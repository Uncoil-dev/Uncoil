## 2026-10-16 — Alerts rules (draft PR)

- [pending owner] Run the manual Convex deploy for jovial-owl-711, then set `RESEND_API_KEY` and `EMAIL_FROM` in that Convex deployment's environment so alert emails send.
- [pending owner] Review the alerts page on a Ready preview with a real project; the page needs the deployed backend to show data.

## 2026-10-15 — Authorized tracing roadmap

- Owner review/merge of draft PRs #162 (auth), #163 (CSV), #164 (sorting), #166 (steps), SDK #167 (independent), and saved views #168 after #166. Merge frontend stack in that order, using merge commits.
- Saved-view live verification requires an isolated Convex deployment; no production backend deployment from feature branches.
- SDK registry publication is a separate owner-controlled release after review.

# 2026-09-02 — First-customer execution

## 2026-09-15 — Google Analytics 4

- [pending owner] Verify a production GA4 page view if not yet confirmed; PR #121 is merged (c88a4c6).

## 2026-09-08 — Site linking and mobile hardening

- [pending owner] Run provider-backed signed-in workflows with EU credentials; these cannot be verified from the public/local deterministic Sandbox.

## 2026-09-08 — Captured Uncoil dashboard follow-up

- [pending owner] Supply provider-backed EU test-account credentials to exercise signed-in project creation, persisted mutations, invitation, checkout, and first-trace ingestion end to end. Public Sandbox behavior, regional routing, unauthenticated safety, auth callback state, and the production build are verified without those credentials.

## 2026-09-06 — Account access and onboarding flow

Current verification gap: provider-backed authenticated journeys still require a real EU account/session with a project. The unauthenticated route safety, local EU-backed coverage, production auth endpoints, corrected EU Convex browser binding, current Vercel Production deployment, and deterministic Playground interactions are verified. The regional Convex deployment still needs its missing `sandbox` functions deployed before any future backend-backed Playground persistence is reintroduced. The failed PR Preview build also showed that `CONVEX_SITE_URL` is not currently configured for generic Preview branches; Production is configured and live.

- [pending owner] Run authenticated Explore/Build, onboarding, invitation, recovery, checkout, and first-trace journeys with provider-backed test credentials (`UNCOIL_E2E_AUTH=1`).

- [pending owner] Create the live one-time $1,000 Stripe Payment Link in the intended Stripe account using `docs/first-customer/stripe-payment-link-setup.md`; no Stripe credentials were available to this workspace.
- [pending owner] Verify public contact channels and one current trigger for the 15 Qualified accounts, then personally send outreach. Continue research until 50 accounts meet the full qualification gate; do not count Watch accounts as qualified.
- [pending owner] Execute the 30-day funnel: 100 personalized sends, 5 calls, 2 written offers, 1 payment, and 1 delivered evidence-backed review.

# 2026-08-26 — AI evaluation metrics editorial rebuild

- [pending] Open and merge the PR; deployment requires the merged commit on `main`.

# ⚠ PENDING — needs BN-KR on their own machine (updated 2026-08-16)

These require local credentials, live provider consoles, or a working internet
connection that this environment doesn't reliably have right now. Read this
section first whenever asked "what do I need to do."

## Regional cloud — EU-first launch (decision recorded 2026-08-16)

Free-plan provider environments do not necessarily guarantee physical EU/US data residency. Launch only EU for now and keep the US option hidden/disabled. Do not describe Uncoil as multi-region until every US stateful provider has a verified US location.

### ⚠ BLOCKER (found 2026-08-18): "europe-west2" is London, UK — not the EU

Both stateful EU services are physically in the **United Kingdom**, which left the EU in 2020:

- Tinybird `uncoil_eu` → `api.europe-west2.gcp.tinybird.co` → GCP **europe-west2 = London, UK**.
- Redis `database-MSZ2JEQR` → `start-crisp-coherent-91539.db.redis.io` → `35.246.69.33`, which
  falls in `35.246.0.0/17`, published by Google in `https://www.gstatic.com/ipranges/cloud.json`
  with `scope: europe-west2` — same London region.

"It's only a cache" does not resolve this. Two different things share that Redis:
- Rate-limit counters (`consumeRateLimit`/`peekRateLimit`) — just integers, genuinely low-risk.
- The analytics/span cache — `src/app/(frontend)/api/projects/[projectId]/runs/[runId]/spans/route.ts`
  stores full `SpanRow[]` under `analytics:spans:<projectId>:<runId>` with a **24-hour TTL**, and
  `SpanRow` (`src/lib/tinybird.ts:413-437`) carries `input: string` and `output: string` — the raw
  LLM prompts and completions from the customer's end users. That is the most sensitive data in
  the product, sitting in a UK datacenter for up to a day.

GDPR Art. 4(2) defines processing to include storage; there is no cache exemption, and a 24-hour
TTL is not ephemeral. The UK holds a UK-GDPR regime and an EU adequacy decision, so transfers are lawful today — but
adequacy is renewable and has been challenged, and "EU data residency" is a factual claim that
London hosting does not satisfy. Many EU buyers (public sector, health, finance) exclude UK
hosting outright. Shipping `eu.cloud.uncoil.dev` on this infrastructure while calling it EU
would repeat exactly the overclaim this EU-first decision was made to avoid.

