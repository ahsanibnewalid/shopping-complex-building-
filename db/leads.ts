import { bigint, index, mysqlEnum, mysqlTable, serial, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { tenants } from "./schema";

/** Tenant-scoped lead pipeline for agency and service businesses. */
export const leads = mysqlTable("tenant_leads", {
  id: serial("id").primaryKey(),
  tenantId: bigint("tenantId", { mode: "number", unsigned: true }).notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 60 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "proposal_sent", "closed"]).notNull().default("new"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("idx_leads_tenant_status").on(t.tenantId, t.status)]);
