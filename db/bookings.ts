import { bigint, index, int, mysqlEnum, mysqlTable, serial, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { products, tenants } from "./schema";
export const bookings = mysqlTable("tenant_bookings", {
 id: serial("id").primaryKey(),
 tenantId: bigint("tenantId", { mode: "number", unsigned: true }).notNull().references(() => tenants.id),
 serviceId: bigint("serviceId", { mode: "number", unsigned: true }).notNull().references(() => products.id),
 customerName: varchar("customerName", { length: 255 }).notNull(),
 customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
 customerPhone: varchar("customerPhone", { length: 60 }),
 note: text("note"),
 startsAt: timestamp("startsAt").notNull(),
 durationMinutes: int("durationMinutes").notNull().default(60),
 status: mysqlEnum("status", ["requested", "confirmed", "completed", "cancelled"]).notNull().default("requested"),
 createdAt: timestamp("createdAt").notNull().defaultNow(),
}, t => [index("idx_bookings_tenant_start").on(t.tenantId, t.startsAt)]);