DECISION 2026-08-18: Option A. BN-KR is recreating the Tinybird workspace in `eu-west-1`
(AWS Ireland — genuinely EU). Remaining work for that move:
- [ ] Create the new `eu-west-1` Tinybird workspace.
- [ ] Redeploy all four definitions from `tinybird/` into it — `spans.datasource`,
      `evaluation_scores.datasource`, `endpoints/recent_runs_summary.pipe`,
      `endpoints/spans_by_run.pipe`. The 2026-08-17 europe-west2 deployment does not carry over.
      ⚠ SEQUENCING: as of 2026-08-18 Vercel's `TINYBIRD_HOST`/`TINYBIRD_TOKEN` already point at
      the new workspace, but the schema has NOT been pushed there — so the EU deployment is
      currently wired to an empty workspace. Ingestion (`/v0/events?name=spans`) and every
      dashboard read (`recent_runs_summary`, `spans_by_run`) would fail until this push happens.
      Push the schema BEFORE deploying or verifying anything else.
      (Production + Preview) via `npx vercel env add --force`. Host verified live before setting:
      `GET /v0/sql` returns 403 (valid endpoint, no token supplied) and it resolves to
      `52.211.129.79`, published by AWS as `eu-west-1` (Ireland) — genuinely EU. Note the write
      flipped the variable from Non-sensitive to Sensitive, so its value is no longer visible in
      `vercel env ls` for future audits.
      `src/instrumentation.ts` required set are now present on `uncoil-cloud-eu`.
      server at `https://mcp.tinybird.co?token=${TINYBIRD_MCP_TOKEN}`. The token is referenced by
      env-var expansion, never written to the file — `.mcp.json` is NOT gitignored, so a literal
      token there would be committed to the repo. Set `TINYBIRD_MCP_TOKEN` in the environment or
      in the gitignored `.claude/settings.local.json`.
- [ ] ROTATE the Tinybird MCP token — pasted unmasked into a chat transcript 2026-08-18. Its JWT
      payload decodes to `host: aws-eu-west-1`, which independently corroborates that the new
      Tinybird workspace is in AWS Ireland (EU).
- [ ] ⚠ STILL SUSPECT — `TINYBIRD_TOKEN` has not been touched since the original swapped-value
      entry and may contain the *host* string rather than the token. Re-add it with `--force` and
      confirm. Symptom if wrong: every Tinybird call fails auth with 403.
      `npx vercel env ls production --project uncoil-cloud-eu` on 2026-08-18: the variable is
      marked Non-sensitive so its value is visible, and it begins `eyJ2IjoidjIiLCJjIj…`, which
      base64-decodes to `{"v":"v2","c"…` — a Tinybird JWT. The host and token values were
      swapped when added. Every Tinybird call would throw on an invalid URL. Fix: set
      `TINYBIRD_HOST` to the new eu-west-1 workspace host (`https://…`) and confirm
      `TINYBIRD_TOKEN` holds the token.
      `vercel env ls`. Value hidden, so the `rediss://` scheme could not be verified — if the
      deployment can't reach Redis, check that first.
- [ ] ⚠ STILL MISSING — `INNGEST_EVENT_KEY` is absent from `uncoil-cloud-eu`. It is in the
      `src/instrumentation.ts` required set, so the EU deployment still hard-throws at boot:
      "Regional cloud deployment is missing required environment variables: INNGEST_EVENT_KEY".
      2026-08-18, same verification caveat.
      git** with a live 205-char token committed (`git show HEAD:.tinyb` confirmed it). Untracked
      via `git rm --cached` and added to `.gitignore`. This mattered urgently: the next `tb login`
      would have written the new EU token into that same tracked file and committed it. The
      exposed token is for the London workspace being deleted, which limits the damage.
      `tb deploy` from the repo root (NOT `tinybird/` — `.tinyb` lives at the root, and running
      from the subdirectory fails with "requires authentication"). Deployment #1 to workspace
      `uncoil_eu_west1` created all four objects, verified via the API:
        datasources: `spans` (MergeTree), `evaluation_scores` (MergeTree)
        pipes:       `recent_runs_summary` (endpoint), `spans_by_run` (endpoint)
      Both endpoints smoke-tested: HTTP 200, 0 rows (expected — nothing ingested yet).
      Note: `tb deploy` ends with a `'charmap' codec can't encode '✓'` error on Windows —
      that is a console encoding failure printing a checkmark, NOT a deployment failure.
      are only accepted through `tb deploy` (the deployments flow). Both `POST /v0/datasources`
      and `POST /v0/pipes` return HTTP 403 "can only be done via deployments", so the REST API
      cannot create them. Verified 2026-08-18 with a working token.
      The MCP token (`https://mcp.tinybird.co?token=…`) authenticates for READS — `GET
      /v0/datasources` returns 200 and confirms the workspace is empty (`{"datasources": []}`) —
      but `tb deploy` rejects it with "This action requires authentication. Run 'tb login' first".
      ONLY REMAINING STEP: BN-KR runs `tb login` (interactive browser), then `tb deploy` from
      `C:\Uncoil	inybird`. Nothing else is outstanding; all four datafiles are staged and valid.
      `.tinyb` now points at `https://api.eu-west-1.aws.tinybird.co` so login targets the right host.
- [ ] Superseded note: local `.tinyb` used to read `host: https://api.europe-west2.gcp.tinybird.co`,
      `name: uncoil_eu` — i.e. the CLI is still authenticated against the OLD London workspace.
      Running `tb push`/`tb deploy` right now would deploy the four definitions to London, not to
      the new eu-west-1 workspace. Re-auth (`tb auth`) before pushing anything.
- [ ] Re-verify by IP once created, same method as below.
- [ ] Delete the old europe-west2 workspace so nothing can silently write to London.
      `patient-microsteady-porter-27084.db.redis.io:19790` → `52.214.68.234`, which AWS publishes
      in `https://ip-ranges.amazonaws.com/ip-ranges.json` as region `eu-west-1` (Ireland).
      Independently verified — this one is genuinely EU.
