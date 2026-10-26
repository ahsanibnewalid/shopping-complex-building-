# Restore the missing BazarHub baseline

The repository's current `main` branch is missing a substantial part of the 96-entry
Kimi Agent source archive. In particular, the archive contains the Vite entry point,
application shell, several tRPC routers/context/middleware files, database relations,
and shared contracts. The SSLCommerz payment work already merged into `main` must be
preserved.

## Safe restore procedure

1. Open a Codespace for this repository on branch `repair/restore-missing-baseline`.
2. Upload `Kimi_Agent_Complete Shopping Complex SaaS.zip` into the Codespace workspace
   (do not commit the archive).
3. From the repository root run:

   ```sh
   node scripts/restore-missing-baseline.mjs "./Kimi_Agent_Complete Shopping Complex SaaS.zip"
   ```

4. Inspect the restored file list and `git diff`. The script only creates paths that
   do not already exist; it does not overwrite existing files, payment code, migrations,
   or configuration.
5. Run the checks below and fix failures before merging:

   ```sh
   npm ci
   npm run check
   npm run lint
   npm test
   npm run build
   ```

6. Check the database migration against a disposable MySQL database, then exercise
   SSLCommerz in sandbox mode. Never use live credentials or production customer data
   for these checks.

## Important

This helper is a safe recovery mechanism, not proof that the application is production
ready. Some archive files may be older than the current main branch. Existing files are
intentionally skipped so that newer changes are not silently replaced. Review all
conflicts manually and verify all five commands above before merging the restored source.
