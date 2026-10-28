# Regional cloud deployment and migration runbook

This runbook is the operating contract for `eu.cloud.uncoil.dev` and `us.cloud.uncoil.dev`. The application source is shared; all stateful services and credentials are isolated.

## Deployment inventory

The authoritative non-secret inventory is `config/regional-cloud.json`. Every cloud deployment requires its own Vercel project, Convex production deployment, Better Auth configuration, Tinybird workspace, Redis database, Inngest environment, API-key hash secret, Stripe webhook secret, and provider credentials.

The `externalReadiness` list in that inventory is a launch gate, not an informational backlog. A regional hostname must not receive production traffic while any item is `credentials-required` or `manual-action-required`.

Before a release, run:

```powershell
npm run verify:regions
npm run test:regions
npm run test:sdk:ts
npm run test:sdk:python
npm run build
```

Deploy the same verified commit to EU and US. Do not promote one region if the other region is built from a different commit. Verify `/api/health/region` returns the expected region and hostname before attaching or moving an alias.

## Environment invariants

Set `NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND=cloud`. Set both `NEXT_PUBLIC_UNCOIL_REGION` and `UNCOIL_REGION` to the deployment's region. `NEXT_PUBLIC_SITE_URL` must equal the regional origin. Startup validation intentionally fails a cloud deployment when regional or stateful-service variables are absent or inconsistent.

Better Auth `SITE_URL` and trusted origins must point to the same regional origin. OAuth applications require a callback URL for each region. Stripe requires a separately signed webhook endpoint per region. Do not reuse API-key hash secrets, webhook secrets, Tinybird tokens, Redis URLs, or Inngest signing keys across regions.

`UNCOIL_INGEST_LIMIT_PER_MINUTE` defaults to 6,000 spans per project. The native and OTLP endpoints share an atomic Redis counter, return `429` with `Retry-After` when exhausted, and therefore inherit the regional Redis isolation boundary.

## Account and data migration

There is no automatic region switch. Schedule a migration window and stop writes to the source project before export.

1. Export the source Convex deployment with `npx convex export --deployment <source> --path <archive>.zip`.
2. Export Tinybird trace data for the project and record the final ingestion timestamp.
3. Create the destination account and project, then import only records whose ownership identifiers have been mapped to the destination Better Auth account.
4. Import trace data into the destination Tinybird workspace and verify project IDs, row counts, earliest/latest timestamps, and evaluation links.
5. Create a new destination-region API key. Never copy an API-key hash secret or plaintext key between regions.
6. Change the customer's SDK region and key together, send a canary trace, and verify it appears only in the destination.
7. Keep the source read-only for the agreed rollback window, then apply the customer's retention/deletion request.

Abort the migration if ownership mapping, row counts, timestamps, or canary isolation cannot be proven.

## Regional outage and rollback

If one region fails, keep the other region isolated; never route traffic across regions automatically because that would change the declared data location. Remove the affected region from the selector only during a confirmed onboarding outage, preserve existing account access messaging, and publish the incident on `/status`.

Rollback application code by reassigning the regional alias to the last verified deployment. A code rollback does not roll back Convex schema or data. Restore state only through the provider's tested backup procedure and record recovery point and recovery time evidence.

## Data residency (verified 2026-08-19)

Verify every provider region by resolving its endpoint and checking the IP against the
provider's published ranges (`https://ip-ranges.amazonaws.com/ip-ranges.json`,
`https://www.gstatic.com/ipranges/cloud.json`). Do not trust a region's name.

**A region name containing "europe" does not mean the EU.** GCP `europe-west2` is London (United
Kingdom) and `europe-west6` is Zurich (Switzerland); neither is in the EU. The EU deployment was
originally built on `europe-west2` for both Tinybird and Redis and had to be rebuilt in Ireland.

| Service | Location | How verified |
| --- | --- | --- |
| Convex | `jovial-owl-711`, AWS eu-west-1 (Ireland) | deployment region |
| Tinybird | `uncoil_eu_west1`, `https://api.eu-west-1.aws.tinybird.co` | `52.211.129.79` in AWS `eu-west-1` |
| Redis | Upstash `concrete-buffalo-140061`, primary eu-west-1 | `52.214.68.234` in AWS `eu-west-1` |
| Inngest | AWS **us-east-2 (Ohio, United States)** | `3.20.90.35`, `18.221.3.32` et al. |