- [ ] ⚠ UNRESOLVED (2026-08-18): Upstash database `concrete-buffalo-140061.upstash.io` may be a
      **Global** (multi-region replicated) database, which would break EU residency outright.
      Evidence: the hostname CNAMEs to `p2-global.upstash.io` and `global-latency.upstash.io`.
      All four IPs it returns here (63.182.22.87, 3.79.250.206, 35.158.17.96, 52.28.247.228)
      are AWS `eu-central-1` (Frankfurt) — but Upstash Global databases use latency-based DNS,
      so a lookup from Norway only ever reveals the *nearest* replica. A lookup from the US would
      return US replicas. DNS from one location CANNOT prove single-region residency.
            add/remove read regions"), but **Primary = Ireland `eu-west-1`**, which is EU. The
            Frankfurt IPs seen via DNS are Upstash's latency-routing/proxy layer in
            `eu-central-1` — also EU. So both the primary and the observed edge are in the EU.
      - [ ] CONFIRM the read-region list is **empty**. Any read region outside the EU replicates
            span `input`/`output` text out of the EU and breaks the residency claim.
      - [ ] ONGOING GUARD: because this is a Global-type database, adding a non-EU read region is
            a one-click, silent residency break with no code change and no deploy. Never add one;
            re-check the read-region list as part of the pre-release sequence in
            `docs/regional-cloud-runbook.md`.
- [ ] `REDIS_URL` format: the Upstash console shows `redis-cli --tls -u redis://...`, where TLS
      comes from the `--tls` flag. `node-redis` takes TLS from the URL scheme instead, so
      `REDIS_URL` must start with **`rediss://`** (two s). Pasting the console's `redis://` value
      verbatim silently disables TLS.
- [ ] Redis hardening still open on the new database:
      - [ ] TLS: NOT AVAILABLE on the Redis Cloud free 30MB Essentials tier — it is gated behind
            a paid plan, so this cannot be toggled on. Decision 2026-08-18: move to Upstash Redis
            instead, which includes TLS by default and has EU regions. Choose the **Redis**
            product (not Ratelimit — `consumeRateLimit`'s Lua script runs fine on plain Redis,
            and Upstash supports EVAL). Use the native `rediss://` connection string with the
            existing `node-redis` client: zero code change, only the `REDIS_URL` value differs.
            Do NOT use the `upstash-redis-start` skill — that provisions temporary 3-day
            unauthenticated scratch databases explicitly not intended for production or PII.
            Optional later: the `@upstash/redis` REST SDK removes connection limits entirely but
            requires rewriting `src/lib/redis-cache.ts`; not needed now.
      - [ ] ACL: still the all-privileges `default` user. Create a scoped user — the app only
            needs GET, SET, INCRBY, EXPIRE, TTL, PING and EVAL on `analytics:*` plus the
            rate-limit keys.
            returns `redis: ok`, confirming the live Upstash database was untouched.
            (it was pasted in plaintext into a chat transcript on 2026-08-18).
            clk2._domainkey all confirmed no longer resolving) — closes the dangling-CNAME
            subdomain-takeover risk left over from the Better Auth migration.
            committed token returns HTTP 404 against `api.europe-west2.gcp.tinybird.co`, and
            `tb workspace ls` earlier returned "workspace not found" — consistent with the
            europe-west2 workspace having been deleted. Suggestive, not conclusive; if the
            workspace is confirmed gone, no rotation is needed for that credential.
      - [ ] STILL OUTSTANDING — rotate the **eu-west-1** workspace token. Rotating the API token
            also invalidates the MCP URL, since `https://mcp.tinybird.co?token=…` embeds that
            same token; one rotation covers both. This workspace is live and holds the deployed
            schema, so this is the exposure that actually matters.
      - [ ] ROTATE the Upstash REST token for `concrete-buffalo-140061` — it was pasted
            unmasked into a chat transcript on 2026-08-18 and must be considered compromised.
            Upstash console → database → rotate/reset token.
      - [ ] Also delete the short-lived Redis Cloud Ireland database `uncoil-eu-west1`
            (`patient-microsteady-porter-27084`), superseded by Upstash.

- [ ] Option A (keeps the "EU" claim): recreate the Tinybird workspace **and** the Redis database
      in a real EU region — `europe-west1` (Belgium), `europe-west3` (Frankfurt), `europe-west4`
      (Netherlands), or `europe-north1` (Finland) — then re-verify by IP as above. Convex EU is
      already `eu-west-1`, which is Ireland and genuinely EU.
- [ ] Option B (keeps the current infrastructure): relabel the region as "UK/Europe" rather than
      "EU" across the selector, docs, `/status`, `config/regional-cloud.json`, and marketing, and
      state the actual hosting location plainly.
- [ ] Re-check Inngest's processing region the same way; it has not been verified either.

### EU launch — required
      US architecture without offering it to customers. DONE 2026-08-18:
      - `src/lib/regions.ts` — added an `available` flag to `UncoilRegion` (eu: true, us: false)
        plus `getAvailableRegions()` / `isRegionAvailable()`. Public surfaces must iterate the
        helper, never `UNCOIL_REGIONS` directly, so a dormant region can't be advertised by
        accident.
      - `src/app/(frontend)/cloud/page.tsx` — selector lists only available regions; the
        hardcoded "02 regions" label is now derived from the count.
      - `src/app/(frontend)/api/region/select/route.ts` — rejects dormant regions server-side, so
        a hand-typed `?region=us` can no longer set the cookie and redirect into the US host.
      - `src/components/status/regional-status-board.tsx` — only probes/lists available regions.
      - `src/lib/regions.test.ts` — two new tests: EU-only is advertised, and the dormant US
        region stays routable so US keys are still detected as wrong-region rather than silently
        treated as EU.
      - Verified: `tsc --noEmit` clean, `npm run test:regions` 6/6, `npm run verify:regions` OK.
      - ⚠ DEPLOY TARGET: `/cloud` only renders when `NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND=marketing`
        — `src/proxy.ts:22` redirects it to `www.uncoil.dev` on a cloud deployment. So the
        region selector lives on the **marketing** project (`uncoil` / www.uncoil.dev), NOT on
        `uncoil-cloud-eu`. This EU-only change must ship to the marketing project or the public
        selector will keep offering the US region regardless of what the EU project runs.
      - NOT visually verified: local `/cloud` 307-redirects to production because `.env.local`
        sets `DEPLOYMENT_KIND=cloud`. Correctness rests on the unit tests, not a rendered page.
