import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@db/schema";
import { adminQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";

/**
 * Complex-owner (platform admin) operations: tenant lifecycle, billing
 * oversight, platform-wide stats. All procedures require users.role=admin.
 */
export const adminRouter = createRouter({
  overview: adminQuery.query(async () => {
    const db = getDb();
    const scalar = async (q: Promise<{ n: number }[]>) =>
      Number((await q).at(0)?.n ?? 0);
    const tenants = await scalar(
      db.select({ n: sql<number>`count(*)` }).from(schema.tenants),
    );
    const activeTenants = await scalar(
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.tenants)
        .where(eq(schema.tenants.status, "active")),
    );
    const users = await scalar(
      db.select({ n: sql<number>`count(*)` }).from(schema.users),
    );
    const products = await scalar(
      db.select({ n: sql<number>`count(*)` }).from(schema.products),
    );
    const orders = await scalar(
      db.select({ n: sql<number>`count(*)` }).from(schema.orders),
    );
    const revenue = await scalar(
      db
        .select({ n: sql<number>`coalesce(sum(amountCents),0)` })
        .from(schema.subscriptionPayments)
        .where(
          and(
            eq(schema.subscriptionPayments.currency, "BDT"),
            eq(schema.subscriptionPayments.status, "VALIDATED"),
          ),
        ),
    );
    const mrr = await scalar(
      db
        .select({ n: sql<number>`coalesce(sum(monthlyCents),0)` })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.status, "active")),
    );
    return { tenants, activeTenants, users, products, orders, revenue, mrr };
  }),

  tenants: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        tenant: schema.tenants,
        subscription: schema.subscriptions,
        ownerName: schema.users.name,
        ownerEmail: schema.users.email,
      })
      .from(schema.tenants)
      .leftJoin(
        schema.subscriptions,
        eq(schema.subscriptions.tenantId, schema.tenants.id),
      )
      .leftJoin(
        schema.tenantMembers,
        eq(schema.tenantMembers.tenantId, schema.tenants.id),
      )
      .leftJoin(schema.users, eq(schema.tenantMembers.userId, schema.users.id))
      .where(eq(schema.tenantMembers.role, "owner"))
      .orderBy(desc(schema.tenants.createdAt));
  }),

  setTenantStatus: adminQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        status: z.enum(["active", "suspended"]),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb()
        .update(schema.tenants)
        .set({ status: input.status })
        .where(eq(schema.tenants.id, input.tenantId));
      return { ok: true };
    }),

  setSubscriptionStatus: adminQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        status: z.enum(["active", "past_due", "cancelled"]),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb()
        .update(schema.subscriptions)
        .set({ status: input.status })
        .where(eq(schema.subscriptions.tenantId, input.tenantId));
      return { ok: true };
    }),

  /** Manually record a payment received offline (bank transfer, cash). */
  recordPayment: adminQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        months: z.number().int().min(1).max(12).default(1),
        note: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const subs = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.tenantId, input.tenantId))
        .limit(1);
      const sub = subs.at(0);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "No subscription" });
      const base = Math.max(Date.now(), new Date(sub.currentPeriodEnd).getTime());
      const newEnd = new Date(base + input.months * 30 * 24 * 60 * 60 * 1000);
      await db
        .update(schema.subscriptions)
        .set({ currentPeriodEnd: newEnd, status: "active" })
        .where(eq(schema.subscriptions.id, sub.id));
      await db.insert(schema.subscriptionPayments).values({
        subscriptionId: sub.id,
        amountCents: sub.monthlyCents * input.months,
        months: input.months,
        note: input.note ?? "Recorded by complex admin",
      });
      return { ok: true };
    }),
});
