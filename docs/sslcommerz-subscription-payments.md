# SSLCommerz subscription payments

This integration is designed for BazarHub's Hono + tRPC + Drizzle/MySQL backend.

## Payment flow

1. An authenticated tenant owner calls the `tenant.initiateSubscriptionPayment` tRPC mutation with a tenant ID, plan ID, billing duration, and customer contact details.
2. Server-side plan pricing is selected from `contracts/marketplace.ts`; client-supplied amounts are never accepted.
3. A payment attempt is written with `INITIATED` status before creating a gateway session.
4. The browser is redirected to the SSLCommerz-hosted checkout.
5. The success callback and IPN both call the same server-to-server validation path.
6. The processor checks the transaction ID, exact amount in BDT paisa, currency, and validation status. A conditional status update and subscription extension run in one database transaction.
7. Duplicate notifications do not extend the subscription again. Fail/cancel browser redirects do not mutate payment state because they are not trusted proof of a gateway outcome.

## Current plan prices

The default plans are configured as BDT 1,500 / 3,500 / 7,500 per month (150,000 / 350,000 / 750,000 paisa). The SQL migration converts only the known legacy default subscription values; custom amounts are left untouched for manual review.

## Environment

Configure these in the hosting provider's secret/environment settings. Never commit actual credentials.

```dotenv
SSLCOMMERZ_STORE_ID=your_sandbox_store_id
SSLCOMMERZ_STORE_PASSWD=your_sandbox_store_password
SSLCOMMERZ_IS_LIVE=false
APP_BASE_URL=https://your-public-api-domain.example
FRONTEND_URL=https://your-frontend-domain.example
```

Use a publicly reachable HTTPS URL for sandbox testing (for example, a temporary HTTPS tunnel). In the SSLCommerz merchant panel, configure the IPN URL as:

`https://your-public-api-domain.example/api/payments/sslcommerz/ipn`

Keep `SSLCOMMERZ_IS_LIVE=false` until the migration, tests, callback delivery, duplicate-notification checks, and amount/currency mismatch cases have all been verified. Switch to live credentials only in the hosting secret store after approval.

## Database migration

Back up the database first, then review and apply:

`db/migrations/20261026_sslcommerz_subscription_payments.sql`

The project does not currently expose a migration runner for this SQL file, so it must be applied using the deployment's approved MySQL migration process. Do not run schema push against production without a reviewed backup and migration plan.

## Verification checklist

- [ ] Confirm the base project builds and its existing router/context/DB modules are present.
- [ ] Apply the SQL migration to a non-production database.
- [ ] Run `npm run check`, `npm run lint`, and `npm test`.
- [ ] Test valid, failed, cancelled, forged, mismatched-amount, mismatched-currency, and duplicate/concurrent IPN callbacks.
- [ ] Verify a new shop remains past due until the gateway confirms payment.
- [ ] Verify the owner can only initiate payments for a tenant where they have the owner role.
- [ ] Verify admin revenue includes only validated BDT gateway receipts and explicitly recorded BDT offline receipts.
- [ ] Configure sandbox credentials and IPN URL; do not test with live credentials until all checks pass.