- [!] ⚠ REGION CLAIM IS WRONG — see the "europe-west2 is not the EU" blocker below. Tinybird workspace `uncoil_eu` (host `api.europe-west2.gcp.tinybird.co`, GCP europe-west2) was recorded as "confirmed EU-located" and deployed 2026-08-17, but europe-west2 is London, United Kingdom, which is not in the EU: `spans` and `evaluation_scores` datasources plus `recent_runs_summary`/`spans_by_run` endpoint pipes are live (deployment #4). Datasources are schema-only right now — no data has been ingested yet, since nothing in the app currently pushes events to this workspace. Auth for this project's `.tinyb` was broken (blank token) and had to be re-logged-in; CLI browser login kept timing out in this environment, so credentials were copied from a working session instead. Next: wire actual span/eval ingestion (Events API or existing logging hook) to `uncoil_eu`.
- [ ] ⚠⚠ BLOCKER FOUND 2026-08-18 — **INNGEST RUNS IN THE UNITED STATES.** `inn.gs` (event
      ingestion) and `api.inngest.com` both resolve exclusively to AWS `us-east-2` (Ohio):
      `3.20.90.35`, `3.13.225.237`, `18.221.3.32`, `18.227.206.98` — all four confirmed against
      Amazon's published ranges, with no latency-based routing aliases.
      This is worse than the earlier Redis/Tinybird findings because Inngest is the PRIMARY
      INGESTION PATH, not a cache. `src/app/(frontend)/api/ingest/route.ts:206` and
      `src/app/(frontend)/api/otel/route.ts:401` both call `inngest.send()` with the full span
      payload — `SpanIngestedEvent` (`src/lib/inngest.ts:6`) includes `input` and `output`, i.e.
      raw LLM prompts and completions. So 100% of customer traces transit and are queued in Ohio,
      and Inngest retains event payloads for replay/history. `eu.cloud.uncoil.dev` cannot be
      described as EU-resident while this is true.
      Partial mitigation already in code: when a project enables redaction, `redactPayload()` runs
      BEFORE the send, so redacted projects leak less. It is opt-in per project, not the default.
      Options:
      - [ ] A: move to an Inngest EU region if the plan supports data residency (check billing tier).
      - [ ] B: replace Inngest on the EU deployment with an EU-region queue. Upstash QStash is
            already available on this account (skills installed 2026-08-18) and is a direct
            HTTP-queue equivalent with EU regions — but this is a real code change to both ingest
            routes plus `src/lib/inngest-functions.ts`.
      - [ ] C: keep Inngest and drop the EU-residency claim, stating US event processing plainly
            on `/security` and `/status`.
- [ ] Document the final choice; do not launch the EU region claim until one of A/B/C is done.
      `redis/agent-skills` pack: `connectRedis()` caches the connect promise with `??=` and never
      clears it. (a) If `client.connect()` rejects, the rejected promise is cached on `globalThis`
      forever — every later call re-awaits it and throws even after Redis recovers, until the
      serverless instance is recycled. (b) If the connection later drops, `client.isOpen` goes false
      but `??=` re-awaits the old *resolved* promise, which returns instantly without reconnecting,
      so the next command runs against a closed client. Both land on the ingest hot path
      (`consumeRateLimit`) and on `/api/health/region`. Fix: clear the global in `.finally()` so only
      an in-flight connect is shared. Also `createClient({ url })` sets no socket timeouts — add
      `connectTimeout` so a hung connect fails fast instead of burning the function budget.
- [ ] Use `rediss://` (TLS) for the EU `REDIS_URL`, not `redis://` — credentials and cached trace
      data otherwise cross the wire in clear text.
- [ ] Add the existing EU Tinybird, Redis, and Inngest credentials to `uncoil-cloud-eu` without printing or committing them. Env-var checklists live at `scratch/uncoil-regional/env/{eu,us,production}.env`.
    CORRECTION 2026-08-18: an earlier note here claimed Vercel env vars were unreachable from this
    environment. That was wrong. `vercel` is not on PATH, but `npx vercel` works and the CLI is
    still authenticated as `bnkr` (scope `uncoil-tech`) — the same route
    `scratch/uncoil-regional/configure-vercel-env.mjs` used on 2026-08-15. So `vercel env ls`,
    `add`, `rm`, and `pull` are all available; only *typing secret values* is off-limits, not
    Vercel access itself. Use `npx vercel env ls production --project uncoil-cloud-eu --scope
    uncoil-tech` to audit which names are set. EU's `STRIPE_WEBHOOK_SECRET` is already filled in there (created 2026-08-17); everything else needs BN-KR to fill in by hand from the Vercel dashboard / provider consoles. Older redacted `vercel env pull` dumps (`eu-vercel-production.env`, `us-vercel-production.env`, `marketing-production.env`) also exist in `scratch/uncoil-regional/` from 2026-08-15 but only show `[SENSITIVE]` placeholders, not usable values.
  - GOTCHA (found 2026-08-17): `TINYBIRD_HOST` must include the `https://` scheme —
    `https://api.europe-west2.gcp.tinybird.co`, not the bare hostname. `src/lib/tinybird.ts:6`
    interpolates it directly into `fetch()` (lines 13/76/103/379) with no normalization, and its
    fallback is `https://api.tinybird.co`. A bare hostname makes every Tinybird call throw on an
    invalid URL. A first draft of `env/eu.env` had the bare hostname; corrected.
  - The authoritative required-at-boot list is `src/instrumentation.ts:9-20` (10 vars), which
    hard-throws when `NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND=cloud` and any are blank. Note the
    Tinybird fallback means a *missing* `TINYBIRD_HOST` on a non-cloud deployment would silently
    hit the global `api.tinybird.co` host instead of the EU workspace.
  - `INNGEST_SIGNING_KEY` is not read anywhere in `src/` or `convex/` — only `INNGEST_EVENT_KEY`.
      `091d9da`, now the tip of `origin/main`. Deployed that exact commit to BOTH projects from a
      clean detached worktree (never from the dirty main tree, so no `scratch/` upload):
        `uncoil-cloud-eu`  -> uncoil-cloud-d4pqdn0fh, Ready, production
        `uncoil` (marketing) -> uncoil-1zmm63ov5, Ready, production, serving www.uncoil.dev
      Git automation remains disconnected on the regional project; deploys were done via
      `vercel deploy --prod` with a locally written `.vercel/project.json`. Reconnecting Git is
      still optional/outstanding.
      HTTP 200 `{"ok":true,"region":"eu"}` with every dependency healthy:
      convex ok (592ms), tinybird ok (334ms), redis ok (404ms), inngest ok (configuration).
      This finally proves the two write-only Vercel values are correct: `TINYBIRD_TOKEN`
      authenticated against the new eu-west-1 workspace, and `REDIS_URL` connected over
      `rediss://`. The earlier suspicion that `TINYBIRD_TOKEN` held the host string was WRONG —
      BN-KR was right that it was correct.
      count label correctly singular "region"), and `/api/region/select?region=us` returns
      307 back to `/cloud` instead of setting the cookie. `/security` shows the new
      "Data residency" family stating EU storage and US event processing.
