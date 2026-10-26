import { and, desc, eq, like, or, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

// ---------------------------------------------------------------------------
// Reads (public marketplace)
// ---------------------------------------------------------------------------

export async function listActiveTenants(opts?: {
  query?: string;
  businessType?: string;
  category?: string;
}) {
  const db = getDb();
  const conds = [eq(schema.tenants.status, "active")];
  if (opts?.businessType)
    conds.push(eq(schema.tenants.businessType, opts.businessType as never));
  if (opts?.category) conds.push(eq(schema.tenants.category, opts.category));
  if (opts?.query) {
    const q = `%${opts.query}%`;
    conds.push(
      or(
        like(schema.tenants.name, q),
        like(schema.tenants.tagline, q),
        like(schema.tenants.description, q),
      )!,
    );
  }
  return db
    .select()
    .from(schema.tenants)
    .where(and(...conds))
    .orderBy(desc(schema.tenants.createdAt));
}

export async function findTenantBySlug(slug: string) {
  const rows = await getDb()
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);
  return rows.at(0);
}

export async function listPublicProducts(opts?: {
  tenantId?: number;
  query?: string;
  category?: string;
  kind?: string;
  limit?: number;
}) {
  const db = getDb();
  const conds = [
    eq(schema.products.active, true),
    eq(schema.tenants.status, "active"),
  ];
  if (opts?.tenantId) conds.push(eq(schema.products.tenantId, opts.tenantId));
  if (opts?.category) conds.push(eq(schema.products.category, opts.category));
  if (opts?.kind) conds.push(eq(schema.products.kind, opts.kind as never));
  if (opts?.query) {
    const q = `%${opts.query}%`;
    conds.push(
      or(
        like(schema.products.name, q),
        like(schema.products.description, q),
      )!,
    );
  }
  return db
    .select({
      product: schema.products,
      tenant: {
        id: schema.tenants.id,
        slug: schema.tenants.slug,
        name: schema.tenants.name,
        themeId: schema.tenants.themeId,
      },
    })
    .from(schema.products)
    .innerJoin(
      schema.tenants,
      eq(schema.products.tenantId, schema.tenants.id),
    )
    .where(and(...conds))
    .orderBy(desc(schema.products.createdAt))
    .limit(opts?.limit ?? 200);
}

export async function findProductById(id: number) {
  const rows = await getDb()
    .select({
      product: schema.products,
      tenant: {
        id: schema.tenants.id,
        slug: schema.tenants.slug,
        name: schema.tenants.name,
        themeId: schema.tenants.themeId,
        status: schema.tenants.status,
      },
    })
    .from(schema.products)
    .innerJoin(schema.tenants, eq(schema.products.tenantId, schema.tenants.id))
    .where(eq(schema.products.id, id))
    .limit(1);
  return rows.at(0);
}

export async function complexStats() {
  const db = getDb();
  const [shopCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "active"));

  // Public aggregate statistics must exclude products and orders belonging to
  // pending or suspended tenants, otherwise lifecycle-hidden merchant activity
  // leaks through the marketplace homepage.
  const [productCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.products)
    .innerJoin(schema.tenants, eq(schema.products.tenantId, schema.tenants.id))
    .where(
      and(
        eq(schema.products.active, true),
        eq(schema.tenants.status, "active"),
      ),
    );

  const [orderCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.orders)
    .innerJoin(schema.tenants, eq(schema.orders.tenantId, schema.tenants.id))
    .where(eq(schema.tenants.status, "active"));

  const categories = await db
    .selectDistinct({ category: schema.products.category })
    .from(schema.products)
    .innerJoin(schema.tenants, eq(schema.products.tenantId, schema.tenants.id))
    .where(
      and(
        eq(schema.products.active, true),
        eq(schema.tenants.status, "active"),
      ),
    );

  return {
    shops: Number(shopCount?.n ?? 0),
    products: Number(productCount?.n ?? 0),
    orders: Number(orderCount?.n ?? 0),
    categories: categories.map((c) => c.category).filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Membership helpers
// ---------------------------------------------------------------------------

export async function findMembership(tenantId: number, userId: number) {
  const rows = await getDb()
    .select()
    .from(schema.tenantMembers)
    .where(
      and(
        eq(schema.tenantMembers.tenantId, tenantId),
        eq(schema.tenantMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows.at(0);
}

export async function listMembershipsForUser(userId: number) {
  return getDb()
    .select({ member: schema.tenantMembers, tenant: schema.tenants })
    .from(schema.tenantMembers)
    .innerJoin(
      schema.tenants,
      eq(schema.tenantMembers.tenantId, schema.tenants.id),
    )
    .where(eq(schema.tenantMembers.userId, userId))
    .orderBy(desc(schema.tenantMembers.createdAt));
}

export async function listMembersOfTenant(tenantId: number) {
  return getDb()
    .select({
      member: schema.tenantMembers,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        avatar: schema.users.avatar,
      },
    })
    .from(schema.tenantMembers)
    .innerJoin(schema.users, eq(schema.tenantMembers.userId, schema.users.id))
    .where(eq(schema.tenantMembers.tenantId, tenantId));
}
