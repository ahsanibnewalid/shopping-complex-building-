# BazarHub — Shopping Complex SaaS

<p align="center">
  <img src="docs/assets/bazarhub-platform-overview.svg" alt="BazarHub product concept: a shared marketplace and independent merchant workspaces" width="100%" />
</p>

<p align="center">
  <strong>One digital destination for a whole shopping complex.</strong><br />
  Help customers discover products and stores while giving each merchant a place to manage its own storefront and day-to-day operations.
</p>

<p align="center">
  <a href="#product-highlights">Product</a> ·
  <a href="#who-its-for">Who it's for</a> ·
  <a href="#technology">Technology</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#local-demo-database">Local demo database</a> ·
  <a href="#project-status">Status</a>
</p>

> **Project status:** Active development. This repository is a work in progress, not a claim of production readiness. The visuals in this README are **illustrative product concepts**, not screenshots captured from a running deployment. Check the current code and tests before using it for live customers, orders, or payments.

## What is BazarHub?

BazarHub is being built as a **multi-merchant shopping-complex platform**. Instead of making shoppers visit separate websites to discover every shop, the central marketplace is designed to bring stores and products together in one place.

Each participating shop, showroom, company, or agency can have its own storefront and team workspace, while the platform operator manages the wider marketplace.

## Product highlights

- **Central product discovery** — browse products and participating shops in one place.
- **Independent merchant storefronts** — each merchant can present its own business identity and catalogue.
- **Store design direction** — theme, template, and CMS-style customization are part of the product vision; confirm implementation before promising features to merchants.
- **Merchant workspace** — foundations for managing products, orders, and shop operations.
- **Team roles** — owner, manager, and staff-style access is part of the intended workflow; verify permissions against current implementation.
- **Platform operations** — central administration experience for overseeing the marketplace and merchants.
- **Subscriptions and payments** — initial SSLCommerz subscription-payment integration with BDT/paisa amount handling. Treat it as an integration foundation until end-to-end sandbox tests and deployment configuration have been verified.

## Who it's for

| Audience | Intended value |
| --- | --- |
| Shoppers | Discover products and stores without searching many separate sites. |
| Shop and showroom owners | Present a branded storefront and manage catalogue and orders. |
| Companies and agencies | Organize a business presence and collaborate with a team. |
| Shopping-complex operators | Bring participating merchants into one digital marketplace and manage the platform. |

## Technology

- **Frontend:** React, TypeScript, Vite
- **API:** Hono and tRPC
- **Database layer:** Drizzle ORM with MySQL
- **UI styling:** Tailwind CSS and supporting React UI libraries
- **Payments:** SSLCommerz subscription-payment foundation

See `package.json`, `api/`, and `db/` for implementation details.

## Getting started

### Requirements

- Node.js and npm compatible with the versions in `package.json`
- Docker with the Docker Compose plugin (for the included local MySQL demo)
- OpenSSL (only needed to generate a local session secret)

### Install dependencies

```bash
npm install
```

### Local demo database

The repository includes a **local-only MySQL demo database** and fictional seed records. It does not create login accounts, real customer data, payment records, or usable payment credentials.

1. Start the database. The port is bound to `127.0.0.1`, not to every network interface.

   ```bash
   docker compose -f docker-compose.demo.yml up -d db
   ```

2. Create your local environment file. Do not commit it.

   ```bash
   cp .env.example .env
   ```

3. Put the following **local demo-only values** into your untracked `.env`. Generate a fresh session secret with the command below; do not copy a session secret from this README or share yours.

   ```bash
   openssl rand -base64 48
   ```

   Set these values in `.env`:

   ```dotenv
   # Local demo only — never reuse these database credentials elsewhere.
   DATABASE_URL=mysql://bazarhub_demo:demo_db_only_change_me@127.0.0.1:3307/bazarhub_demo

   # Replace with the output of: openssl rand -base64 48
   SESSION_SECRET=REPLACE_WITH_YOUR_GENERATED_RANDOM_VALUE

   # Non-credential placeholders: OAuth sign-in will not work until you
   # register an OAuth app and supply its real values privately.
   APP_ID=local-demo-client
   APP_SECRET=local-demo-not-a-real-oauth-secret
   VITE_APP_ID=local-demo-client
   VITE_KIMI_AUTH_URL=https://auth.kimi.com
   KIMI_AUTH_URL=https://auth.kimi.com
   KIMI_OPEN_URL=https://open.kimi.com
   OWNER_UNION_ID=

   # Local URLs; adjust if your dev server uses a different port.
   APP_BASE_URL=http://localhost:5173
   FRONTEND_URL=http://localhost:5173

   # SSLCommerz is disabled for live payments in this demo.
   SSLCOMMERZ_STORE_ID=
   SSLCOMMERZ_STORE_PASSWD=
   SSLCOMMERZ_IS_LIVE=false
   ```

   The MySQL username/password above are intentionally public, disposable **demo-only** values and are safe only because this Compose service binds to loopback. Never use them for staging or production. The OAuth values are placeholders, not working credentials. Do not put real provider credentials into this README, source code, issues, or chat.

4. Push the current Drizzle schema to the disposable local database.

   ```bash
   npm run db:push
   ```

   This command changes the database schema. Only run it against this disposable local demo database, never against production.

5. Insert the fictional shops and products. The seed can be re-run without duplicating the included demo records.

   ```bash
   docker compose -f docker-compose.demo.yml exec -T db sh -lc 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < db/demo-seed.sql
   ```

6. Start the application.

   ```bash
   npm run dev
   ```

   Open the local URL shown by Vite (usually `http://localhost:5173`). Marketplace pages backed by the seeded tables can be explored; sign-in and real payment flows require properly configured provider credentials and should not be treated as enabled by the placeholders above.

