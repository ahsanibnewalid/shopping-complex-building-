import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Shopping complex: tenants (shops), members, catalog, orders, subscriptions
// ---------------------------------------------------------------------------

/** A tenant = one shop / e-commerce store / company / agency / showroom. */
export const tenants = mysqlTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    /** URL-safe unique handle, e.g. /shops/noor-electronics */
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    tagline: varchar("tagline", { length: 255 }),
    description: text("description"),
    businessType: mysqlEnum("businessType", [
      "ecommerce",
      "company",
      "agency",
      "showroom",
    ])
      .notNull()
      .default("ecommerce"),
    category: varchar("category", { length: 120 }).default("General"),
    /** Theme id from contracts/themes.ts */
    themeId: varchar("themeId", { length: 60 }).notNull().default("archive"),
    /** Shop logo image URL (optional; monogram fallback) */
    logoUrl: text("logoUrl"),
    location: varchar("location", { length: 255 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    phone: varchar("phone", { length: 60 }),
    status: mysqlEnum("status", ["active", "suspended"])
      .notNull()
      .default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("idx_tenants_status").on(t.status)],
);

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

/** Tenant team membership with per-shop roles (owner can delegate). */
export const tenantMembers = mysqlTable(
  "tenant_members",
  {
    id: serial("id").primaryKey(),
    tenantId: bigint("tenantId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => tenants.id),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    role: mysqlEnum("role", ["owner", "manager", "staff"])
      .notNull()
      .default("staff"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_tenant_user").on(t.tenantId, t.userId)],
);

export type TenantMember = typeof tenantMembers.$inferSelect;

/** Product or service listed by a tenant. Prices stored in cents. */
export const products = mysqlTable(
  "products",
  {
    id: serial("id").primaryKey(),
    tenantId: bigint("tenantId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    kind: mysqlEnum("kind", ["product", "service"])
      .notNull()
      .default("product"),
    category: varchar("category", { length: 120 }).default("General"),
    priceCents: int("priceCents").notNull().default(0),
    compareAtCents: int("compareAtCents"),
    imageUrl: text("imageUrl"),
    stock: int("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_products_tenant").on(t.tenantId, t.active)],
);

export type Product = typeof products.$inferSelect;

/** Guest-checkout order placed against one tenant. */
export const orders = mysqlTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    tenantId: bigint("tenantId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => tenants.id),
    customerName: varchar("customerName", { length: 255 }).notNull(),
    customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
    customerPhone: varchar("customerPhone", { length: 60 }),
    note: text("note"),
    totalCents: int("totalCents").notNull().default(0),
    status: mysqlEnum("status", [
      "new",
      "processing",
      "completed",
      "cancelled",
    ])
      .notNull()
      .default("new"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("idx_orders_tenant").on(t.tenantId, t.status)],
);

export type Order = typeof orders.$inferSelect;

export const orderItems = mysqlTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: bigint("orderId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => orders.id),
    productId: bigint("productId", { mode: "number", unsigned: true }),
    /** Snapshots so later product edits don't rewrite history */
    name: varchar("name", { length: 255 }).notNull(),
    priceCents: int("priceCents").notNull(),
    qty: int("qty").notNull().default(1),
  },
  (t) => [index("idx_order_items_order").on(t.orderId)],
);

export type OrderItem = typeof orderItems.$inferSelect;

/** Monthly subscription the tenant pays to the complex owner. */
export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    tenantId: bigint("tenantId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => tenants.id)
      .unique(),
    plan: mysqlEnum("plan", ["starter", "pro", "business"])
      .notNull()
      .default("starter"),
    monthlyCents: int("monthlyCents").notNull().default(1900),
    status: mysqlEnum("status", ["active", "past_due", "cancelled"])
      .notNull()
      .default("past_due"),
    currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_subscriptions_status").on(t.status)],
);

export type Subscription = typeof subscriptions.$inferSelect;

export const subscriptionPayments = mysqlTable(
  "subscription_payments",
  {
    id: serial("id").primaryKey(),
    subscriptionId: bigint("subscriptionId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => subscriptions.id),
    amountCents: int("amountCents").notNull(),
    months: int("months").notNull().default(1),
    note: varchar("note", { length: 255 }),
    /** Gateway metadata is nullable so existing offline-payment rows remain valid. */
    tranId: varchar("tranId", { length: 100 }),
    valId: varchar("valId", { length: 100 }),
    planId: varchar("planId", { length: 20 }),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    status: mysqlEnum("status", ["INITIATED", "VALIDATED", "FAILED", "CANCELLED", "OFFLINE"])
      .notNull()
      .default("OFFLINE"),
    gatewayRawResponse: text("gatewayRawResponse"),
    paidAt: timestamp("paidAt"),
  },
  (t) => [
    index("idx_sub_payments_sub").on(t.subscriptionId),
    uniqueIndex("uq_subscription_payment_tran_id").on(t.tranId),
  ],
);

export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