- [ ] Verify EU DNS/TLS, authentication, onboarding, API-key creation, native/OTLP ingestion, Tinybird storage, Redis quotas, Inngest processing, Stripe billing, dashboard reads, and `/api/health/region`.

### US launch — deferred, must remain unavailable
- [ ] Keep `us.cloud.uncoil.dev` without customer traffic and keep US out of the region selector.
- [ ] Before enabling US, obtain a physically US Tinybird workspace, Redis database, and event-processing environment with documented residency.
- [ ] Configure unique US credentials, OAuth callbacks, Stripe webhook signing secret, backups, retention, monitoring, and end-to-end isolation tests.
- [ ] Enable US only after proving an EU trace never appears in US and a US trace never appears in EU.

## Resilience Testing dashboard feature — merged (PR #16)
      (see "Local dev environment is broken" below) — replaced the hand-patched
      `convex/_generated/api.d.ts` `resilience` module entry with a real generated file. This
      also surfaced and fixed an invalid-identifier bug in the `failureMix` validator
      (`"429"`/`"500"` object keys renamed to `rate_limited`/`server_error`).
- [ ] Manually click through `/dashboard/<projectId>/resilience`, run a test, confirm results render.

## Light theme re-skin (2026-08-16) — dashboard now matches the marketing site
The dashboard was converted from the dark palette to the marketing site's editorial light
theme (`#eceae3` cream base, white cards, black borders, `#f4d44d` acid-yellow accent).
Design tokens in `globals.css` now drive every shadcn primitive; ~1,500 hardcoded utility
classes were rewritten across dashboard, onboarding, auth, and ui components. Code/payload
panels stay deliberately dark (`#050505` + `#f4d44d`), matching the docs/marketing convention.
Verified: `tsc --noEmit`, `eslint` (no new problems), `npm run test:content` (16/16),
`npm run build`, plus an automated WCAG-AA contrast audit driven through the browser —
`/`, `/pricing`, `/docs`, `/docs/quickstart`, `/integrations`, `/blog` all report **0 failures**
(down from 23, 21, 16, 21 respectively).
- [ ] Click through the authenticated dashboard visually (Overview, Runs, Trace Viewer,
      Costs charts, Evaluation, Resilience). I could not log in locally, so dashboard
      rendering is verified statically + by build only, not by eye. Charts (recharts)
      and the trace waterfall are the highest-risk surfaces to eyeball.
- [ ] Pre-existing, out of scope, worth a separate fix: the branded 404 in
      `src/app/(frontend)/not-found.tsx` is never shown for unmatched URLs — Next serves its
      built-in 404 because there is no `src/app/not-found.tsx`. Adding one naively would
      render it without the root layout (no `globals.css`), so it needs a deliberate fix.

## Local dev environment is broken — root cause of the two Convex codegen gaps above
Diagnosed 2026-08-16 while trying to preview the dashboard locally:
      quoted into the value itself (`"dev:diligent-dragon-604 # team: kristoffer-bon-6fab2, project: uncoil"`),
      so `npx convex codegen` tried to parse the whole string as one deployment name. Trimmed
      to `"dev:diligent-dragon-604"`.
      the `/cloud` redirect for local dashboard testing.
      `resilience.ts`'s `failureMixValidator`/schema used object keys `"429"` and `"500"`, which
      Convex rejects (`Invalid first character '4' in 429: Identifiers must start with an
      alphabetic character or underscore`). Renamed the `FailureMode` variants and every
      `failureMix`/schema/frontend reference from `"429"`/`"500"` to `rate_limited`/`server_error`
      across `convex/resilience.ts`, `convex/schema.ts`, and
      `src/components/dashboard/resilience-testing-dashboard.tsx`. `npx convex codegen` now
      completes cleanly (Downloading deployment state → Uploading functions → Generating
      TypeScript bindings → Running TypeScript, no errors) — no more hand-patched
      `convex/_generated/api.d.ts`/`dataModel.d.ts`.
- [ ] Do the manual dashboard click-through / resilience-run test noted elsewhere in this file
      now that localhost auth/dashboard routing and real codegen both work.

---

# Sitewide link audit — 2026-08-12

4. [pending] Re-run the production build after the currently active Next.js build releases `.next/lock`.

# uncoil Execution Task List

