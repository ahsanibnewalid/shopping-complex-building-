import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { findMembership } from "./queries/marketplace";
import { hasRequiredTenantRole } from "./lib/tenant-permissions";
import { products, tenants } from "@db/schema";
import { bookings } from "@db/bookings";

async function requireStaff(tenantId: number, userId: number) {
 const member = await findMembership(tenantId, userId);
 if (!member || !hasRequiredTenantRole(member.role, "staff")) throw new TRPCError({code:"FORBIDDEN"});
}
const status = z.enum(["requested","confirmed","completed","cancelled"]);
export const bookingsRouter = createRouter({
 request: publicQuery.input(z.object({
  shopSlug: z.string().min(1).max(120),
  serviceId: z.number().int().positive(),
  customerName: z.string().trim().min(2).max(255),
  customerEmail: z.string().trim().email().max(320),
  customerPhone: z.string().trim().max(60).optional(),
  note: z.string().trim().max(2000).optional(),
  startsAt: z.coerce.date(),
 })).mutation(async ({input}) => {
  const startsAt = input.startsAt;
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() + 30 * 60_000 || startsAt.getTime() > Date.now() + 180 * 86_400_000)
   throw new TRPCError({code:"BAD_REQUEST",message:"Choose a time between 30 minutes and 180 days from now."});
  const db = getDb();
  const [row] = await db.select({tenantId:tenants.id}).from(tenants)
   .innerJoin(products, eq(products.tenantId, tenants.id))
   .where(and(eq(tenants.slug,input.shopSlug),eq(tenants.status,"active"),
     eq(products.id,input.serviceId),eq(products.kind,"service"),eq(products.active,true))).limit(1);
  if (!row) throw new TRPCError({code:"NOT_FOUND",message:"Service unavailable."});
  const [result] = await db.insert(bookings).values({
   tenantId:row.tenantId,serviceId:input.serviceId,customerName:input.customerName,
   customerEmail:input.customerEmail,customerPhone:input.customerPhone ?? null,
   note:input.note ?? null,startsAt,durationMinutes:60
  });
  return {id:Number(result.insertId),status:"requested" as const};
 }),
 list: authedQuery.input(z.object({tenantId:z.number().int().positive()})).query(async ({ctx,input})=>{
  await requireStaff(input.tenantId,ctx.user.id);
  return getDb().select().from(bookings).where(eq(bookings.tenantId,input.tenantId))
   .orderBy(desc(bookings.startsAt)).limit(200);
 }),
 setStatus: authedQuery.input(z.object({
  tenantId:z.number().int().positive(),bookingId:z.number().int().positive(),status
 })).mutation(async ({ctx,input})=>{
  await requireStaff(input.tenantId,ctx.user.id);
  await getDb().update(bookings).set({status:input.status})
   .where(and(eq(bookings.id,input.bookingId),eq(bookings.tenantId,input.tenantId)));
  return {ok:true};
 }),
});
