# Vercel staging workflow

The repository uses `main` for production and `staging` for a persistent Vercel Preview environment.

## One-time Vercel setup

In the Vercel project **tracify**:

1. Set **Production Branch** to `main`.
2. Add a Preview environment for the `staging` branch (or assign a staging domain to that branch).
3. Add the required environment variables to **Preview**. At minimum:

   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_CONVEX_SITE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_JWT_ISSUER_DOMAIN`
   - `TRACIFY_API_KEY_HASH_SECRET`
   - `TINYBIRD_HOST`
   - `TINYBIRD_TOKEN`
   - `INNGEST_EVENT_KEY`

   Use a separate Convex/Tinybird project for staging when data isolation matters. Never commit `.env.prod`, `.env.local`, or Vercel tokens.

## Daily workflow

```bash
git switch staging
git pull --ff-only
git push origin staging
```

Each push updates the staging Preview. Review its Vercel URL or assigned staging domain. When approved, open a PR from `staging` to `main`; merging it creates the production deployment.

Both public Convex endpoints are required during the Next.js build. A missing `NEXT_PUBLIC_CONVEX_URL` makes `ConvexReactClient` fail during prerendering; a missing `NEXT_PUBLIC_CONVEX_SITE_URL` makes the Better Auth server integration fail while Next.js collects route data. Keep both variables scoped to Preview and point them at the isolated development or staging Convex deployment rather than production.

## Production deploys are manual

`vercel.json` sets `git.deploymentEnabled.main` to `false`, so merging to `main` no longer triggers a production deployment on either Vercel project (`tracify`, `tracify-cloud-eu`). Preview deployments for other branches are unchanged. To update production, open the project in Vercel and redeploy the latest `main` commit (or create a production deployment from `main`).

## Preview sample traces

Local previews (`preview <PR>`) read a separate ClickHouse database, `tracify_preview`, never the live `tracify` one. Fill it for the staging test account once:

```powershell
$env:PREVIEW_PROJECT_ID="<id from the dashboard URL /dashboard/<id>>"; node scripts/seed-preview-db.mjs
```

The script creates the database from the live table layout on first run, inserts sample traces straight into ClickHouse (no Convex calls), and refuses any database not ending in `_preview`. The ClickHouse user needs permission to create that database; if it lacks it, create it once with an admin user.