Inngest Cloud has no EU region and sits on the primary ingestion path: `inngest.send()` in
`src/app/(frontend)/api/ingest/route.ts` and `.../api/otel/route.ts` carries span `input` and
`output`, so every trace transits the US. Default-on PII redaction (email, phone, card, SSN,
api_key) is applied before the send. This is disclosed on `/security` under "Data residency".
Do not describe the EU region as end-to-end EU-resident. If a customer requires it, the likely
replacement is Upstash QStash — 2 Inngest functions and 5 `inngest.send()` call sites.

The Upstash database is **Global-type**, so a read region can be added in one click with no code
change and no deploy. Re-check that the read-region list is empty or EU-only as part of the
pre-release sequence; a non-EU read region silently breaks residency.

## Operational gotchas

- `TINYBIRD_HOST` must include the `https://` scheme. `src/lib/tinybird.ts` interpolates it
  straight into `fetch()` with no normalisation and falls back to the global
  `https://api.tinybird.co`, so a bare hostname breaks every call and a missing value silently
  targets the wrong region.
- `tb deploy` must run from the repository root, where `.tinyb` lives. From `tinybird/` it fails
  with "This action requires authentication". It also ends with a
  `'charmap' codec can't encode '✓'` error on Windows — that is a console encoding failure
  printing a checkmark, not a deployment failure.
- Tinybird Forward workspaces reject `POST /v0/datasources` and `/v0/pipes` with
  "can only be done via deployments". Schema changes must go through `tb deploy`.
- `.tinyb` contains a live API token and is gitignored. It was tracked until 2026-08-18. Never
  re-add it.
- Vercel environment variables marked *Sensitive* are write-only: `vercel env pull` returns
  `[SENSITIVE]`, so their values cannot be read back by anyone. Audit names with
  `npx vercel env ls production --project <project> --scope uncoil-tech`. `vercel` is not on
  PATH; use `npx vercel`.
- `/cloud` renders only when `NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND=marketing`; `src/proxy.ts`
  redirects it to `www.uncoil.dev` on a cloud deployment. **The region selector ships with the
  marketing project, not the regional projects.** A regional-only deploy will not update it.
- Deploy from a clean detached worktree at the merged commit, never from a dirty working tree,
  so `scratch/` and unrelated local files are never uploaded.

## Provisioned resources and handoff

- Vercel EU: `uncoil-tech/uncoil-cloud-eu`; Next.js preset; production and preview region/Convex settings applied.
- Vercel US: `uncoil-tech/uncoil-cloud-us`; Next.js preset; production and preview region/Convex settings applied.
- Convex EU: `jovial-owl-711` in `eu-west-1`; isolated runtime secrets; `/health` must report `region: eu`.
- Convex US: `flexible-anaconda-752` in `us-east-1`; isolated runtime secrets; `/health` must report `region: us`.
- Domains are attached to their matching Vercel projects. DNS remains at Domeneshop and requires A records to Vercel before certificates can issue.

Git automation was intentionally disconnected from both regional Vercel projects. Vercel classified the first branch deployment in each empty project as production even though the production branch was `main`. Those feature deployments were deleted. Reconnect `Uncoil-dev/Uncoil` only after this change is merged and all regional launch gates pass, then verify the deployed Git SHA is an ancestor of `origin/main` before assigning traffic.

As of 2026-08-19 the EU project has a real production deployment on `main` (commit `091d9da`, deployed manually with `vercel deploy --prod` and a locally written `.vercel/project.json`), so the first-deployment misclassification can no longer occur and Git may safely be reconnected. `eu.cloud.uncoil.dev` is attached and now resolves via CNAME to `5ee7be47305fd6c5.vercel-dns-017.com` rather than the legacy `76.76.21.21` A record. Note that an earlier claim that both regional domains were already attached was wrong — the EU domain was attached only on 2026-08-19, and the US domain remains unattached by design.

Regional deploy-key files are local operator artifacts under the ignored `scratch/uncoil-regional/` directory. They must never be committed. Rotate them if that directory leaves the trusted workstation. Values are also stored as sensitive Vercel environment variables for production and preview.
