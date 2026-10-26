import { bigint, index, int, mysqlTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { orderItems, orders, products, tenants } from "./schema";
export const reviews = mysqlTable("product_reviews", {
 id: serial("id").primaryKey(),
 tenantId: bigint("tenantId",{mode:"number",unsigned:true}).notNull().references(()=>tenants.id),
 productId: bigint("productId",{mode:"number",unsigned:true}).notNull().references(()=>products.id),
 orderId: bigint("orderId",{mode:"number",unsigned:true}).notNull().references(()=>orders.id),
 orderItemId: bigint("orderItemId",{mode:"number",unsigned:true}).notNull().references(()=>orderItems.id),
 authorName: varchar("authorName",{length:255}).notNull(),
 rating: int("rating").notNull(),
 comment: text("comment").notNull(),
 createdAt: timestamp("createdAt").defaultNow().notNull(),
}, t=>[uniqueIndex("uq_review_order_item").on(t.orderItemId),index("idx_reviews_product").on(t.productId)]);
