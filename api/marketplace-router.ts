import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import {
  complexStats,
  findProductById,
  findTenantBySlug,
  listActiveTenants,
  listPublicProducts,
} from "./queries/marketplace";

export const marketplaceRouter = createRouter({
  /** Public: all active shops in the complex, filterable. */
  shops: publicQuery
    .input(
      z
        .object({
          query: z.string().trim().max(120).optional(),
          businessType: z.string().optional(),
          category: z.string().optional(),
        })
        .optional(),
    )
    .query(({ input }) => listActiveTenants(input)),

  /** Public: one shop by slug (for the storefront). */
  shop: publicQuery
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ input }) => {
      const tenant = await findTenantBySlug(input.slug);
      // Pending and suspended storefronts must never be discoverable through
      // the public API, even when a visitor knows the slug.
      if (!tenant || tenant.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }
      // Return only storefront fields; internal status/lifecycle metadata stays
      // in the merchant and platform-admin workspaces.
      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        tagline: tenant.tagline,
        description: tenant.description,
        businessType: tenant.businessType,
        category: tenant.category,
        themeId: tenant.themeId,
        logoUrl: tenant.logoUrl,
        location: tenant.location,
        contactEmail: tenant.contactEmail,
        phone: tenant.phone,
      };
    }),

  /** Public: product search across the whole complex, or within one shop. */
  products: publicQuery
    .input(
      z
        .object({
          shopSlug: z.string().optional(),
          query: z.string().trim().max(120).optional(),
          category: z.string().optional(),
          kind: z.enum(["product", "service"]).optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      let tenantId: number | undefined;
      if (input?.shopSlug) {
        const tenant = await findTenantBySlug(input.shopSlug);
        if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
        tenantId = tenant.id;
      }
      return listPublicProducts({ ...input, tenantId });
    }),

  /** Public: single product with its shop. */
  product: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const row = await findProductById(input.id);
      if (!row || !row.product.active || row.tenant.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      return row;
    }),

  /** Public: headline numbers for the complex homepage. */
  stats: publicQuery.query(() => complexStats()),
});
