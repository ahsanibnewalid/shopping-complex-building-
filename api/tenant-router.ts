import { z } from "zod";
import { randomUUID } from "node:crypto";
import { sslcommerzService } from "./payments/sslcommerz.service";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@db/schema";
import {
  BUSINESS_TYPES,
  PLANS,
  SHOP_CATEGORIES,
  THEME_IDS,
  type TenantRole,
} from "@contracts/marketplace";
import { authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import {
  findMembership,
  listMembersOfTenant,
  listMembershipsForUser,
} from "./queries/marketplace";

const ROLE_RANK: Record<TenantRole, number> = { staff: 1, manager: 2, owner: 3 };

async function requireTenantRole(
  tenantId: number,
  userId: number,
  minRole: TenantRole,
) {
  const membership = await findMembership(tenantId, userId);
  if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to manage this shop.",
    });
  }
  return membership;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

const productInput = z.object({
  name: z.string().trim().min(2).max(255),
  description: z.string().trim().max(5000).optional(),
  kind: z.enum(["product", "service"]).default("product"),
  category: z.string().trim().max(120).default("General"),
  priceCents: z.number().int().min(0).max(100_000_000),
  compareAtCents: z.number().int().min(0).max(100_000_000).optional(),
  imageUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  active: z.boolean().default(true),
});