## Better Auth Migration (2026-08-10)
- [ ] Deploy the complete dirty worktree to production only after reviewing unrelated changes
- [ ] Set the Better Auth dashboard server URL to `https://www.uncoil.dev` with path `/api/auth`
- [ ] Add the Google OAuth callback `https://www.uncoil.dev/api/auth/callback/google`

## Dashboard Excellence Program
- [ ] Add environment selector once environment becomes a project-level source of truth
- [ ] Make Trace Viewer the flagship debugging workflow
- [ ] Unify Search, Sessions, Costs, Evaluation, and collaboration workflows

### 2. Marketing & Distribution
- [ ] Update Landing Page with real dashboard screenshots
- [ ] Connect Pricing page to real Stripe checkout links when Stripe is ready
- [ ] Publish SDKs to PyPI and npm
  - [ ] Publish `uncoil` with npm 2FA OTP or granular publish token
  - [ ] Publish Python `uncoil` package to PyPI with a PyPI API token
- [ ] Smoke test report page states: no data, normal runs, failed runs, and analytics unavailable
- [ ] Run `npm run smoke:beta` with `UNCOIL_SMOKE_API_KEY` and `UNCOIL_SMOKE_PROJECT_ID`

---

## Completed Tasks

### Evaluation Engine Integration (2026-08-06)
- [ ] Production rollout validation: configure `EVALUATION_INTERNAL_SECRET`, deploy Tinybird datasource, and run beta smoke tests with production credentials.
### Dashboard Excellence: Visual QA and Trace Context Links [IN PROGRESS]
- [ ] Repeat desktop/mobile visual QA with an authenticated project session.
### Dashboard Excellence: Repository Lint Audit [IN PROGRESS]
- [ ] Resolve the broader repository lint debt outside the dashboard scope.
### Dashboard Excellence: Critical Route Validation (COMPLETED)
- [ ] Complete authenticated visual QA once a usable Clerk session is available.
### Marketing Surface Refresh [PLANNED]
- [ ] Upgrade the blog to an editorial resource hub backed by production-ready publishing and subscription behavior.
- [ ] Expand the homepage FAQ into an accessible, searchable answer set connected to docs and contact.

# 2026-08-10 — Reuse social OAuth credentials

- [ ] Add GitHub credentials after a GitHub OAuth App client ID and secret are available.

# 2026-08-11 — Stripe subscription billing

- [ ] Roll the exposed live secret and add a replacement restricted key to Vercel to enable checkout.

# 2026-08-12 — Initialize Payload on Neon

- [ ] Create the first Payload administrator account at `/cms`.
- [ ] Deploy the integrated application after reviewing concurrent worktree changes.

# 2026-08-12 — Unified production release

- [ ] Commit the unified release, fast-forward `main`, push, and verify the Git-backed production deployment.
# Future 19 public-site migration — 2026-08-11

## Direct pricing checkout (2026-08-12)

- [ ] Confirm production Stripe server credential and production deployment.

# Payload-to-Markdoc migration — 2026-08-13

- [ ] Resolve the repository's 19 unrelated pre-existing full-lint errors in a separate cleanup task.

# Page-specific site redesign — 2026-08-14

- [ ] Commit, push, open the default draft PR, and verify the preview deployment.

# SEO release guardrails — 2026-08-14

- [ ] Land SEO remediation commits `3474f98` and `191cbeb` through a follow-up pull request before claiming the audit fixes are live.

## SAML login
- [ ] Register each customer IdP provider with issuer, domain, entry point, certificate, and SAML mapping in the target Convex deployment.

# EU/US regional cloud — 2026-08-15

- [ ] ⚠ STALE CLAIM, corrected 2026-08-19 — "Attach `eu.cloud.uncoil.dev` and
      `us.cloud.uncoil.dev` to their matching Vercel projects" was marked done, but the Vercel
      API reports `domains: []` for `uncoil-cloud-eu` (vs 7 domains on the main `uncoil`
      project, so the field is reliable). The domain is NOT attached. Evidence:
      `eu.cloud.uncoil.dev` resolves correctly to `76.76.21.21` (Vercel) but returns HTTP 404,
      i.e. Vercel receives the request and has no project bound to that hostname.
      Also `latestDeployment: null` — the EU project has never deployed anything, which is
      expected: Git automation is intentionally disconnected per
      `docs/regional-cloud-runbook.md:59`, to be reconnected only after the regional PR merges.
- [ ] Add the two DNS A records at Domeneshop and verify Vercel TLS issuance. EU record confirmed done 2026-08-17 (see EU-first launch checklist above); US record remains deferred per the EU-only launch decision.
- [ ] Create and deploy independent Tinybird workspaces for EU and US; add unique hosts/tokens to Vercel.
- [ ] Create independent regional Redis databases and Inngest environments; add unique credentials to Vercel.
- [ ] Create regional Stripe webhooks and register Google/GitHub callback URLs.
- [ ] Reconnect Git and deploy the exact merged commit to both regional projects after all provider and DNS gates pass.

# Graph-derived feature opportunities — 2026-08-16

Sourced from a graphify knowledge-graph audit (weakly-connected nodes, thin communities, docs-vs-implementation gaps).

  - [ ] `teams-bot/` (the separate BotFrameworkAdapter app) remains unwired into the alert pipeline — the webhook-based integration above covers the common case without standing up bot infrastructure; revisit if a full conversational bot is wanted.

Follow-ups still open:
- [ ] Run `npx convex codegen` once a valid `CONVEX_DEPLOYMENT`/`CONVEX_URL` is available locally (codegen failed in this environment with `InvalidDeploymentName`) to refresh `convex/_generated/dataModel.d.ts` for the new `teamsWebhookUrl` schema field. `tsc --noEmit` and `eslint` both pass without it since the field is additive and optional.
- [ ] Update AGENTS.md's stale "Useful Pages This Project is Missing" and product-page-placeholder notes now that both are confirmed resolved.

