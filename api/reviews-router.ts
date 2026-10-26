import { z } from "zod";
import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, products, tenants } from "@db/schema";
import { reviews } from "@db/reviews";

export const reviewsRouter = createRouter({
 list: publicQuery.input(z.object({productId:z.number().int().positive()}))
  .query(async ({input}) => getDb().select({
   id:reviews.id,authorName:reviews.authorName,rating:reviews.rating,
   comment:reviews.comment,createdAt:reviews.createdAt,
  }).from(reviews).innerJoin(tenants,eq(reviews.tenantId,tenants.id))
   .where(and(eq(reviews.productId,input.productId),eq(tenants.status,"active")))
   .orderBy(desc(reviews.createdAt)).limit(100)),
 submit: publicQuery.input(z.object({
  orderId:z.number().int().positive(),orderItemId:z.number().int().positive(),
  trackingToken:z.string().min(16).max(256),
  rating:z.number().int().min(1).max(5),
  comment:z.string().trim().min(10).max(2000),
 })).mutation(async ({input})=>{
  const db=getDb();
  const digest=createHash("sha256").update(input.trackingToken).digest("hex");
  const [item]=await db.select({
   orderId:orders.id,tenantId:orders.tenantId,productId:orderItems.productId,
   customerName:orders.customerName,
  }).from(orders).innerJoin(orderItems,eq(orderItems.orderId,orders.id))
   .innerJoin(products,eq(orderItems.productId,products.id))
   .where(and(eq(orders.id,input.orderId),eq(orderItems.id,input.orderItemId),
    eq(orders.trackingTokenHash,digest),eq(orders.status,"completed"),
    eq(products.tenantId,orders.tenantId))).limit(1);
  if(!item || !item.productId) throw new TRPCError({code:"FORBIDDEN",message:"A completed purchase and valid tracking token are required."});
  const [existing]=await db.select({id:reviews.id}).from(reviews)
   .where(eq(reviews.orderItemId,input.orderItemId)).limit(1);
  if(existing)throw new TRPCError({code:"CONFLICT",message:"This purchase has already been reviewed."});
  await db.insert(reviews).values({
   tenantId:item.tenantId,productId:item.productId,orderId:item.orderId,
   orderItemId:input.orderItemId,authorName:item.customerName,
   rating:input.rating,comment:input.comment,
  });
  return {ok:true};
 }),
});
