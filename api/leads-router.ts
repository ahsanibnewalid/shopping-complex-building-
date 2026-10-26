import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { findMembership } from "./queries/marketplace";
import { hasRequiredTenantRole } from "./lib/tenant-permissions";
import { tenants } from "@db/schema";
import { leads } from "@db/leads";

const tenantId = z.number().int().positive();
const statuses = z.enum(["new", "contacted", "proposal_sent", "closed"]);
async function requireStaff(shopId: number, userId: number) {
  const membership = await findMembership(shopId, userId);
  if (!membership || !hasRequiredTenantRole(membership.role, "staff"))
    throw new TRPCError({ code: "FORBIDDEN" });
}

export const leadsRouter = createRouter({
  /** Public lead form. Only active service businesses can receive leads. */
  submit: publicQuery.input(z.object({
    shopSlug: z.string().min(1).max(120),
    name: z.string().trim().min(2).max(255),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(60).optional(),
    message: z.string().trim().min(10).max(5000),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const [shop] = await db.select({ id: tenants.id }).from(tenants).where(and(
      eq(tenants.slug, input.shopSlug),
      eq(tenants.status, "active"),
    )).limit(1);
    if (!shop) throw new TRPCError({ code: "NOT_FOUND" });
    await db.insert(leads).values({
      tenantId: shop.id, name: input.name, email: input.email,
      phone: input.phone ?? null, message: input.message,
    });
    return { ok: true };
  }),
  list: authedQuery.input(z.object({ tenantId })).query(async ({ ctx, input }) => {
    await requireStaff(input.tenantId, ctx.user.id);
    return getDb().select().from(leads).where(eq(leads.tenantId, input.tenantId))
      .orderBy(desc(leads.createdAt)).limit(200);
  }),
  setStatus: authedQuery.input(z.object({
    tenantId, leadId: z.number().int().positive(), status: statuses,
  })).mutation(async ({ ctx, input }) => {
    await requireStaff(input.tenantId, ctx.user.id);
    await getDb().update(leads).set({ status: input.status }).where(and(
      eq(leads.id, input.leadId), eq(leads.tenantId, input.tenantId),
    ));
    return { ok: true };
  }),
});