# PR #19 light-theme rebase recovery — 2026-08-20

- [ ] Complete a follow-up authenticated visual sweep of Overview charts, Trace Viewer waterfall, Costs charts, Evaluation, and Resilience; the in-app browser runtime could not initialize in this session, so merge safety relied on the earlier authenticated audit plus local and preview build gates.

# LLM tracing article refinement — 2026-08-25

4. [blocked] Complete the production build/rendered HTML check after supplying the required non-secret `CONVEX_SITE_URL` environment value in the isolated worktree.

# LLM observability metrics refinement — 2026-08-25

5. [pending] Create the focused PR, verify hosted checks and rendered preview, then merge only after all required checks pass.

# AI agent regression testing guide refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# Production debugging guide refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# RAG evaluation guide refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# AI agent testing guide refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# AI agent observability guide refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# AI agent reliability guide refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# AI agent evaluation guide refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# Production-ready AI agents article refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# AI agent architecture article refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# LLM latency article refinement — 2026-08-25

4. [pending] Open the focused PR, verify rendered preview HTML and hosted checks, then merge only after all required checks pass.

# AI evaluation metrics editorial and UX rebuild — 2026-08-26

5. [pending] After localhost approval, force-add the ignored PNGs, create the focused commit and PR, and merge only after hosted checks pass; report the unrelated dashboard build type error separately.

# Reusable Uncoil blog-quality skill — 2026-08-26

5. [pending] Force-add the locally ignored skill files and article PNGs when preparing the already-planned focused PR.

# 2026-09-02 — Trust-first lifecycle implementation

- [ ] Run Convex codegen and focused runtime/build verification after authenticating the Convex CLI.
# EU deployment readiness audit — 2026-09-02

4. [blocked] Provider-side Redis health, EU Stripe billing variables, and any EU queue replacement require owner access and must not be changed in this task.
# 2026-09-02 — Activation path follow-up

- [pending] Run focused contract, lint, typecheck, and browser verification.
## Consent-gated analytics

- Completed the consent/PostHog hardening slice: default-deny, version-safe storage, typed events, immediate opt-out/opt-in, identity gating, and accessible mobile-safe controls.
- Added focused consent utility tests in `src/lib/consent.test.ts`.
- Verification pending in this shell because Node tooling is unavailable on PATH.
# Lead workflow hardening — 2026-09-02

- [ ] Run codegen, lint, typecheck, build, and diff checks in a Node-enabled environment
# Lead workflow completion audit

- [ ] Run Node-backed lint, typecheck, tests, Convex codegen, and build when the bundled runtime is available.

# 2026-09-03 — SEO/AEO blog ideation

## 2026-09-03 email sender configuration
- Set transactional email defaults to `Kristoffer from Uncoil <kb@uncoil.dev>` and `kb@uncoil.dev` reply-to.
- Added the required Resend/Vercel variable names to `.env.local.example`; API key must be supplied by the owner.
# 2026-09-03 — Langfuse parity and release operating model

- [pending] Implement the release foundation and first v0.3.0 release candidate after owner approval.
# 2026-09-03 — Release log and Microsoft 365 discovery

- [pending owner] Supply SharePoint site URL and Microsoft 365 connector/authentication for direct upload or synchronization.

# ERPNext integration — 2026-09-03

4. [pending owner] Supply an ERPNext sandbox URL and dedicated API credentials.
5. [pending] Implement connector, settings UI, event delivery, and security tests.

3. [pending] Run documentation/content validation and review the rendered route.

# Private Plane workspace — 2026-09-04

5. [pending] Provision a dedicated VPS and complete the pinned Plane Docker Compose deployment.
6. [pending] After Cloudflare activation, create the Tunnel, Access/MFA policy, and `plane.uncoil.dev` route.
# 2026-09-04 — Explore / Build playground and site assistant

- [pending owner] Run authenticated Convex codegen/deployment and configure the internal assistant Uncoil credentials in the target deployment.
- [pending] Add browser E2E coverage for the new paths.
- [pending] Submit and review the prepared draft PR for `codex/assistant-spend-guardrails` before merging and deploying the playground/assistant to production.
- [pending owner] Add OpenAI billing details/credits, then configure the provider-side organization/project budget limit; application-side caps are already configured.

# Langfuse clone surface — 2026-09-06

Latest parity pass: visible captured-workspace branding and accent cleanup completed on 2026-09-08. The static reference is now available at `https://uncoil-dashboard-reference.vercel.app/pages/023.html`; implementation viewport comparison remains pending until the local app server is available.

# Langfuse empty dashboard parity — 2026-09-06

7. [pending] Complete the authenticated production-route comparison after the local browser session has a usable project identity.

# 2026-09-05 — EU cloud TLS regression

- [pending] Resolve Vercel custom-domain TLS renegotiation or migrate to a one-level hostname covered by the free certificate.
# Uncoil dashboard feature parity — 2026-09-06

Current verification gap: completing a valid provider-backed sign-in still requires a real EU account/session. Callback race handling, return-path preservation, unauthenticated route safety, local EU-backed coverage, and production auth redirect checks are complete.

