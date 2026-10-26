import { authRouter } from "./auth-router";
import { marketplaceRouter } from "./marketplace-router";
import { orderRouter } from "./order-router";
import { tenantRouter } from "./tenant-router";
import { adminRouter } from "./admin-router";
import { leadsRouter } from "./leads-router";
import { bookingsRouter } from "./bookings-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  marketplace: marketplaceRouter,
  orders: orderRouter,
  tenant: tenantRouter,
  admin: adminRouter,
  leads: leadsRouter,
  bookings: bookingsRouter,
});

export type AppRouter = typeof appRouter;
