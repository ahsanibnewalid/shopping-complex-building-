# BazarHub production-readiness runbook

BazarHub is a multi-merchant marketplace with tenant storefronts, product listings, guest checkout, team roles, and subscription billing. This runbook describes the checks required before it handles real customers or money. A successful build alone does not make the service production-ready.

## Before deploying

- [ ] Use a managed MySQL database with TLS, least-privilege credentials, automated backups, and a tested restore procedure.
- [ ] Configure every required variable from `.env.example` in the deployment secret manager. Never commit a real `.env`.
- [ ] Set `APP_BASE_URL` to the public API origin and `FRONTEND_URL` to the trusted frontend origin. Live payment mode requires HTTPS.
- [ ] Keep `SSLCOMMERZ_IS_LIVE=false` until the complete sandbox workflow has been tested. Store credentials only in the secret manager.
- [ ] Back up the database and review each SQL migration against the deployed schema before applying it.
- [ ] Run `npm ci`, `npm run check`, `npm test`, `npm run lint`, `npm run build`, and `npm audit --audit-level=high`; review any failure rather than bypassing it.
- [ ] Verify the first platform-admin account and owner identity using the configured `OWNER_UNION_ID`. Do not make arbitrary users admins.
- [ ] Configure HTTPS, domain/DNS, health monitoring, error alerts, database capacity alerts, and a rollback plan.

## Payment acceptance checklist

- [ ] Confirm the gateway validation API response matches the transaction ID, validation ID, BDT currency, and exact amount in paisa.
- [ ] Verify callbacks are idempotent and a repeated callback cannot extend a subscription twice.
- [ ] Test success, failure, cancellation, timeout, malformed callback, unknown transaction, wrong amount, wrong currency, and duplicate callback paths in sandbox.
- [ ] Confirm only server-validated payments activate a subscription or a pending storefront.
- [ ] Reconcile gateway settlement reports against the BDT ledger before enabling live mode.

## Tenant and order acceptance checklist

- [ ] Verify a pending or suspended storefront cannot be read through public endpoints.
- [ ] Test that a tenant's staff cannot access another tenant's products, orders, subscription, or team.
- [ ] Verify the last shop owner cannot be removed or demoted.
- [ ] Test duplicate product IDs, stock exhaustion, concurrent checkout, service listings, invalid totals, and rollback after a failed order write.
- [ ] Test order lookup privacy and add rate limiting/abuse protection at the edge before public launch.
- [ ] Confirm owner/admin routes are enforced server-side; hiding a button in the UI is not authorization.

## Operational launch gates

1. Apply reviewed migrations to a staging database populated with synthetic data.
2. Run the complete test suite and the CI workflow on the exact release commit.
3. Run end-to-end browser/API tests against staging, including tenant isolation and sandbox payments.
4. Verify backup restore, log redaction, alerting, incident contacts, and rollback.
5. Obtain a human review of payment handling, data protection, legal/privacy notices, refund/cancellation terms, and Bangladesh tax/accounting treatment.
6. Enable production traffic gradually; monitor errors, payment reconciliation, latency, and database load.

## Current known limitations

- CI is being introduced and must pass on the final commit before release.
- A real database, OAuth provider, domain, SSLCommerz credentials, and deployment target are environment-specific and cannot be verified from source code alone.
- Rate limiting, comprehensive end-to-end tests, abuse monitoring, legal review, and production backup/restore drills remain explicit launch gates until verified.