3. [pending] Wire preview data to authenticated Convex-backed data and complete parity across the remaining dashboard modules.
4. [pending] Finish route-by-route parity for dashboards, users, scores, evaluators, human annotation, and settings using authenticated project data.
5. [in progress] Validate every captured dashboard route at the same viewport; Users and the authenticated Operations route now aggregate/query Convex project data.
6. [pending] Perform the route-by-route visual comparison and close remaining interaction/layout gaps.
7. [in progress] Match dashboard editor controls and remaining captured interaction details before the final route audit.
30. [x] Place the regional cloud selector before the dashboard time-range/environment/filter selectors.
31. [x] Add dedicated Batch Actions settings route and enable Notifications in project settings.
32. [x] Add project-scoped audit logs with settings/API-key events and a dedicated settings page.
33. [x] Add organization settings page with workspace identity, projects, and member management.
34. [x] Add authenticated project Integrations settings surface with Slack/Teams configuration and test actions.
35. [x] Persist dashboard names and implement working Clone behavior in the dashboard editor.
36. [x] Point authenticated sidebar Integrations navigation to project settings.
37. [x] Add search and environment filters to the live Sessions page.
38. [x] Add live user detail page and link user identities from the Users table.
39. [x] Add live user detail route and links from the Users table.
40. [x] Make the dashboard environment selector recalculate live project summary metrics.
41. [x] Make dashboard time-range selection filter live summary metrics.
42. [x] Make dashboard trace, session, end-user, and release filters affect live project summary metrics.
43. [x] Make dashboard environment options dynamic from live project runs.
44. [x] Make Costs summary fallback honor selected range and environment.
45. [x] Make dashboard model selector affect live summary metrics.
46. [x] Make dashboard model options dynamic from live project telemetry.
47. [x] Wire Model Usage and User Consumption tabs to distinct live metrics.
48. [x] Make model selection consistent across dashboard headline, breakdown, and latency panels.
49. [x] Make dashboard usage-by-type and cost-by-type metrics include tool telemetry.
50. [x] Add real p50/p75/p90/p95/p99 model latency values to dashboard analytics.
51. [x] Wire Home Assistant button and Ctrl+I to the real command menu.
52. [x] Wire Home sidebar toggle to the real dashboard collapse state.
53. [x] Clean the stale sidebar hook dependency and verify shell lint.
54. [x] Wire topbar Filters button to the live Home filter popover.
55. [x] Separate widget layouts per dashboard name and verify dashboard editor lint.
56. [x] Add rename/delete actions for custom dashboards and protect the default Uncoil Home dashboard.
57. [x] Make local and EU Cloud dashboard previews render with the Uncoil sidebar and dashboard canvas.
58. Continue visual parity review of linked dashboard surfaces against their captured references.
59. Compare linked-surface content and controls against the captured screenshots and wire the highest-value interactions.
60. Verify the upgraded linked-surface controls through the authenticated-style preview and refine visual spacing against the capture.
61. Continue behavior parity audit for dashboard editor actions and linked-surface create flows.
62. Exercise the editor and linked create-flow state changes in-browser at the reference viewport.
63. Complete the remaining capture-path and feature audit across both regional runtimes.
64. Perform final visual comparison of the Home dashboard against the captured reference at the same viewport.
65. Continue feature-depth parity for non-Home captured surfaces with real list/detail interactions.
66. Extend linked forms with persistence-backed project data where the corresponding Uncoil API exists.
67. Replace local draft markers with Convex mutations for surfaces that have backend schemas.
68. Wire prompt and evaluation create forms to their existing typed Convex mutations, then design schemas for the remaining linked surfaces.
69. Verify prompt and evaluation linked routes with authenticated project data and preserve the generic surfaces for schema-less features.
70. Add explicit Convex-backed schemas for the remaining high-value captured surfaces, starting with alerts and automations.
71. Verify the alert creation route against an authenticated project and then design the automation contract.
72. Verify Automations in both regional runtimes and continue the saved-dashboard/widget backend contract.
73. Switch authenticated dashboard editor reads/writes from compatibility local storage to dashboardConfigs/dashboardWidgets.
74. Add persisted rename, delete, reset, and reorder mutations for dashboard editor parity.
75. Verify authenticated editor actions end-to-end against a real project session.
76. Verify the production build artifact and regional runtime URLs after the final editor mutations.
77. Preserve final handoff links and document the remaining backend expansion points.
78. [x] Replace the dashboard presentation layer with the captured reference shell while preserving existing functionality.

79. [in progress] Migrate every dashboard route to the shared reference shell and canonical captured surface mapping.
80. [in progress] Complete live/Sandbox adapter actions and run the six-viewport zero-pixel route matrix; the paired screenshot harness now includes all 14 primary Sandbox surfaces.
81. [in progress] Continue replacing legacy project route components with live captured-workspace adapters.
82. [in progress] Migrate remaining search, comparison, administration, settings, and detail routes to canonical captured surfaces.
84. [in progress] Continue migrating project settings, administration, and create/edit routes to captured surfaces.
85. [in progress] Remove remaining dashboard-visible Uncoil branding and yellow accents from legacy fallbacks and migrated shared surfaces.
86. [in progress] Implement captured control/detail density and compare local/reference screenshots for all 14 primary surfaces at all six required viewport sizes.
87. [in progress] Continue evidence-driven surface corrections: latest verified work aligns Tracing toolbar controls, removes the unreachable top filter popover, corrects the shared default environment label, neutralizes the captured dashboard marker, and refines mobile Sessions toolbar/surface offsets. Full six-viewport capture remains green; raw visual parity is still incomplete.
88. [in progress] Follow-up correction: the Tracing Filters control is restored as a visible URL-backed menu and verified in the current six-viewport artifact; residual pixel-level parity work and external Vercel preview remain open.
88. [in progress] Match the responsive Sessions filter-rail breakpoint: narrow tablet uses the reference icon-only rail, while desktop/tablet landscape and mobile retain their captured widths and behaviors.
91. [in progress] Finish the Sessions mobile edge/toolbar alignment and re-run the complete six-viewport matrix after each responsive adjustment.
93. [in progress] Align Users Sandbox identifiers, localized event timestamps, fixed column widths, and mobile overflow with the populated page 027 reference while preserving live data behavior.
94. [in progress] Correct Tracing table column geometry after the leading selection column; verify Type icon, Start Time, Input, Output, and horizontal overflow across all six viewports.
95. [in progress] Keep the accepted Tracing selector/icon correction and reject the measured vertical-spacing experiment; continue shell and content-density parity from the 28.40%/24.54% baseline.