### Reset the demo database

**Warning:** this deletes all data in the local demo database volume, including any changes you made.

```bash
docker compose -f docker-compose.demo.yml down -v
docker compose -f docker-compose.demo.yml up -d db
npm run db:push
docker compose -f docker-compose.demo.yml exec -T db sh -lc 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < db/demo-seed.sql
```

### Environment variables and secrets reference

`.env.example` is the canonical variable checklist. The application currently reads these server variables:

| Variable | Purpose | Demo guidance |
| --- | --- | --- |
| `DATABASE_URL` | MySQL connection | Use the local-only Compose URL above. |
| `SESSION_SECRET` | Session signing key | Generate locally using `openssl rand -base64 48`; 32+ characters required in production. |
| `APP_ID` | OAuth application/client ID | A placeholder is enough only for non-authenticated local exploration; real OAuth needs a registered client. |
| `APP_SECRET` | OAuth client secret | Never commit or publish a real value. |
| `APP_BASE_URL` | Canonical callback origin | Must match the registered OAuth callback in a real deployment; use localhost only for local work. |
| `KIMI_AUTH_URL` | OAuth server base URL | Must point to the actual provider for sign-in. |
| `KIMI_OPEN_URL` | Provider API base URL | Must point to the actual provider for profile calls. |
| `OWNER_UNION_ID` | Optional owner identity | Leave blank in the demo unless you intentionally configure the correct test identity. |
| `VITE_APP_ID` | Browser OAuth client ID | Public client identifier, not a secret; use the same ID as the OAuth app. |
| `VITE_KIMI_AUTH_URL` | Browser OAuth URL | Must match the provider setup. |
| `FRONTEND_URL` | Frontend redirect origin | Use your local frontend URL for local testing. |
| `SSLCOMMERZ_STORE_ID` | Payment sandbox merchant ID | Leave blank until you have sandbox credentials. |
| `SSLCOMMERZ_STORE_PASSWD` | Payment sandbox secret | Leave blank until you have sandbox credentials; keep it server-side. |
| `SSLCOMMERZ_IS_LIVE` | Live payment toggle | Keep `false` in demos and sandbox tests. |

Some hosting environments or provider SDKs may require additional variables; check their runtime errors and the current source before deploying.

**Never place real secrets in README files, screenshots, commits, frontend `VITE_*` variables, or public GitHub Actions logs.** Store real credentials in your host's secret manager or GitHub Actions Secrets. Rotate any credential that has already been committed publicly. Do not use real cardholder data or enable live payments in the demo environment.

## Available checks

Run these from the repository root:

```bash
npm run check
npm test
npm run lint
npm run build
npm audit --audit-level=low
```

A command listed in `package.json` is not proof that it currently passes. Check local output or GitHub Actions before treating a build as verified.

## Security and data isolation priorities

Before production use, verify that:

- each merchant can access only its tenant-scoped records;
- authorization is checked on the server for every protected operation;
- staff permissions are enforced consistently, not just hidden in the UI;
- checkout totals and payment amounts are calculated and validated on the server;
- payment callbacks are verified and handled idempotently;
- secrets are stored in environment configuration and never committed;
- database migrations and backup/restore procedures are tested before importing live data.

## Production hardening and deployment gates

Do not deploy the application code before applying required database migrations and verifying identity/payment providers.

- **OAuth:** sign-in must begin at `/api/oauth/start`. The server issues a short-lived, HttpOnly state cookie and validates callback state; set `APP_BASE_URL` to the canonical HTTPS origin registered with the identity provider. Sessions expire after seven days and use a dedicated `SESSION_SECRET` (at least 32 characters in production; generate it with `openssl rand -base64 48`). Existing sessions without the issuer/audience claims will need to sign in again after rollout.
- **Order tracking:** new guest orders receive a random one-time tracking code. Only its SHA-256 digest is stored; the plaintext code is returned once at checkout. Existing orders created before the migration have no code and need merchant-assisted lookup.
- **Database migration:** back up the database and apply `db/migrations/20261028_order_tracking_token.sql` before deploying code that references `trackingTokenHash`. Verify the unique index and test order creation/tracking in staging.
- **Tenant authorization:** team-member lists are restricted to managers/owners; billing history is restricted to the shop owner and omits raw gateway responses. Public homepage counts include active tenants only.
- **Payment validation:** successful SSLCommerz processing requires matching transaction ID, validation ID, merchant store ID, BDT currency, and exact amount. Keep gateway credentials in server-side secrets only.
- **API hardening:** responses include baseline browser security headers, API responses are non-cacheable, and tRPC request bodies are capped at 1 MiB.
- **Operational protection:** configure edge rate limiting, TLS, secret rotation, database backups, restore drills, error monitoring, and an incident contact before launch.

## Roadmap

These are priorities, not a declaration that every item is complete:

- [ ] Restore and verify the complete application source tree
- [ ] Run and fix type-check, lint, unit-test, and production-build checks
- [ ] Verify tenant isolation and role-based permissions with automated tests
- [ ] Complete an end-to-end subscription-payment sandbox test
- [ ] Verify merchant storefront customization and CMS workflows
- [ ] Test catalogue, inventory, checkout, and order lifecycle end to end
- [ ] Prepare deployment, monitoring, backups, and incident-response documentation

## Contributing

Make changes in a feature branch and review them before merging. Add tests for security-sensitive or financial changes, and document required migrations and environment variables.

## License

No license is stated here. Check the repository's license file before copying, distributing, or using this project commercially.
