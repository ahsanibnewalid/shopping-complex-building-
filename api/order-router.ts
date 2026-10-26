import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@db/schema";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { findTenantBySlug } from "./queries/marketplace";
import { aggregateCartQuantities } from "./lib/cart-quantities";

const checkoutItem = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(99),
});

/**
 * Guest checkout: no account required. The order is validated against live
 * prices and stock, snapshots the line items, and decrements stock.
 */
export const orderRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        shopSlug: z.string().min(1),
        customerName: z.string().trim().min(2).max(255),
        customerEmail: z.string().trim().email().max(320),
        customerPhone: z.string().trim().max(60).optional(),
        note: z.string().trim().max(1000).optional(),
        items: z.array(checkoutItem).min(1).max(50),
      }),
    )
    .mutation(async ({ input }) => {
      const tenant = await findTenantBySlug(input.shopSlug);
      if (!tenant || tenant.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }

      let quantities: Map<number, number>;
      try {
        quantities = aggregateCartQuantities(input.items);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The total quantity of an item cannot exceed 99.",
        });
      }

      const db = getDb();
      return db.transaction(async (tx) => {
        const ids = [...quantities.keys()];
        const rows = await tx
          .select()
          .from(schema.products)
          .where(
            and(
              inArray(schema.products.id, ids),
              eq(schema.products.tenantId, tenant.id),
              eq(schema.products.active, true),
            ),
          )
          .for("update");
        const byId = new Map(rows.map((product) => [product.id, product]));

        let totalCents = 0;
        const lines: { product: schema.Product; qty: number }[] = [];
        for (const [productId, qty] of quantities) {
          const product = byId.get(productId);
          if (!product) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One of the items is no longer available.",
            });
          }
          if (product.kind === "product" && product.stock < qty) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Not enough stock for ${product.name}.`,
            });
          }
          const lineTotal = product.priceCents * qty;
          if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(totalCents + lineTotal)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Order total is out of range." });
          }
          totalCents += lineTotal;
          lines.push({ product, qty });
        }

        const [orderResult] = await tx.insert(schema.orders).values({
          tenantId: tenant.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone ?? null,
          note: input.note ?? null,
          totalCents,
        });
        const orderId = Number(orderResult.insertId);

        await tx.insert(schema.orderItems).values(
          lines.map(({ product, qty }) => ({
            orderId,
            productId: product.id,
            name: product.name,
            priceCents: product.priceCents,
            qty,
          })),
        );

        for (const { product, qty } of lines) {
          if (product.kind === "product") {
            const [stockUpdate] = await tx
              .update(schema.products)
              .set({ stock: product.stock - qty })
              .where(
                and(
                  eq(schema.products.id, product.id),
                  eq(schema.products.tenantId, tenant.id),
                  eq(schema.products.active, true),
                  // Guard again in SQL to prevent overselling under concurrency.
                  sql`stock >= ${qty}`,
                ),
              );
            const affectedRows = Number(
              (stockUpdate as unknown as { affectedRows?: number }).affectedRows ?? 0,
            );
            if (affectedRows !== 1) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `Stock changed for ${product.name}; please retry checkout.`,
              });
            }
          }
        }

        return { orderId, totalCents };
      });
    }),

  /** Guest can look up an order by id + email. */
  track: publicQuery
    .input(
      z.object({
        orderId: z.number().int().positive(),
        email: z.string().trim().email(),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({ order: schema.orders, tenant: { name: schema.tenants.name, slug: schema.tenants.slug } })
        .from(schema.orders)
        .innerJoin(schema.tenants, eq(schema.orders.tenantId, schema.tenants.id))
        .where(
          and(
            eq(schema.orders.id, input.orderId),
            eq(schema.orders.customerEmail, input.email),
          ),
        )
        .limit(1);
      const row = rows.at(0);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const items = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, row.order.id))
        .orderBy(desc(schema.orderItems.id));
      return { ...row, items };
    }),
});