export const tenantRouter = createRouter({
  /** Shops the current user belongs to (any role). */
  myShops: authedQuery.query(async ({ ctx }) => {
    return listMembershipsForUser(ctx.user.id);
  }),

  /** Register a new shop; the creator becomes its owner. */
  createShop: authedQuery
    .input(
      z.object({
        name: z.string().trim().min(2).max(255),
        tagline: z.string().trim().max(255).optional(),
        description: z.string().trim().max(5000).optional(),
        businessType: z.enum(
          BUSINESS_TYPES.map((b) => b.id) as [string, ...string[]],
        ),
        category: z.string().trim().max(120).default("General"),
        themeId: z.enum(THEME_IDS).default("archive"),
        location: z.string().trim().max(255).optional(),
        contactEmail: z.string().trim().email().max(320).optional(),
        phone: z.string().trim().max(60).optional(),
        plan: z.enum(PLANS.map((p) => p.id) as [string, ...string[]]).default("starter"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const base = slugify(input.name) || "shop";
      let slug = base;
      for (let i = 2; ; i++) {
        const clash = await db
          .select({ id: schema.tenants.id })
          .from(schema.tenants)
          .where(eq(schema.tenants.slug, slug))
          .limit(1);
        if (!clash.length) break;
        slug = `${base}-${i}`;
      }

      const plan = PLANS.find((p) => p.id === input.plan)!;
      const [result] = await db.insert(schema.tenants).values({
        slug,
        name: input.name,
        tagline: input.tagline ?? null,
        description: input.description ?? null,
        businessType: input.businessType as never,
        category: SHOP_CATEGORIES.includes(input.category as never)
          ? input.category
          : "General",
        themeId: input.themeId,
        location: input.location ?? null,
        contactEmail: input.contactEmail ?? ctx.user.email ?? null,
        phone: input.phone ?? null,
      });
      const tenantId = Number(result.insertId);

      await db.insert(schema.tenantMembers).values({
        tenantId,
        userId: ctx.user.id,
        role: "owner",
      });

      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(schema.subscriptions).values({
        tenantId,
        plan: plan.id as never,
        monthlyCents: plan.monthlyCents,
        status: "past_due",
        currentPeriodEnd: periodEnd,
      });

      return { tenantId, slug };
    }),

  /** Update shop profile (owner/manager). */
  updateShop: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        name: z.string().trim().min(2).max(255).optional(),
        tagline: z.string().trim().max(255).optional(),
        description: z.string().trim().max(5000).optional(),
        businessType: z
          .enum(BUSINESS_TYPES.map((b) => b.id) as [string, ...string[]])
          .optional(),
        category: z.string().trim().max(120).optional(),
        location: z.string().trim().max(255).optional(),
        contactEmail: z.string().trim().email().max(320).optional(),
        phone: z.string().trim().max(60).optional(),
        logoUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "manager");
      const { tenantId, ...patch } = input;
      const clean = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ) as Record<string, unknown>;
      if (clean.logoUrl === "") clean.logoUrl = null;
      if (Object.keys(clean).length) {
        await getDb()
          .update(schema.tenants)
          .set(clean)
          .where(eq(schema.tenants.id, tenantId));
      }
      return { ok: true };
    }),

  /** Switch the storefront theme (owner/manager). */
  setTheme: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        themeId: z.enum(THEME_IDS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "manager");
      await getDb()
        .update(schema.tenants)
        .set({ themeId: input.themeId })
        .where(eq(schema.tenants.id, input.tenantId));
      return { ok: true };
    }),

  // -------------------------------------------------------------- products

  listProducts: authedQuery
    .input(z.object({ tenantId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "staff");
      return getDb()
        .select()
        .from(schema.products)
        .where(eq(schema.products.tenantId, input.tenantId))
        .orderBy(desc(schema.products.createdAt));
    }),

  createProduct: authedQuery
    .input(z.object({ tenantId: z.number().int().positive(), data: productInput }))
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "staff");
      const [result] = await getDb()
        .insert(schema.products)
        .values({
          tenantId: input.tenantId,
          ...input.data,
          imageUrl: input.data.imageUrl || null,
          compareAtCents: input.data.compareAtCents ?? null,
        });
      return { id: Number(result.insertId) };
    }),

  updateProduct: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        productId: z.number().int().positive(),
        data: productInput.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "staff");
      const patch = { ...input.data } as Record<string, unknown>;
      if (patch.imageUrl === "") patch.imageUrl = null;
      await getDb()
        .update(schema.products)
        .set(patch)
        .where(
          and(
            eq(schema.products.id, input.productId),
            eq(schema.products.tenantId, input.tenantId),
          ),
        );
      return { ok: true };
    }),

  deleteProduct: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        productId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "manager");
      await getDb()
        .delete(schema.products)
        .where(
          and(
            eq(schema.products.id, input.productId),
            eq(schema.products.tenantId, input.tenantId),
          ),
        );
      return { ok: true };
    }),

  // ---------------------------------------------------------------- orders

  listOrders: authedQuery
    .input(z.object({ tenantId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "staff");
      const db = getDb();
      const orderRows = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.tenantId, input.tenantId))
        .orderBy(desc(schema.orders.createdAt))
        .limit(200);
      if (!orderRows.length) return [];
      const items = await db
        .select()
        .from(schema.orderItems)
        .where(inArray(schema.orderItems.orderId, orderRows.map((o) => o.id)));
      const grouped = new Map<number, schema.OrderItem[]>();
      for (const item of items) {
        const arr = grouped.get(item.orderId) ?? [];
        arr.push(item);
        grouped.set(item.orderId, arr);
      }
      return orderRows.map((o) => ({ ...o, items: grouped.get(o.id) ?? [] }));
    }),

  setOrderStatus: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        orderId: z.number().int().positive(),
        status: z.enum(["new", "processing", "completed", "cancelled"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "staff");
      await getDb()
        .update(schema.orders)
        .set({ status: input.status })
        .where(
          and(
            eq(schema.orders.id, input.orderId),
            eq(schema.orders.tenantId, input.tenantId),
          ),
        );
      return { ok: true };
    }),

  // --------------------------------------------------------------- members

  listMembers: authedQuery
    .input(z.object({ tenantId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "staff");
      return listMembersOfTenant(input.tenantId);
    }),

  /** Owner adds a teammate by the email they signed in with. */
  addMember: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        email: z.string().trim().email(),
        role: z.enum(["manager", "staff"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "owner");
      const db = getDb();
      const usersFound = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, input.email))
        .limit(1);
      const user = usersFound.at(0);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No account with that email yet. Ask them to sign in once, then add them.",
        });
      }
      const existing = await findMembership(input.tenantId, user.id);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That person is already on this shop's team.",
        });
      }
      await db.insert(schema.tenantMembers).values({
        tenantId: input.tenantId,
        userId: user.id,
        role: input.role,
      });
      return { ok: true };
    }),

  setMemberRole: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        memberId: z.number().int().positive(),
        role: z.enum(["owner", "manager", "staff"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "owner");
      await getDb()
        .update(schema.tenantMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(schema.tenantMembers.id, input.memberId),
            eq(schema.tenantMembers.tenantId, input.tenantId),
          ),
        );
      return { ok: true };
    }),

  removeMember: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        memberId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "owner");
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.tenantMembers)
        .where(eq(schema.tenantMembers.id, input.memberId))
        .limit(1);
      const target = rows.at(0);
      if (target?.role === "owner") {
        const owners = await db
          .select({ n: sql<number>`count(*)` })
          .from(schema.tenantMembers)
          .where(
            and(
              eq(schema.tenantMembers.tenantId, input.tenantId),
              eq(schema.tenantMembers.role, "owner"),
            ),
          );
        if (Number(owners.at(0)?.n ?? 0) <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A shop must keep at least one owner.",
          });
        }
      }
      await db
        .delete(schema.tenantMembers)
        .where(
          and(
            eq(schema.tenantMembers.id, input.memberId),
            eq(schema.tenantMembers.tenantId, input.tenantId),
          ),
        );
      return { ok: true };
    }),

  // ----------------------------------------------------------- subscription

  subscription: authedQuery
    .input(z.object({ tenantId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "staff");
      const db = getDb();
      const subs = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.tenantId, input.tenantId))
        .limit(1);
      const sub = subs.at(0);
      if (!sub) return null;
      const payments = await db
        .select()
        .from(schema.subscriptionPayments)
        .where(eq(schema.subscriptionPayments.subscriptionId, sub.id))
        .orderBy(desc(schema.subscriptionPayments.paidAt))
        .limit(24);
      return { ...sub, payments };
    }),

  changePlan: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        plan: z.enum(PLANS.map((p) => p.id) as [string, ...string[]]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "owner");
      const plan = PLANS.find((p) => p.id === input.plan)!;
      await getDb()
        .update(schema.subscriptions)
        .set({ plan: plan.id as never, monthlyCents: plan.monthlyCents })
        .where(eq(schema.subscriptions.tenantId, input.tenantId));
      return { ok: true };
    }),

  /**
   * Create a pending gateway attempt. A subscription is activated only by a
   * server-validated SSLCommerz callback/IPN, never by this initiation request.
   */
  initiateSubscriptionPayment: authedQuery
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        months: z.number().int().min(1).max(12).default(1),
        customerName: z.string().trim().min(2).max(255),
        customerEmail: z.string().trim().email().max(100),
        customerPhone: z.string().trim().min(6).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireTenantRole(input.tenantId, ctx.user.id, "owner");
      const db = getDb();
      const [sub] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.tenantId, input.tenantId))
        .limit(1);
      if (!sub) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No subscription found for this shop." });
      }

      const configuredPlan = PLANS.find((p) => p.id === sub.plan);
      if (!configuredPlan) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Subscription plan is not configured." });
      }
      const amountInPaisa = configuredPlan.monthlyCents * input.months;
      if (!Number.isSafeInteger(amountInPaisa) || amountInPaisa <= 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Invalid subscription price configuration." });
      }

      const tranId = `BH-${randomUUID()}`;
      const [insertResult] = await db.insert(schema.subscriptionPayments).values({
        subscriptionId: sub.id,
        amountCents: amountInPaisa,
        months: input.months,
        note: "SSLCommerz subscription payment",
        tranId,
        planId: sub.plan,
        currency: "BDT",
        status: "INITIATED",
        paidAt: null,
      });

      try {
        const gatewayUrl = await sslcommerzService.initPayment({
          tranId,
          amountInPaisa,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          productName: `BazarHub ${configuredPlan.label} subscription`,
        });
        return { gatewayUrl, tranId, paymentId: Number(insertResult.insertId) };
      } catch (error) {
        await db
          .update(schema.subscriptionPayments)
          .set({ status: "FAILED" })
          .where(
            and(
              eq(schema.subscriptionPayments.tranId, tranId),
              eq(schema.subscriptionPayments.status, "INITIATED"),
            ),
          );
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Could not start the SSLCommerz payment session. Please try again.",
          cause: error,
        });
      }
    }),

});
