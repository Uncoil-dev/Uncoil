# EU deployment readiness audit — 2026-09-02

## Outcome

The EU deployment is reachable, but it is not ready to be declared operational: `https://eu.cloud.uncoil.dev/api/health/region` returned HTTP `503` because its Redis probe failed. Convex and Tinybird probes passed, and the endpoint reports Inngest only as configuration health. The EU deployment must not be described as end-to-end EU-resident. Convex, Tinybird, and Redis are documented as Ireland-based, but Inngest Cloud processing is documented as AWS `us-east-2` (Ohio, United States), and span input/output is included in `inngest.send()` events.

This audit is based on source, the committed regional contract/runbook, git history, and safe public HTTP probes. No credentials or provider settings were changed.

## Regional architecture inventory

| Provider / surface | Purpose | Region / location | Evidence | Unresolved risk |
| --- | --- | --- | --- | --- |
| Marketing region selector | Selects a customer cloud | EU is public; US is dormant | `getAvailableRegions()` filters `available`; `/api/region/select` rejects unavailable regions | None in code; verify the marketing deployment matches this commit |
| Vercel | Regional web/API deployments | EU project `uncoil-cloud-eu`; US project defined but unavailable | `config/regional-cloud.json`; `src/instrumentation.ts` startup invariants | Provider deployment/SHA is external evidence |
| Ingest API | Authenticates API key, redacts payload, sends event, updates Convex metadata | Served by selected regional Vercel app | `api/ingest/route.ts` | Raw redacted payload crosses the Inngest boundary |
| OTLP API | Authenticates OTLP JSON and enqueues each non-empty span | Served by selected regional Vercel app | `api/otel/route.ts` | Same Inngest transit risk; `GET` is informational, not a data-flow check |
| Inngest | Queue, retries, async Tinybird/Convex processing | AWS `us-east-2`, US | `config/regional-cloud.json`, `docs/regional-cloud-runbook.md`, `inngest.send()` call sites | Blocks end-to-end EU processing; follow-up migration required if strict residency is required |
| Tinybird | Raw span and evaluation-score storage/querying | AWS `eu-west-1` (Ireland) | Regional contract/runbook; `src/lib/tinybird.ts` uses `TINYBIRD_HOST` directly | Live workspace/deployment evidence must be rechecked at release time |
| Redis / Upstash | Cache and atomic ingest rate limits | Global-type DB with primary `eu-west-1`; read regions must remain empty/EU-only | `src/lib/redis-cache.ts` uses `REDIS_URL`; runbook/config | Public health probe currently fails; provider read-region setting is not code-verifiable |
| Convex | Projects, runs, alerts, comments, auth metadata and rollups | EU deployment `jovial-owl-711`, AWS `eu-west-1` | `src/lib/convex.ts`, health route, regional contract | Health proves reachability/region response, not every data path |
| Stripe | Checkout and regional webhook handling | Shared live Stripe account; EU webhook endpoint documented | `src/lib/stripe.ts`; `/api/stripe/webhook`; regional contract | EU project lacks `STRIPE_SECRET_KEY` and `STRIPE_PRICE_*` per contract, so billing is expected to 503 until owner configures it |
| Better Auth / OAuth | Email auth and Google/GitHub callbacks | EU callback URLs documented; US callbacks not registered | `convex/betterAuth/auth.ts`; regional runbook | Provider registration is external and must be verified without exposing secrets |
| Region health endpoint | Checks Convex, Tinybird, Redis; reports Inngest configuration separately | Each regional deployment | `api/health/region/route.ts` | It intentionally does not prove queue delivery or a completed trace |

## Configuration audit

`config/regional-cloud.json` and `src/instrumentation.ts` agree on the required cloud variables: deployment kind, public/server region, site and Convex URLs, API-key hash secret, Tinybird host/token, Redis URL, and Inngest event key. The startup check requires cloud kind, matching `NEXT_PUBLIC_UNCOIL_REGION`/`UNCOIL_REGION`, and the regional site origin.

The contract requires `TINYBIRD_HOST` to include `https://`; the example does so, and `src/lib/tinybird.ts` interpolates the value without normalization. Redis uses the Node Redis client with the URL supplied by `REDIS_URL`; TLS is therefore compatible with `rediss://` URLs and is explicitly required by the runbook. This audit did not print any values. The local shell had none of the cloud variables, so local presence could not be used as production evidence.

## Safe runtime checks

| Check | Result |
| --- | --- |
| EU region health | HTTP 503; Convex passed, Tinybird passed, Redis failed, Inngest configuration reported true |
| OTLP GET | HTTP 200 informational endpoint |
| Ingest without auth | HTTP 401 `Invalid API key` |
| OTLP without auth | HTTP 401 `Invalid API key` |
| Ingest with synthetic US-shaped key | HTTP 401 `wrong_region`; points to dormant US endpoint |
| OTLP with synthetic US-shaped key | HTTP 401 `wrong_region`; points to dormant US endpoint |
| Marketing `?region=us` | HTTP 307 to `/cloud`; no US selection cookie/redirect issued |
| EU security/status on cloud host | HTTP 307 to marketing host, consistent with proxy rules |
| Regional contract script | Passed with `bun scripts/verify-regional-cloud.mjs` |
| Regional registry tests | Passed with `bun test src/lib/regions.test.ts` (6 tests in the workspace file; Bun also discovered 3 ignored-worktree copies, 24 total passes) |

These checks distinguish configuration from data-flow health: the health route's Inngest result means only that `INNGEST_EVENT_KEY` is present, while no public probe proves event delivery, Tinybird write completion, or Convex rollup completion.

## Residency truth and owner actions

The EU deployment supports EU-region selection and documents Ireland storage for Convex, Tinybird, and the primary Redis location. It is not end-to-end EU-resident because span input/output is sent to Inngest Cloud in the United States before asynchronous writes. Existing redaction is a mitigation, not a residency guarantee.

Owner actions before an EU launch declaration:

1. Investigate and restore the EU Upstash Redis health probe. Verify with `GET https://eu.cloud.uncoil.dev/api/health/region` and require `dependencies.redis.ok=true` and HTTP 200. Separately confirm the Upstash read-region list is empty or EU-only in the provider console/API; do not infer it from `REDIS_URL`.
2. Add the EU Stripe secret and monthly/annual price variables in the EU Vercel project, then verify the billing flow and webhook signature using a non-secret test result. Required names are `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_TEAM_MONTHLY`, and `STRIPE_PRICE_TEAM_ANNUAL`.
3. Decide whether strict end-to-end EU processing is a launch requirement. If yes, specify and implement a provider-supported EU queue/worker replacement; do not enable US processing silently. Verify with a canary trace and provider logs that payloads do not transit the US.
4. Before release, run `npm run verify:regions`, `npm run test:regions`, `npm run test:sdk:ts`, `npm run test:sdk:python`, and `npm run build` from a Node-enabled environment; verify the deployed SHA and repeat the public health/auth checks.
