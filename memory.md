## 2026-10-26 Fewer Convex calls on ingest — draft PR (branch `claude/project-thread-i9vpqs`)
- `src/lib/ingest-cache.ts` (in-memory, per server process): valid API-key lookups cached 30s on `/api/ingest` and `/api/otel` (deleted key, plan or redaction changes take up to 30s; unknown keys never cached). `processSpan` skips the Convex online-evaluation call for 60s once Convex says the project has no online evaluators (`/evaluation/online` now returns `noEvaluators: true`; needs a Convex deploy, until then nothing is skipped). New evaluator can take up to a minute to start. 5/15-min alert/budget crons not merged. Tests in `test:tools`.
## 2026-10-26 Terminal login `npx tracify-sdk login` — draft PR (branch `claude/project-thread-7wijgh`)
- Browser sign-in for the SDK (device-link flow). CLI makes an RSA key pair, `POST /api/cli/login/start` (IP-limited 10 per 10 min) returns a device code, a short code (`BCDF-GHJK`) and `/cli/login?code=` address; the signed-in person confirms on that page (pick a project or create one; replacing a key already in use needs a tick), Convex `deviceLogins.approve` makes/rotates the key and stores it encrypted to the CLI's public key, `POST /api/cli/login/poll` hands it over once and erases it. Plaintext key is never stored. Requests expire after 10 minutes, cron `clean device logins` removes old rows, max 500 open requests.
- CLI writes `TRACIFY_API_KEY`, `TRACIFY_PROJECT_ID` (and `TRACIFY_REGION` for us) to `.env.local` (mode 600), adds it to `.gitignore` in git repos. `doctor` reads `.env.local`, calls new `GET /api/sdk/whoami` and prints `Traces will land in: <project>`; fails if `TRACIFY_PROJECT_ID` is another project. Shared helpers `insertProjectWithKey` / `rotateProjectKey` in `convex/projects.ts` now back `createProject`, `rotateApiKey` and the login (any per-account project limit must go in `insertProjectWithKey`). Convex deploy needed (new table + cron + functions); SDK release needs a version bump and "Publish SDKs".
- npm package `tracify` belongs to a stranger; ours is `tracify-sdk`. Tests: `convex/deviceLogins.test.ts` (`vitest run`, needs `pnpm install`), `packages/ts-sdk/__tests__/login.test.ts`. Not run against a real browser/deployment.
## 2026-10-23 Data retention by plan — draft PR (branch `claude/project-thread-czr8ti`)
- Retention now follows the plan: Free 7 days, Pro 30, Team 90, Enterprise/unknown no plan limit (`src/lib/retention.ts`, checked against the pricing page by `retention.test.ts` in `test:tools`). A project's own Retention setting can only be shorter; `projects.updateProject` rejects longer than the plan.
- Daily Inngest cron `daily-retention` (03:17 UTC, `src/lib/inngest-functions.ts`) runs `runRetention` (`src/lib/retention-job.ts`): one ClickHouse `ALTER TABLE ... DELETE` per retention length for `spans` and `evaluation_scores` (`purgeExpiredAnalytics`), then the Convex summaries via `retention.purgeProjectData`. Skips when `TRACIFY_RETENTION_SECRET` is unset (must be set in both the app env and Convex env). `POST /api/retention` runs the same job by hand. Convex deploy needed (`listProjectsForRetention` now paginates and returns planTier). Not run against the real ClickHouse; tables' 365-day TTL stays as a backstop. Inngest must re-sync to pick up the new function.
## 2026-10-23 Trace opens on the failing step — draft PR (branch `claude/project-thread-93ofte`)
- Opening a trace that has a failed step now selects the earliest failed step (not the first step) and scrolls it into view once. A red "Failed" bar under the trace header shows the step name, error type and message, plus "first of N" when there are several and a "Show failing step" button. Code: `src/components/dashboard/tracing/trace-panel.tsx` (`earliestFailedId`). A `?step=` link still wins. Checked with a scratch page and mocked data only (desktop + phone), not the signed-in dashboard.
- Same PR: after sign-in, sign-up and onboarding (project picker, onboarding entry, skip/leave links, success page) people land on `/dashboard/<id>/tracing` instead of the project overview.
## 2026-10-23 Plan caps and usage meter — draft PR (branch `claude/project-thread-7fb92q`)
- Pro and Team now stop taking new data at their plan plus a 10% buffer (550k / 2.2m spans per UTC month; Free still stops at 25k). Same 429 `plan_limit_reached` path on `/api/ingest` and `/api/otel`; Enterprise and unknown tiers never blocked. Rules in `src/lib/plan-limits.ts` (`enforcedSpanLimit`, `usageLevel`, `PAID_GRACE`), tests in `test:tools`. Redis counter starts fresh when this ships, so paid projects are undercounted for the rest of that month (lenient).
- Also: Usage tab in Account settings (`account/usage-tab.tsx`, one bar per project) and a usage bar in the user-icon dropdown (`usage-bar.tsx`, `sidebar-account-menu.tsx`).
- New `UsageMeter` (`src/components/dashboard/usage-meter.tsx`) at the top of the Billing page: bar with 80% and included ticks, hatched buffer zone, status chip, reset date, upgrade button. `UpgradeBanner` uses the same levels. No Convex change. Screenshots: shared files `plan-caps/usage-meter.png` (scratch page, not signed in).

## 2026-10-21 Thumbs up/down on runs — draft PR (branch `claude/project-thread-1cr2yp`)
- Tracing list has a new "Feedback" column (on by default, hidden on the demo project): two small thumb buttons per run. One tap saves a yes/no score named `feedback` (human, boolean) on the trace; tapping the same thumb again removes it (undo); the other thumb switches it. Convex `evaluation.myFeedback` (the signed-in person's thumbs for the page's runs) and `evaluation.setFeedback` (value true/false/null), needs a manual Convex deploy. UI in `src/components/dashboard/tracing/feedback.tsx`. Saved column choices from before do not show the column until it is switched on in Columns. Checked with a scratch page, not the signed-in dashboard.

## 2026-10-20 Ask AI can use an alternate provider — draft PR
- `completeWithFallback` (`src/lib/llm-chain.ts`) tries an OpenAI-compatible alternate provider first when `ASK_AI_ALT_API_KEY` is set (address `ASK_AI_ALT_BASE_URL`, model `ASK_AI_ALT_MODEL`), then Gemini. OpenAI is skipped when the alternate key is set, because it can cost money. A model is sent only if it is listed in `ASK_AI_ALT_MODELS_ALLOWED`. Ask AI only. Tests in `llm-chain.test.ts`.

# Project Memory

## 2026-10-19 Scores and Evaluators rebuilt — same draft PR #237
- Scores (`src/components/dashboard/scores/`): per-name summary cards (mean/range, true rate, top categories, 14-day trend), filters (source, type, range, search, name), sortable table, side panel (reason, trace link, other scores on the trace), add-by-hand form, CSV. Uses the newest 1,000 scores (`listScores` got an optional `limit`, max 1000); `createScore` now validates value against type and lengths. Pure helpers in `src/lib/score-utils.ts`.
- Evaluators (`src/components/dashboard/evaluators/`): list with pass rate from the last 50 runs, on/off switch, side panel (config, try-a-rule box, recent runs), create form for code rules (live check) and AI judges (templates, sample rate, run on live traces). New Convex queries `evaluators.overview` / `evaluators.recentResults`; creation goes through `evaluationEngine.createEvaluator`. Code rules now live in `src/lib/evaluator-rules.ts` (shared with `/api/evaluators/run`, same behaviour; invalid regex/schema give plain errors). Editing: `evaluators.update` keeps the kind, changes name/rule/settings and writes a new evaluatorVersion each save (runs use the newest version).
- Tests: `convex/evaluation.test.ts` (3), `evaluator-rules` and `score-utils` tests in `test:tools`. Convex deploy needed for the new queries. Checked with mocked data only.

## 2026-10-19 Prompts and Playground rebuilt — same draft PR #237
- Prompts page: `src/components/dashboard/prompts/` (list, side panel with Versions / Compare line diff / Usage / Test, editor with variable chips, commit note, extra labels). URL state `?prompt=&tab=&q=`. Live through Convex queries.
- Convex (`convex/prompts.ts`, needs a manual backend deploy): labels are exclusive pointers per prompt (`moveLabels`), "latest" is automatic, production is never handed out by hand (a version that already holds it may keep or drop it), `commitMessage` on versions, `versionUsage` query, input limits, `create` accepts starting labels. Tests: `convex/prompts.test.ts` (12). convex-test 0.0.56 does not load with the installed convex 1.38 (all convex tests fail the same way, also leads); they pass with `npm i --no-save convex-test@0.0.50`. package.json untouched.
- Playground: `src/components/dashboard/prompts/playground-workspace.tsx`, `?prompt=<name>&version=<n>` prefill. `/api/playground` now: GET reports which providers have keys, POST runs up to 3 models (OpenAI, or Anthropic for names starting "claude" when `ANTHROPIC_API_KEY` is set), temperature, token usage, timeouts, missing-variable check. Needs `OPENAI_API_KEY` to run anything.
- Pure helpers `src/lib/prompt-utils.ts` (+ tests in `test:tools`). Old `PromptManagement`/`PromptPlayground` components are unmounted. Screens checked with mocked data only, not signed in on a Vercel preview.

## 2026-10-19 Sessions and Users rebuilt on real data — same draft PR #237
- Both pages now follow the dashboard page standard: one `GroupExplorer` (`src/components/dashboard/groups/`) with search, time range, environment and status filters, URL state, live polling, sortable columns, CSV export and a side panel (`?id=`) that lists a session's runs in order (or a user's runs) plus the opposite kind (a user's sessions, a session's users). Old `/sessions/<id>` and `/users/<id>` links redirect to `?id=`.
- Data: `GET /api/projects/[id]/groups/[kind]` (kind session|user) -> `src/lib/tinybird-groups.ts` (aggregates `spans` by sessionId / endUserId). Pure URL parsing in `src/lib/group-filters.ts` (`npm run test:tools`). The SQL was run against a real ClickHouse (chdb) with `npm run test:groups-sql` and `CLICKHOUSE_URL` set; this caught two real bugs (aliases that shadow columns or nest aggregates), so keep outer aliases distinct from inner ones. `tinybird.ts` only gained three `export` keywords.
- The old `LiveCapturedSessions`/`LiveCapturedUsers` components are no longer mounted. The `/demo` sessions and users pages are separate and unchanged. Not checked on the real Vercel preview signed in (no robot login here): screens were checked with mocked responses.

## 2026-10-19 Free plan limit on ingest — draft PR #237 (branch `claude/project-thread-ji3n7c`)
- Free projects are refused at 25,000 spans per UTC month (was 50,000 until Oct 19 2026) on `/api/ingest` and `/api/otel` with HTTP 429, code `plan_limit_reached`, `Retry-After` until the 1st (shared helper `src/lib/plan-limits-server.ts`, pure rules + tests in `plan-limits.ts`, `npm run test:tools`). Count lives in Redis (`ingest-month:<project>:<YYYY-MM>`), fails open if Redis errors. Paid tiers and unknown tiers are never blocked. A batch crossing the limit is refused whole. The existing SDK already reports 429 once with an upgrade hint and does not retry.
- `getProjectByApiKey` now returns `planTier` (default free): needs a manual Convex deploy. Until deployed the field is absent and nothing is enforced. Also renamed Steps to Actions in the menu and on the page.

## 2026-10-17 Paid-plan upgrade prompts — draft PR (branch `claude/project-thread-e9f2e8`)
- Audit: Stripe Checkout, customer portal, webhook and plan sync already exist (pricing buttons -> `/pricing/checkout` -> `/api/stripe/checkout`). Missing: plan limits are NOT enforced on ingest (only a per-minute rate limit), retention is not tied to plan, and there was no usage meter or upgrade prompt.
- Added `billing.getMonthlyUsage` (sums this month's run span counts, scans up to 20k runs) and `UpgradeBanner` in the project layout: calm note at 80% of the plan's monthly spans, yellow upgrade bar at 100%, hidden on the billing page and for enterprise. Billing page "Current plan" card shows usage. Needs a manual Convex deploy.
- Still owner-side: Stripe live keys, the four price IDs, webhook secret, STRIPE_SYNC_SECRET in Vercel/Convex; verify with a real test payment.

## 2026-10-16 Growth pass — draft PR (branch `claude/project-thread-bq73n8`)
- New public tool `/tools/ai-cost-estimator` (pure maths in `src/lib/cost-estimator.ts`, tested by `npm run test:tools`; runs in the browser, share link puts numbers in the URL, example prices are round placeholders, never a provider list). Added to sitemap and `public/llms.txt`.
- Newsletter: existing `NewsletterCapture` (posts to `/api/leads`, intent `newsletter`) now takes a `source` and sends it with any saved referral code in the lead `campaign` field (`newsletter-blog|ref:anna`). `NewsletterPanel` sits after the blog CTA, at the end of docs articles and on the estimator. No backend change, no Convex deploy needed.
- Referral: `?ref=code` is remembered in localStorage (`tracify.ref`) by `ReferralCapture` in the root layout; `/refer` builds a link. It is only attributed on newsletter/contact leads for now, not on sign-ups. There is no reward scheme (owner has not decided one).
- Three blog posts: `how-to-estimate-ai-agent-costs`, `how-to-track-llm-token-usage`, `trace-langgraph-agents` (hand-made SVG visuals in `public/media`). Launch drafts for Product Hunt and Hacker News live in the shared project files under `growth/`, nothing posted.
## 2026-10-16 Data export and project deletion — draft PR (branch `claude/project-thread-suo63z`)
- Settings > Data tab (replaces the placeholder Exports tab): "Download all data" streams one JSON file via `/api/projects/[id]/export` (Convex tables paged through `projectData.exportPage`, plus spans and scores from analytics; no API key hash, billing ids or webhook URLs). "Delete this project" needs the exact name plus DELETE, goes through `/api/projects/[id]/delete`: clears analytics rows first, then `projects.deleteProject`, which removes the project and schedules `projectData.purgeBatch` to clear every project table in batches. Needs a manual Convex deploy. Analytics delete needs a Tinybird token that can delete rows (ClickHouse uses ALTER TABLE DELETE).
## 2026-10-16 SDK safety and framework helpers — draft PR (branch `claude/project-thread-tetqg9`)
- Both SDKs (0.4.0 base, NOT published, no version bump): `sampleRate`/`sample_rate` (per-run, stable hash, errors kept), `redact` (pii, patterns, custom fn), `TracifyError` with a plain `hint`, `onError`/`on_error`, key/host/region checks and one-time messages for 401/403/429/5xx/network. New `tracifyMiddleware` (Vercel AI SDK) and `traceTools`/`trace_tools` helpers, plus `templates/` starters in each package. Tests: `safety.test.ts`, `test_safety.py`. Release waits for owner.
## 2026-10-16 Ask AI on traces — draft PR (branch `claude/project-thread-n3qyyc`)
- Trace panel has an "Ask AI" tab: suggested questions + free text, answers cite steps that jump to the step. API `POST /api/projects/[projectId]/runs/[runId]/ask` (signed-in + run access, per-project rate limit). Digest/redaction/built-in answers in `src/lib/ask-ai.ts` (tests: `npm run test:ask-ai`). Uses Anthropic when `TRACIFY_ASK_AI_API_KEY` (or `ANTHROPIC_API_KEY`) is set in Vercel env (model override `TRACIFY_ASK_AI_MODEL`, default claude-haiku-5-5); without a key it answers failures/slowest/cost/summary itself. No Convex change, so no backend deploy.

## Tracing roadmap authorized 2026-10-14 (in progress)
- User authorized all five recommended priorities: loading flash; CSV and sorting; OpenAI/Anthropic then LangGraph integrations; cross-trace steps table; saved views. Start base main `fcafb74` after #160/#161 merged, no open PRs. Auth isolated on `codex/project-loading-refresh` in `/home/orca/workspaces/Tracify-loading`. Sessions page files remain out of scope.
## 2026-10-15 Search exclusions and comparisons — draft PR (branch `claude/search-exclusions-limits-csfvu6`)
- Tracing search accepts `-env:dev` style exclusions (any facet; `-status:error` = healthy) and `latency|cost|tokens` with `>`, `>=`, `<`, `<=`, `=` (bounds inclusive; bare number = minimum; tokens take `k`/`m`). Exclusions travel as `not_<facet>` URL params and become `runId NOT IN (...)` in `traceListClauses`; `minTokens`/`maxTokens` are new HAVING filters. Max latency/cost already existed in the backend. Excluding a numeric field is rejected with a hint. Touches `tinybird.ts`/`trace-filters.ts` near the codex sort branch but in different hunks.
## 2026-10-15 Trace page critical path — draft PR (branch `claude/project-thread-0wyjbs`)
- Single-trace page gets a "Critical path" card (above the waterfall): the chain of spans that set wall-clock time, working vs waiting time, parallelism, and the top 5 bottlenecks (click to jump to the span card). Waterfall outlines critical-path spans. Logic is a pure function in `src/lib/trace-critical-path.ts` (vitest, 5 tests); wrapper spans that have children are ignored so they never hide the real work. Frontend only; not yet checked against real data in a preview.

## 2026-10-14 Agent-scoped Flow map and finished latency — draft PR #150
- Branch `codex/tracing-agent-map`, worktree `/home/orca/workspaces/Tracify-agent-map`, based on origin/main `209924a`. Draft PR: https://github.com/BN-KR/Tracify/pull/150. Verified runtime: `f3140cf`; EU preview https://tracify-cloud-eu-git-codex-tracing-agent-map-tracify-tech.vercel.app is Ready. Later verification notes do not change runtime code. Owner preview review before merge.
- Map requires exactly one selected Trace name, in the UI and authenticated API. `src/lib/trace-flow.ts` shares canonical type/name aggregation, first-seen traversal, caller tool branches, counted return pairs, failure counts and arrow presentation with the detail Flow graph. Top-down ELK retains positions across updates. Node/arrow trace counts use distinct runs, including the union of return directions; filters resolve through the same Flow rules.
- The minimap occupies a reserved collapsible footer outside the drawing; phones start collapsed. Cards retain names/counts/errors/p50 at every zoom. Search prefers an exact name (chat selects the model, not a name containing chatbot). Node and arrow selection remain in the URL. Fixed a Next.js remount bug that restored stale server `mode=map` after Show traces: browser initial state now takes the current URL alone, including parameter removals.
- Summary latency uses exact percentiles of finished runs (run_end, failed root, or non-running root metadata status), with an excluded-running note and a dash when none finished. A child failure alone does not close a run. Duration labels use days/hours and hours/minutes.
- Real pnpm install, focused ESLint on all changed TS/TSX files, full `tsc --noEmit`, EU production build and six Flow/duration tests pass. On Ready runtime `f3140cf`: click 26/26, live updates 7/7, features 40/40, focused map checks 12/12. Only the documented Better Auth identify CORS/associated ERR_FAILED exception is tolerated; no other console/page errors.
- Independent `clickhouse-query` proof: three finished and two unfinished fixtures produce p50 300 ms / p95 500 ms in ClickHouse, API and UI; two running notes are shown, and all-running results show a dash. All 18 map nodes and 26 arrows have trace counts equal to their filtered list totals; the map's 11 matching runs are confirmed directly in ClickHouse. Combined tag/status/latency filters scope the map to three healthy seeded runs.
- Desktop 1440×900 and phone 390×844 fit/zoom/fullscreen screenshots inspected under `/root/tracify-tools/shots-agent-map/`; zero horizontal overflow. Exact model search is asserted during capture. Durable verification logs and query scope: `/root/tracify-tools/agent-map-verification/`.
- Updated server tools: loop seeding uses stable `docs-qa` (TRACE_NAME override), SDK aliases, completed root status, explicit tool/model returns and optional FAIL_TOOL. Features cover the single-name rule, Flow arrows, reserved minimap, URL restoration, pan/zoom, live view retention and count parity. Click testing selects the actual support-triage chat fixture and applies the documented CORS exception; failed checks still exit nonzero. Tool README, dashboard standard and handoff updated. No Sessions files or ingestion/storage changes. PR remains draft and unmerged.

## 2026-10-13 Tracing map refinement — PR #146 merged
- Branch `codex/tracing-map-refinement` in `/home/orca/workspaces/Tracify-canvas`, from latest main `6a0682f` after #145 merged. Draft PR: https://github.com/BN-KR/Tracify/pull/146. Verified runtime commit: `b86028b`; later documentation notes do not change runtime code.
- Both graph views retain full cards and text at every zoom. Connectors are straight; return arrows attach to facing card edges and self-repeats use a square loop above the card. The minimap now receives explicit controlled-node dimensions, so every node renders; click centers the requested world point, drag/wheel navigate, the yellow outline shows the viewport, and its phone layout avoids controls.
- Shared native React Flow pan/pinch gestures work from cards, background and arrows. Pointer capture removes React Flow's default nopan marker from an arrow before its native gesture starts; taps/clicks still select. The graph fills the remaining pane height so its phone controls are fully visible. No Sessions page files, backend or storage code changed.
- Real `pnpm install`, focused ESLint (including the checked-in regression script), full `tsc --noEmit`, and EU-configured `pnpm build` pass (222 routes). On the Ready EU preview at `b86028b`, click interactions pass 26/26 (the existing script's final console gate reports only known Better Auth identify CORS/associated ERR_FAILED), live updates pass 7/7, and expanded features pass 38/38 with only that known CORS tolerated.
- `scripts/tracing-canvas-regression.mjs` passes 8/8, checking populated minimaps in both views, exact click geometry within a screen pixel, directional drag/wheel from a stationary view, persistent card text below the former 84% bubble threshold, straight paths, pan from arrows without changing selection, and phone controls/minimap staying inside the visible graph pane. `/root/tracify-tools/map-refinement-touch.mjs` passes 6/6 including phone minimap drag, control separation, card text, single-finger arrow pan and two-finger pinch, without injecting application fixes.
- Map/list/ClickHouse parity is verified in `/tmp/tracing-map-count-proof.log`: tested node 76 = 76 = 76 traces; tested arrow 15 = 15 = 15 traces. Desktop 1440×900 and phone 390×844 screenshots, including zoomed in/out and fullscreen, were inspected under `/root/tracify-tools/shots-tracing-map-refinement/`. Dashboard standard and handoff updated. Owner merged #146 on 2026-10-14 as `e200d1b`; #147 Flow graph is also merged.

## 2026-10-13 Tracing map canvas — PR #145 merged
- PR #145 was merged by the owner at 22:42 UTC as `6a0682f`. It added the shared React Flow/ELK canvas, navigation controls, search, URL-backed selection/arrow limit, node/edge Show traces actions and stable live positions.
- Implementation `88293c9` passed focused ESLint, full typecheck, EU-configured build, click interactions 26/26 (known Better Auth console errors), live 7/7, extended features, and inspected desktop/phone screenshots. The owner subsequently requested the map refinement above.

## 2026-09-15 Google Analytics 4 setup
- Created the `Tracify` GA4 property in the existing Analytics account and the `Tracify website` web stream for `https://www.tracify.tech`; measurement ID: `G-XW154R1G8Y`.
- Added a consent-aware Google tag integration controlled by `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`. It loads only while the existing analytics preference is enabled, updates Google consent state when preferences change, and always denies advertising storage/personalization.
- Added GA4 disclosure to the cookie policy and documented the environment variable. Production Vercel configuration now contains the ID, but it only takes effect after a deployment containing the code change.
- Clean-branch verification passed: consent/unit tests 8/8, focused ESLint, full TypeScript, production build (211 routes), and browser analytics contract 2/2 (loads when enabled; absent when rejected).
- Published draft PR #121 from `codex/google-analytics`; its first hosted-check run passed security, activation, adapter, and both Vercel previews.

## 2026-09-08 site linking and mobile hardening
- Added responsive shell behavior for dashboard and Sandbox: mobile sidebar slides over content with backdrop, closes after navigation, and the existing shell toggle opens/closes it below 700px.
- Routed email authentication through `/auth/callback` so email and OAuth share the same Better Auth/Convex readiness path; unauthenticated `/dashboard` now redirects to sign-in with its destination preserved.
- Isolated Playwright’s managed server to port 3100 with stale-server reuse disabled; TypeScript and focused ESLint pass.
- Made captured Settings tabs URL-addressable and kept their click state stable; direct browser validation reaches LLM Connections and opens the Sandbox boundary dialog. Added an explicit hydration marker to make browser interactions deterministic and removed the shell's server/client theme-class mismatch.
- Final verification on the current tree: `pnpm build` passed (211 routes), TypeScript, focused ESLint, and `git diff --check` passed; the complete account-access contract passed 9/9 including Sandbox routing/interactions and mobile/keyboard coverage. Remaining verification is provider-backed signed-in cloud behavior, which requires EU test credentials.
- Re-ran the complete account-access contract after hydration hardening: 9/9 passed. Public product smoke also passed 3/3, including consent persistence and safe sign-in routing.
- Content/link integrity suite also passes 27/27 (`pnpm test:content`), including public internal-link validation and canonical docs/blog route inputs.
- Replaced generic captured Build action modals with navigation into existing authenticated workflows for dashboard/alert/evaluator/dataset creation, LLM connections, and project settings; Sandbox retains explicit read-only boundaries. TypeScript, focused ESLint, and diff checks pass after this wiring.
- Ran a 390px viewport sweep across all 14 captured Sandbox surfaces: every route returned 200, had no horizontal overflow, and reported no page errors. The existing route contract remains green; internal link HTTP probing should be added as a follow-up when the full navigation audit is expanded.
- Added and passed the captured Sandbox internal-link contract (1/1): it collected links across all 14 surfaces and verified every unique internal destination returned below 400.
- Fixed the captured workspace hydration readiness marker so client hydration reliably transitions to ready without a synchronous-effect lint violation; the complete account-access contract now passes 10/10, including consent-safe Sandbox navigation, URL-persisted tracing controls, internal-link probing, and mobile/keyboard coverage.
- Committed the implementation as `43e670a`, `45b5e25`, `b9f4444`, and `55befa5` (expanded/mapped captured Tracing filters); unrelated scratch/archive files remain untracked and untouched.
- Pushed branch `codex/build-captured-sessions` to origin; PR #106 now includes the implementation through commit `34e5882`. GitGuardian, activation, adapter, and the Tracify Vercel preview passed; the EU Vercel preview was still pending when polling stopped.

## 2026-09-08 hosted dashboard reference
- Deployed the complete static dashboard capture as the isolated Vercel project `tracify-dashboard-reference`; it does not modify or share configuration with the production `tracify` or `tracify-cloud-eu` projects.
- Stable reference index: `https://tracify-dashboard-reference.vercel.app`; populated dashboard: `/pages/023.html`; empty-project dashboard: `/pages/empty-home.html`.
- Vercel reported deployment `dpl_AZwXrhFh5v84UwmSMwG7K2HZCqTS` Ready, and the populated page was opened successfully with its local CSS, assets, and rewritten snapshot navigation.

## 2026-09-08 exact captured branding pass
- Updated captured dashboard copy to the reference presentation: `Demo Project (view only)`, `Langfuse Demo`, `Home`, `Cost Dashboard`, and neutral evaluator labels.
- Scoped the reproduced workspace interaction accent to violet and removed Tracify from visible Build loading messages; internal route/event/data-source identifiers remain unchanged.
- TypeScript and focused ESLint were run with the bundled runtime. Browser verification remains blocked because port 3000 was not running and shell startup was rejected.

## 2026-09-08 captured dashboard parity follow-up
- Added a capture-aligned Tracing surface with working table/chart toggle, preset filters, environment/search filtering, selectable columns, filter-rail search, trace links, and an empty-state footer.
- Added a populated Session detail surface with event input/output inspection, linked trace context, score rows, and the dataset action boundary.
- Added dedicated populated Dashboards and Scores surfaces with dashboard selection, layout toggles, metric widgets, score metric filtering, and score summary/table views.
- Production build passes after the parity additions: Next.js compiled, TypeScript completed, and all 211 routes generated. The branch still contains only intentional tracked parity edits; unrelated scratch directories remain unstaged.
- Added dedicated Prompt Management and Evaluators surfaces with prompt text/chat tabs, prompt selection/editor controls, Playground handoff, evaluator filtering, status/run columns, and create/edit action boundaries.
- Added captured-style Datasets, Human Annotation, and Alerts surfaces with search/queue/status controls, review and create actions, plus real local Settings tab switching instead of forcing every tab through a modal.
- Warmed and verified the local Sandbox route matrix: `/playground` and all primary/nested parity routes returned HTTP 200, including session detail; initial compile latency was isolated from subsequent route behavior.
- Re-ran the Playwright account-access contract against the local app with one worker; the command completed successfully after the Sandbox route warm-up.
- Extended the account-access contract to cover prompt Text/Chat switching and selection, dataset search empty state, Settings tab switching, and the read-only action boundary; the Playwright command still completes successfully with one worker.
- Added captured-style pagination controls to generic collection surfaces, including a working rows-per-page selector for Users and Experiments-style tables.
- Restarted the stale local Next dev server and visually verified `/playground/tracing` now renders the intended captured tracing surface: preset controls, table/chart toggle, filter rail, columns dropdown, dense trace table, and trace links are all present in the browser DOM.
- Corrected generic collection pagination so the rows-per-page selector now slices rendered rows and reports the visible/total counts; TypeScript, focused ESLint, and the 9-test account-access Playwright contract were rerun.
- Expanded the populated Tracify Home grid to match the localhost:4173 reference composition: cost, top users, observation/trace use cases, environment cost, and three P95 cost panels; browser DOM verification confirms all widgets render.
- Added the first authenticated Build parity adapter: the project Tracing route now queries the real Convex project and paginated agent runs, normalizes them into the captured tracing renderer, and preserves live project identity without using Sandbox trace fixtures.
- TypeScript and focused ESLint pass for the changed workspace component. Remaining parity work is to deepen the other captured templates and connect the same interactions to authenticated Build data.

## 2026-09-08 captured Tracify dashboard implementation
- Replaced the generic demo simulator with one shared capture-derived Tracify workspace renderer and deterministic populated Sandbox data. `/playground` plus its nested primary routes now cover Home, Dashboards, Tracing, Sessions, Users, Alerts, Prompts, Playground, Scores, Evaluators, Human Annotation, Datasets, Experiments, Settings, and record details without account or project dependencies.
- Kept Build and Sandbox distinct: Sandbox is public/read-only with explicit mutation boundaries; authenticated project routes retain their existing Convex/Tinybird-backed functionality, use the capture-style Home in both empty and populated states, and now share the capture-aligned primary sidebar taxonomy.
- Reordered cloud entry so `/cloud` selects region first and `/cloud/mode` then offers Sandbox or Build. Local regional selection correctly hands `localhost:3000` to the EU cloud host at `localhost:4000`.
- Included the existing regional Better Auth/Convex callback race fix from upstream so a valid Better Auth session waits for Convex readiness instead of bouncing back through sign-in.
- Verification passed: TypeScript, focused ESLint, production build (211 pages), auth callback tests (6/6), browser route contract (7/7 before interaction expansion), direct capture comparison at 1280×720, and focused Sandbox interaction coverage. No source-product branding appears in the new UI.
- Provider-backed authenticated mutation testing remains unavailable on this machine because no EU test-account credentials are configured; unauthenticated redirect safety and callback-state behavior are covered.
- The first production probe caught `/cloud/mode` being treated as a marketing route on the EU deployment. Added it to the cloud-app allowlist while keeping `/cloud` on `www`, covered the production and localhost host matrix with four proxy tests, and re-ran the full browser/build gates before release.

## 2026-09-06 account access and onboarding flow
- Implemented `src/lib/navigation-context.ts` with safe relative-path validation and Explore/Build intent parsing.
- Regional selection now preserves validated destinations and intent; Explore enters `/playground` with `intent=explore`, Build preserves `intent=build`.
- Better Auth email flow preserves intent; OAuth callback redirects are validated, wait for both Better Auth and Convex, and show a retry state after 15 seconds.
- Auth region-change links now stay on the current host, and one-time API-key detection reads persisted session storage after reload.
- Focused ESLint, TypeScript, and `git diff --check` passed using the bundled runtime. The worktree contains substantial unrelated user changes; none were removed.
- Completed the persistence/recovery slice: project onboarding now stores step, SDK, and dismissal timestamp in Convex; dashboard setup links resume from the stored step; password reset preserves redirect and intent; invitation failures are classified and no longer show a false success action.
- Regenerated Convex bindings successfully. Added four navigation-context unit tests (all pass). Public Playwright smoke was attempted: the auth redirect test passed, while two page tests timed out because the local app server was not healthy at `127.0.0.1:3000`.
- AuthShell now derives the displayed region from the request Host, so direct regional cloud URLs show their own region. Invitation acceptance now validates the invitation first and activates the accepted organization before offering the dashboard link. TypeScript and focused ESLint pass after this change.
- Warmed local server probes returned 200 for `/`, `/cloud`, `/sign-in`, and `/docs`. Playwright public smoke then passed the public product and sign-in redirect tests; the consent test exposed an accessible-name mismatch, which was corrected to `Privacy preferences` and its fixture now clears consent before navigation. A subsequent consent run still hung in the dev server, so full browser verification remains unproven.
- Adjusted the consent fixture to use commit navigation and explicit UI readiness; the local dev server still stalls the isolated browser run after rendering the page, so this remains an environment-level verification issue rather than a failing assertion.
- Production-style verification completed: rebuilt with the EU site origin, started `next start` on port 3100, and ran `tests/e2e/public-smoke.spec.ts` with 3/3 passing. The run exposed a real consent hydration bug; initializing browser consent state after hydration fixed it. Focused ESLint, TypeScript, Vitest (4/4), and diff checks pass.
- Added `tests/e2e/account-access-contract.spec.ts` covering cloud Explore/Build entry and intent links, auth/recovery forms, missing invitations, and mobile keyboard/overflow behavior. Production-style browser run passes 4/4; focused ESLint, TypeScript, and diff checks pass. Provider-backed authenticated journeys remain gated by `TRACIFY_E2E_AUTH=1` credentials.
- Split the cloud directory into explicit sequential screens: `/cloud` is path choice (step 01), `/cloud/region` is region choice (step 02), and intent/destination are carried through the regional redirect. Production build and updated account-access contract suite pass (4/4).

## 2026-09-04 favicon candidates
- Superseded the first literal trace-path and pixel-`T` drafts after review; those marks were too busy and too logo-like for a tab bar.
- Added a cleaner pair under `public/`: `favicon-signal.svg` for a measured telemetry pulse and `favicon-open-trace.svg` for a restrained open-loop trace mark.
- Added 16px, 32px, and 48px PNG renders for both candidates and a combined preview at `public/favicon-candidates-preview.png`.
- Replaced `src/app/(frontend)/favicon.ico` with a proper multi-size ICO built from the signal mark; `public/favicon-open-trace.ico` remains ready as the alternate.
- Verified the SVG sources parse correctly and visually checked both new marks at 16px and 48px.
- Packaged the three-bar cascade variant under `public/favicons/cascade-t-three-bar/` with SVG, ICO, and 16/32/48/180/512px PNG exports.

## 2026-09-04 Explore / Build playground and site assistant
- Added an Explore / Build switcher to `src/app/(frontend)/cloud/page.tsx`. Explore uses the EU auth boundary only to reach the account session, then enters a region-independent simulated workspace at `/playground`; Build preserves the existing region selector and real onboarding path.
- Added an authenticated playground shell at `src/app/(frontend)/playground/` with deterministic healthy, latency-regression, and tool-call-failure scenarios, populated runs/metrics/alert data, filters, and safe real-project CTA. It does not use a fake project ID or `/api/ingest`.
- Added account-scoped `sandboxWorkspaces` persistence in `convex/schema.ts` and `convex/sandbox.ts`; generated API typings were updated manually because the local Convex CLI binary failed before codegen (`Cannot read properties of undefined (reading 'toString')`).
- Added the public `SiteAssistant` widget and `/api/site-assistant`. It answers from a curated local public knowledge set, returns allowlisted citations, applies request bounds/rate limiting, falls back deterministically without `OPENAI_API_KEY`, and optionally sends redacted internal traces through `TRACIFY_INTERNAL_INGEST_URL` + `TRACIFY_INTERNAL_API_KEY` without blocking the response.
- Verification: focused ESLint and TypeScript pass; the assistant endpoint returns a cited playground answer locally. Full page HTTP smoke tests are blocked by the existing local Convex service dependency on `127.0.0.1:3211`, not by the new route code. The worktree contains substantial pre-existing user changes; none were removed.
- Updated the assistant to use `gpt-5.6-luna` with low reasoning effort. Added a separate optional `TRACIFY_ASSISTANT_OPENAI_API_KEY`, Redis-backed per-IP 5/minute and global 100/day limits with local fallback, and a configurable 300-token output cap.

## 2026-09-04 EU cloud hostname TLS incident
- `eu.cloud.tracify.tech` initially returned `NXDOMAIN` because the Cloudflare `eu.cloud` CNAME target was malformed and displayed as `5ee7be47305fd6c5.vercel-dns-017.com.5ee7be47305fd6c5.vercel-dns-017.com`.
- Corrected the CNAME target to exactly `5ee7be47305fd6c5.vercel-dns-017.com`; Vercel's `tracify-cloud-eu` project already had `eu.cloud.tracify.tech` attached to Production with a valid configuration and did not require a domain change.
- DNS-only direct-to-Vercel then exposed a Chromium TLS failure (`ERR_SSL_VERSION_OR_CIPHER_MISMATCH`): the Vercel edge requested TLS 1.3 renegotiation, which Windows curl tolerated but Chrome rejected. The Vercel certificate itself was valid for `eu.cloud.tracify.tech`.
- Final working fix: set the Cloudflare CNAME to **Proxied** (orange cloud), allowing Cloudflare to terminate visitor TLS and proxy to Vercel. Public DNS then returned Cloudflare edge IPs and both Chrome and the EU `/sign-up` route loaded successfully.
- Future regional-hostname rule: for this nested hostname, keep the exact Vercel CNAME target and Cloudflare proxy enabled. Cloudflare's free Universal SSL certificate covers `*.tracify.tech` but not the two-level `eu.cloud.tracify.tech`; do not disable proxying unless Vercel/Chromium TLS behavior has been revalidated. Advanced Certificate Manager would be needed to terminate this nested hostname directly at Cloudflare with a dedicated edge certificate.

## 2026-09-03 ERPNext integration discovery
- User approved integrating ERPNext into Tracify; no connector currently exists.
- Proposed outbound project-scoped delivery of failed-run and alert metadata to ERPNext `ToDo` records, with links back to Tracify evidence.
- Added `docs/erpnext-integration.md` with mapping, implementation sequence, and SSRF/secret/RBAC requirements. Live connection testing requires an ERPNext sandbox URL and dedicated API credentials.
- Added `src/lib/erpnext.ts` and `src/lib/erpnext.test.ts` for the server-side REST boundary, including HTTPS/private-target checks, token auth, fixed endpoints, bounded payloads, timeout, and no-redirect behavior. Test execution is blocked because npm is unavailable on PATH.
- The bundled Node runtime was located through workspace dependencies; the focused ERPNext suite now passes 6/6.
- Documented the future `TRACIFY_INTEGRATION_ENCRYPTION_KEY` deployment contract in `.env.local.example` and the ERPNext runbook; live credential storage remains disabled until the encrypted Convex path is implemented.
- Added `src/lib/integration-crypto.ts`, a versioned AES-GCM envelope helper with fresh IVs and safe decryption errors, plus focused tests; ERPNext and crypto tests pass 9/9.

## 2026-09-03 release log and SharePoint discovery
- Added canonical `docs/releases.md`, a release-log validator, and `/changelog` rendering from the repository source.
- Added release-workflow validation and SharePoint package generation through `npm run prepare:m365-index`, producing `artifacts/m365-sharepoint/` with 10 approved documents and `m365-file-index.json`.
- Added `docs/sharepoint-discovery.md`; direct SharePoint upload remains blocked until a tenant/site URL and authenticated Microsoft 365 connector are supplied.
- Focused release-log validation, export generation, TypeScript typecheck, and `git diff --check` pass.

## 2026-09-03 demo dashboard seed attempt
- For the authenticated `admin@tracify.tech` account, `tracify-demo` already existed at the EU cloud project route. With explicit user authorization, rotated the project key, sent 383 synthetic support-agent spans across 90 traces through `https://eu.cloud.tracify.tech/api/ingest` (379 accepted), then rotated the key again to retire the temporary seed credential.
- The dashboard remained in its verified empty state after waiting for asynchronous processing. Direct calls to the production Convex `agentRuns:upsertRun` mutation returned server errors, so no claim of populated dashboard data was made. Follow-up requires diagnosing the EU ingestion/Convex rollup deployment.

## 2026-09-03 Langfuse parity-plus planning
- Added a detailed 33-capability roadmap to `implementation_plan.md`, translating the Langfuse August release into a Tracify-native trace-to-release system: evidence sets, evaluator workbench, reusable rules, cost/comparability controls, multimodal evidence, search/timeline/comparison, alerts, API/CLI/SDK parity, governance, deployment trust, and release operations.
- Sequenced the roadmap around the first paid Agent Failure Review: P0 evidence/evaluation/release loop first, then multimodal and investigation depth, then developer-platform and enterprise capabilities.
- Updated `AGENTS.md` so agents remove completed entries, stale headings, and superseded duplicates from active task files before finishing; durable history belongs in memory, changelogs, PR history, or explicitly historical sections.

## 2026-09-03 transactional sender configuration
- Configured the shared transactional email adapter defaults for a more personal customer-facing identity: `Kristoffer from Tracify <kb@tracify.tech>` with `kb@tracify.tech` as the default reply-to address.
- Added `RESEND_API_KEY`, `EMAIL_FROM`, and `EMAIL_REPLY_TO` to `.env.local.example`; the production Resend key remains intentionally user-supplied through Vercel environment variables.

## 2026-09-02 lead workflow completion audit
- Preserved the existing lead implementation and tightened JSON body shape and aggregate payload limits on `POST /api/leads`.
- Improved `/admin/leads` metadata presentation for source/campaign, company, intent, stack, created time, owner, and message while keeping the monochrome sharp-corner system; added recoverable mutation errors and client-side empty-note feedback.
- Added Convex coverage for the authorized empty state and expanded browser API validation cases. Bundled Node focused ESLint passes; Convex lead tests pass 4/4; `git diff --check` passes. The configured Convex deployment still returns the valid browser submission as 503 and the CLI requires interactive authentication.
- Direct HTTPS probing confirms the Convex hostname responds, but `convex dev --once --typecheck disable` stops at interactive login; the remaining valid-submission failure is deployment/auth state rather than lead validation.
- Bundled TypeScript now passes cleanly after removing the stale Vite type reference from the Convex lead test and updating the Stripe SDK API-version literal. Production build compiled successfully but had not exited from its optimization/type phase within the observation window.
- Webpack production build subsequently completed successfully: TypeScript finished, 184 static pages generated, and route optimization/build traces finalized. Live browser persistence remains blocked by the authenticated Convex dev deployment.

## 2026-09-02 lead workflow hardening
- Hardened the existing lead slice: bounded/validated POST fields, optional Redis rate limit, deterministic ten-minute dedupe, safe email encoding, non-fatal email delivery, and no personal-data logging in the email adapter.
- Added indexed lead dedupe storage, lead existence checks, owner normalization, and non-empty note validation to Convex operations.
- Expanded `/admin/leads` with all lead metadata, status filtering/transitions, assignment, internal note listing/creation, and recoverable UI errors.
- Verification is blocked in this shell because Node/npm/npx are not on PATH; Convex codegen and tests remain to run in the bundled runtime.
- Bundled runtime later became available: focused lead ESLint and activation tests pass; lead Playwright file lists four tests. `next build` compiles successfully but stops at TypeScript output in this runner before a final status; Convex codegen remains 401 due missing CLI token.
- Added `convex-test`, Vitest, and Edge Runtime coverage. `pnpm run test:convex:leads` passes all 3 tests for unauthorized access, admin lifecycle operations, blank-note rejection, and deduplication.

## 2026-09-02 consent-gated analytics completion
- Tightened the existing consent slice to default-deny optional analytics, invalidate malformed/old versions, tolerate blocked storage, and expose a typed consent event.
- PostHog now initializes only from valid analytics consent, avoids duplicate initialization, opts out immediately on withdrawal, and gates authenticated identity calls.
- Consent UI now has explicit reject/preferences/accept controls, separate analytics/marketing choices, privacy links, accessible labels, and mobile-safe overflow behavior. Added `src/lib/consent.test.ts`.
- Bundled Node verification: focused consent tests pass (3/3), focused ESLint passes, and `git diff --check` passes. Full TypeScript remains blocked by pre-existing generated-route errors and the unrelated Stripe API-version error; browser coverage was not run because no dev server was available.

## 2026-09-02 activation path follow-up
- Audited the public-to-authenticated activation surfaces and made a focused handoff correction: homepage quickstart links now target `/docs/quickstart`; the authenticated empty state distinguishes seeded demo data from project data and routes users with a first trace to their own runs.
- Added activation contract assertions for the corrected quickstart destination and seeded-demo/first-trace copy.

## 2026-09-02 EU deployment readiness audit
- Added `docs/eu-deployment-readiness-audit-2026-09-02.md` based on source, regional contract/runbook, git history, and safe public probes.
- Public EU health returned 503: Convex and Tinybird passed, Redis failed, and Inngest was configuration-only healthy. Ingest/OTLP auth failures and dormant-US rejection behaved as expected.
- Confirmed the repository does not claim end-to-end EU residency: Inngest Cloud is documented in AWS us-east-2 and receives redacted span input/output. Owner follow-up remains required for Redis, EU Stripe variables, and any strict-EU queue replacement.

## 2026-09-02 trust-first lifecycle implementation
- Added the first implementation slice for consent-gated PostHog, real lead submission plumbing, Convex lead storage/admin functions, and a Resend-compatible transactional email adapter with development-safe logging.
- Added `src/components/privacy/consent-banner.tsx`, `src/lib/consent.ts`, `src/components/marketing/lead-form.tsx`, `src/app/(frontend)/api/leads/route.ts`, and `convex/leads.ts`. Convex codegen and runtime verification remain pending because this shell cannot locate Node.
- Analytics preference changed per user request: enabled by default with explicit opt-out; added `/cookie-policy`. Node is now reachable through Cursor's bundled runtime, but Convex codegen is blocked by missing CLI authentication.
- Added protected `/admin/leads` inbox UI with status filtering and updates. New lifecycle files pass targeted TypeScript filtering; full verification still has unrelated generated-route, dashboard-members, and Stripe API-version errors.
- Added signup welcome-email endpoint and client trigger, account notification preferences, and first lifecycle wiring. Targeted TypeScript filtering and diff hygiene remain clean.
- Added first-trace lifecycle email trigger from onboarding once a first run is observed, with idempotent delivery and direct trace link.
- Added Better Auth server-side user-create welcome hook covering email and OAuth accounts, plus migrated the primary footer newsletter capture to the real `/api/leads` endpoint.
- Migrated the remaining static marketing POST forms from `/contact` GET navigation to `/api/leads`; the endpoint now supports browser form bodies and redirects to a user-safe result state. Demo fit-call CTA now routes to the structured contact flow.
- Added delayed onboarding reminder scheduling through Inngest: after project creation, wait 24 hours, check for a first span, and email only if the project remains inactive.
- Added authenticated Convex notification-preference storage with local fallback migration; account preferences now sync server-side. Added lead-note listing backend (admin UI note controls remain a small follow-up).
- Completed lead-note UI in the protected inbox: expandable note history and add-note control are now available per lead.
- Revalidated current worktree after concurrent edits: restored analytics default and lead inbox, moved account preferences to a lint-clean derived-state implementation, and verified changed privacy/admin files with ESLint.
- Completion audit found a concurrent revert of the analytics default and its consent tests; restored both to analytics-on by default and verified the three affected privacy/admin files with ESLint.

## 2026-09-02 first-customer review execution system
- PR #75 was squash-merged into `main` as commit `1cc8f88` on 2026-09-02. Both Vercel previews, the Playwright adapter, and GitGuardian passed; the activation workflow remained red only on pre-existing comparison-blog framework violations outside this change. No production deployment was performed as part of the merge.
- The active 30-day commercial objective is one paid **Founding Agent Failure Review** at **$1,000 upfront**. The service covers one workflow, one consequential failure, five business days, sanitized staging evidence only, an annotated trace, one evidence-backed mechanism, one tested fix or stop/rollback recommendation, five regression cases, a concise report, and a 45-minute readout. Existing $19/$39 subscriptions remain unchanged.
- `/contact` now offers a free 20-minute **Agent Failure Fit Call** strictly for qualification and evidence scoping; it does not promise written findings, regression cases, or a release recommendation. `/demo` remains explicitly seeded and adds a fit-call CTA while preserving self-serve signup.
- The dashboard quickstart now uses `pip install tracify-sdk` with `from tracify import ...`, valid Python `async def`, the local TypeScript `tracify-sdk` contract, and a real `/docs/quickstart` destination. The inactive “Check Connection” control was removed because the regional health endpoint cannot prove SDK ingestion.
- The operating kit lives under `docs/first-customer/`: customer scope, report template, pilot sanitization/retention checklist, sales/demo playbook, and Stripe Payment Link setup.
- The editable execution workbook is `C:/Tracify/outputs/first-customer-execution/tracify-first-customer-crm.xlsx`. It contains 50 current source-backed candidates and 100 contact slots; the initial public-evidence pass marks 15 Qualified, 28 Watch, and 7 Disqualified. Never describe all 50 as qualified until concrete failure, technical ownership, sanitized staging evidence, and purchase authority are verified. No outreach has been sent.
- No Stripe product or Payment Link was created because this workspace has neither a Stripe CLI login nor `STRIPE_SECRET_KEY`; follow the documented Dashboard procedure and keep the live URL out of source control.
- Verification: focused ESLint passes; both quickstart snippets compile against the local SDK sources; `/contact`, `/demo`, `/docs/quickstart`, `/pricing`, and `/sign-up` return 200; clean-browser desktop/mobile checks confirm the fit-call path and seeded demo; pricing remains $19/$39. The production build compiles but is blocked by an unrelated existing TypeScript error in `src/components/dashboard/cost-dashboard.tsx:256` (`new Date(value)` receives `ReactNode`).

## 2026-08-26 AI evaluation metrics editorial rebuild
- Replaced the stale H3/paragraph tail of `content/blog/ai-evaluation-metrics.mdoc` with varied release-room tables, trace storytelling, difficult-case guidance, layered gates, a worked release decision, and a visual checklist.
- Added shared slash-separated display titles and centralized yellow `highlight` Markdoc rendering in the blog system; local route verified at `/blog/ai-evaluation-metrics` with the required Convex placeholder environment.

## 2026-08-26 blog corpus completion audit
- Removed the remaining generated `In the context of ...` prose pattern across 29 published posts while preserving article-specific headings and required presentation modules.
- Verified all 35 posts are 4,000–8,000 words and pass the strict framework, internal-link, Markdoc, and reading-time suites; production build generated 125 pages successfully.

## 2026-08-26 canonical blog refinement prompt
- Added a copy-paste content-manager prompt to `docs/blog-canonical-format-playbook.md` for bringing the remaining 26 published posts up to the `ai-agent-monitoring` standard.
- The prompt requires preserved frontmatter/publication state, reader/job/boundary definition, numbered H2/H3 decision structure, evidence, one purposeful deterministic interaction, one FAQ accordion, contextual links, mobile/rendered QA, and all release checks.

## 2026-08-25 Production-ready AI agents article refinement
- On clean branch `codex/blog-production-ready-agents` from `origin/main`, replaced the duplicated/generated body of `content/blog/building-production-ready-ai-agents.mdoc` with a Goal → Boundary → Evidence → Readiness → Stewardship launch guide.
- Preserved published metadata, `draft: false`, related-post intent, and the tracked hero asset. Added one deterministic launch scenario, one FAQ section, goal/ownership/evidence/staged-gate tables, boundary and stewardship rules, contextual links, and a checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, the tracked hero returns HTTP 200, and the final body has one FAQ heading with no recommendation prose dump. Full lint still reports 18 unrelated pre-existing errors.

## 2026-08-25 AI agent architecture article refinement
- On clean branch `codex/blog-ai-agent-architecture` from `origin/main`, replaced the duplicated/generated body of `content/blog/ai-agent-architecture.mdoc` with a Contract → Boundary → State → Evidence guide.
- Preserved published metadata, `draft: false`, related posts, and the tracked observability hero. Added one deterministic architecture scenario, one FAQ section, six-layer and tool-boundary tables, a typed decision example, a control-loop diagram, degraded-path guidance, contextual links, and a checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, the tracked hero returns HTTP 200, and the final body has one FAQ heading with no recommendation prose dump. Full lint still reports 18 unrelated pre-existing errors.

## 2026-08-25 LLM latency article refinement
- On clean branch `codex/blog-llm-latency-optimization` from `origin/main`, replaced the duplicated/generated body of `content/blog/llm-latency-optimization.mdoc` with a Measure → Waterfall → Optimize → Tail guide.
- Preserved published metadata, `draft: false`, the existing tracked operations hero, related posts, and article intent. Added one deterministic latency scenario, one FAQ section, waterfall evidence, milestone and trade-off tables, bounded retry/streaming/cache guidance, contextual links, and a checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, the tracked hero returns HTTP 200, and the final body has one FAQ heading with no recommendation prose dump. Full lint still reports 18 unrelated pre-existing errors.

## 2026-08-25 LLM tracing article refinement
- On clean branch `codex/blog-llm-tracing-format` from `origin/main`, replaced the duplicated/generated body of `content/blog/llm-tracing-explained.mdoc` with a focused Boundary → Propagate → Annotate → Inspect guide.
- Preserved the published slug, `draft: false`, tracked hero asset, and frontmatter intent. Added one deterministic trace-scenario interaction, one FAQ section with three shared accordion items, decision notes, semantic trace/span tables, an illustrative trace shape, a checklist, and three contextual links to published posts.
- `npm run test:content` passes all 19 tests, `git diff --check` passes, and the tracked image URL returns HTTP 200. `npm run build` compiles and passes TypeScript but page-data collection requires the missing clean-worktree `CONVEX_SITE_URL` environment variable.

## 2026-08-24 future content quality gate
- Completed launch-plan labels in `src/components/dashboard/dashboard-overview.tsx` keep their muted text but now use `decoration-black/75`, making the strikethrough readable without overpowering the label.
- The authoritative content workflow now has a mandatory future-agent quality gate in `.agents/skills/tracify-blog-tool/SKILL.md` and `content/blog/README.md`: inspect evidence first, define reader/job/boundary, use layered structure and purposeful interactions, keep examples truthful, target contextual links only where useful, render-test desktop/mobile behavior, and run all required checks before PR/merge.
- Verification on 2026-08-24: 19 content tests, focused dashboard ESLint, and diff hygiene pass. Full lint still has unrelated existing errors; the full build reaches TypeScript but fails on the untracked archived Motion Canvas file `video/archive/tracify-demo-motion-canvas/src/scenes/demo.tsx`.

## 2026-08-22 Tracify product film rebuilt from scratch in Remotion
- Replaced the active Motion Canvas project with a new Remotion 4 composition under `video/tracify-demo`; the previous project is recoverably archived at `video/archive/tracify-demo-motion-canvas`.
- The new film takes its visual system directly from the public homepage and demo page: warm paper `#eceae3`, white panels, one-pixel black rules, hard 18px black shadows, zero radius, black proof surfaces, acid yellow `#f4d44d`, and the exact Geist Pixel/Sans/Mono fonts copied from the site dependency.
- The 38.25-second film covers the real Tracify loop: homepage release proof, demo workspace and failed run selection, span/root-cause inspection with replay evidence, and release-candidate promotion.
- `npm run lint` and `npm run build` pass. Four Remotion still checkpoints and four frames extracted from the final MP4 were visually inspected with no clipping or panel overflow. Final `video/tracify-demo.mp4` is H.264, 1920×1080, 30fps, 38.25 seconds.

## 2026-08-21 AI agent monitoring blog refinement
- Refined only `/blog/ai-agent-monitoring`: added six H2 phases with nested H3 decision points, a five-item native FAQ accordion, a scoped paper/grid article background, and colored readable code-block treatment.
- The shared blog renderer now nests H2/H3 headings into a structured TOC and adds mobile-safe wrapping/overflow rules. The `faq-item` Markdoc tag is centralized in `src/lib/markdoc-blog.ts` and rendered in `src/components/blog/markdoc-rich-text.tsx`.
- `npm run test:content` passes all 18 tests. Focused ESLint passes for the changed TypeScript files. The local browser runtime could not initialize; the local Next response returned 200 after its first slow compile.

## 2026-08-21 Tracify Motion Canvas product demo
- Reworked the initial card-based draft after visual review: the final scene keeps a persistent execution graph and uses camera/object transitions into the selected span, code patch, evaluation bars, and release gate.
- The film uses real Tracify concepts from the repository: support-agent trace spans, model/tool/decision telemetry, empty retrieval debugging, code patching, offline evaluation candidates, quality/latency/cost metrics, and a release gate.
- Rendered the final `video/tracify-demo.mp4` with the Motion Canvas FFmpeg exporter at 1920×1080, 60fps, H.264, 45.87 seconds. Explicit left-anchored text helpers keep labels inside their panels; the selected-span evidence panel was tightened after inspection so its red failure marker stays inside the frame; the opening graph was reframed so its evaluation label stays inside the hook. Added a staged signal pulse through the graph and kinetic title-rule entry based on the supplied AI video-engineer/Remotion guidance, while retaining Tracify’s monochrome and acid-yellow brand. `ffprobe` confirms the stream and the hook, trace, code, and release frames were visually inspected from the replacement MP4.

## 2026-08-20 17-post blog visibility content set
- Added 17 published Markdoc articles under `content/blog` targeting distinct, durable AI engineering searches: architecture, RAG evaluation, prompt injection, structured outputs, latency, hallucinations, cost, memory, MCP, OpenTelemetry, human review, regression testing, production readiness, browser agents, prompt versioning, monitoring, and the Tracify writing workflow.
- Added `how-to-write-tracify-blog-posts.mdoc` so future agents have a public, reader-facing version of the required writing process. The repository-level must-follow process remains in `AGENTS.md`, `.agents/skills/tracify-blog-tool/SKILL.md`, and `content/blog/README.md`.
- Added the centralized `trace-scenario` Markdoc tag in `src/lib/markdoc-blog.ts` and its accessible disclosure renderer in `src/components/blog/markdoc-rich-text.tsx`; it is deterministic, local, and used by the RAG and cost articles.
- `npm run test:content` passes all 16 tests. The first Turbopack build hit a Windows `spawn UNKNOWN` TypeScript-worker error; the full Webpack build then passed after temporarily enabling Node worker threads for verification. The temporary setting was removed, so `next.config.ts` remains unchanged.

## 2026-08-16 Mandatory reply format: every reply starts with "TRACIFY"
- Every reply in this repo, from any agent, must begin with the literal line `TRACIFY` on its own, a blank line, then the reply. See CLAUDE.md "Reply format" section — that's the enforced instruction; this entry is just the pointer so it isn't missed.

## 2026-08-16 Regional cloud launch decision: EU first
- Free-plan Tinybird, Redis, and Inngest environments must not be treated as physically regional merely because they have logical environment names. The owner accepted an EU-first launch.
- PR #14's regional architecture may retain dormant US support, but customer-facing selection and documentation must expose EU only until physically US Tinybird, Redis, and event-processing infrastructure is available and verified.
- Reuse the existing Stripe account and catalog. Only an EU-specific webhook signing secret and EU OAuth callback registration are needed when `eu.cloud.tracify.tech` becomes the application origin.
- Do not promise strict EU residency unless the existing Redis and Inngest services' storage/processing locations are verified. Describe limitations honestly.
- The maintained workflow and owner-action checklist is the pinned regional-cloud section at the top of `task.md`.

## 2026-08-16 Pending work needs BN-KR's own machine
- `task.md` has a `⚠ PENDING — needs BN-KR on their own machine` section pinned at the very top. Read it first whenever asked "what do I need to do" or "what's pending" — it's the maintained source of truth, not this file or conversation history.
- It currently tracks: the EU-first regional-cloud launch and deferred US gates, the uncommitted Resilience Testing dashboard branch (`codex/resilience-testing-dashboard`) and its remaining verification steps, a Convex codegen gap from merged PR #15 (`teamsWebhookUrl` field — hand-patched `convex/_generated/api.d.ts` for the resilience module too, both need a real `npx convex codegen` run), and setting up a GitHub account for Claude Code commit attribution.
- Update that section as items resolve or new local-machine-only blockers appear; don't let it go stale.

## 2026-08-15 Docs IA refinement from Langfuse reference
- The requested reference pattern is an information architecture, not just a color/style reference: persistent left product navigation, central overview with quickstarts and product-area groupings, right-side “On this page” utility, searchable docs, and a clear docs utility/footer layer.
- Future docs redesigns should preserve that hierarchy while keeping Tracify’s own monochrome/acid-yellow visual language and original claims/content.

## 2026-08-15 Vercel docs runtime fix
- Public docs are loaded from `content/docs/*.mdoc` through runtime filesystem discovery. Next/Vercel output tracing may omit dynamically discovered Markdown files even when local builds pass, so `next.config.ts` explicitly includes `./content/docs/**/*.mdoc` in traced server functions.

## 2026-08-15 Documentation migration and content refinement
- Public docs now live in `content/docs/*.mdoc`, separate from `content/blog/*.mdoc`, with Markdoc parsing, searchable navigation, and repository-boundary tests.
- Keep public SDK examples aligned to the published `tracify` package and `TracifyClient` API. The strongest editorial references remain `/product/trace-viewer` and `/security`: concrete, structured, and restrained.
- Avoid fabricated resource titles or generic blog links when a card makes a specific promise; use a real published slug or clearly label the resource as a guide.
- Superseded 2026-09-02: do not restore the old free trace-clinic promise. The free contact offer is now a 20-minute Agent Failure Fit Call for qualification and evidence scoping only; root-cause findings and release recommendations belong to the paid review.

## 2026-08-14 Better Auth SAML login integration
- Added `@better-auth/sso` to the Convex-hosted Better Auth configuration and the React auth client.
- Added the Convex-backed `ssoProvider` schema required by the plugin, with domain verification enabled and strict SAML timestamp/algorithm validation.
- Added a “Continue with SAML SSO” action to both sign-in and sign-up that resolves the provider from the user’s work-email domain and preserves the existing callback destination.
- Published the SAML integration directly to `main` at commit `64464a7` after syncing newer main history.
- Validation: TypeScript and `git diff --check` pass. Full lint remains blocked by 19 pre-existing repository errors; Convex sync is blocked locally by an invalid deployment name containing a leading space.

## 2026-08-13 Vercel preview deployment recovery
- The `codex/llms-seo` previews failed after compilation and TypeScript because Vercel Preview lacked `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL`; Better Auth failed during page-data collection for `/api/evaluation/run`.
- Added both public endpoints to Vercel Preview using the isolated `diligent-dragon-604` development Convex deployment, avoiding production data access from branch previews.
- Redeployed commit `45780f6` as deployment `dpl_F8Uk4ryBBfiDiJXvpc3CHe7PmcfS`; it completed the Next.js build and reached `READY` at the branch alias.
- Updated `docs/vercel-staging.md` to name the current `tracify` Vercel project and require both Convex public endpoints for Preview.

## 2026-08-13 Product page depth and SEO hardening
- Replaced the shared thin product-page template with nine substantial, source-backed pages for Trace Viewer, Cost Dashboard, Tool Calls, LLM Calls, Failure Analysis, Project Reports, Runtime Control, Evaluation Engine, and the AI Engineering Lifecycle.
- Each route now has a feature-specific working-surface visual: trace waterfall, cost ledger, tool payload, model-call accounting, failure stack, report sheet, policy controls, evaluation matrix, or lifecycle rail. The pages share the Future 19 palette and typography but vary hero alignment, section ordering, workflow geometry, and content.
- The landing page was not changed.
- Sitemap entries no longer claim that unchanged static pages were modified at every build; the blog index uses the newest published post date and other static routes omit unknown modification dates.
- Blog JSON-LD now includes canonical page identity, publisher data, absolute images, and breadcrumbs. Product pages include BreadcrumbList JSON-LD.
- All nine product routes rendered at desktop and 375px with no horizontal overflow. Browser structure, canonical/JSON-LD output, and console output were checked; a list-key warning found during QA was fixed.
- Verification passed: focused ESLint, 15 content tests, diff hygiene, and the Next.js production build with 80 generated pages.

## 2026-08-13 llms.txt and SEO audit
- Added `public/llms.txt` as a concise, curated entry point for agents, using canonical public Tracify URLs and explicit availability caveats.
- Added a regression contract to keep the file canonical, deduplicated, concise, and connected to core public resources; it runs with `npm run test:content`.
- Future agents must update the file when core public documentation or product routes change and must not list drafts, authenticated routes, secrets, or speculative capabilities.
- `llms.txt` is maintained for agent discovery only. Google states that it neither helps nor harms Google Search visibility; canonical crawlable pages, useful original content, page experience, sitemap coverage, and valid structured data remain the SEO priorities.

## 2026-08-13 Tracify content-authoring skill
- Added the project-local skill now named `tracify-blog-tool` for drafting, editing, reviewing, storing, and publishing Tracify blogs and documentation.
- The skill distinguishes live storage surfaces: public blogs in `content/blog/*.mdoc`, blog media in `public/media`, internal engineering Markdown in `docs/`, public `/docs` content in its current TypeScript registry, and dashboard reference content in `docs-viewer.tsx`.
- Added an evidence-led writing quality bar, explicit draft/privacy and no-fabrication rules, a complete Markdoc blog example, and an internal-document example.
- Registered the skill as required in `AGENTS.md`. Skill validation passes, the skill body is 405 words, its template parses through the real Markdoc repository, remains a draft, and contains no placeholders.

## 2026-08-13 Payload replaced with Markdoc
- Replaced the Payload-backed blog and CMS with repository-authored Markdoc. The App Router blog index, post pages, metadata, JSON-LD, category filtering, related posts, RSS feed, and sitemap now read `.mdoc` files through a validated server-side content repository.
- Exported all 10 existing Payload articles (roughly 5,000 words each) and their metadata into `content/blog`; all remain drafts because their Payload `_status` was `draft`. Existing image originals and generated card/hero/OG variants remain under `public/media`.
- Removed the Payload route group, `/cms` and `/cms-api`, Payload config/collections/generated types/migrations, dashboard Content link, Next wrapper, TypeScript alias, seven Payload dependencies, and Payload npm scripts. Added Markdoc/YAML dependencies, author documentation, a legacy SQLite-to-Markdoc importer, and focused content tests.
- Verification: 7 content/conversion tests pass, focused ESLint passes, standalone TypeScript passes, diff hygiene passes, and the Next.js production build passes with 69 generated pages. Production runtime checks return 200 for `/blog`, `/blog/rss.xml`, and `/sitemap.xml`, and 404 for `/cms`, `/cms-api/posts`, draft slugs, and unknown blog slugs.
- Full repository ESLint remains blocked by 19 pre-existing errors in unrelated orchestration, marketing, hook, and UI files; none are in the Markdoc migration scope.

## 2026-08-13 Payload-to-Markdoc migration assessment
- Payload currently powers only the public blog/CMS surface, but that surface includes four collections, draft/version and scheduled publishing workflows, media uploads with generated sizes, categories, related posts, SEO metadata, RSS/sitemap queries, and the protected `/cms` editor.
- A Git-authored Markdoc replacement is estimated at 2-4 focused engineering days for application integration and verification, plus roughly 10-30 minutes per ordinary post for content/media conversion and QA.
- Markdoc is a parser/rendering system rather than a browser CMS. Preserving visual editing, roles, drafts, scheduled publishing, and media management requires retaining Payload or adding another editorial layer; a comparable replacement is likely 1-3 weeks.
- The supplied `@markdoc/next.js` example targets the Pages Router. Tracify uses Next.js 16 App Router, so the safer design is explicit server-side `@markdoc/markdoc` parsing within the existing `/blog/[slug]` route rather than adopting the example verbatim.
## 2026-08-13 Payload CMS dashboard access
- Corrected the private-content bootstrap allowlist to the live owner account, `kristofferbon@gmail.com` (the previous address incorrectly included a period).
- Dashboard Content visibility now comes from the same server-side access decision as `/cms`, preventing a client-session mismatch and supporting the existing user, email, and organization access configuration for the whole team.
- Focused ESLint, TypeScript, and diff-hygiene checks pass. Production deployment `dpl_BZ6kJ19vD83ENr6KEQb6rGUDNJdj` is Ready; the live dashboard shows Content and `/cms` now reaches Payload's login screen rather than the previous Next.js 404.

## 2026-08-13 Admin hub
- Consolidated the dashboard's separate Content and Admin Library links into one protected **Admin** entry.
- `/admin` offers authorized users two clear choices: **Admin Library** and **Payload CMS**.
- The hub retains the shared `requireLibraryAccess` policy; the individual destinations remain separately protected.
- Focused ESLint, TypeScript, the Admin-hub route contract check, and diff hygiene pass. Production deployment `dpl_CnFUPs1Jy5vz4u9LN4cwYNPLyurr` is Ready; live verification confirms the sidebar, hub, library, and CMS destinations.

## 2026-08-12 Dashboard onboarding escape and launch plan
- Leaving onboarding now records a durable local dismissal, so the optional setup entry point no longer reappears during ordinary dashboard navigation.
- The empty overview's activation list is now called **Launch plan** and routes to in-dashboard quickstart resources rather than sending an existing project back into onboarding.
- The populated overview now includes a live Launch plan checklist for traces, costs, evaluations, and alert coverage.
- Focused dashboard/onboarding ESLint passed. Full TypeScript verification is currently blocked by pre-existing malformed `.next/dev/types` generated files from another local dev process; no generated files were altered.

## 2026-08-12 Direct Pricing Checkout
- Paid plan CTAs on the homepage and `/pricing` now preserve plan and billing interval and route through `/pricing/checkout`.
- Authentication preserves the checkout destination for email and social sign-in/sign-up.
- Existing customers select a project before hosted Stripe Checkout; new customers can create their first project directly on the checkout page and proceed immediately to payment without completing onboarding.
- Pricing is directly accessible in desktop and mobile navigation. Focused ESLint and diff hygiene pass.

## 2026-08-12 Sitewide Link Audit
- Audited static and generated internal navigation links against the Next.js route manifest, including public marketing/docs/product/use-case/pricing flows and dashboard path templates.
- Fixed stale `/docs/quickstart` links in the docs index, public footers, and exploration navigation by routing them to the existing TypeScript SDK quickstart at `/docs/typescript`.
- Fixed a stale `/docs/api-reference` footer destination to `/docs/api` and changed dashboard documentation navigation from the unavailable `https://docs.tracify.tech` host to the first-party `/docs` route.
- Focused ESLint and `git diff --check` pass. Final production build rerun is pending because another active Next.js process owns `.next/lock`.

## 2026-08-11 Future 19 Public-Site Migration
- Migrated every previously dark/legacy public route family into the Future 19 paper, rule, pixel-type, black-panel, and acid-yellow signal language.
- Added reusable public-page primitives for mastheads, ruled bands, actions, indexes, and article typography.
- Gave each surface a distinct composition: blog signal-board bento, pricing ledger, docs field manual, product capability instrument, use-case failure anatomy, demo lab, integration directory, release tape, roadmap register, status ledger, contact router, trust matrix, and legal records.
- Preserved existing route data and interactions, including Sanity blog content, documentation code examples, pricing billing toggle, demo tabs, integration logos, and dynamic product/use-case metadata.
- Browser QA covered 11 representative public routes at desktop and 375px; all rendered without server errors or horizontal overflow after fixing the integrations mobile shell.
- Verification: focused ESLint, TypeScript, diff check, and full Next.js production build pass; 69 static pages generated.

## 2026-08-11 Sitewide SEO
- Canonical host standardized to `https://www.tracify.tech` in the root metadata base, sitemap, robots host/sitemap declaration, JSON-LD, RSS feed, alert links, and Tracify-owned Sanity blog canonicals.
- Added `robots.ts` to allow public content while blocking dashboard, admin, auth, onboarding, API, library, and preview paths from crawling; it advertises the canonical sitemap.
- Improved root metadata with a title template, search-focused descriptions/keywords, Open Graph/Twitter defaults, and Organization plus SoftwareApplication JSON-LD.
- Added canonical/page metadata across primary public pages and dynamic docs, product, and use-case pages; documentation now supplies static params for its known public routes.
- Expanded the sitemap to include public docs, product features, use cases, changelog, and demo pages while preserving CMS blog URLs.
- Verification: production build passed and generated 75 routes, including `/robots.txt` and `/sitemap.xml`. Focused lint only reports nine pre-existing quote-escaping violations in privacy, security, and terms content; none are from the SEO changes.

## 2026-08-10 Development Password Reset Enabled
- Synced the current Better Auth configuration to the Convex development deployment after localhost reported that password reset was disabled.
- Confirmed the development Convex auth endpoint now accepts `request-password-reset` and returns the enumeration-safe success response for a non-existent test address.
- The implementation keeps one-hour single-use tokens and revokes existing sessions after a successful password reset.

## 2026-08-10 Simplified Auth Layout
- Removed the shared auth-page editorial intro panel, including the Future 19/Auth System label, secure-connection badge, large mode headline, explanatory paragraph, and three benefit cells.
- Every auth route now opens directly on its centered form/status card beneath the standardized Tracify header.
- Verification: TypeScript, focused ESLint, diff check, and browser inspection pass with no horizontal overflow.

## 2026-08-10 Standardized Tracify Wordmark
- Added a canonical `BrandLogo` component matching the production Future 19 navbar wordmark: Geist Pixel Square, tight tracking, and the skewed translucent acid-yellow marker.
- Replaced one-off logo markup in the marketing navbar/footer, auth shell, both dashboard sidebars, and onboarding shell/router.
- Preserved plain-text product mentions and oversized editorial footer treatments because they are content/artwork rather than navigation wordmarks.
- Verification: TypeScript, focused ESLint, diff check, and local browser inspection pass; the auth logo renders at the navbar's 24px metrics with no horizontal overflow.

## 2026-08-10 GitHub OAuth Enabled
- Added the supplied GitHub OAuth App client ID and secret to both Convex development and production environments without committing them to the repository.
- Redeployed the production Convex Better Auth server; the existing conditional `github` social provider is now active alongside Google.
- GitHub OAuth App callback must remain `https://www.tracify.tech/api/auth/callback/github` because the canonical Better Auth `SITE_URL` is `https://www.tracify.tech`.

## 2026-08-10 Better Auth Social Credentials
- Existing Google OAuth credentials were found in `.env.prod` and synchronized without exposing their values to both Convex development (`diligent-dragon-604`) and production (`focused-otter-289`), where Better Auth executes.
- The Better Auth server and Future 19 auth UI already support conditional Google and GitHub providers.
- No reusable `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET` exists in the local environment; Clerk-managed social credentials cannot be extracted, so a GitHub OAuth App still needs to be created and its credentials added to Convex.
- Google Cloud must allow `https://www.tracify.tech/api/auth/callback/google` (and localhost for local testing) as an authorized redirect URI.

## 2026-08-10 Better Auth Sentinel
- Added Better Auth Infrastructure `sentinel()` to the Convex-hosted auth server and `sentinelClient()` with automatic proof-of-work challenge handling to the React auth client.
- Configured the project-specific identify endpoint in production Convex and Vercel (`BETTER_AUTH_IDENTIFY_URL` plus the browser-exposed `NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL`).
- Deployed Convex and Vercel production; deployment `dpl_5Yg6Arq6SMSBnUw3ALpnLt6fhAMz` reached Ready and both `www.tracify.tech` and `tracifytech.vercel.app` point to the new build.
- Sentinel uses its default security policy initially so events can be observed before adding stricter block/challenge thresholds.

## 2026-08-10 Stable Staging Alias
- Assigned `https://tracifytech.vercel.app` to the current Ready production deployment so the previously empty Vercel domain now serves Tracify.
- Added the stable staging hostname to Better Auth `trustedOrigins` and redeployed Convex production; authentication requests originating from that alias are now accepted.
- Verification: TypeScript, focused auth ESLint, Vercel alias assignment, and Convex production deployment pass.

## 2026-08-10 Better Auth Production Connection
- Replaced the production Convex `BETTER_AUTH_API_KEY` with the newly issued dashboard key and deployed the current Convex backend, including the `@better-auth/infra` `dash()` plugin and `/api/auth/dash/validate` ownership endpoint.
- Deployed the current application directly to Vercel production. Deployment `dpl_6ubgahD4kp66Ah6BDkVCSdBo4r3Y` reached Ready and `https://www.tracify.tech` resolves to it.
- The Convex deployment also applied all pending schema/index changes present in the worktree, including replacing `agentRuns.by_projectId_startedAt` and adding the evaluation/session indexes reported by Convex.

## 2026-08-10 Future 19 Auth Experience
- Rebuilt every Better Auth-facing page in the homepage's Future 19 visual system: cream field, black rules, acid-yellow interaction states, pixel headlines, mono labels, hard shadows, and zero-radius controls.
- Sign-in and sign-up now support both GitHub and Google OAuth plus email/password, safe absolute callback URLs, redirect preservation, password visibility, and accessible error states.
- Added `/forgot-password`, `/reset-password`, and `/auth/error`; password reset emails use Better Auth Infrastructure, expire after one hour, and revoke other sessions when completed.
- Reworked `/accept-invitation` into the same auth shell and suppressed the global marketing navbar/footer across all auth routes.
- GitHub OAuth is conditionally enabled by `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the Convex deployment environment.
- Verification: TypeScript, focused ESLint, diff check, and responsive in-app browser QA pass with no horizontal overflow and 48px auth controls.

## 2026-08-10 Better Auth Migration
- Replaced Clerk runtime dependencies, providers, middleware, auth screens, server checks, dashboard account controls, organization switching, member invitations, and Convex JWT configuration with Better Auth.
- Better Auth runs inside the Convex-maintained `@convex-dev/better-auth` component; auth data remains in Convex and the Next.js `/api/auth/[...all]` route proxies to the Convex HTTP deployment.
- Enabled email/password, optional Google OAuth, organizations, encrypted OAuth tokens, persistent rate limiting, explicit trusted origins, and organization role claims in Convex JWTs.
- Added Better Auth Infrastructure `dash()` and configured its API key on development and production Convex deployments. Production `SITE_URL` is `https://www.tracify.tech`; the bare domain redirects with 308 and must not be entered in the Better Auth dashboard.
- Installed the six official Better Auth agent skills under `.agents/skills`.
- Development Convex functions are synced. Production deployment is intentionally pending because the worktree contains extensive unrelated changes.
- Verification: `npx.cmd tsc --noEmit`, focused ESLint (generated-file warnings only), Better Auth session endpoint (200), Infra validation endpoint (401 without dashboard JWT, proving it is mounted), and `npm run build` all pass.

## 2026-08-07 Homepage Lifecycle Rail
- Added a linked Detect → Inspect → Evaluate → Promote → Monitor rail beneath the interactive marketing showcase.
- The rail uses numbered editorial steps, quiet dividers, and direct links to trace, evaluation, lifecycle, and failure product surfaces.
- Added varied public compositions: Linear-style workflow canvas, centered connection statement, integration matrix, Better Auth-style README quickstart, and Langfuse-style FAQ block.
- Public product feature pages now include evidence panels, capability signals, and clear next-step CTAs.
- Verification: focused ESLint, standalone TypeScript, `git diff --check`, and production build pass.

## 2026-08-07 Command-Center Landing Page
- The homepage now leads with a realistic production incident rather than a generic trace: a selectable timeout/retry trace, root-cause inspector, recommended fix, and direct signup/demo path.
- The page tells one consistent Detect → Inspect → Diagnose → Evaluate → Ship narrative, with incident-linked Trace, Cost, Evaluation, Prompts, and Alerts panels plus SDK/OTLP activation code and copy feedback.
- Marketing metadata now positions Tracify around agent-failure diagnosis and `/opengraph-image` produces a bespoke social command-center card.
- Legacy `tracify` install strings in the final CTA now use `tracify`; the footer status label links to `/status`.
- Verification: `npx.cmd tsc --noEmit`, focused marketing ESLint, `git diff --check`, and a full `npm run build` pass. Next generates 58 routes, including the Open Graph image route.

## 2026-08-07 Dashboard Saved Runs Views
- Runs now supports named, project-scoped saved views for status, search, model, session, environment, release, cost/span thresholds, sort, and page size.
- Restore updates the visible controls and URL query state; saved views are stored locally, capped at 12, and can be deleted individually.
- Runs rows now expose a keyboard-operable focus target with Arrow Up/Down, Home/End navigation, and Enter to open the trace.
- Runs now supports server-backed time filtering for the last 24 hours, 7, 30, or 90 days; the selected window is URL-addressable and included in saved views.
- Dashboard routes now have a shared loading skeleton and recoverable error boundary, so slow or failed authenticated navigation remains actionable.
- Command menu now turns a typed identifier into direct `Inspect run` and `Open session` destinations under the active project.
- Missing dashboard routes now render an intentional not-found state with a return-to-projects action.
- Alert muting now requires explicit confirmation and explains the available reopen path.
- Overview now surfaces failure rate and p95 latency from the recent run sample, with honest sample/no-data labeling and filtered Runs links.
- With the dev server running, `npm run smoke:beta` passes all 5 available checks and skips only the 2 checks requiring `TRACIFY_SMOKE_API_KEY`/project credentials.
- Final production build passes after the dashboard/API changes, generating 58 routes. Browser-based visual QA could not complete because local dashboard navigation timed out before a reliable authenticated render.
- A fresh browser tab successfully inspected the public trace-first entry page; the dashboard route redirects to `/sign-in?redirect_url=...` as expected, preventing authenticated dashboard screenshots in the current session.
- Trace payload copy actions now handle clipboard failures, announce success/failure to assistive technology, and expose explicit accessible names/focus rings.
- Trace Viewer selection now persists as `?span=<spanId>`, restoring the selected evidence panel after refresh and making shared debugging links more precise.
- Alerts now have an explicit optional `state` (`active`, `resolved`, `muted`); legacy records render as active, while authorized users can transition states from the alert center.
- Global CSS now honors `prefers-reduced-motion` by collapsing animation/transition durations and disabling smooth scrolling.
- Trace Search now has actionable first-use/no-result states and an inline retryable analytics-unavailable error instead of a bare placeholder.
- Extended verification now passes: platform lint, TypeScript, and a 600-second-window production build completed successfully; Next generated all 57 routes.
- Dashboard-wide ESLint now passes with zero errors or warnings across `src/components/dashboard` and `src/app/dashboard`.
- Verification: `npx.cmd eslint src/components/dashboard/runs-table.tsx`, `npx.cmd tsc --noEmit`, and `git diff --check` pass.

## 2026-08-07 Marketing Visual Redesign
- Public homepage redesigned toward a Better Auth × Langfuse visual language: editorial grid, restrained monochrome surfaces, numbered sections, trace-first hero, integrations strip, README quickstart, and product-led CTA.
- Existing Tracify fonts and zero-radius black/white system were retained.
- Dashboard, auth, onboarding, backend, and existing marketing routes were left unchanged.
- `npx.cmd tsc --noEmit`, homepage ESLint, and `npm run lint:platform` pass. The production build now completes successfully across 57 routes.
- Follow-up viewport pass tightened the hero to `100svh` minus the fixed nav, reduced the headline/trace footprint, and kept primary CTAs visible above the fold.
- The hero trace preview is now interactive: visitors can select individual spans, inspect latency/cost context, and toggle live/inspection mode.
- Rebuilt the homepage again from the pure-black interactive brief: added workflow map, failure-to-fix comparison, tabbed product showcase for Trace/Cost/Evaluation/Prompts/Alerts, runtime-aware README lab, ecosystem rail, guide-line backgrounds, and pure-black panels.
- Verification: homepage ESLint, TypeScript, diff check, and full Next production build pass across 57 routes.

## 2026-08-05 Platform Continuation
- Official Langfuse review highlighted score analytics and model comparison as remaining product gaps; Tracify now has both in the evaluation and playground surfaces.
- Evaluation sub-routes previously rendered a generic “ready to be expanded” panel. They now expose dataset, run, monitor, and settings workflows backed by Convex state.
- `npm run build` and `npx tsc --noEmit` pass after the changes. `npm run lint:platform` passes cleanly. The unauthenticated smoke script can lose its external local server mid-run; this is not an application build failure.
- Annotation review now has Convex-backed reviewer records, self-claim/submission controls, and queue-level agreement visibility; production build remains green.
- Prompt deployment now has a real runtime contract at `/api/prompts/:name?environment=production`; it resolves only explicitly labeled versions using the project API key and is documented under `/docs/prompts`.
- Both SDKs expose prompt resolution helpers (`getPrompt` and `get_prompt`) and show how to attach the returned version id to a traced generation.
- Datasets now support backward-compatible `project` or `restricted` access, with owner-only access changes and experiment visibility checks.
- Experiment summaries now calculate score deltas against the prior run and the UI labels improvements versus regressions.
- API-key score ingestion now honors and validates the SDK-provided data type instead of coercing every custom score to text.
- Prompt SDK helpers now cache resolved deployments for 60 seconds by default and serve stale/fallback prompts when the resolver is unavailable.
- The platform smoke script now probes `/api/evaluation/run`; the full Next production build completed successfully across 56 routes on this pass.
- Root scripts now expose `test:sdk:ts` and `test:sdk:python`; both SDK suites pass after adding Python test-path configuration.
- Public pricing pages now accurately describe the shipped AI engineering workflows instead of calling them roadmap items.
- Platform smoke now checks `GET /api/otel`; its API-key prefix matches the Convex project key generator (`tracify_sk_live_`).
- `projects.markApiKeyUsed` now verifies the supplied API-key hash, project ID, and active status before patching usage metadata.
- Datasets are now directly reachable at `/dashboard/[projectId]/datasets` and use the live Evaluation Engine dataset workflow rather than being hidden under Evaluation.
- Trace viewer now exposes a copyable deep link for sharing findings; the action remains within the existing project authorization boundary.
- Dashboard Resources now links directly to `/integrations`, making framework/provider setup discoverable from an authenticated project workspace.
- `npm run lint:platform` passes. Full `npm run lint` remains noisy because of pre-existing blog/marketing `any` and hook-rule violations outside the platform scope.
- Production prompt labels are now backend-gated; direct prompt editing cannot bypass the evaluation suite promotion mutation.
- Integrations docs now include a Python OTLP exporter example for OpenAI/LangChain/LlamaIndex and the attributes needed for sessions and releases.
- The focused platform lint command now includes the newest routes/components rather than only the original workflow files; it passes alongside `tsc --noEmit`.
- `/demo` now has a working promotion interaction instead of a dead button, completing the visible Trace → Experiment → Deploy story.
- Live `npm run smoke:platform` now passes all public, protected, OTLP, prompt, evaluation, experiment, and dataset route checks; invalid offline evaluation IDs return 404 instead of 500.
- Final production build completed successfully across 56 routes after the demo, navigation, deployment-safety, and evaluation API fixes.
- Platform smoke now verifies both `GET /api/otel` health and rejection of unauthenticated OTLP ingestion.
- Platform smoke also rejects unauthenticated native ingestion, covering the primary SDK/API path.
- The lifecycle is now documented explicitly at `/docs/lifecycle` and `/product/lifecycle`, not only implied by the interactive demo.
- The demo now has an explicit Datasets surface alongside Prompts, Evaluation, and Experiments, completing its seeded lifecycle coverage.

## Overview
- Last Synced: 2026-06-16T12:00:00Z
- Purpose: tracify — Agent Observability Platform (Full visibility into AI agent steps, decisions, cost, failures).
- Stack: Next.js 16 (App Router), Clerk (Auth/Orgs), Convex (App DB), Tinybird (Telemetry Storage), Redis (API cache), Inngest (Background Jobs).

## Architecture
- **Auth:** Clerk handles user and organization auth. Now uses **Keyless mode** for local development.
- **Application State:** Convex is the source of truth for app metadata (`projects`, `agentRuns`, `alerts`). It provides reactive UI updates.
- **Telemetry Data:** Tinybird is the high-volume time-series database for raw telemetry (`spans`).
- **Ingestion Pipeline:** SDK calls POST `/api/ingest` -> Inngest event -> validates, writes to Tinybird, upserts rollups to Convex, triggers alerts.
- **Typography:** Uses **Geist Pixel Square** for logos (regular weight, normal tracking) and H1 headers, Geist Mono for UI/Data, and Geist Sans for prose.
- **Aesthetics:** Strict "Developer-grade" look: **0px border radius**, monochrome palette (#000000 bg, #FFFFFF primary), and **Emil Kowalski** design engineering principles (tactile feedback, micro-animations, polish).
- **Branding:** Site UI rebranded to **tracify** (lowercase logo with Geist Pixel Square, same monochrome styling). SDK packages already use `tracify`; internal storage keys and Inngest event IDs retain legacy `tracify` prefixes for compatibility.
- **Navigation:** Integrated a custom monochromatic `DropdownMenu` for both Project Switching and Account management in the topbar.
- **Legal:** Dedicated `/privacy` and `/terms` pages with a minimalist, linked **Footer** component.
- **Auth:** Google OAuth credentials configured in `.env.prod`, `.env.local`, and Vercel production variables.

- **Evaluation Engine (2026-08-06):** Added versioned evaluator/suite/job/result/monitor/feedback schema and authenticated Convex mutations in `convex/evaluationEngine.ts`. The dashboard now has a unified Evaluation Engine workspace with overview, evaluator, dataset, run, monitor, review, and settings routes. Trace Viewer shows linked quality scores/results/feedback. Online evaluation now runs through a secret-protected Convex HTTP action invoked from Inngest, with deterministic rules, LLM judges, built-in groundedness/toxicity/PII/jailbreak/prompt-injection/policy templates, idempotent results, automatic failed-trace review queueing, and monitor alert creation. Offline jobs run through `/api/evaluation/run`. Reviewer assignment supports round-robin/least-loaded rotation and agreement metrics. TypeScript/Python SDKs expose feedback and score helpers. Public marketing and quickstart/SDK docs expose the workflow. Live online/API-key feedback requires the same `EVALUATION_INTERNAL_SECRET` in Next and Convex environments.


## Conventions
- Use Tailwind CSS and shadcn/ui.
- Follow Next.js 16 App Router best practices (React Server Components by default).
- Convex queries/mutations live in `convex/`.
- **Path Aliases:** Use `convex/_generated/api` for Convex imports and `@/*` for `src/` imports.
- Tinybird REST API is used for high-volume ingest and heavy analytics queries (`lib/tinybird.ts`).

## Known Issues
- None yet (MVP phase).

## Infrastructure
- Frontend/API: Vercel (target)
- Database: Convex Cloud
- Analytics: Tinybird (Clickhouse)
- Queues: Inngest
- **Environment:** Created `.env.prod` template for streamlined Vercel deployment. Isolated local dev via Tinybird `dev` branch.

## Recent Important Changes
- **Site Rebrand to Tracify (2026-06-14):**
  - **UI:** Marketing, auth, onboarding, dashboard, legal pages, and Slack alert copy now show **tracify** branding with unchanged monochrome styling (Geist Pixel Square logo, 0px radius, black/white palette).
  - **Env copy:** Onboarding and quickstart surfaces now show `TRACIFY_API_KEY` instead of `TRACIFY_API_KEY`.
  - **Links:** Public docs/social/email links use **tracify.tech** domains.
  - **Unchanged:** localStorage keys, Inngest app/event IDs, and backend env var fallbacks kept for compatibility.

- **Tracify SDK Package Rename (2026-06-14):**
  - **Public Packages:** Python distribution and TypeScript npm package metadata now use `tracify`.
  - **Install Copy:** Marketing CTA, dashboard docs, SDK READMEs, quickstart docs, design specs, and project-manager summary now show `pip install tracify-sdk` and `npm install tracify-sdk`.
  - **Imports:** Added Python `tracify` import package that re-exports the existing SDK, and added TypeScript `TracifyClient` export while preserving legacy `tracify` / `TracifyClient` compatibility.
  - **Environment:** SDKs now prefer `TRACIFY_API_KEY` and `TRACIFY_CURRENT_RUN_ID`, with fallbacks for existing `TRACIFY_*` variables.
  - **Verification:** `npm run build` passes for the TypeScript SDK and full Next app. Python import smoke test passes using the repo virtualenv with local `PYTHONPATH`.

- **Marketing Repositioning, Pricing, and Beta Smoke Script (2026-05-21):**
  - **Positioning:** Landing hero copy now centers the broader niche: agent observability for production AI workflows, with concrete language around what the agent did, why it failed, cost, and what to fix next.
  - **Audience:** Use-case section now explicitly covers developers, AI startups, AI agencies, internal teams, and operators before agent-type examples.
  - **Honest Pricing:** Added `/pricing` and rewrote the landing pricing teaser around Free/Pro/Team/Enterprise beta states without claiming replay, evals, email alerts, self-hosting, PDF export, or runtime controls as currently working.
  - **Navigation:** Marketing navigation no longer advertises Run Replay as a product surface; it points to reports instead.
  - **Smoke Tests:** Added `npm run smoke:beta` using `scripts/beta-smoke.mjs` for missing API key, invalid API key, invalid payload, protected route reachability, and optional valid-span/Convex-run verification when smoke env vars are provided.
  - **Verification:** `npm run build`, `node --check scripts\beta-smoke.mjs`, and default `npm run smoke:beta` pass. Default smoke skips valid ingest/run checks until `TRACIFY_SMOKE_API_KEY` and `TRACIFY_SMOKE_PROJECT_ID` are set.

- **Reports, Honest Billing, and Tinybird Pipe Prep (2026-05-20):**
  - **Reports:** Added `/dashboard/[projectId]/reports` with a print-friendly project report covering run totals, failed runs, saved cost, span count, top models, top tools, recent alerts, and notable failed traces.
  - **Project Metadata:** Added optional `clientName` and `reportNotes` project fields, surfaced in settings, so agencies/internal teams can label stakeholder reports without changing ingest payloads.
  - **Billing:** Replaced hardcoded billing usage and nonfunctional upgrade buttons with real Convex saved usage, current `planTier`, and beta "Join beta" states while Stripe remains unconnected.
  - **Analytics:** Extended stats cache/API responses with Tinybird-backed tool cost breakdowns and adjusted the daily Tinybird read reservation from 2 to 3 reads for stats refreshes.
  - **Tinybird:** Added endpoint pipe definitions for `spans_by_run` and `recent_runs_summary` under `tinybird/endpoints/`.
  - **Verification:** `npx convex codegen` and `npm run build` pass.

- **Settings, Alerts, and RBAC Hardening (2026-05-18):**
  - **Settings Validation:** Project settings now validate project name, non-negative cost thresholds, positive integer duration/stall thresholds, and Slack webhook URLs on both client and Convex mutation paths.
  - **Slack Test:** Settings includes a guarded "Send test alert" action that posts to the saved Slack webhook only for admins.
  - **RBAC:** Project settings updates, API key rotation, and project deletion now require project owner, configured app admin, or Clerk org admin access; comments require developer/admin style access.
  - **Alerts:** Alert creation deduplicates repeated run/type events, topbar alert clicks mark individual alerts read, and alert/comment queries now enforce project access.
  - **Runs Search:** Runs search now performs an exact indexed runId lookup across saved project runs in addition to loaded-page filtering.
  - **Teams:** Settings members now renders Clerk organization membership data instead of placeholder teammates.
  - **Verification:** `npx convex codegen` and `npm run build` pass.

- **Trace Viewer Product Polish (2026-05-18):**
  - **Core UX:** Added a compact span latency overview above the timeline so a developer can scan trace shape before opening individual spans.
  - **Inspection:** Input/output payload panels now have copy buttons with immediate copied feedback.
  - **Debugging:** Error spans auto-expand, and empty completed traces now show a clear inline empty state instead of a blank timeline.
  - **Summary:** Added a right-side trace summary panel with cost/latency metrics plus model and tool breakdowns.
  - **Verification:** `npm run build` passes.

- **Alert Read State + Visibility (2026-05-18):**
  - **Backend:** Added optional `alerts.readAt` and public `alerts:markAllRead`, guarded by the same Clerk project access check as alert listing.
  - **UX:** Topbar bell now counts unread alerts only, highlights when unread notifications exist, and exposes a `Read all` action in the popup.
  - **UX:** Unread popup rows have a stronger border/background, a left accent rail, and a `New` label so fresh notifications are easier to spot.
  - **Verification:** `npx convex codegen`, `npx convex dev --once`, and `npm run build` pass.

- **Alerts Popup Conversion (2026-05-18):**
  - **UX:** Converted the dashboard Alerts entry from a primary sidebar/page destination into a topbar bell popup showing recent alerts inline.
  - **Navigation:** Removed Alerts from the primary dashboard sidebar. The old `/dashboard/[projectId]/alerts` route remains as a compatibility redirect back to the project overview.
  - **Security:** Hardened `alerts:listByProject` to verify Clerk identity has access to the project before returning alerts.
  - **Verification:** `npx convex codegen`, `npx convex dev --once`, and `npm run build` pass.

- **Dashboard Runs Pagination (2026-05-18):**
  - **Backend:** Added Convex `agentRuns:getRunsPageByProject` using `paginationOptsValidator`, project access checks, and server-side status filtering.
  - **Backend:** Added bounded `agentRuns:getRunCountsByProject` so pagination can show total pages for the active status filter. Counts are capped at 1,000 and should become denormalized counters for large production projects.
  - **UI:** Runs table now uses Convex paginated results instead of a fixed 25-run query.
  - **Controls:** Added rows-per-page controls for 10/25/50 runs, Prev/Next buttons, and a `Page X of Y` indicator.
  - **Behavior:** Duration still ticks client-side for running runs; status filters reset to page 1 and search applies within loaded results.
  - **Verification:** `npx convex codegen` and `npm run build` pass.

- **Dashboard Analytics Empty-State Polish (2026-05-18):**
  - **UX Copy:** Removed the visible `Analytics temporarily unavailable; showing cached data` label from dashboard refresh controls and trace span status copy.
  - **Controls:** Overview and Costs range selectors plus manual refresh controls are right-aligned in the dashboard header/control area.
  - **Charts:** Overview and Costs now always render a date series for the selected range. Analytics data wins when available; saved Convex run summaries are used when analytics is empty; a zero baseline renders when no runs exist yet.
  - **Verification:** `npm run build` passes.

- **Low-Query Analytics Refresh (2026-05-17):**
  - **Goal:** Keep Tinybird read volume under 1,000/day while preserving a live-feeling dashboard.
  - **Stats Cache:** Added Convex-backed `analyticsStatsCache` keyed by project/range with 10-minute fresh TTL, 24-hour stale fallback, and metadata used by Overview/Costs labels.
  - **Budget Guard:** Added `tinybirdReadBudget` with stats refresh reservations counting 2 Tinybird reads, soft protection near 850/day, and hard protection near 980/day.
  - **Manual Refresh:** Overview and Costs now expose an explicit Refresh button and status copy; repeated manual refreshes cool down for 30 seconds.
  - **Polling Removed:** `useProjectStats` no longer does 4-second Tinybird polling. It fetches on load/range/visibility and only performs controlled stale refreshes from Convex activity.
  - **Span Cache:** Run span responses are cached in Convex; running traces use cached spans by default and expose `Refresh spans`.
  - **Live Durations:** Runs table and trace viewer durations now tick with a client timer from Convex run timestamps, without Tinybird requests.
  - **Verification:** `npx convex codegen` and `npm run build` pass.

- **Redis Analytics Cache Layer (2026-05-17):**
  - **Goal:** Prevent empty analytics screens when the analytics backend is unavailable before Convex has a warm cache.
  - **Dependency:** Installed `redis` and added `REDIS_URL` support for server route handlers.
  - **Stats Route:** `/api/projects/[projectId]/stats` now verifies project access, reads fresh Redis cache before spending analytics reads, writes successful analytics responses to Redis, and uses stale Redis cache before returning an empty analytics payload.
  - **Spans Route:** `/api/projects/[projectId]/runs/[runId]/spans` now caches span responses in Redis; running traces use a 30-second fresh window and otherwise require manual refresh while terminal traces can reuse cached data for 24 hours.
  - **Security:** Redis responses are only served after existing Clerk/Convex project or run access checks pass. The real Redis URL is local-env only; `.env.local.example` contains a placeholder.
  - **Verification:** `npm run build` passes and a Redis smoke test writes/reads a temporary key successfully.

- **Project Manager Summary Document (2026-05-17):**
  - **File:** Added `docs/project-manager-project-summary.md` as a detailed handoff summary for non-implementation stakeholders.
  - **Scope:** Captures product status, architecture, implemented dashboard areas, Convex functions, API routes, Inngest/Tinybird pipeline, SDK/package status, deployment lessons, major bug fixes, and open production-beta work.
  - **Purpose:** Gives a project manager enough context to track what has shipped, what is verified, and what remains without reading the full codebase.

- **Run Cancellation + Clickable Dashboard Breadcrumbs (2026-05-17):**
  - **Run Control:** Added a guarded `agentRuns:cancelRun` Convex mutation that can mark a running saved run summary as `cancelled` after verifying Clerk identity and project access.
  - **UI:** Runs table and trace detail now expose a two-step stop/cancel control for running traces; completed, failed, and cancelled runs remain terminal and are not overwritten by later ingest updates.
  - **Navigation:** Dashboard topbar breadcrumbs are clickable for parent levels. `Dashboard` returns to the active project overview, and nested section crumbs like `runs` return to the section list while the current leaf remains plain text.
  - **Limit:** Cancellation currently stops the observed dashboard run state only; it does not terminate a user's external agent process until SDK/runtime cancellation polling is added.
  - **Deployment Note:** The stop button requires the Convex deployment to have `agentRuns:cancelRun`; after the frontend error, both dev `diligent-dragon-604` and prod `focused-otter-289` were synced and verified with `convex function-spec`.
  - **Verification:** `npm run build` passes.

- **Hybrid Dashboard Refresh Strategy (2026-05-17):**
  - **Goal:** Make dashboard stats feel closer to 1-second updates without permanently polling Tinybird every second.
  - **Approach:** Added shared `useProjectStats` hook for Overview and Costs that keeps 4-second visible-tab polling as a fallback.
  - **Realtime Trigger:** Convex `getProjectManagementSummary.latestActivityAt`/totals now act as a live refresh signal; when saved run summaries change, the hook schedules quick stats refetches after 750ms and 2500ms.
  - **Efficiency:** This preserves efficient baseline polling while refreshing charts/model breakdowns immediately after Convex sees new activity.
  - **Robustness:** The hook avoids duplicate in-flight requests for the same project/range and ignores stale responses when the user switches ranges.
  - **Verification:** `npm run build` passes.

- **SDK Install Copy Finalization (2026-05-17):**
  - **Goal:** Make every user-facing install path consistently show the now-published package names.
  - **Change:** Onboarding Python install now uses `pip install tracify-sdk` instead of the old GitHub package URL.
  - **Change:** Marketing final CTA terminal now shows both `pip install tracify-sdk` and `npm install tracify-sdk`.
  - **Change:** The onboarding AI setup prompt now explicitly tells coding agents to use `pip install tracify-sdk` for Python and `npm install tracify-sdk` for TypeScript/Node.js.
  - **Verification:** Searched source/docs for stale `pip install tracify-sdk`, GitHub Python install, `npm install @tracify`, and `tracify` references outside dependency folders; `npm run build` passes.

- **Python SDK PyPI Package Rename Prep (2026-05-17):**
  - **Goal:** Make Python install match the public product/package name: `pip install tracify-sdk`.
  - **Change:** `packages/python-sdk/pyproject.toml` now uses distribution name `tracify` while keeping the import module as `tracify`.
  - **Reason:** PyPI distribution names may be installed as `tracify`, but Python import statements cannot cleanly use `from tracify import ...`; user code should install `tracify` and import from `tracify`.
  - **Docs:** Updated Python install snippets in app quickstart/docs and package README from `pip install tracify-sdk` to `pip install tracify-sdk`.
  - **Verification:** `uv build` produced `dist/tracify-0.1.0.tar.gz` and `dist/tracify-0.1.0-py3-none-any.whl`; local wheel smoke test imported `TracifyClient`, `trace_agent`, `llm_call`, and `tool_call`; `uv publish --dry-run` passed. Real PyPI upload still needs a PyPI API token.

- **Production Convex Auth Recovery (2026-05-17):**
  - **Issue:** Production project creation could stay on "waiting for auth", matching the previous dev failure.
  - **Cause:** The production Clerk instance had no JWT templates, so `ConvexProviderWithClerk` could not fetch `getToken({ template: "convex" })`.
  - **Fix:** Created production Clerk JWT template `convex` with `aud: "convex"` and standard user claims.
  - **Fix:** Deployed current Convex functions/auth config to prod deployment `focused-otter-289`.
  - **Verification:** Production Clerk now lists JWT template `convex`, Convex prod env has `CLERK_JWT_ISSUER_DOMAIN=https://clerk.tracify.tech`, and Vercel production has the required Clerk/Convex env vars.
  - **Runbook:** Detailed dev/prod troubleshooting steps are documented in `docs/troubleshooting-convex-clerk-auth.md`.

- **Dashboard Layout Fix (2026-05-17):**
40:   - **Issue:** Identified a 56px "bar" or gap at the bottom of the dashboard content area.
41:   - **Cause:** A hardcoded height subtraction `h-[calc(100svh-56px)]` in `DashboardShell` was reserving space for a topbar that is actually rendered inside the scrollable content.
42:   - **Fix:** Removed the height subtraction and set `main` to `h-svh pb-0` to fill the viewport and eliminate the gap.
43: 
44: - **Dashboard Decision Document Alignment Pass (2026-05-17):**
  - **Source:** Read `tracify - docs\tracify_dashboard_decisions.docx` and used it as the dashboard MVP target.
  - **Navigation:** Added `/dashboard/[projectId]/costs` and removed API Keys/Billing from primary sidebar navigation; those are now settings-owned actions per the decision doc.
  - **Settings Hub:** Settings now includes API Keys and Management tabs, making project operations discoverable without cluttering primary nav.
  - **Overview Scope:** Removed model distribution from the overview chart area; model breakdown now belongs on the Costs page.
  - **Costs Page:** Added a lightweight cost dashboard with total spend, 7/30/90 day range controls, cost-over-time, cost-by-model, expensive saved runs, and threshold link.
  - **Verification:** Convex dev sync passed and `npm run build` passes with `/dashboard/[projectId]/costs` included.

- **Dashboard Saved Totals Fallback (2026-05-17):**
  - **Issue:** New agent workflow runs appeared in Convex-backed run lists, but overview/cost totals could stay stale because the top cards depended on Tinybird analytics only.
  - **Fix:** Overview spend/span cards now use Convex `getProjectManagementSummary` saved totals as the immediate source of truth when analytics are unavailable or behind.
  - **Fix:** Costs total spend now uses the larger of Tinybird analytics and Convex saved totals, so newly ingested high-cost runs show immediately while detailed analytics catches up.
  - **Correction:** Range-scoped spend and span cards must use Tinybird analytics for the selected range when available; Convex saved totals are all-time-ish fallback only when Tinybird is unavailable.
  - **Verification:** `npm run build` passes.

- **Tinybird SQL JSON Response Fix (2026-05-17):**
  - **Issue:** Dashboard analytics showed `Tinybird analytics unavailable` even though Tinybird had data because `/v0/sql` returned tab-separated output and the app attempted `res.json()`.
  - **Fix:** Tinybird SQL helpers now append `FORMAT JSON` to every analytics query so `getDailyCosts`, `getCostByModel`, and run span queries parse correctly.
  - **Verification:** Direct Tinybird query with `FORMAT JSON` returned JSON and `npm run build` passes.

- **Historical Demo Data Seed (2026-05-17):**
  - **Script:** Added `scratch/user-test-tracify/seed-history.mjs` and `npm run seed:history` for local demo data generation.
  - **Data Shape:** Seeds 13 previous days with 22 runs, 132 spans, varied costs, one failed run, and model coverage across `gpt-5.5`, `claude-3-opus-latest`, and `claude-3-5-sonnet-latest`.
  - **Verification:** Seed ran through the real `/api/ingest` path, Convex saved historical run summaries, Tinybird returned 14-day daily JSON rollups, and `npm run build` passes.

- **Dashboard Analytics Auto-Refresh (2026-05-17):**
  - **Issue:** Tinybird-backed charts and model breakdowns only updated after a manual page refresh.
  - **Fix:** Overview and Costs now poll `/api/projects/[projectId]/stats` every 4 seconds while the tab is visible, use `cache: "no-store"`, and refresh immediately when the tab becomes visible again.
  - **UX:** Polling keeps existing chart data on screen and avoids skeleton flicker after the first load.
  - **Verification:** `npm run build` passes.

- **Savings Impact Cost Graph (2026-05-17):**
  - **Issue:** The Costs page line graph was too plain and did not communicate the visual impact of reducing agent spend.
  - **Fix:** Replaced the basic cost-over-time line with a savings-impact area chart: actual spend, shaded estimated avoided spend, and a dashed peak-day baseline.
  - **UX:** Added peak day, latest day, and estimated avoided-spend cards above the chart to make savings visible before reading the graph.
  - **UX:** Savings copy now always renders with `$0.00` when there is no computed saving instead of disappearing.
  - **UX:** Overview and Costs now keep spend as the primary number and show savings as smaller secondary sub-metrics in the same card.
  - **UX:** Dashboard Overview now has a 1d/7d/30d/90d range switcher and shows total potential savings for the selected period, not per-day savings.
  - **Demo Data:** Added `scratch/user-test-tracify/seed-savings.mjs` and `npm run seed:savings` to create a clear unoptimized-to-optimized savings pattern through the real ingest path.
  - **Verification:** `npm run build` passes.

- **Custom 404 Page (2026-05-17):**
  - **Fix:** Added `src/app/not-found.tsx` using the existing monochrome tracify visual language for unmatched routes and `notFound()` cases.
  - **UX:** Includes direct actions back to `/dashboard` and `/`, plus a small trace-style status panel.
  - **Verification:** `npm run build` passes and Next generates the `_not-found` route.

- **Project Management + Safer Delete Flow (2026-05-17):**
  - **Stats Resilience:** `/api/projects/[projectId]/stats` now returns an empty analytics payload with `unavailable: true` when Tinybird is unavailable instead of surfacing a dashboard console error.
  - **Management Page:** Added `/dashboard/[projectId]/manage` with Convex-backed saved stats: runs, spans, saved cost, alerts, recent runs, lifecycle, API key last-used, and alert thresholds.
  - **Navigation:** Added Manage to the dashboard sidebar, account menu, and overview activity header.
  - **Deletion Safety:** Project deletion now requires typing the exact project name and `DELETE`; deletion also removes saved Convex runs, alerts, and comments for the project.
  - **Verification:** Synced Convex dev, verified `projects:getProjectManagementSummary` for `test_manual_api`, and `npm run build` passes with Next.js 16.2.6.

- **Local Ingest Dev Flow Fix (2026-05-16):**
  - **Issue:** Localhost showed internal server/proxy errors and the npm user-test script could not move onboarding past the listening state.
  - **Fix:** Restarted Next.js in normal `npm run dev` mode instead of binding to `127.0.0.1`, which avoided the localhost proxy hang.
  - **Fix:** `.env.local` now uses the Convex dev `TRACIFY_API_KEY_HASH_SECRET` and points `INNGEST_DEV` at `http://127.0.0.1:8288`.
  - **Verification:** `http://localhost:3000` returns `200`, `/api/ingest` returns `202`, `scratch/user-test-tracify` returns `Ingest status: 202 Accepted`, and Convex dev contains the generated run for project `jd74cdngtnqd2yw3gsb2602fv186t0hr`.

- **Manual API Key Issuance + npm Package Rename (2026-05-16):**
  - **SDK Install Copy:** Updated app onboarding, dashboard docs, quickstart docs, design spec, and TS SDK README so TypeScript installs use `npm install tracify-sdk` and imports use `from "tracify-sdk"`.
  - **Package Metadata:** `packages/ts-sdk/package.json` now publishes as `tracify`; removed the accidental self-dependency from `package.json` and `package-lock.json`.
  - **Admin Issuance:** Added `projects:createProjectForUser`, an admin-only Convex mutation that creates a project for a target Clerk user and returns the one-time plaintext API key using the same HMAC storage path as normal onboarding.
  - **Access Control:** Dev Convex env `TRACIFY_ADMIN_CLERK_USER_IDS` is set to the local admin Clerk user id `user_3DbExfanjwXgIVGD8jXscKuXf7S`.
  - **Verification:** Convex dev sync passed, manual project/API key creation succeeded for project `jd75ha4z0264kr6wsbes7vd8rs86trsa`, SDK package build passed, and root `npm run build` passes.

- **npm SDK Publish Prep (2026-05-16):**
  - **Issue:** `npm publish --access public` for `tracify@0.1.0` failed with npm `E403` because the npm account requires 2FA or a granular publish token with bypass 2FA.
  - **Fix:** Added `packages/ts-sdk/tsconfig.json` so `npm run build` emits `dist/index.js` and `dist/index.d.ts`.
  - **Cleanup:** Removed stale `uuid` runtime/type dependencies from `packages/ts-sdk/package.json`; the SDK uses `crypto.randomUUID` with a fallback.
  - **Verification:** `npm run build` in `packages/ts-sdk` passes, and `npm pack --dry-run --cache C:\tmp\npm-cache` includes `README.md`, `dist/index.js`, `dist/index.d.ts`, and `package.json`.

- **Dashboard Shell Single-Instance Fix (2026-05-16):**
  - **Fix:** Removed nested `DashboardShell` wrappers from project child pages (`alerts`, `api-keys`, `billing`, `quickstart`, `runs`, `runs/[runId]`, `settings`).
  - **Reason:** `src/app/dashboard/layout.tsx` already owns the dashboard shell and sidebar. Nested shells could render two independent sidebars with different collapsed state and layer them over each other.
  - **Guarantee:** `DashboardShell` is now referenced only by `src/app/dashboard/layout.tsx`, so dashboard routes can render only one sidebar instance.
  - **URL Behavior:** Project workspaces keep the Convex project id in the URL (`/dashboard/[projectId]`), `/dashboard` is just an entry redirect, and the sidebar logo now links to the active project URL when a project is selected.
  - **Verification:** `npm run build` passes with Next.js 16.2.6.

- **Dev Convex Project Seed + Clerk JWT Template Fix (2026-05-16):**
  - **Dev Data:** Created Convex dev project `Dev Terminal Project` for local Clerk user `user_3DbExfanjwXgIVGD8jXscKuXf7S`; project id is `jd77b4bxf1k3eq4ztxmphjgyy186vcf3`.
  - **API Key Backup:** Saved the generated one-time dev API key to `C:\tmp\tracify_dev_terminal_project_api_key.txt`.
  - **Auth Fix:** Local Clerk instance had no JWT templates, so `ConvexProviderWithClerk` could not fetch `getToken({ template: "convex" })` and the app stayed in "waiting for auth". Created Clerk JWT template `convex` with `aud: "convex"` and standard user claims.
  - **Deployment Sync:** Ran `npx convex dev --once --typecheck disable` after the browser reported missing `projects:getProjectRouteState`; Convex dev now registers the route-state query.
  - **Verification:** `projects:getProjectsByUserOrOrg` returns the seeded project and `projects:getProjectRouteState` returns `{ status: "ready", projectId: "jd77b4bxf1k3eq4ztxmphjgyy186vcf3" }` when run against Convex dev with the matching Clerk identity.

- **Project Onboarding Route-State Fix (2026-05-16):** Removed `/dashboard/no-project` as an active dashboard state.
  - **Fix:** `/dashboard` now resolves the authenticated user's real Convex project list and redirects to the last/first valid project, or shows a first-project empty state without creating a fake project id.
  - **Fix:** `/dashboard/[projectId]` is guarded by a Convex-backed route-state query that accepts a plain string, normalizes it with `ctx.db.normalizeId`, and redirects invalid/stale/no-project routes before project-scoped query components mount.
  - **Fix:** Onboarding entry now verifies real Convex projects instead of trusting `sessionStorage`/`localStorage`; stale project ids are cleared for zero-project users.
  - **Fix:** Onboarding escape/return-path handling normalizes old `/dashboard/no-project` values back to `/dashboard`.
  - **Cleanup:** Removed active `"no-project"` query guards from dashboard leaves; the sentinel remains only as stale browser-state compatibility cleanup.
  - **Build:** `npm run build` passes with Next.js 16.2.6 after adding missing local `Tabs`, correcting encoded API route folders/files, fixing trace viewer JSX, and replacing the TS SDK `uuid` dependency with `crypto.randomUUID`.

- **Vercel Build Pipeline Fix (2026-05-15):** Removed the interactive Convex deploy from the Vercel build script and committed Convex generated bindings.
  - **Fix:** `package.json` build now runs `next build`; Convex deployment is available separately via `npm run deploy:convex`.
  - **Fix:** `convex/_generated` is no longer gitignored, so Vercel can resolve `convex/_generated/api` during frontend compilation without running an interactive deploy step.
  - **Fix:** Dashboard link buttons no longer pass unsupported `asChild` props to the local Base UI-backed `Button` component.
  - **Fix:** `agentRuns` project access typing now matches the legacy-compatible optional `projects.clerkUserId` schema field.
  - **Verification:** `npm run build` passes with Next.js 16.2.6.
  - **Deployment:** Vercel project `tracify/tracify` was linked and production deployment `dpl_HsSNpJDGpET5miH4ji2MEZ8773JN` is Ready at `https://tracify.vercel.app`.
  - **Environment:** `.env.prod` values were applied to the Vercel production environment before the successful deploy.
  - **Runtime Correction:** `.env.prod` still contained template placeholders, causing Clerk runtime 500s (`Publishable key not valid`). Vercel production was temporarily overwritten with non-placeholder `.env.local` test/dev values and redeployed as `dpl_3AqxVmaB5qaP5LDnkJSeqL2QXjeZ`; recent 500 logs cleared.
  - **Clerk Production Keys:** Vercel production now has live Clerk keys and redeployed successfully as `dpl_3TiEbJ9qwnXEzuWYoLvYSYida3er`. Local ignored `.env.prod` was also updated with the live Clerk entries.
  - **Convex Production Switch:** Vercel production now points to Convex prod `focused-otter-289` (`https://focused-otter-289.convex.cloud` and `https://focused-otter-289.convex.site`) and redeployed successfully as `dpl_8rT1Ty4pWGnMveuRTd5LagdUu1rW`.
  - **Convex Auth:** `convex/auth.config.ts` now reads `CLERK_JWT_ISSUER_DOMAIN` with a dev fallback. Convex prod has `CLERK_JWT_ISSUER_DOMAIN=https://clerk.tracify.tech`.
  - **Production Secret:** Generated and set `TRACIFY_API_KEY_HASH_SECRET` in Vercel and Convex prod; a local backup is in `C:\tmp\tracify_api_key_hash_secret.txt`.
  - **Caution:** Inngest and Slack production values still need final real credentials; `INNGEST_DEV` was removed from Vercel production.
  - **Note:** `npm run lint` still reports pre-existing lint issues in `.agents`, `scratch`, and several marketing/UI files; these are not part of the Vercel production build blocker.

- **Dashboard Login Flow Correction:** Landing -> sign-in now returns users to the dashboard instead of the landing page.
  - **Behavior:** Clerk sign-in and sign-up pages now force/fallback redirect to `/dashboard`.
  - **Behavior:** `/dashboard` now renders the dashboard start state directly instead of bouncing into onboarding.
  - **Behavior:** The dashboard top bar now exposes an explicit `Onboarding` button so quickstart remains reachable from the main workspace.
  - **Reason:** Signed-in users should not be sent back to marketing or onboarding by default.

- **Project Creation Auth-State Split:** `ProjectStep` now distinguishes Clerk sign-in from Convex auth readiness.
  - **Behavior:** Signed-in users see `Preparing project creation...` while Convex catches up instead of a sign-in prompt.
  - **Behavior:** Only truly unsigned users see `Sign in to create a project.`
  - **Reason:** The previous Convex auth gate was too opaque for a user who was already signed in through Clerk.

- **Project Creation Auth Boundary Fix:** `ProjectStep` now waits for Convex `Authenticated` before rendering the create-project form.
  - **Reason:** Calling `projects.createProject` before the Convex auth token is established can yield `ctx.auth.getUserIdentity() === null`.
  - **Behavior:** A short `AuthLoading` message appears while Convex auth initializes, and the form only renders once the client is truly authenticated.
  - **Scope:** This is a submit-path auth timing fix only; no onboarding copy, install commands, or dashboard navigation behavior changed.

- **Convex Sync Recovery:** Fixed a deployment sync blocker that prevented `projects:createProject` and `projects:getProjectsByUserOrOrg` from registering.
  - **Cause:** An existing `agentRuns` document in the deployment was missing `createdAt`, which caused schema validation to fail before upload.
  - **Fix:** Made `agentRuns.createdAt` optional for backward compatibility and kept new writes populating it.
  - **Result:** `npx convex dev` now reports `Convex functions ready!`, so the deployment can serve the current public functions again.
  
- **Vercel Build Fix:** Resolved "Module not found" errors for `convex/_generated/api` during Vercel deployment.
  - **Fix:** Updated `package.json` build script to `npx convex deploy && next build`. This ensures Convex generated files are available before the Next.js build starts.
  - **Correction:** Removed the unsupported `--bundle` flag which was causing the build to fail.
  - **Cleanup:** Standardized all Convex imports to use the `convex/` path alias instead of relative paths (e.g., in `src/lib/inngest-functions.ts`).
  
- **Auth Instant Loading Pass:** Removed all entrance animations (Framer Motion) and conflicting global CSS overrides to eliminate 5-second loading delays and 'black overlay' effects. Pages now render immediately.
- **Auth Contrast Pass:** Reverted background to deep black (`#050505`) and pushed all text and terminal logs to pure white (`#FFFFFF`) to ensure maximum legibility and modal visibility.
- **Navbar Sign Out:** Added a `SignOutButton` to the marketing navbar for authenticated users, placed beside the Dashboard button.
- **Root Routing Stability Fix:** Onboarding and dashboard root entry now rely on local project context first instead of a Convex query during redirect.
  - **Reason:** A stale deployment can block route entry if the redirect itself depends on a missing public Convex function.
  - **Current Behavior:** `/dashboard` and `/onboarding` now use onboarding/session and last-selected project context to decide whether to route to `/dashboard/[projectId]` or `/onboarding/project`.
  - **Scope:** This keeps route entry stable without touching trace viewer, runs list, cost dashboard, or landing page behavior.
- **Onboarding Routing + Install Step Refinement:** Onboarding is now state-based and manual-entry friendly instead of login-based.
  - **Routing:** `/onboarding` checks signed-in project state and routes users with an existing project back to `/dashboard/[projectId]`; users with no project continue to `/onboarding/project`.
  - **Dashboard Entry:** `/dashboard` routes users with an existing project to `/dashboard/[projectId]` and users with no project to `/onboarding/project`, so onboarding does not run every login.
  - **API Key Handling:** API keys are generated on project creation, shown once, stored server-side only as HMAC-SHA256 hash plus prefix/last4, and the plaintext browser handoff is memory-only until copy.
  - **Install Step:** `/onboarding/install` now includes Python, TypeScript, and AI setup prompt modes.
  - **Package Accuracy:** Real PyPI/npm install commands should only be shown when packages are published; current onboarding uses beta GitHub install commands because `tracify` and `tracify` were not found in public registries.
- **Onboarding/Dashboard Navigation Escape Hatches:** Added navigation-only escape and re-entry paths between onboarding and dashboard.
  - **Onboarding Escape:** `/onboarding/project`, `/onboarding/api-key`, `/onboarding/install`, `/onboarding/waiting`, and `/onboarding/success` now show a quiet top-left Home/Dashboard link in the onboarding shell.
  - **API Key Protection:** The API key step warns before leaving if the one-time key is still available and has not been copied.
  - **Dashboard Re-entry:** Dashboard sidebar Resources now includes Quickstart above Docs, routed to `/onboarding/install`.
  - **Empty State CTA:** Dashboard start state now routes View quickstart to `/onboarding/project`, `/onboarding/api-key`, or `/onboarding/install` based on available onboarding session context.
  - **Scope Control:** This pass was navigation-only; landing, auth, pricing, ingestion, Convex, Inngest, trace viewer, runs, costs, and alerts behavior were not changed.
- **Dashboard Project Switcher Runtime Fix:** Removed dashboard project switcher Convex query calls for now.
  - **Reason:** Local/stale Convex deployments can throw missing public function errors before `npx convex dev` registers new project-list functions.
  - **Current Behavior:** Switcher uses onboarding `sessionStorage` project context when present, then falls back to existing mock projects.
  - **TODO:** Reconnect to Convex-backed project listing after the local deployment/function registration path is stable.
- **Milestone 2 Part 3 - Ingestion + First Span Activation:** Added the minimum ingestion path needed for real onboarding activation.
  - **Ingest API:** `POST /api/ingest` accepts span JSON with Bearer API key auth, validates payloads up to 1MB, updates API key last-used metadata, and returns `202` after accepting valid spans.
  - **Key Validation:** API keys are validated by HMAC hash lookup; invalid/missing/revoked keys return `401` without revealing existence.
  - **Processing:** `tracify/span.received` Inngest event writes span rows to Tinybird and upserts Convex `agentRuns` summaries.
  - **Activation:** `/onboarding/waiting` subscribes to `agentRuns.getProjectOnboardingState` and auto-advances only after a real run exists.
  - **Run Destination:** `/onboarding/success` now uses real `projectId` and `runId`; the destination remains the temporary run placeholder until the trace viewer milestone.
  - **Scope Control:** Full trace viewer, runs list, costs, alerts, billing, replay, evals, and integrations remain deferred.
- **Milestone 2 Part 2 - Project Creation + API Key Backend:** Connected onboarding project creation to Convex and real one-time API key generation.
  - **Project Schema:** Projects now include `slug`, `clerkUserId`, optional `clerkOrgId`, timestamps, `planTier`, alert/default threshold fields, and API key metadata.
  - **Fix (Onboarding Error):** Resolved "Could not find public function for 'projects:createProject'" by successfully syncing schema and ensuring mutation exports.
  - **Identity Mapping:** Shifted to `identity.subject` (Clerk User ID) for `clerkUserId` storage in projects to match frontend expectations.
  - **Timestamps:** Standardized project timestamps (`createdAt`, `updatedAt`, `apiKeyCreatedAt`, `apiKeyLastUsedAt`) as numeric `Date.now()` values.
  - **Legacy Compatibility:** Relaxed `projects` and `agentRuns` schema fields to optional to accommodate existing local development data.
- **Required Secret:** Convex project creation requires `TRACIFY_API_KEY_HASH_SECRET`.
- **Milestone 2 Part 1 - Onboarding UI Flow:** Started the onboarding UI-only pass without backend integration.
  - **Separate Shell:** `/onboarding/*` uses a standalone centered dark panel, not the dashboard shell, marketing navbar, or footer.
  - **Five Steps:** Project -> API key -> Install SDK -> Waiting -> First span success are implemented as route segments.
  - **Mock Key:** API key screen uses `tracify_sk_live_mock_1234567890abcdef1234567890abcdef` and gates Continue on copying.
  - **No Fake Activation:** Waiting screen does not auto-advance from normal UI; success remains a separate route for the future real first-span activation.
  - **Backend Deferred:** Project creation, real key generation, ingestion, and first-span detection remain Part 2/Part 3 TODOs for this UI flow.
- **Dashboard Sidebar Simplification:** Removed the recently added hover-peek and adjustable-width behavior because it made the expand control harder to use.
  - **Steady Widths:** Sidebar is back to fixed workspace widths: 240px expanded and 64px collapsed.
  - **No Hover Peek:** Collapsed sidebar no longer expands on hover; the top icon is the deliberate expand control.
  - **No Resize Handle:** User drag-resizing was removed; `tracify.sidebar.width` is no longer used by the shell.
  - **Preserved Behavior:** Top header collapse/expand icon remains, collapsed state still persists in `tracify.sidebar.collapsed`, and clicking a collapsed nav icon still expands before navigation.
- **Dashboard Sidebar Workspace Assistance:** Refined the authenticated dashboard sidebar interaction model only.
  - **Top Collapse Control:** Collapse/expand now lives as a quiet 28px icon in the 60px sidebar header, aligned with the `tracify` logo when expanded.
  - **Resizable Panel:** Permanent expanded sidebar width is user-resizable from 200px to 360px, with a 240px default and 64px collapsed width.
  - **Persistent State:** Sidebar collapsed state persists in `tracify.sidebar.collapsed`; custom width persists in `tracify.sidebar.width`; group state remains preserved.
  - **Hover Peek:** Collapsed sidebar hover temporarily reveals labels/project switcher without shifting main content; peeking is overlay-only and not persisted.
  - **Assisted Nav:** Clicking a nav icon while collapsed or peeking permanently expands the sidebar, preserves/restores the saved width, opens that item's group when needed, and lets navigation continue.
  - **Project Memory:** Mock project switcher stores the last selected project id in `tracify.lastProjectId`.
- **Dashboard Shell Usability Pass:** Improved the authenticated dashboard entry point without building the full product surfaces.
  - **Collapsible Sidebar:** Sidebar now supports persisted expanded/collapsed widths (240px/64px), icon-only collapsed nav, and collapsed tooltips.
  - **Grouped Navigation:** Sidebar is organized into persisted OBSERVE, CONFIGURE, and RESOURCES groups while still hiding Replay, Evals, Integrations, Team, Memory, and Runtime.
  - **Project Selector:** Project switcher now exposes mock environment labels and routes selected mock projects to their dashboard route.
  - **Start State:** Replaced the thin empty dashboard placeholder with a start-here checklist, quickstart code panel, and sample trace entry points.
  - **Scope Control:** No trace viewer, runs list, cost dashboard, alerts logic, landing page, pricing, auth, CTA, or footer work was added in this pass.
- **Dashboard Milestone 2:** Started onboarding plus the minimum ingestion pipeline needed for first-span activation.
  - **Onboarding Flow:** Create project -> copy API key -> install SDK -> wait for first span -> success.
  - **Activation Event:** Onboarding auto-advances only when a real first span creates the first Convex agent run.
  - **API Key Security:** API keys use `tracify_sk_live_` plus 32 hex chars, are shown once, and Convex stores only HMAC-SHA256 hash, prefix, last 4 chars, timestamps, and status.
  - **Ingestion Minimum:** `POST /api/ingest` validates Bearer keys and span payloads, emits the Inngest span event, writes spans to Tinybird, and upserts Convex `agentRuns` for live onboarding detection.
  - **Activation Query:** `agentRuns.getProjectOnboardingState` returns project key display data plus the first real run so the waiting screen can advance without simulation.
  - **Run Placeholder:** `/dashboard/[projectId]/runs/[runId]` exists only as a received-run placeholder until the trace viewer milestone.
- **Dashboard Shell Foundation:** Started the authenticated dashboard shell using `shadcn` `sidebar-03` as the structural base.
  - **Milestone:** Dashboard Milestone 1 started: authenticated shell and project selector only.
  - **Visual Direction:** Adapted the shell to the tracify dashboard language: dark-only, sharp monochrome surfaces, no radius, no shadows, and no blue UI accents.
  - **Navigation:** MVP sidebar includes only Overview, Runs, Costs, Alerts, Settings, and Docs.
  - **Scope Control:** Deferred dashboard pages are hidden from nav; unfinished Phase 2/Phase 3 surfaces such as Replay, Evals, Integrations, Team, Runtime, and Memory are not exposed.
- **Final landing page order:** Hero → Problem → DebugStream → FirstTrace → WhatYouGet → Use Cases → PricingTeaser → Final CTA → Footer
- **Pricing Teaser (`PricingTeaser`):** Restructured into a 3-column top row (Pro, Team, Enterprise) and a full-width bottom row (Free). Team plan updated to include 10 seats (extra seats paid).
- **"What You Get" (`WhatYouGet`):** Compact technical matrix showing the concrete outputs of a trace (Trace, Cost, Retries, Failure). Uses a scanning focus animation to guide attention.
- **"Workspace Terminal" (`DebugStream`):** High-velocity simulation of agent execution ends with a "Wasted Cost" indicator to create visceral pain. Untouchable emotional hook.
- **"SDK Quickstart" (`FirstTrace`):** Reframed as "Catch the next one." Provides immediate relief after the terminal shock by showing a code diff (+@trace_agent) and the resulting visibility of the "next run."
- **Typography Refined:** Installed `geist` package and integrated **Geist Pixel Square** for all branding and primary headers.
- **Clerk Keyless:** Configured Clerk to run in **Keyless mode**, removing local dependency on placeholder keys.
- **Monochrome Transition:** Removed all blue/indigo accents in favor of a strict black-and-white palette to emphasize technical precision.
- **Emil Kowalski Integration:** Adopted design engineering principles for UI polish, including scale-on-press, custom easing curves, and staggered entrances.
- **Clerk v7 (Core 3) Compatibility:** Migrated from deprecated `<SignedIn>`/`<SignedOut>` components to the unified `<Show>` component.
- **Build Configuration:** Excluded `scratch` directory from TypeScript compilation to prevent temporary scripts from blocking production builds.
- **Custom Auth Pages Integration:** Created a production-grade authentication experience using Clerk with strict tracify design language.
  - **Auth Shell:** Split-screen layout (45% terminal panel, 55% auth form) with a "Home" back-link and mobile-optimized branding.
  - **Terminal Panel:** A looping agent trace simulation (`run-agent`, `llm_call`, `tool_call`) that signals technical capability. Now features staggered line entry with subtle y-translation.
  - **Clerk Appearance:** Comprehensive `Theme` override in `src/components/auth/clerk-appearance.ts` to enforce 0px radius, monochrome primary buttons (White/Black), and Geist Mono typography for all sub-components (inputs, cards, social buttons).
    - **Auth Pages Styling Fix:** Updated `.cl-socialButtonsRoot` to use `grid-template-columns: repeat(2, 1fr)` instead of a hardcoded 3-column grid. This ensures that when exactly 2 providers (Google/GitHub) are active, they fill the space correctly without gaps. Applied to `CLERK_APPEARANCE`, `layout.tsx`, and `globals.css`.
- **Design Engineering Polish:** Integrated Emil Kowalski principles:


    - **Tactile Feedback:** Added `scale(0.98)` on `:active` for all buttons and interactive elements.
    - **Premium Entrances:** Implemented staggered `framer-motion` entrances for form containers and terminal visuals.
    - **Custom Easing:** Replaced default transitions with high-performance `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out).
    - **Refined Transitions:** Specified exact properties for transitions to avoid layout thrashing and improve perceived performance.
  - **Social Providers:** Built-in support for Google, GitHub, and Apple via Clerk components.
  - **Routing:** Configured `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and related variables in `.env.local` to support custom auth paths.
- **Landing Page Navigation Wiring:** Rewired all marketing CTAs to real application routes.
  - **Start/Free/Trace CTAs:** All route to `/sign-up`.
  - **Sign-in/Login CTAs:** All route to `/sign-in`.
  - **Paid Plans:** Pro/Team buttons route to `/sign-up` with `plan` query parameters.
  - **Demo Anchor:** Hero secondary CTA wired to `#workspace-terminal`.
  - **Placeholders:** Replaced all `#` and `SignUpButton` wrappers with Next.js `Link` components.
- **Marketing Navbar Integration:** Implemented a high-fidelity `DropdownNavigation` component for the landing page.
  - **Aesthetic:** Dark monochrome, 0px radius, Geist Mono for links.
  - **Menu Structure:** Includes product-specific sections (Platform, Signals, Agent Types, Start) with detailed descriptions and monochrome icons.
  - **Tech:** Uses `framer-motion` for subtle y-translation and opacity transitions on hover.
- **Final CTA Overhaul:** Replaced the generic marketing banner with a compact, developer-centric `FinalCTA` component.
  - **Headline:** "Run your first trace." (Geist Mono).
  - **Visual:** Compact terminal surface showing `pip install tracify-sdk` and `run-agent` with a `trace ready` confirmation.
  - **Purpose:** Transition from "learning" to "immediate action" after the pricing section.
- **Full Frontend Design Package:** Complete 40-section design spec written to `docs/design-spec/`. Covers design tokens, all 30+ pages, component system, copy, SEO, file structure, build prompts, and QA checklist. Key decisions: `#0A0A0A` bg, `#6366F1` accent, 0px radius, Geist Pixel for logo, tagline "Five signals. One truth.", free tier 50K spans/month.

- **Sanity CMS Blog Added (2026-06-15):**
  - **Goal:** Add a blog with rich content managed via Sanity Studio.
  - **Schema:** Post schema with title, slug, author, publishedAt, excerpt, coverImage, categories, tags, block content, and SEO object.
  - **Pages:** Blog listing (`/blog`), blog post (`/blog/[slug]`) with SSG + JSON-LD + OG/Twitter meta, RSS feed (`/blog/rss.xml`), sitemap integration.
  - **Sanity Studio:** https://8no3oibu.sanity.studio
  - **Dataset:** `production`

- **API Key Prefix Changed (2026-06-16):**
  - **Change:** API keys now generated with `tracify_sk_live_` prefix instead of `tracify_sk_live_`.
  - **Validation:** Ingest API still accepts both prefixes for backward compatibility with existing keys.

- **Google OAuth Updated (2026-06-16):**
  - **Change:** Replaced old Google OAuth client ID/secret in `.env.prod` and Vercel production env.

- **Convex Auth Config Deployed (2026-06-16):**
  - **Fix:** Deployed `convex/auth.config.ts` with `https://clerk.tracify.tech` to Convex production, resolving the "Auth: Waiting" hang during onboarding.

- **Project Rename tracify → tracify (2026-06-15):**
  - **Goal:** Complete the project/product rename from `tracify` to `tracify`.
  - **Change:** Updated `package.json` name to `tracify`.
  - **Change:** Updated all source code comments and visible product name references in docs.
  - **Change:** Updated `pyproject.toml` bug tracker URL to `github.com/tracify/python-sdk`.
  - **Change:** Updated Tinybird pipe/datasource descriptions.
  - **Change:** Updated Convex test alert text.
  - **Retained:** Internal localStorage keys, Inngest event IDs (`tracify/span.received`, `tracify/alert.triggered`), and scratch scripts preserve legacy `tracify` prefixes for backward compatibility.
  - **Verification:** `npm run build` pending.

- **Blog CMS via Sanity (2026-06-15):**
  - **Goal:** Add a headless CMS-powered blog to tracify using Sanity.io (free tier).
  - **Schema:** Blog post schema in `sanity/schemas/post.ts` with title, slug, author, publishedAt, excerpt, coverImage, categories, tags, rich body (Portable Text + code blocks), and a full SEO object (metaTitle, metaDescription, ogImage, canonicalUrl).
  - **Client:** `src/lib/sanity/client.ts` – Sanity client with image URL builder. Gracefully handles missing env vars.
  - **Queries:** `src/lib/sanity/queries.ts` – GROQ queries for listing, single post, slugs, recent posts, and category filtering.
  - **Blog Listing (`/blog`):** Static page with post cards (cover image, title, date, author, excerpt, categories), responsive layout, and empty/not-configured states.
  - **Blog Post (`/blog/[slug]`):** SSG with `generateStaticParams`. Full rich text rendering via `@portabletext/react`. JSON-LD structured data for BlogPosting schema. SEO metadata via `generateMetadata` with Open Graph, Twitter cards, and canonical URL.
  - **RSS Feed (`/blog/rss.xml`):** Static RSS 2.0 feed with all published posts.
  - **Sitemap (`/sitemap.xml`):** Includes blog posts with `weekly` change frequency.
  - **Footer:** Added "Blog" link to the marketing footer.
  - **Env vars required:** `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`.
  - **Setup:** User needs to create a free Sanity project at sanity.io, get the project ID, and add it to `.env.local`. The Sanity Studio is accessed via Sanity's hosted platform (responsive web app works on mobile for posting from phone).
  - **Verification:** `npm run build` passes.

## Active Priorities
- **Phase 2.1: Beta Reliability and Proof.**
- Deploy and validate Tinybird endpoint pipes in the active Tinybird workspace.
- Run full beta smoke with a real API key/project id so valid ingest and Convex run creation are checked, not skipped.
- Smoke test report page states with authenticated sessions: no data, normal runs, failed runs, and analytics-unavailable fallback.
- Continue replacing beta placeholders with real usage, contact, or hidden states.

## Competitive Product Surface (2026-08-03)
- Replaced the placeholder marketing product pages with detailed, feature-specific pages for Trace Viewer, Cost Dashboard, Tool Calls, LLM Calls, Failures, Reports, and Runtime Control.
- Added public `/roadmap`, `/contact`, and intentionally non-claiming `/status` routes. The roadmap explicitly separates shipped work from in-progress, planned, and enterprise-phase delivery.
- Added dashboard `/dashboard/[projectId]/control`, which exposes the existing project runtime-policy controls from the sidebar. The sidebar now has a Control group and preserves compatibility with previously stored group preferences.
- Marketing navigation now links to Reports, Runtime Control, and the roadmap. Targeted ESLint passes; the full lint command exceeded the 60-second command limit without diagnostics.

## Sessions and Search Milestone (2026-08-03)
- Added optional session context to native ingest, OTLP ingest, TypeScript SDK, and Python SDK helpers: session, end user, environment, release, tags, and trace name.
- Added Tinybird span fields and a project-scoped `/api/projects/[projectId]/search` route with bounded filters for text, session, user, environment, release, model, tags, status, cost, latency, and time range.
- Added Convex `sessions` summaries and optional `agentRuns.sessionId` linkage with authorized list/detail/run queries.
- Added dashboard Observe routes for Sessions, session detail, and Trace Search, plus sidebar navigation.
- Convex codegen, targeted ESLint, Next production build, and TypeScript SDK build pass.

## Evaluation Engine Integration (2026-08-06)
- Added release-gated regression suites, safe prompt promotion mutation, and UI gate visibility.
- Added monitor state transitions so recovery alerts are emitted after a breach clears.
- Added Tinybird evaluation score datasource, ingestion, and hourly aggregation query helper.
- Verification: Convex codegen, Next production build, targeted ESLint, TypeScript SDK build, Python compile, and diff check pass.
- Remaining production setup: `EVALUATION_INTERNAL_SECRET` and Tinybird datasource deployment/smoke validation.
- Follow-up audit fixes: configurable suite thresholds and prompt-version promotion UI, trace-to-dataset and queue-review mutations, job completion accounting, JSON Schema/numeric-range deterministic rules, and explicit evaluation result retrieval.
- Full-repository lint still reports unrelated pre-existing errors outside the evaluation changes; targeted evaluation lint and production build remain green.
- Added `/docs/evaluation` documentation and expanded platform smoke coverage for the evaluation product/docs routes. Smoke requests now use per-request timeouts; the current local run timed out on the existing dev environment before completing, so production credential validation remains outstanding.
- Configured a local-only `EVALUATION_INTERNAL_SECRET` consistently in `.env.local` and the Convex dev deployment; private evaluator endpoint checks returned 401 for the wrong secret and 422 for an authenticated but invalid payload. Formatted `tinybird/evaluation_scores.datasource` with the Tinybird CLI. Tinybird cloud deployment remains unavailable because the workspace is not logged in.
- Corrected monitor aggregation to filter by configured score/evaluator name, count failed and error results, and honor hysteresis via `recoveryThreshold`; Convex codegen and Next production build pass afterward.
- Routed online evaluation monitor breach/recovery events through the existing Inngest `tracify/alert.triggered` flow so Convex alerts can reach configured Slack notifications with the standard deduplication path. Build and Convex codegen pass.
- Extended Tinybird evaluation score records and hourly aggregation to retain numeric, boolean, categorical, and text-derived score types instead of forwarding numeric values only. Tinybird formatting, Convex codegen, SDK build, Next build, targeted lint, and diff check pass.
- Added `npm run deploy:tinybird:evaluation` with a guarded PowerShell deployment script and documented the required secret/authentication setup; it is ready to run after Tinybird CLI login.
- Exposed monitor score name, aggregation, breach/recovery thresholds, and grouping controls in the Evaluation dashboard; build, Convex codegen, targeted lint, and diff check pass.
- Connected `/experiments` to evaluation suites: experiments can now select a matching suite, persist its criteria, and use the same evaluator thresholds while retaining prompt/model comparison. Build and Convex codegen pass.
- Added an allowlisted server-side custom evaluator registry (`has_citation`, `no_pii`, `non_empty_json`) so custom checks remain controlled and never execute browser-provided code. Next build, targeted lint, and diff check pass.
- Added built-in redaction of common emails, phone numbers, identifiers, and API secrets before LLM judge calls, plus a 10-second timeout and one retry for transient judge failures. The first build worker reported a stale demo-page symbol error; a clean rerun passed with all 57 static pages generated.

## Dashboard Excellence Foundation (2026-08-07)
- Added shared dashboard primitives for signal badges, clickable metrics, and attention items.
- Upgraded Overview hierarchy around workspace health, an attention queue, and next-best actions while preserving existing analytics fallbacks and routes.
- Added dashboard grid and tabular-number tokens, dark color-scheme support, and signal-color variables.
- Renamed dashboard sidebar groups toward Operate and Manage; expanded navigation restructuring remains the next slice.
- Verification: TypeScript, focused ESLint, and `npm run lint:platform` pass.
- Reorganized sidebar destinations into Observe, Analyze, Improve, Operate, Manage, and Resources groups.
- Added Alerts, API Keys, and Billing to their intent-based groups while preserving existing routes.
- Synced Runs status and run-ID search filters to URL query parameters for durable links and Overview drill-downs.
- Verification: focused dashboard ESLint and TypeScript pass after the Runs changes.
- Trace Viewer now exposes a Focus first error action that scrolls to and highlights the first error/error-message span using stable span anchors.
- Trace span headers have explicit keyboard focus styling and scroll offsets for deep inspection.
- Verification: Trace Viewer ESLint and TypeScript pass.
- Added persistent trace context metadata for trace name, environment, release, and session when present on spans.
- Added a sticky selected-span inspector driven by the existing replay selection, showing type, model/tool, latency, cost, error text, and output preview.
- Verification: Trace Viewer ESLint and TypeScript pass after the context-panel changes.
- Added a project-aware dashboard command menu using the existing dialog primitives; opens from the Command button or `⌘K`/`Ctrl+K` and links to core workspace surfaces.
- Verification: command menu/topbar TypeScript and focused ESLint pass; remaining warnings are pre-existing topbar title/image warnings.
- Trace Search now initializes and persists query, status, and time-window state in the URL.
- Added one-click search presets for failures in 24 hours, all traces in 7 days, and healthy traces in 30 days.
- Search results now visually distinguish error traces from healthy traces and retain keyboard focus styling.
- Verification: Trace Search and Sessions ESLint plus TypeScript pass.
- Costs range selection now persists as the `days` URL parameter for shareable period context.
- Cost summary explicitly labels analytics-backed values versus saved-summary fallback and links directly back to Runs.
- Verification: Costs ESLint and TypeScript pass.
- Dashboard topbar now shows supported workspace context from Clerk organization/personal workspace plus the authorized Convex project name.
- Replaced the misleading static `running` label with a neutral workspace/project context indicator.
- Verification: topbar ESLint and TypeScript pass; existing title/description and raw-image warnings remain.
- Restored the project Alerts route as a real alert center instead of redirecting to Overview.
- Added all/unread filtering, unread emphasis, mark-all-read, read-on-inspect, and direct run inspection links.
- Verification: Alerts page/list ESLint and TypeScript pass.
- Trace Search now exposes environment and release filters backed by the existing search API, with those filters included in submitted URL state.
- Verification: focused Trace Search ESLint and standalone TypeScript pass; a combined command timeout produced no diagnostics.
- Runs table now surfaces primary model and session context in a large-screen Context column, with graceful fallback labels and responsive hiding on smaller screens.
- Verification: Runs ESLint and TypeScript pass.
- Completed a focused lint audit across all changed dashboard files with no warnings; platform lint also passes.
- Fixed topbar title/description accessibility usage and replaced raw Clerk avatar images with dimensioned `next/image` elements.
- Standalone TypeScript passes. Full `npm run build` exceeded the Windows timeout and ended with EPIPE without source diagnostics.
- Added the installed Clerk `OrganizationSwitcher` to the dashboard topbar with Tracify-compatible compact styling and personal-workspace support.
- Verification: topbar ESLint and TypeScript pass.
- Runs pagination now restores and persists `page` and `limit` URL parameters alongside status and run-ID search state.
- Verification: Runs ESLint is clean; TypeScript passed in the pagination verification run.
- Sessions list now has a responsive mobile presentation instead of forcing the desktop grid; compact metric labels preserve traces, spans, and last-seen context.
- Session links have stronger hover/focus treatment and tabular-number styling for cost/counts.
- Verification: Trace Search and Sessions ESLint plus TypeScript pass.
## Dashboard Feedback States (2026-08-07)
- Added a reusable empty-state primitive with explanatory copy and optional recovery/onboarding action.
- Applied it to Sessions and Alerts.
- Verification: focused ESLint and standalone TypeScript pass.
## Runs Triage Views (2026-08-07)
- Added URL-backed client-side sorting for newest, most expensive, slowest, and most spans.
- Added visible Views controls so common triage states are one interaction away and survive refresh/deep links.
- Verification: Runs ESLint and standalone TypeScript pass.
## Server-backed Runs Filters (2026-08-07)
- Extended `getRunsPageByProject` with optional model, session, minimum cost, and minimum span-count filters.
- Connected the Runs filter controls to URL state and the Convex paginated query, with numeric validation for threshold inputs.
- Regenerated Convex bindings and verified focused ESLint plus TypeScript.
## Runs Bulk Export (2026-08-07)
- Added accessible row selection and select-all-visible behavior to Runs.
- Added bounded CSV export for selected loaded runs, including status, model, session, spans, cost, and start time.
- Verification: Runs ESLint and standalone TypeScript pass.
## Search Saved Queries (2026-08-07)
- Added project-scoped local saved searches with naming, restore, and delete actions.
- Added visible active filter chips with one-click clearing for query, environment, release, and status.
- Preserved URL-backed query state and verified focused ESLint plus TypeScript.
## Trace Handoff Feedback (2026-08-07)
- Hardened the Trace Viewer share-link action against clipboard failures.
- Added visible button fallback text and an aria-live announcement for copied/failed states.
- Verification: Trace Viewer ESLint and standalone TypeScript pass.
## Improve Lifecycle Navigation (2026-08-07)
- Added a shared lifecycle rail across Prompts, Datasets, Evaluation, Experiments, and Playground.
- The rail makes Observe → Collect → Evaluate → Compare → Promote → Monitor explicit, with active-step styling and keyboard-visible focus.
- Verification: affected route ESLint and standalone TypeScript pass.
## Alert Review States (2026-08-07)
- Expanded Alerts with All, Unread, and Reviewed views while preserving mark-read and inspect behavior.
- Alert rows now expose review state and triggering run context directly in the center.
- Verification: Alerts ESLint and standalone TypeScript pass.
## Sidebar Keyboard Shortcut (2026-08-07)
- Added Ctrl+\\ / Cmd+\\ as a global sidebar toggle shortcut.
- Added the shortcut to the sidebar control tooltip while retaining the accessible button label.
- Verification: shell/sidebar ESLint and standalone TypeScript pass.
## Dashboard Quality Gate and Navigation Audit (2026-08-07)
- Platform lint and standalone TypeScript pass after the dashboard slices.
- Corrected sidebar taxonomy so Integrations is under Operate and Members is visible under Manage.
- Updated active-path matching to handle query-bearing navigation links such as the Members shortcut.
## Visual QA and Trace Context Links (2026-08-07)
- Attempted authenticated dashboard visual QA at localhost; the app correctly redirected to Clerk sign-in, so project-level desktop/mobile inspection remains pending authenticated access.
- Trace Viewer context metadata now links sessions to Session detail and environment/release values to filtered Search routes.
- Verification: Trace Viewer ESLint and standalone TypeScript pass.
## Active Project Shortcut (2026-08-07)
- Added Alt+Shift+O / Cmd+Shift+O to open the active project's Overview from any dashboard route.
- Added the shortcut to the command-menu footer alongside the sidebar shortcut.
- Verification: shell/command-menu ESLint and standalone TypeScript pass.
## Alerts URL State (2026-08-07)
- Persisted the Alerts All/Unread/Reviewed view in the `view` query parameter.
- Alert review tabs now restore correctly from deep links and refreshes.
- Verification: Alerts ESLint and standalone TypeScript pass.
## Alert Grouping (2026-08-07)
- Grouped identical alert type/message pairs in the alert center and surfaced occurrence counts.
- Preserved the first triggering run as the direct inspection target while reducing repeated visual noise.
- Verification: Alerts ESLint and standalone TypeScript pass.
## Runs Accessibility Hardening (2026-08-07)
- Added accessible names and focus-visible treatment to the icon-only run link.
- Added `aria-pressed` semantics and focus states to status and view toggles.
- Verification: Runs ESLint and standalone TypeScript pass.
## Repository Lint Audit (2026-08-07)
- `git diff --check` passes.
- Dashboard-focused lint, platform lint, and standalone TypeScript pass.
- Full `npm run lint` remains red with 69 pre-existing errors and 29 warnings across unrelated marketing/UI/hooks/lib files; this is an outstanding repository-wide gate, not a dashboard-specific diagnostic.
## Runs Empty State (2026-08-07)
- Replaced the bare Runs “No results found” message with a shared contextual empty state.
- Filtered no-data states offer Clear filters; genuinely empty projects offer the Quickstart path.
- Verification: Runs ESLint and standalone TypeScript pass.
## Shared Empty-State Focus (2026-08-07)
- Added a visible focus ring to the shared empty-state recovery link used across dashboard surfaces.
- Verification: dashboard primitives ESLint and standalone TypeScript pass.
## Run Environment and Release Contract (2026-08-07)
- Added optional environment and release fields to Convex agent-run summaries.
- Propagated those fields from Inngest span processing into run upserts.
- Added server-backed Runs filters and URL state for environment and release.
- Regenerated Convex bindings and verified focused lint plus TypeScript.
## Runs Context Visibility (2026-08-07)
- Added environment and release context to the large-screen Runs row hierarchy alongside model and session.
- Verification: Runs ESLint and standalone TypeScript pass.
## Cost Breakdown Actions (2026-08-07)
- Added direct “Inspect model runs” links beneath the Cost by Model chart.
- Links carry the model filter and cost sort into the Runs workflow.
- Verification: Costs ESLint and standalone TypeScript pass.
## Overview Evaluation Quality (2026-08-07)
- Overview now reads `api.evaluationEngine.overview` and exposes project evaluation pass rate as a health metric.
- Missing evaluation data renders `—` with “No evaluation results”; quality is not fabricated.
- Focused ESLint, TypeScript, and `git diff --check` passed after the change.
## Overview URL Time Range (2026-08-07)
- The Overview time-range selector is now URL-backed via `range`, making shared links and refreshes deterministic.
- Supported values are 1, 7, 30, and 90 days; invalid values fall back to 7 days.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Route-Aware Time Context (2026-08-07)
- Topbar now reads `range` on Overview and `days` on Runs/Search, with matching route defaults.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Overview Scope-Preserving Links (2026-08-07)
- Overview symptom links now preserve the selected time range when opening Runs, keeping the debugging scope consistent.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Topbar Time Context (2026-08-07)
- Added the active dashboard time window to the topbar context strip beside project and environment.
- Defaults are aligned with Overview’s 7-day range.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Trace Annotation Action (2026-08-07)
- The Trace Viewer annotation submit icon now has an accessible name, tooltip, and visible focus ring.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Alert Resolve Safeguard (2026-08-07)
- Alert resolve now uses confirmation, matching the existing mute safeguard; both lifecycle actions remain reopenable.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Overview Alert Action (2026-08-07)
- Added the missing alert-configuration action to Overview’s next-best-action panel.
- The action correctly links to project settings, while `/alerts` remains the alert review center.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Shared Dashboard Contracts (2026-08-07)
- Added `src/components/dashboard/dashboard-contracts.ts` as the shared home for dashboard state/type contracts.
- `SavedRunView` and `DashboardSignal` now flow through shared definitions.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Alert Filter Semantics (2026-08-07)
- Alert All/Active/Resolved/Muted tabs now expose `aria-pressed` and visible focus rings.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Trace Action Focus States (2026-08-07)
- Trace Viewer primary actions now have visible keyboard focus rings.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Overview Range Semantics (2026-08-07)
- Added `aria-pressed`, descriptive labels, and focus rings to the Overview time-range controls.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Explicit Environment Context (2026-08-07)
- Topbar now displays the active environment query scope, defaulting to “all environments.”
- This keeps environment context visible while preserving the existing URL-backed Runs/Search filters.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Critical Route Validation (2026-08-07)
- Current production build passes and generates the dashboard route set.
- Beta smoke: 5 passed, 0 failed, 2 skipped due to absent live smoke credentials.
- Full repository lint still has unrelated pre-existing errors; dashboard-focused lint is clean.
- Authenticated browser QA is not yet proven because the local dashboard redirects to Clerk sign-in.
## Authenticated Visual QA Recheck (2026-08-07)
- A fresh local dashboard navigation again redirected to `/sign-in?redirect_url=.../dashboard`.
- No authenticated project session was available; no desktop/mobile visual pass is claimed.
## Final Dashboard Build Recheck (2026-08-07)
- `npm run build` passes after the latest dashboard/topbar changes and generates all 58 routes.
## Accessibility Sweep (2026-08-07)
- Added accessible member-action naming, analytics refresh labeling, and documentation navigation focus rings.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Overview Quality Trend (2026-08-07)
- Overview now includes a daily pass-rate trend derived from `evaluationOverview.recentResults`.
- The chart is sample-labeled and shows a clear no-results state when no quality data exists.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Overview Run Failure Trend (2026-08-07)
- Overview now shows daily run volume with failure rate on a secondary axis alongside spend.
- Because the current query returns recent run summaries, the chart labels the sample instead of implying complete telemetry coverage.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Alert Recommended Actions (2026-08-07)
- Alert center cards now include actionable guidance for cost-exceeded versus failure alerts.
- Do not invent threshold/trend values; the current alert schema only stores type, message, run, time, read state, and lifecycle state.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Shell Icon Accessibility (2026-08-07)
- Account and alert icon-only controls now expose accessible labels/tooltips and keyboard focus treatment.
- Focused ESLint, TypeScript, and `git diff --check` passed.
## Project Skill: Hog Release Notes (2026-08-08)
- Added `.agents/skills/hog-release-notes`, a project-local PostHog release-notes workflow.
- It gathers recent merged changes, applies concise reader-focused entry rules, and emits Markdown ready for the PostHog changelog.
## PostHog Environment Configuration (2026-08-08)
- Added the supplied public PostHog project token and EU ingestion host to `.env.local` and `.env.prod`.
## Marketing Homepage, Blog, and FAQ Plan (2026-08-08)
- Reviewed the supplied Langfuse, Linear, and Better Auth reference captures and the current Tracify marketing/blog surfaces.
- Planned an original Tracify refresh that borrows their structural strengths: outcome-led product proof, editorial release storytelling, and docs-first developer trust. No code changes were made in this planning pass.
## Landing Page Rebuild (2026-08-09)
- Rebuilt `/` around an original trace-to-release narrative using the supplied reference captures for inspiration: Linear's editorial grid rhythm, Better Auth's concise README proof, and Langfuse's lifecycle-based product evidence.
- Added a run-health hero, interactive trace inspection, integration rail, product workflow cards, accessible FAQ accordion, and a refreshed social card that matches the new positioning.
- Verification: focused ESLint, standalone TypeScript, `git diff --check`, and a production build passed; Next generated 58 routes.
## Landing Viewport Composition (2026-08-09)
- Reworked the public landing-page composition so each primary desktop/tablet content section fits within the visible viewport; the compact integrations rail remains intentionally brief.
- Moved the hero run-health card to top alignment and reduced oversized vertical spacing without forcing small-screen content to clip.
- Verified the active 720px-tall local viewport: hero is 710px, the longest primary section is 693px, and the remaining primary sections are 660px.
## Landing Exploration Set (2026-08-09)
- Appended three clearly labeled, removable concept sections after the existing homepage without changing its prior sections: an execution report, developer-first implementation brief, and connected-platform lifecycle matrix.
- The concepts take structural inspiration from the supplied Linear, Better Auth, and Langfuse captures while using original Tracify copy and UI.
- Verification: focused ESLint, standalone TypeScript, `git diff --check`, and a production build passed; refreshed `localhost:3000` opens at the first concept section.
## Landing Exploration Round 02 (2026-08-09)
- Appended exactly ten more independent homepage concepts (04–13) after the first exploration set without modifying the established landing sections or concepts 01–03.
- The layouts cover an incident flight recorder, quality scorecard, release pipeline, cost ledger, collaborative review, session map, policy control plane, integration directory, before/after experiment, and release changelog.
- All copy and product visuals are original to Tracify while borrowing high-level editorial, developer-first, and lifecycle patterns from the supplied references.
- Verification: focused ESLint, standalone TypeScript, `git diff --check`, and the Next.js production build pass; `localhost:3000` returns 200 and opens at concept 04.
## Landing Hero Exploration Gallery (2026-08-09)
- Appended five standalone hero directions (A–E) after concept 13 without changing the original hero or any prior exploration.
- Directions: command-center split, editorial declaration, live incident investigation, release-proof scorecard, and developer quickstart.
- Kept the gallery server-rendered and independently labeled for easy comparison/removal.
- Verification: focused ESLint, standalone TypeScript, diff check, and production build pass; localhost returns 200 and includes both the original hero and Hero A.
## Definitive Hero Exploration (2026-08-09)
- Appended Hero F after the exploration gallery, preserving the original hero and Heroes A–E.
- Combines a concise outcome-led headline with immediate run health, trace evidence, root-cause diagnosis, evaluated fix, and safe-to-promote proof in one server-rendered composition.
- Verification: focused ESLint, standalone TypeScript, diff check, and production build pass; localhost returns 200 and includes both the original and definitive hero anchors.
## Footer Exploration Gallery (2026-08-09)
- Appended four independently labeled footer directions after Hero F while preserving the current production footer below them.
- Variations: dark editorial signal, light newsroom grid, operational control room, and oversized brand monument.
- Every direction includes Product, Developers, Company, and Resources link categories plus an accessible email newsletter form routed to the existing contact flow.
- Verification: focused ESLint, standalone TypeScript, diff check, and production build pass; localhost returns 200 with all four anchors, four forms, and the production footer.
- Follow-up: added Footer 05, a dark full-bleed wordmark direction where `tracify` spans the entire browser width beneath links and newsletter signup; localhost now verifies five footer anchors and five forms.
- Full-bleed refinement: removed the wordmark side inset and increased/scaled its responsive type so the `tracify` letters extend from the left viewport edge to the right viewport edge.
## CTA Exploration Gallery (2026-08-09)
- Appended five independently labeled CTA directions after Hero F and before the footer gallery, preserving every existing CTA.
- Variations: centered editorial focus, proof-before-promise release panel, developer activation quickstart, horizontal release rail, and light live-signal conversion block.
- The set uses original Tracify content while borrowing high-level editorial restraint, developer clarity, and product-proof patterns from the supplied Linear, Better Auth, and Langfuse references.
- Verification: focused ESLint, standalone TypeScript, diff check, and production build pass; localhost returns 200 with exactly five CTA anchors and the existing footer gallery intact.
## Pricing Exploration Gallery (2026-08-09)
- Appended five independently labeled pricing directions after Hero F and before the CTA/footer galleries, preserving the existing `/pricing` route.
- Variations: editorial matrix, highlighted plan trio, usage-led table, light comparison ledger, and enterprise conversation.
- Uses the live plan facts without inflating claims: Free ($0), Pro ($19), Team ($39), and custom Enterprise; beta access framing is preserved.
- Verification: focused ESLint, standalone TypeScript, diff check, and production build pass; both `/` and `/pricing` return 200 and the homepage includes exactly five pricing anchors.
- Clarity pass: rebuilt all five variants around price-first plan decisions. Each self-serve plan now visibly includes the monthly price, span allowance, retention, projects/members, and three concrete included benefits before its CTA.
- Billing refinement: added one shared Monthly/Annual toggle for the whole gallery. Annual mode shows the exact 20%-off monthly equivalents ($15.20 Pro, $31.20 Team), marked as billed annually; every `/mo` suffix now uses readable Geist Sans rather than the display face.
## Extended Landing Surface Exploration Gallery (2026-08-09)
- Appended 30 independently labeled sections after the pricing explorations while preserving every existing homepage section.
- The gallery provides three comparison-ready visual directions for each requested theme: customer proof, integrations, security, FAQ, developer docs, use cases, comparisons, resources, workflow, and contact/sales.
- Customer-proof treatments are explicitly placeholder/approval-oriented and make no fabricated customer, logo, testimonial, or outcome claims.
- Verification: focused ESLint, standalone TypeScript, diff check, and production build pass.
- Creative rebuild: replaced the repeated three-template system with 30 theme-specific compositions, including a placeholder logo wall, quote monument, metric poster, integration orbit, connector bento, data-flow rail, security vault, trust center, FAQ conversation, terminal takeover, workload map, editorial covers, workflow loop, office hours, and enterprise intake.
- Added restrained signal colors (acid yellow, coral, violet, mint), two original generated illustrations under `public/images/explorations/`, and client-leaf interactions for signal selection and mouse-reactive artwork.
- Motion includes orbit rotation, a pausable lifecycle ribbon, signal pulses, hover-responsive connector tiles, and pointer spotlights; reduced-motion preferences disable continuous animation.
- Browser verification confirms all 30 section anchors render, the generated signal visual changes to the selected evaluation state, three continuous-motion elements have active keyframes, and the page reports no console errors.
## Future Surface Exploration Gallery (2026-08-09)
- Appended 24 additional independently labeled concepts after the creative 30-section gallery, preserving all previous homepage work.
- Covered every remaining proposed direction: interactive product sandbox, ROI calculator, architecture explorer, gradual migration, onboarding journey, reliability/status, deployment choices, persona routing, evaluation playground, cost simulator, release-gate builder, trace anatomy, brand manifesto, founder story, community/open source, template gallery, editorial newsletter, announcement system, navigation rework, hero rework, pricing curation, homepage sequence curator, dedicated mobile composition, and footer finale.
- Kept the gallery server-rendered except for focused client leaves containing six interactive tools: trace selection, ROI controls, prompt comparison, cost modeling, release-gate configuration, and persona routing.
- Browser verification proves 24 `future-*` anchors render, trace selection updates evidence, ROI controls recalculate values, release-gate toggles update coverage, mobile viewport has no horizontal document overflow, and console logs contain no runtime errors.
- Focused ESLint, standalone TypeScript, diff check, and the Next production build pass.
## Sitewide Text Selection (2026-08-09)
- Global text selection now uses faint yellow (`rgba(250, 204, 21, 0.38)`) while preserving the selected text's existing color across the entire application.
- The rule lives outside CSS cascade layers, intentionally overriding older component/page-level white and translucent selection utilities, and includes Firefox's selection pseudo-element.
- Removed every remaining source-level `selection:bg-white*` and `selection:text-black` utility, replacing them with `selection:bg-yellow-300/40` directly on page/component roots.
- Verification: production build passes; the served stylesheet contains the faint-yellow utility and no white selection utility.
## Private Section Library (2026-08-09)
- Moved the complete exploration stack off the public homepage and into canonical `/admin/library`; `/library` is now an authenticated compatibility redirect.
- The admin workspace organizes 94 live explorations into 16 functional categories with search, category filters, direct anchor links, and five selectable site-structure narratives.
- Added six demand-generation concepts: production-readiness audit, trace clinic, reliability benchmark, cost-leak scan, migration brief, and five-day operator course.
- Every host, including localhost, now requires Clerk sign-in plus either an approved user ID or an approved organization with active `org:admin` role. Missing configuration and unapproved identities fail closed.
- Admin email allowlists are also supported through `TRACIFY_LIBRARY_ADMIN_EMAILS`; the local and production environment files allow `kristoffer.bon@gmail.com` to access the workspace after Clerk sign-in.
- The library is dynamic, marked noindex/nofollow/nocache, omitted from the sitemap, and absent from the public and signed-in marketing navigation.
- Verification: focused ESLint, standalone TypeScript, production build, clean public homepage response, and signed-out admin redirects pass.
## Curated Alternative Homepage (2026-08-09)
- Added public `/alternative` as a standalone, conversion-first homepage composition, leaving the production homepage untouched.
- The sequence combines the selected release-proof hero, trace investigation, operating benefits, readiness-audit lead magnet, clear three-plan pricing, trace-clinic CTA, custom navigation, and full-bleed yellow wordmark footer.
- Acid yellow is the signature accent across primary actions, proof markers, featured pricing, diagnostic affordances, and footer branding; an existing Tracify signal-map asset supports the product story.
- The private library now links directly to the curated route for comparison.
## Lightweight Homepage Composer (2026-08-09)
- Added private `/admin/composer` with simple show/hide switches for the seven alternative-homepage beats: hero, product, proof, readiness audit, pricing, CTA, and footer.
- The composer creates a shareable `/alternative?sections=...` preview URL; no CMS, database, or publish flow was introduced.
- Library category links now support focused URLs such as `/admin/library?category=Heroes` and `/admin/library?category=Contact%20%26%20CTA`.
- Verification: focused lint/type checks and production build pass; a partial preview verifies that omitted sections are not rendered.
## Future 19 Section System (2026-08-09)
- Extended the light navigation language into 15 distinct, live homepage sections under the dedicated `Future 19 system` library category.
- Replaced `/alternative` with a complete Future 19-only homepage preview: shared light-grid navigation plus all 15 matched sections, from outcome hero through footer atlas.
- Promoted the same Future 19 composition to the public `/` homepage; `/alternative` remains available as a comparison preview.
- Centralized the landing navbar and Future 19 footer in `SiteChrome` at the root layout. Every page route receives the marketing shell except `/dashboard` and all dashboard children; former route-local nav/footer instances were removed.
- The set covers an outcome hero, signal directory, proof band, lifecycle map, trace report, evaluation scoreboard, developer install, integration index, use-case switchboard, security controls, comparison matrix, pricing ledger, resource desk, conversion workshop, and footer atlas.
- All directions share the navbar's light paper field, thin black rules, black feature panels, yellow interaction/accent color, square geometry, and pixel-display typography without collapsing into one repeated layout.
- The private library now contains 114 indexed sections across 17 categories.
- Verification: exactly 15 `navsys-*` component anchors match exactly 15 library entries; focused ESLint, standalone TypeScript, production build, and refreshed localhost production server pass.

## Mobile Evaluation Scoreboard (2026-08-10)
- The Future 19 evaluation scoreboard now replaces its wide five-column table with stacked candidate cards below the `md` breakpoint.
- Its release heading scales down on narrow screens; desktop retains the original comparison table.
- Browser QA at a 375px viewport confirmed the section matches the viewport width with no horizontal document overflow.

## Official Third-Party Brand Marks (2026-08-10)
- Added a shared `ThirdPartyLogo` registry for external product marks used by the public site.
- Replaced invented homepage integration glyphs with official OpenAI, Anthropic, Vercel, LangChain, LlamaIndex, and OpenTelemetry marks.
- The homepage integration index and `/integrations` directory now reuse the same registry; unavailable live Simple Icons slugs use pinned or official-project assets.
- Browser QA confirmed every rendered third-party image loaded across all three public brand surfaces.

## Public Integration Disclosure (2026-08-10)
- Removed the public homepage Platform row that disclosed Tinybird, Redis, and Convex.
- The integration area now communicates only customer-facing compatibility: models, frameworks, and telemetry standards.

## Private Admin Navigation (2026-08-10)
- Removed the Admin destination from public desktop and mobile navigation; it does not appear in the public footer.
- Signed-in users see Dashboard and Sign out actions in the navbar; signed-out visitors retain Start free.
- The Admin link now appears only in the dashboard for `kristoffer.bon@gmail.com`; the server-side library guard uses the same default allowlist in addition to configured environment allowlists.

## Focused Onboarding and Product-Shell Branding (2026-08-10)
- `/onboarding` and every nested onboarding route now render without the marketing navbar or footer.
- `BrandLogo` supports a plain mode without the yellow marker; dashboard and onboarding shells use it while marketing retains the highlighted wordmark.
- Browser verification confirms the onboarding project route contains no navbar, footer, or yellow logo highlight.

## Development API-Key Hashing Secret (2026-08-10)
- Local onboarding project creation failed because the development Convex deployment lacked `TRACIFY_API_KEY_HASH_SECRET`.
- Production already had the variable; a separate cryptographically random 256-bit secret was generated, set, and verified for development without exposing its value.
- Convex environment variables apply directly to the deployment, so no source or schema change was required.

## Tracify API-Key Secret Rename (2026-08-10)
- Renamed `TRACIFY_API_KEY_HASH_SECRET` to `TRACIFY_API_KEY_HASH_SECRET` across Convex, Next.js, local environment files, examples, and operational documentation.
- Preserved the existing secret value separately in development and production so previously issued API keys continue to hash identically.
- Synced and deployed Convex development and production, verified the new variable, and removed the old variable from both Convex deployments.
- Added the new production variable to Vercel; its old variable remains temporarily for the currently deployed pre-rename Next.js build and can be removed after the next site deployment.

## Stripe Documentation Skills (2026-08-11)
- Installed the seven Stripe-published agent skills under `.agents/skills`: Connect recommendations, Stripe Apps, best practices, directory, docs, projects, and upgrade guidance.
- User-provided Stripe sandbox keys were not written to source control or local environment files.

## Stripe Subscription Billing (2026-08-11)
- Installed Stripe CLI 1.45.2, configured Stripe agent tooling, installed the Projects plugin, and accepted the hosted Checkout subscription integration plan.
- Added Stripe SDK 22.4.0 plus authenticated Checkout and Customer Portal routes, signature-verified webhook handling, and Convex-backed customer/subscription state.
- Created test-mode Tracify Pro ($19 monthly / $182.40 annual) and Team ($39 monthly / $374.40 annual) products and a customer portal with invoice history, payment-method updates, prorated plan changes, and cancel-at-period-end.
- Test credentials and webhook secrets are stored only in ignored `.env.local`; public templates contain variable names only.
- Live payments remain blocked because the Stripe account is not activated: charges and payouts are disabled and required business/representative/bank/TOS details are outstanding. Tax is intentionally disabled until an active tax registration is confirmed.

## Stripe Live Billing Readiness (2026-08-12)
- Stripe account activation is complete: card payments, transfers, charges, and payouts are enabled with no outstanding verification requirements.
- The live catalog contains Pro ($19 monthly / $182.40 annual) and Team ($39 monthly / $374.40 annual). The live Customer Portal supports invoice history, payment-method updates, prorated plan changes, and cancel-at-period-end.
- Created the live subscription webhook for `https://www.tracify.tech/api/stripe/webhook`; its signing secret, the billing sync secret, live publishable key, and all live price IDs are configured in Vercel production. The sync secret is also configured in production Convex.
- Deployed the billing schema/functions to production Convex, including Stripe customer and subscription indexes.
- Reconciled homepage, public pricing, dashboard, and Stripe prices/limits. Production build passes after making the Open Graph image dynamic to avoid a Windows libvips prerender failure.
- Application deployment is intentionally pending: the live server secret was pasted into chat and must be rolled. Add a replacement restricted live key directly to Vercel as `STRIPE_SECRET_KEY`; never paste it into chat or commit it.
- Stripe Tax remains disabled because an active tax registration has not been confirmed.

## Git and Vercel Production Release (2026-08-12)
- Published branch `codex/stripe-live-billing` with release commits `121ccdd` and `a6f40b5`.
- Production Vercel deployment `dpl_7RgTFMWSVRfdsQEyZKaSghfuhRwB` reached Ready and `https://www.tracify.tech` points to it.
- Hardened Stripe client initialization so builds and non-billing routes remain healthy when the server key is absent; billing endpoints return 503 until a replacement restricted live key is configured.
- Removed the tracked `scratch/sync_envs.ps1` credential dump before publishing. Its historical credentials remain compromised and require rotation.

## Distinct Future 19 Public Pages (2026-08-11)
- Replaced the repeated public-page masthead composition with route-specific visual systems across the public routes migrated in the Future 19 pass.
- Blog, pricing, docs, product, use-case, changelog, contact, roadmap, status, security, privacy, and terms now use distinct editorial metaphors and responsive layouts while retaining the shared monochrome/yellow brand language.
- Desktop and 375px browser checks passed on representative and dynamic variants; focused ESLint, TypeScript, and diff-hygiene checks passed.
- A separate concurrent task moved the application into `(frontend)` and `(payload)` route groups; those unrelated Payload, Stripe, dashboard, and backend changes were preserved untouched.

## Payload Neon Initialization (2026-08-12)
- Connected Payload to the dedicated Neon Postgres database through `DATABASE_URL` in local development and all Vercel environments.
- Generated `src/migrations/20260811_220842_initial_payload_schema.ts` and applied it successfully to Neon.
- Verified migration batch 1 is recorded as run and the local Payload posts API responds with HTTP 200.
- The remaining personal setup step is creating the first administrator account at `/cms`; application deployment remains separate because the worktree contains concurrent changes.
- Installed Neon’s official `neon` and `neon-postgres` agent skills under `.agents/skills` for managed database access, branching, SQL, and migrations.
- Added a whitelisted `Content` entry to the dashboard Resources navigation and protected `/cms` with the existing server-side private-library allowlist; Payload authentication remains a second security layer.
- Browser verification confirmed the whitelisted signed-in session still reaches `Dashboard - Payload`. Full static/build validation was interrupted because the long-running Windows Next development process saturated Node and caused new checks/navigation to stall.

## Unified Production Release (2026-08-12)
- Consolidated the recent SEO/public-site, Payload blog and CMS, Stripe live billing, Site 1/dashboard navigation, Neon migration, and administrator-access work into the `codex/stripe-live-billing` release lineage.
- Scratch logs and downloaded reference material remain excluded from version control.
- The exact combined worktree passed Vercel's production compilation and TypeScript checks and deployment `dpl_5TUPyFowyzSBZhBZpftsTn2L2wjR` reached Ready before the Git history consolidation.

## Markdoc Blog and Authoring Workflow (2026-08-13)
- Replaced Payload CMS with validated repository-backed Markdoc content under `content/blog`; Payload routes and runtime packages are removed.
- Future blog and documentation work must use `.agents/skills/tracify-blog-tool/SKILL.md` for writing quality and storage routing.
- The first published post is `ai-agent-observability-complete-guide`; the other migrated posts remain drafts.
- Blog posts do not render a post-level newsletter CTA. The site-wide footer newsletter remains.
- The article author signature uses a responsive light editorial treatment instead of the former dark card.
- Markdoc shipped to `main` in `b551ff2`; production deployment `dpl_7eQKAxcC6R5gZ1y8NhJE5huUZ6Gc` reached Ready and owns the Tracify production aliases.
- The linked `tracify` Vercel project has no environment variables, so there were no Payload-only variables to remove. Localhost was restarted from merged `main`, and the blog index and published article both returned HTTP 200.
- Published articles require at least two distinct contextual links to other published posts when eligible targets exist. Generic `Related guide` blocks, self/draft/missing targets, bare URLs, `click here`, and `read more` fail `npm run test:content`.
- The blog index uses a restrained bento grid: the newest post spans two of three desktop columns with capped media, standard cards retain their own images, tablet uses two columns, and mobile uses one. The page-level newsletter was removed; only the global footer signup remains.
- Blog discovery and internal linking shipped in `1717d19`; production deployment `tracify-h15vc5vcq-tracify-tech.vercel.app` reached Ready. Live checks confirmed `/blog` and a representative article return 200, all 10 cards render, the duplicate newsletter is absent, and contextual links are present.
- Future posts must choose interaction by reader job: trace/evaluation demos for execution reasoning, editable sandboxed code for implementation learning, focused calculators/checklists/explorers for operational decisions, or static prose when interaction adds no value. Interactive content remains centralized Markdoc tags mapped to accessible leaf React components; arbitrary MDX/JSX, server-side code execution, secrets, and production-data access are prohibited.
- Future Git work defaults to a `codex/<description>` branch and draft PR. Features and higher-risk application changes require PRs; direct `main` pushes are reserved for explicit user-approved, low-risk content fixes after checks pass. Agents must inspect staged scope and exclude scratch or unrelated changes.
## Root robots.txt route (2026-08-13)
- Removed the unsupported `Host` directive from `/robots.txt` after Google Search Console correctly reported it as ignored by Googlebot. Canonical-host selection remains enforced by the bare-domain redirect, `metadataBase`, canonical tags, and sitemap URLs.
- Diagnosed the production `robots.txt` 404: Next.js requires `robots.ts` in the root App Router directory, but it was nested under the `(frontend)` route group and omitted from Vercel's build output.
- Moved the metadata route to `src/app/robots.ts`; `npm run build` passed and explicitly emitted static `/robots.txt`. PR #4 merged to `main` and production deployment `dpl_BQ1D2JYfFkcp771WcRnYP5BVsJ7f` is Ready; live `/robots.txt` and `/sitemap.xml` return HTTP 200.

## Page-specific redesign and mobile switchboard (2026-08-14)
- The current redesign explicitly excludes the landing page, public blog, and public docs; those surfaces remain untouched until the owner asks otherwise.
- The owner rejected applying one template across the site. Each route must use a composition shaped by its job while sharing only Tracify's paper, black, acid-yellow, pixel/mono, zero-radius identity.
- The selected mobile **Section Switchboard** is implemented in `src/components/marketing/navbar.tsx`: large numbered accordion controls, 2x2 destination tiles, a dedicated Pricing tile, and a sticky account action replace the former 9px text-link list.
- Browser verification passed at the 390px breakpoint: sections switch correctly, inactive destinations hide, clean `/contact` console output has no errors, and `design-qa.md` records a passed comparison.
- Work continues on `codex/unique-page-redesign`; the requested page-by-page implementation is complete and is in final repository verification.
- Pricing now uses an interactive team-size/trace-volume decision canvas with live plan recommendation, rate details, billing interval, and a comparison ledger; it no longer uses the shared masthead-plus-plan-card composition.
- Integrations now uses a split OTLP protocol rail, sticky category index, and full-width adapter connection rows instead of a generic card grid.
- The four `/use-cases/[slug]` routes no longer share one recolored template: research is an evidence trail, support an escalation record, automation an execution pipeline, and tool calling a payload/schema inspector.
- Focused ESLint and diff hygiene pass for these routes. Browser checks at desktop and 390px show no horizontal overflow; recommendation and use-case rendering interactions produce no console errors.
- The remaining redesign now covers all nine product features, status, roadmap, changelog, security, contact, privacy, terms, authentication shells, and onboarding shells.
- Responsive browser checks found no horizontal overflow across the redesigned public and account routes. Focused lint passes for every changed source file; repository-wide lint still reports pre-existing unrelated failures.
- Final verification: `npm run test:content` passed all 15 tests, the changed-file ESLint pass and `git diff --check` passed, and `npm run build` completed successfully with TypeScript and all 80 static pages.

## Documentation navigation and agent access (2026-08-15)
- Documentation articles and the docs overview now use a categorized navigation sidebar at every viewport: a compact expandable drawer on small screens and a sticky grouped rail on desktop.
- Each documentation article has `Copy Markdown` and `Send to` actions with the understated helper copy “Copy or share.”; the send menu supports Markdown copy, ChatGPT, Claude, and the MCP setup guide.
- Public documentation is available through the read-only Streamable HTTP MCP endpoint at `/api/docs/mcp`. It lists, searches, and reads every repository-backed public docs page, and deliberately exposes no traces, prompts, evaluations, API keys, or customer data.

## SEO release ancestry and deployment guardrails (2026-08-14)
- PR #5 merged branch state at `5e7807b`; later SEO commits `3474f98` and `191cbeb` were pushed after the merge and are not ancestors of `origin/main`.
- Production deployment `dpl_GucMKe2AYetsPtixDMw1GMGJgGy6` correctly deployed exact main commit `f646ca7` and owns the canonical Tracify domains. The later IndexNow key remains absent because it is not in that commit.
- Future agents must follow `docs/seo-release-checklist.md`: prove commit ancestry, deploy an exact clean `origin/main` tree to `tracify-tech/tracify`, verify canonical aliases, and submit IndexNow only after its key is live.

## EU/US regional cloud foundation (2026-08-15)
- Regional cloud uses one Git repository and two fully separated deployments. Canonical hosts are `eu.cloud.tracify.tech` and `us.cloud.tracify.tech`; selection happens before authentication, and accounts/data do not automatically migrate.
- Vercel projects `tracify-cloud-eu` and `tracify-cloud-us` are configured as Next.js and have region-specific production/preview settings. Both domains are attached; Domeneshop DNS still needs A records to `76.76.21.21` before TLS can issue. Git automation is intentionally disconnected because Vercel treated each empty project's first feature-branch build as production; those builds were deleted. Reconnect only for the verified merged-main release.
- Convex EU is `jovial-owl-711` in `eu-west-1`; Convex US is `flexible-anaconda-752` in `us-east-1`. They use unique runtime secrets and live `/health` endpoints that report `eu` and `us` respectively.
- The existing Tinybird host is European and the existing Redis Cloud URL is one shared database. They may seed the EU setup, but must never be reused for US. Independent Tinybird, Redis, and Inngest resources remain launch blockers and their secrets are intentionally absent from regional Vercel projects.
- Local deploy keys and copied environment artifacts live only under ignored `scratch/tracify-regional/`; never commit or print their values. The non-secret authoritative inventory and external launch gates live in `config/regional-cloud.json`.
- The latent Better Auth SAML plugin was removed during regional deployment work because `@better-auth/sso` imports Node-only crypto/samlify and cannot bundle in Convex's HTTP runtime. Do not claim SAML support until it is reintroduced through a Convex-compatible architecture and verified in both regions.

## EU regional cloud is LIVE (2026-08-19) — and "europe" is not "the EU"
- `eu.cloud.tracify.tech` is live and healthy on merged commit `091d9da`. `/api/health/region` returns 200 with convex, tinybird, redis, and inngest all `ok`. This supersedes the 2026-08-15 entry above, which is now stale in several places: both regional domains were NOT already attached (the EU domain was attached on 2026-08-19; US remains unattached by design), and DNS now uses a CNAME to `5ee7be47305fd6c5.vercel-dns-017.com`, not the legacy `76.76.21.21` A record.
- **The costliest lesson: a cloud region named `europe-*` is not necessarily in the EU.** GCP `europe-west2` is London (UK) and `europe-west6` is Zurich (CH); the UK left the EU in 2020. Both the Tinybird workspace and the first Redis database were built in `europe-west2` and recorded as "confirmed EU-located" before anyone checked. Always verify by resolving the endpoint and matching the IP against `https://ip-ranges.amazonaws.com/ip-ranges.json` or `https://www.gstatic.com/ipranges/cloud.json`. Never trust a region's name.
- Verified EU: Convex `jovial-owl-711` (aws eu-west-1), Tinybird `tracify_eu_west1` at `https://api.eu-west-1.aws.tinybird.co` (`52.211.129.79`), Upstash Redis `concrete-buffalo-140061` primary eu-west-1 (`52.214.68.234`).
- **Inngest runs in AWS us-east-2 (Ohio) and has no EU region.** It is the primary ingestion path — `inngest.send()` carries span `input`/`output`, so every trace transits the US. Default-on PII redaction runs before the send. Decision: keep Inngest, disclose it plainly in the "Data residency" section of `/security`, and do not claim end-to-end EU residency. Replacement candidate if a customer ever demands it: Upstash QStash (2 functions, 5 send sites).
- Redis moved from Redis Cloud to Upstash because Redis Cloud's free 30 MB tier gates TLS behind a paid plan. Upstash gives TLS by default. It is a **Global-type** database: a non-EU read region can be added in one click with no code change and no deploy, silently breaking residency. Re-check the read-region list before each release.
- Public region selector now offers EU only. `src/lib/regions.ts` carries an `available` flag with `getAvailableRegions()`/`isRegionAvailable()`; `/api/region/select` rejects dormant regions server-side so a hand-typed `?region=us` cannot set the cookie. US stays defined and routable so US-issued keys are still detected as wrong-region.
- `/cloud` renders only when `NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND=marketing` (`src/proxy.ts` redirects it away on cloud deployments), so **the region selector ships with the marketing `tracify` project, not the regional ones**. A regional-only deploy will not update it.

## Tooling and credential facts learned the hard way (2026-08-19)
- `vercel` is not on PATH but `npx vercel` works and the CLI is authenticated as `bnkr` (scope `tracify-tech`). Env vars can be listed/added/removed. Do not claim Vercel is unreachable from this environment.
- Vercel env vars marked *Sensitive* are **write-only**: `vercel env pull` returns `[SENSITIVE]`, so nobody can read them back. Audit names with `npx vercel env ls production --project <p> --scope tracify-tech`. A wrong value is only provable at runtime — `/api/health/region` is the check.
- `TINYBIRD_HOST` must include `https://`. `src/lib/tinybird.ts` interpolates it directly into `fetch()` and falls back to the global `https://api.tinybird.co`, so a bare hostname breaks every call and a missing value silently targets the wrong region. A swapped host/token pair was caught this way: `TINYBIRD_HOST` held a `p.eyJ…` JWT.
- Tinybird Forward workspaces reject `POST /v0/datasources` and `/v0/pipes` ("can only be done via deployments"). Schema must go through `tb deploy`, run **from the repository root** where `.tinyb` lives. Its trailing `'charmap' codec can't encode '\u2713'` error on Windows is console encoding, not failure.
- `.tinyb` holds a live Tinybird token and was **tracked in git** with the token committed until 2026-08-18. Now gitignored; never re-add it. `scratch/tracify-regional/` was likewise unignored despite the runbook claiming otherwise — also fixed.
- `INNGEST_SIGNING_KEY` does not exist in this codebase; only `INNGEST_EVENT_KEY` is read.

## 2026-08-20 PR #19 rebase recovery
- Rebased the four light-theme commits from `codex/light-theme-reskin` onto `origin/main` in the isolated `scratch/pr19-rebase` worktree, leaving the owner's dirty primary checkout untouched.
- The only conflict was `task.md`: the branch carried stale EU-launch and Convex-codegen instructions. The current `main` version was retained because it already includes the light-theme record and the newer, completed infrastructure history.
- Rebased detached HEAD is `ed28cb7`. Verification passes: TypeScript, 16 content tests, diff hygiene, and the Next.js production build (99 routes). Focused ESLint reports only the pre-existing `no-explicit-any` in `src/components/ui/dot-pattern.tsx`; the PR changes only that file's SVG fill color.
- The remote PR branch has not been rewritten. Updating PR #19 requires an explicitly authorized `git push --force-with-lease origin HEAD:codex/light-theme-reskin`.
- On 2026-08-20 the owner explicitly authorized safe updates and merges for PRs #23 and #19. PR #23 passed review and merged to `main` as `3e656e1`; PR #19 must include that new base before its protected branch rewrite.
- gstack 1.68.2 was installed as a personal, namespaced skill set for both Codex and Claude Code. Bun 1.3.14 and the gstack browser runtime are installed; telemetry, automatic upgrades, update checks, team enforcement, and plan-tune hooks are disabled.

## 2026-08-20 PR merges and SDK publishing dry run
- PR #19 was rebased again onto PR #23's merge, force-pushed with an exact lease, and squash-merged as `1a5555f` only after GitGuardian and both Vercel previews passed. PR #23 had already merged as `3e656e1`.
- The repository's first `Publish SDKs` dry run (`32358700372`) uploaded nothing. Python tests/build passed. npm failed at `vitest: not found` because the workflow ran `npm ci` at the repository root even though `packages/ts-sdk` has its own lockfile and dev dependencies.
- `tracify-sdk` still returns 404 on both npm and PyPI. npm staged publishing cannot create a brand-new package. PyPI can create one through a pending trusted publisher. Do not first-publish either distribution without explicit approval and confirmed registry ownership.

## 2026-08-20 SDKs published to npm and PyPI
- The owner explicitly approved the irreversible first releases and completed registry login/2FA in normal Chrome.
- `tracify-sdk@0.2.0` is public on npm under maintainer `tracifytech <admin@tracify.tech>` and on PyPI as `tracify-sdk 0.2.0` with both wheel and source distribution.
- GitHub workflow run `32365691091` published PyPI successfully. npm rejected the CI token with `EOTP`, so the identical verified npm package was published locally through the owner's interactive npm 2FA session.
- Registry verification and clean consumer smoke tests pass: npm exposes `TracifyClient`, `traceAgent`, `llmCall`, `toolCall`, `decision`, and region constants; Python imports `TracifyClient`, `trace_agent`, `llm_call`, and `tool_call` from `tracify`.
- Follow-up: configure trusted publishers for both registries. npm staged publishing can now be enabled because the npm package exists; it was unavailable for the first release.

## 2026-08-21 blog article repertoire and monitoring polish
- The supplied Semrush references establish three especially useful pacing models: a sequential definitive guide, a numbered decision framework, and a browsable practical library with a short starter set plus an adaptation method. Tracify's workflow now expands these into five selectable archetypes rather than forcing one template on every post.
- The repertoire is mandatory in `.agents/skills/tracify-blog-tool/SKILL.md`, its quality bar, and `content/blog/README.md`. Future authors must choose an archetype and distribute proof modules throughout the article instead of concentrating visuals in the opening.
- `ai-agent-monitoring` is the only post using the new monitoring treatment: six static operator runthroughs, `C:\` H2 prompts, highlighted key phrases, operational tables, colored code artifacts, a closed nested TOC, FAQ accordions, and a yellow reading-progress bar.
- The refined article is 3,626 words and has 17 contextual internal links (about 4.7 per 1,000 words). The former bottom link dump and irrelevant publishing-process tangent were removed.
- Verification: 19 content tests pass; focused ESLint and `git diff --check` pass; the full 116-route Next production build passes when supplied non-secret placeholder Convex URLs for page collection. Repository-wide lint still fails on unrelated pre-existing files. Local SSR returned HTTP 200 and confirmed one closed TOC, six runthroughs, and five FAQ accordions. The in-app browser kernel still cannot initialize (`failed to write kernel assets`), so viewport verification is limited to CSS/DOM safeguards rather than a screenshot sweep.

## 2026-08-22 monitoring article usability correction
- The owner rejected decorative terminal framing when it does not help a reader decide or act. `ai-agent-monitoring` now uses a simple `/` H2 marker, no numbered runthrough cards, and concise blockquote notes for paging, diagnosis, routing, rollout, runbook, and calibration rules.
- Code belongs only when readers can adapt it. The throwaway pseudo-alert was removed; the remaining rollout-policy YAML and alert-packet JSON are explicitly described as illustrative, retain copy controls, identify their actual language, and use neutral dark-gray panels.
- Markdown tables render through an accessible native-table wrapper with contained horizontal scrolling. Cells keep normal word boundaries, while the page itself has no horizontal overflow at 390px.
- The article now clears the fixed navigation, the Back to blog control has readable hover/focus contrast, and exactly three recommended-post cards appear after the tags at the bottom.
- The article is roughly 3,838 words with 17 contextual links (about 4.43 per 1,000 words). The in-app browser verified desktop and 390px layouts, semantic tables, contained overflow, two labeled code panels, simple heading markers, no runthroughs, and three recommendations.
- Final verification passes: 19 content tests, focused ESLint, `git diff --check`, and the 116-route production build with non-secret placeholder Convex URLs. The only browser console error was the expected missing local PostHog token.

## 2026-08-25 AI agent evaluation guide refinement
- On clean branch `codex/blog-ai-agent-evaluation` from `origin/main`, replaced the duplicated/generated body of `content/blog/ai-agent-evaluation-practical-guide.mdoc` with a Represent → Specify → Score → Review → Gate evaluation loop.
- Preserved published metadata, `draft: false`, related-post state, and the existing tracked hero image. Added one deterministic release-gate scenario, representative-set and rubric tables, an illustrative rubric artifact, one FAQ section, contextual links, and an operational checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, and the final body has one FAQ heading with no recommendation prose dump. Full lint remains a separate check with the same unrelated pre-existing errors.

## 2026-08-25 AI agent regression testing guide refinement
- On clean branch `codex/blog-regression-testing` from `origin/main`, replaced the appended/generated sections of `content/blog/ai-agent-regression-testing.mdoc` with a Capture → Replay → Compare → Gate regression workflow.
- Preserved published metadata, `draft: false`, related posts, and the tracked evaluation asset. Added one deterministic case-selection scenario, failure-mechanism matrix, illustrative fixture, baseline/candidate comparison table, an in-article visual, one FAQ section, contextual links, and an operational checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, and the final body has one FAQ heading with no recommendation prose dump. Full lint remains a separate check with the same unrelated pre-existing errors.

## 2026-08-25 production debugging guide refinement
- On clean branch `codex/blog-production-debugging` from `origin/main`, replaced the duplicated/generated body of `content/blog/debug-ai-agents-in-production.mdoc` with a Stabilize → Reconstruct → Compare → Correct → Verify incident workflow.
- Preserved published metadata, `draft: false`, related-post state, and the existing tracked hero image. Added one deterministic investigation scenario, containment/timeline/comparison tables, an illustrative incident packet, an in-article visual, one FAQ section, contextual links, and an operational checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, and the final body has one FAQ heading with no recommendation prose dump. Full lint remains a separate check with the same unrelated pre-existing errors.

## 2026-08-25 RAG evaluation guide refinement
- On clean branch `codex/blog-rag-evaluation` from `origin/main`, replaced the appended/generated sections of `content/blog/rag-evaluation-guide.mdoc` with a Retrieve → Ground → Score → Gate evaluation loop.
- Preserved published metadata, `draft: false`, related posts, and the tracked evaluation hero asset. Added one deterministic citation-mismatch scenario, an illustrative evaluation record, retrieval/claim/release tables, an in-article visual, one FAQ section, contextual links, and an operational checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, and the final body has one FAQ heading with no recommendation prose dump. Full lint remains a separate check with the same unrelated pre-existing errors.

## 2026-08-25 AI agent testing guide refinement
- On clean branch `codex/blog-agent-testing` from `origin/main`, replaced the duplicated/generated body of `content/blog/ai-agent-testing-unit-tests-production-evals.mdoc` with an Isolate → Simulate → Evaluate → Observe → Improve testing loop.
- Preserved published metadata, `draft: false`, related-post state, and the existing tracked hero image. Added one deterministic layer-selection scenario, a failure/layer matrix, illustrative test pseudocode, an in-article visual, one FAQ section, contextual links, and an operational checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, and the final body has one FAQ heading with no recommendation prose dump. Full lint remains a separate check with the same unrelated pre-existing errors.

## 2026-08-25 AI agent observability guide refinement
- On clean branch `codex/blog-agent-observability` from `origin/main`, replaced the duplicated/generated body of `content/blog/ai-agent-observability-complete-guide.mdoc` with a Frame → Follow → Assess → Respond → Learn observability loop.
- Preserved published metadata, `draft: false`, related-post state, and the existing tracked hero image. Added one deterministic trace scenario, signal-layer and outcome tables, an illustrative trace event shape, one FAQ section, contextual links, and an operational checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, and the final body has one FAQ heading with no recommendation prose dump. Full lint remains a separate check with the same unrelated pre-existing errors.

## 2026-08-25 AI agent reliability guide refinement
- On clean branch `codex/blog-agent-reliability` from `origin/main`, replaced the duplicated/generated body of `content/blog/ai-agent-reliability-failures-retries-guardrails.mdoc` with a Classify → Contain → Recover → Escalate → Learn operational loop.
- Preserved published metadata, `draft: false`, related-post state, and the existing tracked hero image. Added one deterministic retry scenario, failure/action and boundary tables, an illustrative retry policy, one FAQ section, contextual links, and an operational checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, and the final body has one FAQ heading with no recommendation prose dump. Full lint remains a separate check with the same unrelated pre-existing errors.

## 2026-08-25 LLM observability metrics refinement
- On clean branch `codex/blog-llm-observability-metrics` from `origin/main`, replaced the duplicated/generated body of `content/blog/llm-observability-metrics-that-matter.mdoc` with an Outcome → Dimension → Threshold → Action decision guide.
- Preserved the published metadata, `draft: false`, tracked hero asset, and article intent. Added one deterministic alert scenario, one FAQ section, decision notes, metric hierarchy tables, cost/latency trade-offs, contextual links, and a practical checklist.
- `npm run test:content` passes all 19 tests, the production build passes with non-secret placeholder Convex URLs, `git diff --check` passes, the tracked image returns HTTP 200, and the final body has one FAQ heading with no recommendation prose dump. Full lint still reports 18 unrelated pre-existing errors.

## 2026-08-26 long-form corpus gate
- Enforced a 4,000–8,000 body-word target for every published post in this worktree, with a hard 3,000–10,000 validator gate for future content.
- Updated the agent skill, AGENTS.md, publishing README, canonical playbook, and blog framework tests/validator.
- Expanded the remaining short published posts and verified all 35 are currently between 4,000 and 8,000 body words.
- Framework, internal-link, Markdoc, docs, reading-time tests, and production build pass. The package `test:content` script remains broken because it invokes Node's test runner directly against TypeScript tests; equivalent `bun test` coverage passes.

## 2026-08-26 AI evaluation metrics editorial and UX rebuild
- Reworked `ai-evaluation-metrics` into a 5,533-word editorial article with a late five-item FAQ, no in-body recommendation dump, three instructional editorial panels, dynamic three-card related-post selection, and eleven restrained explicit highlights.
- Kept the yellow and dark panel colors unchanged while giving selected text card-specific contrast: black/white on yellow and cream/black on dark. Browser-computed selection styles confirm the overrides.
- Added two generated, article-specific 1672×941 visuals under `public/media`: a request-to-outcome first-divergence trace and a layered release-gate/canary diagram. Both return HTTP 200 and scale without page overflow at 1460px and 390px.
- Replaced the reused evaluation scorecard hero with the article-specific 1672×941 `ai-evaluation-metrics-hero.png`, a photographed mechanical measurement machine. The asset is referenced by this article only, and the shared article hero no longer forces grayscale so unique color direction remains visible; related-card thumbnails stay grayscale.
- Updated the mandatory writing skill and publishing README: future posts need their own compositionally distinct hero and teaching visuals, may not borrow another post's asset or submit a simple recolor, and may derive card/hero/OG crops only from that post's unique source.
- Verification passes: 20 content tests, 3 related-post tests, focused ESLint, `git diff --check`, route/media HTTP checks, and desktop/mobile in-app browser inspection. The production bundle compiles, then stops on the unrelated pre-existing `src/components/dashboard/cost-dashboard.tsx:256` `ReactNode`/`Date` type error.
- The localhost review pass remains uncommitted. `public/media` is ignored, so all three new PNGs must be force-added when the approved PR commit is prepared.

## 2026-08-26 reusable blog-quality skill gate
- Upgraded and renamed the existing mandatory project skill to `tracify-blog-tool`, so it is visually distinct from the global `writing-tracify-content` skill while `AGENTS.md` continues to trigger one canonical workflow for every Tracify blog request.

## 2026-08-26 project blog skill rename
- Renamed the repository-local skill folder, frontmatter name, UI display name, and `$skill` invocation from `writing-tracify-content` to `tracify-blog-tool`.
- Updated active repository rules, package commands, publishing instructions, canonical playbook links, and historical design references to the new path.
- The global `C:\Users\krist\.codex\skills\writing-tracify-content` skill remains unchanged. The project-local skill is now unambiguous in the skill list as “Tracify Blog Tool.”
- The renamed skill passes the skill-package validator, its YAML UI metadata parses correctly, the strict benchmark gate passes, both validator tests pass, all 22 content tests pass, and `git diff --check` passes.
- Added `references/blog-quality-blueprint.md`, using the rendered `ai-evaluation-metrics` article as the composition benchmark without allowing agents to copy its topic, structure, examples, or artwork.
- Replaced the thin blog asset with a full editorial scaffold covering a unique hero, two teaching images, lower-half visual pacing, code, tables, notes, varied panels, restrained highlights, a practical ending, and exactly five FAQ items.
- Added `npm run validate:blog -- <slug>` and a deterministic validator that enforces 3,000–10,000 words, unique hero and body media paths, article depth, lower-half modules, code, tables, notes, highlights, panels, one interaction, contextual links, a late five-item FAQ, and no in-body recommendation dump.
- The approved article passes with 5,533 words, 3 body visuals, 11 highlights, 3 panel tones, 8 tables, 2 notes, 1 interaction, 3 internal links, and 5 FAQs. A deliberately bad fixture fails the expected gates. The complete content suite passes 22 tests, the focused blog lint passes, the skill package validator passes, and `git diff --check` passes.
- Full lint still reports the same unrelated 18 errors across existing share buttons, ToC, marketing, UI, and hook files. The production bundle compiles and then reaches the same unrelated `cost-dashboard.tsx:256` `ReactNode`/`Date` type error.
- The new skill reference and validator scripts are hidden by the repository’s local `.git/info/exclude` rule for `.agents/`; force-add them with the three ignored article PNGs when preparing the PR.
# Release-readiness disclosure update — 2026-09-02

- Updated the public Privacy and Security pages to disclose that EU account data, traces, and cache are stored in Ireland, Stripe handles billing data separately, and Inngest Cloud currently processes queued span events in US infrastructure. The pages now explicitly avoid claiming end-to-end EU residency and describe analytics as enabled by default.
# 2026-09-03 SEO/AEO blog ideation
- Reviewed the canonical Tracify blog skill/playbook and current corpus of published topics.
- Prepared 10 new, non-duplicative blog concepts designed for search intent and answer-engine extraction; no blog content or publication state was changed.
# 2026-09-03 — Langfuse parity and release operating model

- Tracify currently has `.github/workflows/publish-sdks.yml`, triggered manually or by `sdk-v*` tags; it builds/tests TS and Python SDKs and publishes npm/PyPI packages, but it is not a complete application release process.
- Application package version is `0.1.0`; both TS and Python SDK manifests are `0.2.0`; Playwright package is `0.1.0`.
- Existing product code includes prompts, datasets, evaluators, experiments, alerts, comments, agent tracing, typed scores, cost ceilings, and TS/Python SDKs.
- Recommended first milestone: release foundation plus a v0.3.0 candidate, then trace-linked evaluation regression gates and accurate model/token/cost accounting.
- Executable backlog spec: `docs/tracify-parity-and-release-spec.md`; no external issue was opened.
# 2026-09-03 — Plane integration documentation

- Added `content/docs/plane-integration.mdoc`, a Plane-specific integration guide covering ownership boundaries, failure-review workflow, API/webhook guardrails, self-hosting separation, and links to Plane's official developer documentation.
# 2026-09-03 — Internal Plane workspace correction

- Corrected Plane scope to private Tracify project management, removed the mistaken public `content/docs/plane-integration.mdoc`, and added `docs/plane-internal-ops.md`.
- VPS, DNS/Cloudflare Access, SMTP, and backup provisioning remain pending because no provider credentials or target server were supplied.
# 2026-09-03 — Cloudflare Tunnel security correction

- Updated the internal Plane runbook to use an outbound Cloudflare Tunnel and Cloudflare Access with MFA. The VPS should expose SSH only; Plane HTTP/HTTPS remains private behind the tunnel.
- On 2026-09-04 the owner changed `tracify.tech` nameservers at Domeneshop to Cloudflare's assigned `margo.ns.cloudflare.com` and `sue.ns.cloudflare.com`. Cloudflare reports the zone is waiting for propagation; `nslookup` against 1.1.1.1 still returns the old `ns1/ns2/ns3.hyp.net` nameservers. No DNS records were changed because the scanned records were already present at Domeneshop.

## 2026-09-04 — Assistant spend guardrails

- Added the non-secret assistant runtime settings to the Vercel `tracify` Production project: `TRACIFY_ASSISTANT_MODEL=gpt-5.6-luna`, `TRACIFY_ASSISTANT_REQUESTS_PER_MINUTE=5`, `TRACIFY_ASSISTANT_REQUESTS_PER_DAY=100`, and `TRACIFY_ASSISTANT_MAX_COMPLETION_TOKENS=300`.
- Triggered Vercel production deployment `8X1Z1DWAniuH5th2gPHf8fSs2SFV` from `main` commit `fbd51b1`; Vercel reported `Ready` and `www.tracify.tech` assigned.
- The OpenAI organization limits page still redirects to login. The owner must sign in manually before a provider-side budget/usage limit can be configured; no API key, password, MFA code, or billing setting was entered by the agent.
- Live homepage verification succeeded, but the current `main` deployment did not show the locally uncommitted assistant widget/playground changes. Do not describe those code changes as production-live until they are committed, reviewed, merged, and redeployed.
- Committed the isolated feature as `c00e8aa` on `codex/assistant-spend-guardrails`, pushed it to GitHub, and confirmed both marketing and EU Vercel previews built successfully and reported `Ready`. The GitHub draft-PR form is prepared but not submitted pending confirmation for that external action.
- OpenAI sign-in is now complete. The organization Limits page exposes rate limits but no editable spend cap; Billing shows `$0.00` free-trial credit and no payment method, so adding billing details would be required before a provider monthly budget can exist.

## 2026-09-05 — EU cloud TLS regression

- `eu.cloud.tracify.tech` currently resolves through Cloudflare and its CNAME is still exact (`5ee7be47305fd6c5.vercel-dns-017.com`) with proxy enabled.
- Chrome and Windows curl fail the public HTTPS handshake with `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` / Schannel `SEC_E_ILLEGAL_MESSAGE`.
- Cloudflare Edge Certificates shows only the free Universal certificate for `tracify.tech` and `*.tracify.tech`; the full-setup zone does not cover the two-level `eu.cloud.tracify.tech` hostname.
- Vercel project `tracify-cloud-eu` is attached to the custom domain and its production deployment is Ready. DNS-only is not an acceptable fallback because the Vercel edge requests TLS renegotiation that Chrome rejects.
- Direct fix requires Cloudflare Advanced Certificate Manager ($10/month) with a certificate covering `eu.cloud.tracify.tech`, or a deliberate migration to a one-level hostname such as `eu-cloud.tracify.tech`; do not purchase the add-on or change the public hostname without owner choice.
- Owner requested the no-Cloudflare path. Set the Cloudflare CNAME to DNS only; fresh curl requests now reach Vercel and return `200 OK` on `/sign-in`, but Chrome still returns `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`, confirming the remaining issue is Vercel's TLS renegotiation behavior for this custom domain.

## 2026-09-05 — Favicon cascade preview

- Replaced the isolated deploy branch favicon with the transparent three-bar cascade-T ICO and pushed commit `19082d7` to `codex/favicon-cascade-t`.
- Vercel Git integration picked up the branch and created previews for both `tracify` and `tracify-cloud-eu`; the main preview URL is `https://tracify-c93nkvd62-tracify-tech.vercel.app/` and was still building at handoff.

## 2026-09-06 — Cascade wordmark lockup

- The rejected horizontal cascade lockup was moved to `scratch/superseded-favicons/logo-mockups/`; `public/logos/` is now empty and reserved for explicitly approved logos. Existing `public/logo.png` and `public/favicons/` were left untouched.
- Owner clarified that only the Cascade A family is approved. Consolidated the A and three-bar exports under `public/logos/cascade-t-a/`; moved Cascade B, signal, open-trace, and preview experiments to `scratch/superseded-favicons/unselected/`.
- Created the Photoshop-ready transparent lockup `public/logos/cascade-t-a/tracify-cascade-a-lockup.png` using only the approved Cascade A icon and the owner-supplied Tracify wordmark.
- Added the matching self-contained SVG at `public/logos/cascade-t-a/tracify-cascade-a-lockup.svg`; the icon is vector geometry and the supplied pixel wordmark is embedded to preserve its exact appearance.

## 2026-09-06 — Langfuse clone surface

- Added a local `/langfuse` clone route modeled from the supplied authenticated Langfuse demo trace screen and empty-project state.
- Demo project ID `clkpwwm0m000gmm094odg11gi` renders a filterable trace table with seeded rows, sidebar navigation, chart/table toggle, project header, and pagination controls.
- Other project IDs, including `cmsjau8t70iv9ad0g1mkndml8`, render a first-run empty project state with onboarding cards.
- Focused ESLint and `git diff --check` pass; full browser/build verification remains pending.

## 2026-09-06 — Langfuse empty dashboard parity

- Replaced the empty-project branch of the authenticated Tracify project overview with a local, componentized dark dashboard modeled on `C:/opencrawl/output/langfuse-capture/pages/empty-home.html`.
- Added metric cards, empty chart panels, tabs, model selectors, environment/time-range controls, keyboard-visible assistant affordance, and Tracify-native quickstart/report links. The controls are local UI state only until matching data contracts are available.
- Added a scoped dark shell/sidebar treatment only for the empty project overview; populated projects continue using the existing Tracify overview.
- Focused ESLint passes. Full typecheck remains blocked by stale `.next/dev/types` references to removed `/langfuse` source routes, and browser verification is blocked by the existing local Convex dependency refusing connections on `127.0.0.1:3211`.
- Restored local Convex function startup by making the two lead-delivery status fields optional in the schema for legacy records; new lead writes still populate both fields. Convex dev now reports functions ready, but the local browser session has no authenticated project to render the production route.
- A clean isolated Next preview rendered the component at the captured desktop viewport; the visual structure matched the reference and tab/model controls changed state in the browser. The authenticated production route remains unverified because the local session reports no projects. TypeScript and focused ESLint pass; the sidebar hook warning is pre-existing.
- Rechecked the real route with local Convex running: the dashboard shell renders, but `/onboarding/project` resolves to `Sign in to create a project` and the project route remains `Loading project...`. This confirms the remaining gap is authentication/project state, not a Convex startup failure or component render error.
- Renamed the implementation-facing dashboard surface from the captured-reference name to Tracify: `tracify-empty-overview.tsx`, `TracifyEmptyOverview`, and `tracify-*`/`tracify-shell*` selectors. The source tree no longer contains the reference name; it remains only in historical notes and the supplied capture folder.
- Started the built-in local host pair for visual review: marketing Tracify on `localhost:3000` and EU cloud on `localhost:4000`, with local Convex running. Added a development-only `/tracify-preview` entry and a cloud-directory link immediately after the region list so the dashboard selectors are visible without authentication; the route returns 404 in production.
- Broadened dashboard parity: all `/dashboard` routes now use the dark Tracify cloud shell/canvas, existing dashboard topbars share interactive time-range, environment, and filter controls, and the local preview remains available for visual review. TypeScript and focused ESLint pass; the only lint output is the existing sidebar dependency warning.
- Added a development-only populated tracing preview at `/tracing-preview` on both local hosts. It has seeded trace rows, search, type/status/environment filters, table/chart toggle, column visibility, trace metadata, cost/latency/model fields, and a volume chart. TypeScript, focused ESLint, and diff checks pass.
- 2026-09-06: Added local-only Tracify operations preview with Sessions, Users, and Alerts tabs, search, severity filters, seeded activity rows, and dark dashboard treatment. Available on both local hosts at `/operations-preview`.
- 2026-09-06: Aligned the dashboard sidebar with the captured navigation by adding Home, Dashboards, Tracing, Users, and Prompt Management labels; added project routes for `/dashboard/[projectId]/dashboards` and `/dashboard/[projectId]/users`.
- 2026-09-06: Exposed Scores, Evaluators, and Human Annotation as first-class Improve navigation items; added `/dashboard/[projectId]/scores` backed by the existing evaluation engine and linked the evaluator/review routes.
- 2026-09-06: Replaced the seeded Users dashboard rows with a Convex-backed aggregation of the project's sessions by `endUserId`, including trace/span totals and latest activity; the route now accepts and passes the real project ID.
- 2026-09-06: Completed the captured sidebar coverage pass by adding Upgrade Plan and Support destinations alongside the existing project-scoped dashboard modules.
- 2026-09-06: Added dashboard-mode controls to the project Dashboards route: Add Widget and Clone now provide visible local interaction feedback above the overview canvas, matching the captured dashboard workflow.
- 2026-09-06: Upgraded dashboard-mode Add Widget into an interactive widget library with Trace volume, Cost by model, Latency percentiles, and Score analytics choices; selected widgets are tracked and the clone action reports draft state.
- 2026-09-06: Added direct project routes `/dashboard/[projectId]/evaluators` and `/dashboard/[projectId]/human-annotation`, matching the captured destination names while reusing the authenticated evaluation engine and review queue.
- 2026-09-06: Expanded the dashboard command menu to cover Dashboards, Users, Alerts, Scores, Evaluators, Human Annotation, Playground, and Operations so keyboard navigation matches the visible sidebar feature set.
- 2026-09-06: Fixed project settings query navigation: `/dashboard/[projectId]/settings?tab=members` and the other supported tab values now open the requested panel instead of always defaulting to General.
- 2026-09-06: Added captured-style project settings secondary navigation for General, API Keys, MCP & CLI, LLM Connections, Model Definitions, Scores Configs, Members, Integrations, Exports, Batch Actions, Audit Logs, Notifications, and Billing, mapped to real Tracify workflows.
- 2026-09-06: Added `/dashboard/organizations` with live Better Auth organization switching, Convex project cards, and a New project action; added it to the project switcher.
- 2026-09-06: Added a real New organization form to the organization workspace using Better Auth create/set-active behavior, with accessible status feedback.
- 2026-09-06: Added first-class `/dashboard/[projectId]/tracing` route backed by the existing live RunsTable and moved the sidebar/command-menu Tracing destinations to it; `/runs` remains available for compatibility.
- 2026-09-06: Added first-class `/dashboard/[projectId]/prompt-management` route backed by the existing prompt manager and lifecycle navigation; `/prompts` remains available for compatibility.
- 2026-09-06: Connected the dark Home/Dashboards overview to live Convex project totals when used by authenticated project routes: traces, cost, observations/spans, and evaluation score counts now replace fixed zero values while the standalone visual previews remain deterministic.
- 2026-09-06: Connected authenticated overview chart summaries to the existing project-stats API: Model Usage, User consumption, and Model latencies now render live cached analytics when available.
- 2026-09-06: Added live model-cost and end-user token breakdown rows inside the overview panels, capped to the top four entries for a compact captured-dashboard layout.
- 2026-09-06: Made the dashboard editor's widget library render selected widgets into a dedicated Added Widgets area, so Add Widget changes the dashboard view rather than only showing a notice.
- 2026-09-06: Persisted selected dashboard widgets per project under `tracify.dashboard.widgets.<projectId>`, restoring the editor layout after refresh while keeping preview routes isolated.
- 2026-09-06: Added per-widget removal controls to the dashboard editor, completing the add/persist/remove interaction loop.
- 2026-09-06: Added a first-class `/dashboard/[projectId]/settings/llm-connections` workflow with provider/adapter/base URL/API-key entry, masked display, project-scoped metadata persistence, and removal; raw secrets are not persisted.
- 2026-09-06: Made the overview Filters control interactive with trace name, session ID, end-user, and release fields, active-state indication, and Clear all behavior.
- 2026-09-06: Added first-class `/dashboard/[projectId]/settings/model-definitions` with provider/model/token-pricing editing, project-scoped persistence, and removal; Settings navigation now points there.
- 2026-09-06: Added first-class `/dashboard/[projectId]/settings/scores-configs` with score name, type, threshold editing, project-scoped persistence, and removal; Settings navigation now points there.
- 2026-09-06: Added first-class `/dashboard/[projectId]/settings/mcp-cli` with Tracify CLI, MCP server, and REST API snippets plus copy feedback; Settings navigation now points there.
- 2026-09-06: Added first-class `/dashboard/[projectId]/settings/exports` backed by the live filterable RunsTable and its CSV export action; Settings navigation now points there.
- 2026-09-06: Added first-class `/dashboard/[projectId]/settings/notifications` backed by the existing notification-preferences component; Settings navigation now points to the project-scoped route.
- 2026-09-06: Added authenticated Operations route at `/dashboard/[projectId]/operations`; its Sessions, Users, and Alerts tabs query Convex sessions/alerts when a project ID is supplied, while the standalone local preview keeps seeded data for visual review.
## 2026-09-06 — Regional selector order

- Moved the regional cloud switcher into the dashboard top bar before the time-range, environment, and filter selectors so the selector order is consistent across the Tracify and EU cloud local previews.
## 2026-09-06 — Batch actions settings surface

- Added a dedicated project settings Batch Actions route backed by the existing selectable runs table and corrected the settings navigation to link to it.
- Enabled the existing Notifications tab instead of leaving it disabled.
## 2026-09-06 — Project audit logs

- Added the Convex `auditLogs` table with project-scoped access, listing, and recording functions.
- Project setting updates and API-key rotations now create audit events; added the dedicated Audit Logs settings page and linked it from project settings.
## 2026-09-06 — Organization settings parity

- Added a dedicated organization settings route with active workspace identity, project access cards, and the existing real member/invitation workflow.
- Added an Organization settings entry from the organization workspace when an organization is active.
## 2026-09-06 — Project integrations parity

- Added a project-scoped Integrations settings page with SDK, OpenTelemetry, MCP/CLI links and editable Slack/Teams alert destinations with test actions.
- Updated project settings navigation to use the authenticated project integrations route instead of the public marketing page.
## 2026-09-06 — Dashboard editor behavior

- Dashboard mode now persists a per-project dashboard list, exposes an active dashboard selector, and makes Clone create a durable custom dashboard name instead of only showing a notification.
## 2026-09-06 — Integrations navigation alignment

- Updated the authenticated dashboard sidebar Integrations entry to open the project-scoped integrations workspace; public users still use the marketing integrations page.
## 2026-09-06 — Sessions controls

- Added live search across session and end-user IDs plus an environment selector to the project Sessions page; filtering runs against the existing Convex session data.
## 2026-09-06 — User detail parity

- Made live Users rows navigable and added a project-scoped user detail page with aggregated traces, spans, cost, and linked sessions.
## 2026-09-06 — User detail navigation

- Added navigable user identities and a live user detail page aggregating sessions, traces, spans, cost, environment, and last activity.
## 2026-09-06 — Live dashboard environment filtering

- Connected the dashboard environment selector to `getProjectManagementSummary`; live totals and latest activity now filter by the selected environment instead of changing only UI state.
## 2026-09-06 — Live dashboard time-range filtering

- Connected the dashboard time-range selector to the Convex project summary query; headline metrics and recent activity now use the selected 1d, 7d, or 30d window alongside environment filtering.
## 2026-09-06 — Live dashboard filter dimensions

- Connected dashboard Trace name, Session ID, End user, and Release filters to the Convex summary query; filtered headline metrics and recent runs now reflect those values together with range and environment.
## 2026-09-06 — Dynamic environment selector

- Dashboard summary responses now expose observed project environments, and the dashboard environment selector populates additional environments dynamically instead of only offering hardcoded values.
## 2026-09-06 — Costs context alignment

- Updated the Costs dashboard summary fallback to use the selected `days` and `environment` query context, keeping cost totals aligned with dashboard filters when analytics data is unavailable.
## 2026-09-06 — Live dashboard model filtering

- Connected the Model Usage/Model latencies selector to the Convex project summary query so selected model values filter headline totals and recent activity.
## 2026-09-06 — Dynamic model selector

- Dashboard summary responses now expose observed primary models, and both model selectors in the dashboard populate from live project telemetry instead of fixed provider labels.
## 2026-09-06 — Dashboard tab behavior

- Dashboard Model Usage and User Consumption tabs now calculate different live values: cost vs span usage, cost by type vs model, and token cost vs trace count.
## 2026-09-06 — Model filter consistency

- Model selection now filters the Model Usage breakdown rows and Model Latencies metric as well as the headline summary value.
## 2026-09-06 — Usage by type semantics

- Usage by type now combines live model spans and tool spans, while cost by type combines model and tool costs.
## 2026-09-06 — Real latency percentiles

- Added p50, p75, p90, p95, and p99 latency aggregation to the Tinybird model-cost query, analytics cache validators, stats API types, and dashboard selector rendering.
## 2026-09-06 — Assistant interaction

- Wired the Home surface Assistant button and Ctrl+I shortcut into the real dashboard command menu; the existing Ctrl+K shortcut remains supported.
## 2026-09-06 — Home shell sidebar control

- Wired the captured Home sidebar toggle button into the real dashboard sidebar collapse state through a shared event; Ctrl+\\ and the sidebar button continue to work together.
## 2026-09-06 — Sidebar hook cleanup

- Removed the unused project setup dependency from the sidebar navigation memo; the dashboard sidebar and Home shell controls now lint without the previous hook warning.
## 2026-09-06 — Topbar filters interaction

- Connected the dashboard topbar Filters button to the Home filter popover, so both shell entry points open the same live trace/session/user/release filters.
## 2026-09-06 — Per-dashboard widget layouts

- Dashboard widget selections are now keyed by project and dashboard name; cloned dashboards start with their own layout and switching dashboards loads the corresponding saved widgets.
## 2026-09-06 — Saved dashboard management

- Added Rename and Delete actions for custom Tracify dashboards. The default `Tracify Home` dashboard is protected, while custom dashboard names and widget layouts remain persisted per project.
## 2026-09-06 — Dashboard-only local preview

- The local `/tracify-preview` and EU Cloud `/tracify-preview` previews now render through the real dashboard shell with the Tracify sidebar and dark dashboard canvas, rather than the public marketing chrome. The regional cloud directory remains the first step before region selection.
## 2026-09-06 — Preview project context

- Local and EU Cloud dashboard previews now use a consistent `local-preview` project context and display `local-pr` in the sidebar project switcher, matching the project shown in the dashboard header and generating project-scoped navigation links.
## 2026-09-06 — Preview Home active state

- The dashboard sidebar now marks Home active on the `/tracify-preview` route when it is rendering the preview project context, matching the active state of the real project Home route.
## 2026-09-06 — Sidebar command entry

- Added the captured dashboard sidebar `Go to...` command entry with `Ctrl K`, wired to the existing Tracify command menu. Preview verification also confirms Home is visibly active.
## 2026-09-06 — Preview command menu behavior

- Mounted the shared dashboard command menu inside the standalone Home preview without adding a second visible trigger, so the sidebar `Go to...`, Assistant control, Ctrl+K, and Ctrl+I all have a live menu target in preview mode.
## 2026-09-06 — Captured sidebar width parity

- Matched the expanded dashboard sidebar to the captured stylesheet's `11.5rem` width (184px) in both the shell layout offset and sidebar surface; preview verification shows the dashboard grid starting at the captured horizontal position.
## 2026-09-06 — Widget layout audit

- Compared the captured Home layout metadata with the Tracify preview. The captured shell uses a 184px sidebar and the preview now matches that measurement; the dashboard widget inventory and selector set remain present across the same Home surface.
## 2026-09-06 — Captured collapsed rail parity

- Matched the collapsed dashboard sidebar rail to the captured stylesheet's `3rem` width (48px), alongside the already aligned 184px expanded width.
## 2026-09-06 — Shell selector interactions

- Made the dashboard workspace breadcrumb navigate to organization settings and made the project breadcrumb open the existing project switcher dropdown through a shared event, matching the captured shell's selector behavior.
## 2026-09-06 — Environment selector semantics

- Fixed the Home environment selector to use the backend's `all environments` sentinel, so switching from a specific environment clears the filter instead of querying for a literal environment named `all`.
## 2026-09-06 — Sidebar chrome row parity

- Matched the sidebar chrome row to the captured `min-h-11` measurement (44px), keeping the expanded and collapsed rail widths aligned with the supplied dashboard shell.
## 2026-09-06 — Dashboard route audit

- Both local and EU Cloud preview entry points return HTTP 200. Representative project-scoped Dashboard and Quickstart routes also return HTTP 200; the EU dev server is slower because it compiles those routes on first request, not because they are missing.
## 2026-09-06 — Dashboard layout reset

- Added a Reset action to the dashboard editor. It clears the active dashboard's saved custom widget additions while preserving the dashboard name and the default Tracify Home protection rules.
## 2026-09-06 — Widget order controls

- Added durable move-up and move-down controls for custom dashboard widgets. Reordering updates the same per-project/per-dashboard local layout that Clone, Reset, and Delete use.
## 2026-09-06 — Standalone editor preview

- Added `?edit=1` to the local and EU Cloud-compatible `/tracify-preview` route so dashboard editor controls can be inspected without authentication redirect. Runtime verification shows Add Widget, Clone, Rename, Reset, and Delete controls alongside the captured Home layout.
## 2026-09-06 — Editor preview verification

- Verified both local and EU Cloud `/tracify-preview?edit=1` responses return 200 and contain the editor controls, including Add Widget, Clone, and Reset. The EU route is slower on first compile but completes successfully.
## 2026-09-06 — Region-first editor discovery

- Added a development-only `Preview dashboard editor` link beside the existing dashboard selector preview in the regional cloud directory. It routes to `/tracify-preview?edit=1` while preserving the region-first production flow.
## 2026-09-06 — Reference viewport grid parity

- Lowered the dashboard two-column breakpoint from 1100px to 900px. At the preview's 1068px viewport, the Home metric cards now remain in the captured three-column row while narrower devices still collapse to two and then one column.
## 2026-09-06 — Region-first selector flow

- Added a development-only continuation on `/cloud/region` that selects the available EU region and redirects to the dashboard selector preview. The region page now explicitly supports the requested order: choose region, then inspect dashboard selectors.

## 2026-09-06 — Capture inventory audit

- Compared the captured manifest's primary dashboard pages and linked surfaces with Tracify's project route tree. The main navigation surfaces and project settings pages are present; remaining capture-only detail URLs are data-specific linked examples rather than missing top-level Tracify routes.

## 2026-09-06 — Linked dashboard surfaces

- Added Tracify route entry points for the captured widget library, dashboard creation/detail, automations, alert creation, prompt creation, score analytics, and evaluation rules surfaces. These render inside the shared dashboard shell and preserve the project-scoped visual language.
- TypeScript verification passes, and all new routes returned HTTP 200 from the local runtime.

## 2026-09-06 — Navigation parity

- Promoted Automations and Widget library into the project sidebar and added Scores analytics and Evaluation rules to the shared command menu, so the linked captured surfaces are reachable through the same dashboard navigation model.
- Focused TypeScript and ESLint checks pass for the navigation and linked-surface files.

## 2026-09-06 — Linked surface controls

- Upgraded the reusable linked-surface workspace from static cards to an interactive Tracify pattern with Overview/Activity/Configuration tabs, search, time-range and environment selectors, active filter summary, and create action.
- TypeScript and focused ESLint checks pass for the upgraded surface.

## 2026-09-06 — Rendered parity verification

- Inspected the live EU preview accessibility tree after the navigation update. It now exposes the full project navigation including Automations and Widget library, plus the captured Home controls: time range, environment, filters, dashboard selector, Add Widget, Clone, Reset, model selector, and latency percentile tabs.

## 2026-09-06 — Create-flow behavior

- Wired the shared linked-surface Create new action to an observable draft-created state with dismiss behavior, so the new Automations, Widgets, alert, prompt, analytics, and evaluation-rule entry points have a working interaction instead of a decorative button.
- TypeScript and focused ESLint checks pass.

## 2026-09-06 — Capture path parity

- Audited every distinct project path in the capture manifest and added the missing Tracify aliases for `/traces`, `/traces/setup`, `/annotation-queues`, `/evals`, and `/settings/api-keys`.
- All five aliases returned HTTP 200 on the local runtime; the first three also returned HTTP 200 on the EU runtime during its incremental compile verification. TypeScript passes.

## 2026-09-06 — Regional completion audit

- Rechecked the complete normalized capture path inventory against the Tracify project route tree; no captured top-level project paths remain missing.
- Verified the remaining EU aliases individually: `/evals` and `/settings/api-keys` both returned HTTP 200. The full alias set is now confirmed across local and EU runtimes.

## 2026-09-06 — Home visual comparison

- Opened the captured Home page and the Tracify editor preview together at the same in-app browser viewport. The primary shell, breadcrumb row, time range, assistant, environment, filters, dashboard selector, metric cards, chart panels, model selector, usage tabs, and latency percentile tabs are all present in the same order and with the same labels.
- The Tracify sidebar intentionally retains additional Tracify-native destinations while preserving the captured core navigation and project-scoped behavior.

## 2026-09-06 — Final implementation checks

- Final focused typecheck, dashboard lint, and `git diff --check` all pass.

## 2026-09-06 — Linked list views

- Added a captured-style table header and empty-state body to the shared linked-surface workspace. Automations, widgets, prompts, alerts, score analytics, and evaluation rules now have a list-oriented content area beneath their filters and actions.
- TypeScript and focused ESLint checks pass after the change.

## 2026-09-06 — Linked create forms

- Added a reusable create/configure form to create-oriented captured routes, with required name, environment, description, and save-state behavior. This covers alert, automation, prompt, dashboard, and tracing setup entry points.
- TypeScript and focused ESLint checks pass.

## 2026-09-06 — Durable linked drafts

- Persisted create/configure draft markers per Tracify project and surface in local storage, and restore the saved state after reload. This gives the linked create flows the same durable project-scoped behavior as dashboard editor state.
- TypeScript and focused ESLint checks pass.

## 2026-09-06 — Backend integration audit

- Read the Convex AI guidelines and audited the existing schema/functions before changing persistence. Prompt and evaluation data models already exist; generic alert/automation/widget/dashboard draft persistence needs a deliberate schema/API design rather than an unsafe inferred mutation.

## 2026-09-06 — Existing backend feature reuse

- Replaced the captured `/prompts/new` shell with the existing typed PromptManagement workspace, including real prompt listing, version creation, labels, trace links, and Convex-backed creation.
- Replaced `/evals/rules` with the existing Convex-backed EvaluationEngineDashboard evaluator workspace, including evaluator creation and evaluation lifecycle controls.
- Focused TypeScript and ESLint checks pass.

## 2026-09-06 — Backend route verification

- Verified `/dashboard/local-preview/prompts/new` and `/dashboard/local-preview/evals/rules` return HTTP 200 in both local and EU runtimes after the Convex-backed route substitutions.

## 2026-09-06 — Alert creation backend wiring

- Reused the existing project-owned `alerts` schema and `api.alerts.create` mutation to replace the generic `/alerts/new` surface with a real Tracify alert form supporting alert name, signal type, message, and active-state creation.
- Focused TypeScript and ESLint checks pass.

## 2026-09-06 — Automations backend wiring

- Added a project-owned `automations` Convex table with access-checked list/create mutations and replaced the generic Automations page with a real workspace showing persisted automations plus event source, action, and destination creation controls.
- Convex generated API bindings updated; TypeScript and focused ESLint checks pass.

## 2026-09-06 — Saved dashboard backend contract

- Added project-owned `dashboardConfigs` and `dashboardWidgets` tables with access-checked list, create-dashboard, and add-widget mutations. Widget rows are separate records so positions remain bounded and future reorder/reset/delete operations can be transactional.
- TypeScript and focused Convex/dashboard ESLint checks pass. The existing editor still uses its compatibility local state until the authenticated dashboard route is switched to these records.

## 2026-09-06 — Authenticated editor persistence

- Connected the authenticated Home/Dashboards editor to the dashboard backend query and mutations: real project dashboards now sync their persisted names, Clone writes a dashboard record, and Add Widget writes a widget row. The unauthenticated preview continues using the compatibility local state.
- TypeScript and focused ESLint checks pass.

## 2026-09-06 — Persisted editor actions

- Added access-checked Convex mutations for dashboard rename, delete, reset, and widget reorder, including default-dashboard protections and widget ownership validation.
- Wired the authenticated editor actions to those mutations; local preview behavior remains compatible and isolated.
- TypeScript and focused ESLint checks pass.

## 2026-09-06 — Production build verification

- Ran the Next.js production build after the persisted editor changes. The application compiled successfully, completed its TypeScript phase, and produced a `.next/BUILD_ID` artifact.

## 2026-09-06 — Dashboard regression pass

- Local runtime returned HTTP 200 for dashboard list/detail, Automations, Alerts, Prompt creation, and Evaluation rules after the Convex persistence changes. EU dashboard list also returned HTTP 200; the other EU routes were already verified individually during their incremental compiles.

## 2026-09-06 — Reversible Tracify dashboard branding layer

- Added a presentation-only dashboard theme switch to the shared shell. `ui=legacy` preserves the existing treatment; `ui=tracify-v2` applies Tracify’s yellow accent, branded navigation emphasis, and control focus states without changing routes, APIs, storage keys, or dashboard behavior.
- Added development preview links for both themes and the branded editor at `/cloud`; the theme also honors `NEXT_PUBLIC_TRACIFY_DASHBOARD_V2=true` when no query override is present.
- TypeScript, focused ESLint, and local preview HTTP checks pass for both theme URLs on ports 3000 and 4000.
- Extended the branded shell treatment beyond Home so the shared sidebar and top bar receive the same Tracify accent on dashboard routes; overview chart color overrides remain scoped to the overview surface.
- Revalidated TypeScript, focused ESLint, and both local/EU preview URLs after the shell-scope correction.

## 2026-09-07 — Account-flow deployment recovery

- Standardized Vercel and the activation workflow on the committed pnpm lockfile, declared the root Playwright dependency, and restored green marketing and EU cloud builds.
- Deployed the matching Convex schema/functions to production and corrected the EU cloud `NEXT_PUBLIC_CONVEX_URL` to the verified production deployment.
- The Explore flow uses a stable simulated user identifier in the URL and workspace banner so the playground reads like a real account while remaining isolated from production telemetry.

## 2026-09-07 — Cloud app auth and dashboard recovery

- Added a bounded Convex auth-readiness hook and a shared retry/sign-in error state across dashboard home, project routes, onboarding, pricing checkout, auth callback, and playground. Unauthenticated project redirects now preserve the exact requested path.
- Fixed the playground runtime failure by skipping the account-scoped `sandbox.getWorkspace` query until Convex auth is established. The previous behavior threw `Unauthorized` before redirecting and left the page appearing to loop on access checking.
- Connected saved dashboard list/create/detail routes to persisted dashboard records, rehydrated saved widgets from Convex, and added persisted widget removal. Empty projects remain stable and do not auto-create or redirect.
- Audited dashboard controls: Tracing Filters now opens a working clearable filter panel, account-menu feedback navigates to Contact, and single-state chart tabs are rendered as state indicators rather than dead buttons.
- Verification: production build passes and enumerates 88 dashboard page routes; local EU-backed route sweep returned 88/88 non-5xx responses; account-access Playwright suite passes 5/5 with one worker; CUA browser review verified playground auth redirect, project return-path preservation, tracing Filters, and no fresh runtime errors.
- Full repository ESLint remains red on pre-existing unrelated files (blog TOC, marketing components, shared hooks, and generated warnings); focused lint for every changed source file passes. Convex codegen itself fails in this environment with the CLI backend-binary `toString` error, but the generated API is type-inferred and the full TypeScript/build checks pass.

## 2026-09-07 — Production route-state hardening

- The merged auth recovery commit reached the EU production Vercel project at `3e2af86`, and live `/playground?intent=explore` now reaches `/sign-in?redirect_url=%2Fplayground` without fresh browser errors.
- A live direct project URL exposed a second edge case: invalid or inaccessible project IDs could render project-specific Convex queries before the route state was safe. `ProjectRouteGate` now renders stable Tracify empty states for `no_projects` and `not_found` instead of rendering child queries with invalid IDs.
- Added a regression covering `/dashboard/demo-project/settings`; account-access Playwright is now 6/6 with focused ESLint and TypeScript passing. PR #95 was merged as `6bead98`; EU preview deployment completed successfully and production promotion should follow the main branch deployment.
- Live bundle inspection then found the EU Vercel project still compiled `focused-otter-289` into the browser. Updated the project’s `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` to `jovial-owl-711.eu-west-1`, and a fresh deployment is required because queued builds retain their environment snapshot.

## 2026-09-07 — EU runtime parity and Playground recovery

- Verified the corrected EU Vercel deployment (`5Y4LdN5TAXZ4vbgyGfXDP4CfgJ9t`) serves the EU Convex URL in its browser bundle. Vercel runtime logs show the auth token and organization endpoints returning 200 with no runtime errors.
- Convex logs identified the remaining live Playground failure precisely: the EU deployment did not yet contain the public `sandbox:getWorkspace` function, even though the source and generated bindings contain it. The Playground is a deterministic simulator, so it no longer depends on that regional telemetry query or mutation; scenario selection and alert dismissal now persist best-effort in local storage and remain usable if backend telemetry is stale or unavailable.
- Verification after the change: focused ESLint passes, TypeScript passes, the production build compiles and generates 209 pages, and the account-access Playwright contract is 6/6 green. Full repository ESLint still has the previously documented unrelated baseline failures.
- Added the non-secret EU `CONVEX_SITE_URL` to the Vercel Production environment after a preview-build diagnostic exposed that the generic site URL was absent from the cloud build context. The current main deployment `9vJY7VegtjorJdu8RypnkNe3BqSE` is Ready and owns `eu.cloud.tracify.tech`.
- Live EU smoke verification after the merged deployment: Playground rendered without the stale `sandbox:getWorkspace` error; scenario selection changed metrics and alert state, failure filtering reduced the table to the failed run, trace detail opened, and alert dismissal removed the alert. No live browser errors were reported.

## 2026-09-08 — Build captured Sessions migration

- Replaced the authenticated Build Sessions list and session-detail routes with the captured localhost:4173 workspace renderer, preserving the dense two-pane visual treatment while sourcing session summaries and linked recent runs from Convex.
- Live session records now carry status, environment, cost, user, timestamps, and linked trace rows; loading is explicit and inaccessible/empty data does not fabricate rendered rows.
- Focused ESLint and TypeScript pass. Remaining Build parity work is still required for dashboards, costs, prompts, evaluations, datasets, settings, and the other authenticated surfaces.

## 2026-09-08 — Build captured Costs migration

- Added `costs` as a first-class captured workspace surface and replaced the authenticated Build Costs route with the captured card/chart composition.
- Costs uses live project trace records for total cost, average cost per trace, top users, environment breakdown, and percentile visualization; Tracify branding and existing project routing remain intact.
- Focused ESLint and TypeScript pass; prompt/evaluation and remaining authenticated surface migrations are still open.

## 2026-09-08 — Build captured Prompts migration

- Replaced authenticated Build Prompt Management presentation with the captured prompt collection surface, populated from Convex prompts and their latest versions.
- Prompt names, production/draft state, update dates, models, and content now feed the captured view; the existing prompt mutations remain available in the underlying product contract for follow-up wiring of editor actions.
- Focused ESLint and TypeScript pass.

## 2026-09-08 — Build captured Evaluation migration

- Added one live Evaluation adapter for authenticated Evaluators, Datasets, and Scores routes.
- These routes now render through the captured collection/table system while sourcing evaluator state, dataset access/item counts, score values, and timestamps from Convex.
- Focused ESLint and TypeScript pass; action wiring for the captured collection controls remains the next parity step.

## 2026-09-08 — Build captured Alerts and Settings migration

- Added a live admin adapter and routed authenticated Alerts and Settings through the captured workspace presentation.
- Alerts now use Convex alert records in the captured collection view; Settings uses the captured settings surface while the existing project settings/member/API-key mutation components remain available for action wiring.
- Focused ESLint and TypeScript pass.

## 2026-09-08 — Captured trace-detail interaction fix

- Fixed captured Tracing links so `/playground/tracing/:traceId` renders the captured record-detail view instead of reopening the tracing table.
- The focused Sandbox filter/detail/read-only interaction test now passes; TypeScript and focused ESLint remain green.

## 2026-09-08 — Auth callback loop and return-path recovery

- Root cause: `/auth/callback` redirected to `/sign-in` whenever Convex briefly reported unauthenticated, even when Better Auth already had a valid session. That transient JWT exchange state created the sign-in loop after regional OAuth handoff.
- Fixed callback state handling to wait for Convex when a Better Auth session exists, and added unit coverage for session-pending, dual-authenticated, and genuinely unauthenticated states.
- Playground auth redirects now preserve the complete `/playground` query, including `userId=usr_demo_7f3a9c21` and `intent=explore`, so the signed-in destination remains immersive and deterministic.
- Updated Convex Better Auth host resolution for the regional proxy and set production `SITE_URL` to `https://eu.cloud.tracify.tech`. Production social callback probes resolve both GitHub and Google to the EU host; an email probe reaches the expected invalid-credentials response rather than an origin error.
- Verification: focused lint, TypeScript, production build (209 routes), activation contract, auth/navigation unit tests, and regional contract all pass. Valid credential completion remains a user-session check.

## 2026-09-08 — Reference shell migration

- Began the full parity implementation by changing the shared dashboard shell to the captured dark/full-bleed presentation, replacing visible Tracify sidebar branding with the reference logo treatment, and removing the general dashboard layout’s restricted library allowlist.
- Updated the Sandbox access contract to use the reference project label. Route-by-route migration and six-viewport zero-pixel verification remain active work.
- Migrated authenticated Users list/detail and Experiments routes to live captured-workspace adapters backed by Convex sessions and experiments; TypeScript passes.
- Migrated Human Annotation to a live Convex-backed captured adapter and canonicalized the legacy Operations route to captured Sessions; TypeScript passes.
- Canonicalized legacy project Search, Compare, Traces, and Runs routes into captured Tracing/list-detail routes with query preservation; TypeScript passes.
- Canonicalized project Settings/API Keys to the captured Settings route with URL-backed `API Keys` tab state; TypeScript and diff checks pass.
- Canonicalized the remaining project settings aliases (LLM Connections, Model Definitions, MCP & CLI, Scores, Integrations, Notifications, Audit log, Batch Actions, and Exports) into URL-backed captured Settings tabs; TypeScript and diff checks pass.
- Removed visible Sandbox metadata/project branding references and replaced the captured workspace accent token with the reference violet accent; remaining legacy component strings are outside the migrated captured surfaces and require continued route cleanup.
- Browser review confirms the local Sandbox renders the captured dark shell and populated controls at the managed test server; compared with the authoritative 4173 Tracing tree, the remaining gap is control/detail density rather than shell access. Canonicalized legacy Prompt Management, Dashboard Create, Evaluation, and Evals entry points into captured route families; TypeScript and diff checks pass.
- Tracing range, environment, and search query state now round-trip through URL parameters (`range`, `environment`, `q`); the account-access contract asserts the filtered Sandbox view survives reload. TypeScript and diff checks pass.
- Tracing table/chart mode, quick-filter preset, and selected-column state now round-trip through URL parameters (`view`, `preset`, `columns`); the browser contract verifies chart mode and the 16/40 columns control survive reload.
- Added URL-backed Tracing pagination with bounded previous/next controls and filtered-page slicing; TypeScript and diff checks pass.
- Migrated project Alerts creation into the captured Alerts surface using `alerts?view=create`, added a reference-styled form with Sandbox/read-only action handling, and added responsive editor styling. Next route types regenerated with `next typegen`; TypeScript and diff checks pass.
- Added the captured Prompt creation state for `/prompts?view=create`, including name, type, content, commit message, save, and cancel controls; TypeScript and diff checks pass.
- Migrated project Dashboard detail routes to `LiveCapturedDashboards`, preserving the dashboard ID in captured route segments and removing the legacy Tracify overview renderer; route type generation, TypeScript, and diff checks pass.
- Dashboard detail IDs now resolve to the corresponding live dashboard record and initialize the captured editor with that dashboard selected; available live dashboard names are included in the selector.
- Captured Dashboard list/detail state now persists selected dashboard and Grid/List layout in URL parameters (`dashboard`, `layout`); Next route types, TypeScript, and diff checks pass.
- Added `tests/e2e/captured-viewport-parity.spec.ts`, a six-viewport Sandbox matrix covering all captured surfaces, shell/branding assertions, and full-page screenshot artifacts; route type generation and TypeScript pass.
- Six viewport tests enumerate successfully with Playwright; targeted ESLint passes for changed TypeScript/TSX files (CSS is intentionally ignored by ESLint configuration).
- Runtime evidence: the harness enumerates all six viewport profiles and the desktop-wide 1440x900 Sandbox matrix passed across all 14 public surfaces. Mobile execution exposed dev-server/backend instability before the full matrix completed; the production launcher was then made deterministic, but the rebuilt Webpack artifact hit the known Windows hashing failure. Six-viewport parity therefore remains unproven.
- Added a repository-owned Playwright production launcher with a test-only local-server escape hatch for regional instrumentation and development Convex defaults; production cloud validation remains enforced. TypeScript and route type generation pass after the launcher changes.
- Rebuilt successfully with the default Turbopack production build after injecting the development Convex URLs; the forced Webpack build remains affected by the Windows WasmHash failure. A subsequent production Playwright attempt exposed a runner isolation issue (`test.describe()` evaluated with a second Playwright runtime) before any viewport assertions ran, so mobile parity remains unverified.
- Fixed the Datasets captured-surface JSX link and declared the Alerts `onCreate` prop after the viewport server surfaced both errors. TypeScript passes. The corrected `@playwright/test` dev harness then passed both `390x844` and `375x812` across all 14 captured Sandbox surfaces; the earlier complete run also passed desktop-wide, compact desktop, tablet landscape, and tablet portrait. Direct screenshot diffs against the 4173 archive and full Build/action/auth verification remain outstanding.
- Re-ran `375x812` alone on a fresh dev port after the cache-related matrix failure; it passed all 14 captured Sandbox surfaces in 1.2 minutes. Responsive render coverage is now green for all six required sizes, although the existing screenshots are test attachments rather than a stable paired reference/implementation diff set.
- Added stable paired reference/implementation screenshot capture for Home and Tracing at all six viewport profiles; verified desktop-wide image dimensions and byte-level ratios. Removed the consent banner from captured routes, matched the Home seven-track desktop geometry, corrected captured blue accent/header geometry, and added the reference sidebar logo mark plus neutral active state. TypeScript and diff checks pass after the latest shell changes; exact pixel parity and full Build/auth/action audit remain open.
- Added captured-only neutral active-row styling and reference logo treatment, then aligned Home user-cost bars to the reference dark-blue palette. Focused route typegen, TypeScript, ESLint, and `git diff --check` pass.
- Live prompt management now uses the captured editor for authenticated projects while persisting through the existing Convex prompt mutations: create, rename, and new-version saves are connected; Sandbox remains read-only.
- Production build verification after the live prompt wiring completed successfully with 211 routes. The repository-owned production Playwright launcher is required by the test configuration and remains an in-scope tracked artifact.
- Live captured Evaluators, Datasets, Alerts, and Dashboards now render persistence-backed create forms. Their adapters call the existing typed Convex create mutations; Sandbox continues to route writes to its read-only boundary.
- Live Human Annotation now wires the captured Claim next action through the authenticated reviewer identity and `annotations.assignNext`, with explicit claimed, empty-queue, and error feedback.
- Live captured Session detail now wires the Annotate action through `annotations.create`, preserving the Sandbox fallback and adding inline success/error feedback.
- Expanded the paired reference screenshot harness from Home/Tracing to all 14 primary Sandbox surfaces, mapping each to the corresponding populated 4173 archive page. The harness now covers the complete six-viewport set, but a clean full run is still required; the current local 3100 process collision prevented reliable artifact completion during this pass. TypeScript and `git diff --check` pass.
- Persistent production-server testing showed the captured screenshot harness must wait longer for client hydration on cold artifacts; increased that assertion timeout to 30 seconds. The production run also confirmed the artifact must be rebuilt after source changes before it can provide parity evidence; no visual signoff is claimed.
- Rebuilt with EU Cloud public Convex URLs and ran the corrected production screenshot harness successfully for the complete desktop-wide 14-surface set (14 reference and 14 implementation images, all 1440x900). Corrected the harness fixtures so populated Sandbox pages compare against populated archive pages 024-036 rather than the earlier empty-state pages 006-019; remaining six-viewport diffs and pixel-level fixes are still open.
- Stabilized the paired screenshot test by disabling Playwright's trace/video recorder for this artifact-only suite and setting an explicit 180-second per-viewport timeout. Production paired captures now pass for desktop-wide, desktop-compact, tablet-landscape, tablet-portrait, mobile-standard, and mobile-narrow across all 14 surfaces; pixel-diff review and functional Build verification remain open.
- Added `scripts/compare-reference-parity.mjs`, which validates dimensions, computes thresholded per-surface mismatch ratios, writes red visual diff images, and emits `artifacts/reference-parity/summary.json` for all 14 surfaces and six viewports. The first complete report confirms all artifacts exist; a captured-workspace global sans-font correction was applied and rebuilt, but Home's desktop mismatch remained approximately 21%, so the next fixes should target structural/content-density differences rather than broad typography alone.
- Inspected the refreshed Home pair and identified the captured sidebar project selector wrapper as 32px too tall versus the 4173 reference. Added Sandbox-only `Use Demo App` and `Your Langfuse Orgs` context rows plus a compact captured project wrapper; TypeScript and `git diff --check` pass. Rebuild and screenshot remeasurement remain pending for this CSS/layout correction.
- Rebuilt and visually verified the sidebar context correction: project/context rows now align closely with the reference. Home content begins approximately 2px too high, so added a captured desktop Home-grid top-padding correction; TypeScript and `git diff --check` pass, with final screenshot remeasurement pending.
- Rebuilt after the sidebar/grid corrections and reran the desktop-wide paired suite. Home improved from 21.57% to 20.62% thresholded mismatch at 1440x900; Tracing remained approximately 26.15%. The shared shell correction is retained, and the next visual pass should target Tracing-specific structure.
- Added a Tracing-specific reference query strip between the page title and tracing controls, hid the generic environment/filter/create toolbar controls on that route, and preserved URL-backed query editing. Focused ESLint, TypeScript, and `git diff --check` pass; production rebuild and paired visual remeasurement remain pending.
- Inspected the rebuilt Tracing pair and measured the filter rail at approximately 153px in the reference versus 260px in the implementation. Added a captured desktop/tablet override to use the reference 153px rail; mobile stacked rules remain later in the stylesheet. TypeScript and `git diff --check` pass; rebuild and screenshot remeasurement remain pending.
- Rebuilt and reran the desktop-wide paired suite after the Tracing rail correction. The full 14-surface capture passed; Tracing changed only from approximately 26.45% to 26.44%, confirming the outer rail width is corrected but remaining mismatch is internal filter/table density and populated content structure.
- Added a captured Tracing table-mode count-by-time strip before the results table using reference-height grid and event-bar styling, preserving existing table data and interactions. TypeScript and `git diff --check` pass; production rebuild and visual remeasurement remain pending.
- Inspected the rebuilt Tracing capture: the query strip and rail now align, but the implementation exposed Metadata within the viewport while the reference exposed only six wide columns. Added captured table minimum width and explicit first-six column widths to reproduce the reference overflow boundary; TypeScript and `git diff --check` pass.
- Rebuilt and reran the desktop-wide suite after the Tracing table-width change; the suite passed, but automatic table layout still exposed Metadata. Added `table-layout: fixed` so the measured first-six widths are honored and later columns overflow like the reference; fresh rebuild/remeasurement remains pending.
- Rebuilt and remeasured after enabling fixed table layout: the full desktop-wide 14-surface suite passed, Metadata is clipped at the viewport boundary, and Tracing improved from approximately 26.47% to 26.34%. Remaining table column proportions still need reference refinement.
- Added captured Tracing filter-rail density styling for the first Name, Is Root Observation, and Type groups, including reference-like expanded value-list rhythm while preserving the existing filter action handlers. TypeScript and `git diff --check` pass; production rebuild and responsive visual remeasurement remain pending.
- Rebuilt and measured the filter-density experiment: the full desktop-wide suite passed, but Tracing regressed from 26.27% to 27.15%. Reverted the pseudo-content expansion while retaining the measured rail/table fixes; the experiment is not part of the accepted parity baseline.
- Added a paired-screenshot network guard that records implementation requests and fails if any reference production domain (`langfuse.com`, `langfuse.cloud`, or the reference deployment host) is contacted. TypeScript and `git diff --check` pass.
- A repository-wide raw ESLint scan was stopped after it began traversing unrelated untracked archive/build directories without output; the configured focused lint set for all changed application and E2E files passed, as did TypeScript and `git diff --check`.
- Removed the recreated `Create new` toolbar action from Tracing only after comparing the reference header; collection create actions remain on the other surfaces. TypeScript and `git diff --check` pass; visual remeasurement remains pending.
- Added screenshot-suite assertions that captured surfaces contain no visible `Tracify` text and that Tracing has zero `Create new` buttons. Focused ESLint, TypeScript, and `git diff --check` pass.
- Rebuilt only after stopping the production server to avoid a mixed Next client manifest, then reran the complete desktop-wide suite successfully. After the latest Start Time/Input width adjustment plus fixed table layout, Tracing improved from approximately 26.34% to 26.27%; TypeScript and `git diff --check` pass.
## 2026-09-08 parity verification continuation

- The first clean production parity attempt was invalid because the existing port 3200 server served stale/mixed Next static chunks (HTTP 500), leaving `.captured-workspace[data-hydrated="false"]`. Stopped the server, rebuilt with the EU Cloud production environment, and restarted it cleanly.
- After the clean rebuild, the desktop-wide paired screenshot suite passed its single six-viewport-profile test (14 Sandbox surfaces captured) in 1.4 minutes. The comparator currently reports substantial remaining visual differences, including approximately 20.62% Home, 26.02% Tracing, 18.85% Sessions, 14.59% Users, 9.56% Alerts, 8.49% Prompts, 21.08% Playground, 14.86% Scores, 15.20% Evaluators, 13.00% Annotation, 7.42% Datasets, 9.59% Experiments, 9.26% Settings, and 13.62% Dashboards at 1440x900. This proves harness validity, not pixel parity.
- Focused lint and TypeScript checks passed for the changed workspace, parity test, and comparator files. Full all-viewport parity and functional verification remain incomplete.
- Tracing geometry pass: increased the reference query strip height, extended the count/chart strip to the measured reference height, moved the chart overlay accordingly, and reduced tracing table cell vertical padding to match the reference row density. Clean production rebuild and desktop-wide paired run passed; Tracing mismatch improved from 26.02% to 25.72% at 1440x900. Further work remains, especially semantic filter controls and fixture/data density.
- Added a semantic reference-shaped Tracing filter rail: search icon/input, filter count, Name select/text tabs, value search, checked value rows/counts, “Show more values”, expanded root-observation values, and a collapsed Type group. Added corresponding interaction hooks and scoped styling. Focused ESLint and TypeScript pass; production rebuild and screenshot comparison are still required before accepting the visual effect.
- Rejected and reverted an attempted Sandbox trace-fixture expansion: adding 14 synthetic rows increased desktop-wide Tracing mismatch from 26.03% to 29.30%, demonstrating that filler data is worse than the smaller fixture until exact reference row values/geometry are extracted. The semantic filter rail remains; current production artifacts reflect the temporary expanded fixture and require a rebuild after this revert.
- Extracted the actual visible reference Tracing table through a live browser against `127.0.0.1:4173`, including 20 row timestamps/names/latencies/models, then replaced the six-row fixture with those reference-derived rows. Clean build passed; desktop-wide capture passed, but raw pixel mismatch rose to 29.89% because long dynamic input/output text differs and is counted by the current comparator. This is structurally closer (the implementation now fills the same table height) but requires dynamic-content masking/normalization before using raw mismatch as a visual-layout signal. Updated Sandbox header project name to `langfuse-docs` to match the reference breadcrumb; rebuild still required after that final small change.
- Final captured Tracing action correction: removed the invalid global Create new action from Tracing, preserved collection create actions, and verified the read-only create dialog on Datasets. The targeted account-access browser test passes; the production build passes for all 211 routes. Changes are pushed in commits 641192ed and 55c7eb5c on PR #106.
- Fixed the captured Tracing filter dropdown so its controlled search updates both React state and URL state; aligned the browser contract with the populated `handle-chatbot-message` fixture and verified the targeted interaction. Added the dedicated mobile-aware Sessions surface and reference-derived fixture/CSS; focused lint and a clean isolated build for commit 39a6660f pass across all 211 routes. Full-suite local reruns were additionally affected by stale shared Next output and an unavailable local service on port 3211, not an app assertion.
- Rebuilt with explicit EU Convex endpoints in isolated `.next-contract` output, then ran the complete account-access contract against the production-style server: 10/10 tests passed in 46 seconds. The prior 3211 failures were caused by `.env.local` embedding a local Convex site URL and shared generated output, not by the app routes. Assertions now match the populated captured fixture (`langfuse-docs` and `handle-chatbot-message`).
- Updated the viewport parity assertion to the current captured fixture and ran the full 14-surface matrix at desktop-wide, desktop-compact, tablet-landscape, tablet-portrait, mobile-standard, and mobile-narrow sizes against the isolated EU production build. All 6 viewport tests passed in 1.2 minutes.
- Added extracted reference-style visible trace inputs and response text to the deterministic Sandbox fixture, replacing generic filler for the populated Tracing table. This improves content-shape fidelity without adding live dependencies or changing the read-only contract; rebuild and responsive verification should be repeated after accepting the data change.
- Rebuilt the reference-content update in isolated `.next-data` output and passed the targeted Tracing interaction contract, confirming search, URL persistence, detail navigation, and read-only behavior remain intact.
- Full six-viewport reference screenshot matrix passed before the mobile CSS change. The captured comparator identified the largest remaining surfaces as desktop Tracing and mobile Sessions/Annotation/Tracing. A responsive Tracing fix changed mobile layout from a full-width vertical filter rail to a narrow 40px filter strip beside the horizontally scrolling table and wrapped the query bar like the reference. After a clean `.next` rebuild (the prior narrow-mobile hydration issue was caused by a stale static chunk; moving `.next` to a recoverable `.next-parity-backup-20260908` and rebuilding resolved it), the isolated mobile-narrow parity test passed. Raw mobile-narrow Tracing mismatch is 24.61%, so geometry is still not accepted as pixel-perfect.
- Mobile Sessions audit: the reference uses a dedicated search/actions/table surface, while the implementation was still rendering the generic collection cards/list. Added a dedicated `SessionsSurface` with reference-shaped search, Filters/My Views/Columns controls, horizontally scrollable session table, created-at and ID columns, row actions, and footer pagination; added responsive CSS for the mobile table. TypeScript passes and focused ESLint has only the pre-existing missing `pathname` dependency warning in the dashboard editor. Clean production rebuild and screenshot comparison are still required for this change.
- Clean rebuild and mobile pair run for the first Sessions surface passed technically, but raw mismatch was 28.84% at 390x844 and 28.26% at 375x812. Visual inspection showed the shared mobile toolbar still displayed Env/Create controls and the title/header was ~40px too high. Added mobile-only Sessions rules to hide those controls, reserve the reference-like second header-row height, align the surface to the viewport edge, and preserve the narrow first/action column. These CSS changes require another clean rebuild and screenshot run.
- Verified the Sessions responsive correction with a clean production rebuild: both mobile parity tests passed. Raw mismatch improved to 25.50% at 390x844 and 26.92% at 375x812. The source and server now include the dedicated Sessions surface plus the mobile toolbar/offset/edge-alignment rules.
- Annotation audit: at 375x812 the reference is an `Annotation Queues` table with a New queue action, Columns control, two queue rows, and footer pagination; the implementation was a Human Annotation review banner/form. Added a dedicated reference-shaped non-review state to `AnnotationSurface`, changed the shared label to `Annotation Queues`, added queue rows/columns/footer markup and styling, while retaining the review flow when a row is opened. TypeScript and focused ESLint pass; clean build and screenshot verification are pending.
- Clean production rebuild and both mobile Annotation parity tests passed after the dedicated surface change. Raw mismatch improved from 23.77% to 9.06% at 390x844 and from 25.66% to 10.11% at 375x812. This is a substantial structural improvement; remaining differences are primarily header/sidebar controls, exact row text, and fine spacing.
- Tablet Home audit: the 768x1024 reference uses two metric cards side-by-side, followed by full-width chart/panel sections, while the captured implementation artifact showed a narrow three-panel composition. Added an explicit 701–1000px grid override after the desktop rules: two tracks, metric cards span one track, and charts/panels span two. Clean rebuild and tablet screenshot verification are pending.
- Clean rebuild and focused tablet parity verification passed after the Home grid override. Home mismatch improved from 24.37% to 21.16% at 768x1024 and is 17.45% at 1024x768. Both tablet tests passed; remaining differences include reference card dimensions/content and the shared tablet header.
- Tracing content-alignment pass: replaced the generic generated input snippets with the visible first-line inputs extracted from the reference rows (including `abc`, `I mean integration`, `show me the trace`, `py`, `adk2`, and the image/sentiment examples), and aligned the first output snippet. Clean build and desktop-wide parity passed; raw Tracing mismatch improved from 29.86% to 29.10% at 1440x900.
- Current all-surface baseline after the latest source changes: the six-viewport paired screenshot matrix (14 surfaces × 6 viewports) passed. Comparator top mismatches are desktop-wide Tracing 29.10%, mobile-narrow Sessions 26.97%, mobile-standard Sessions 25.47%, desktop-compact Tracing 25.30%, mobile Tracing 24.46/24.17%, tablet Tracing 23.39/23.29%, tablet Sessions 23.12/22.93%, and mobile Users ~22.98/22.43%. This is evidence of harness stability and remaining work, not completion.
- Sessions content pass: extracted the actual `chat_...` session IDs from the reference browser table and applied them to the Sandbox session records. Clean build and both mobile tests passed, but raw mismatch increased to 28.00%/28.02% from 25.47%/26.97% because the current session ordering and ancillary columns still differ; the exact IDs are retained for reference fidelity, and the next fix should align session row ordering/timestamps or normalize dynamic data in comparison rather than adding more geometry guesses.
- Sessions timestamp-order pass: applied the reference session timestamp sequence alongside the extracted IDs. Clean build and both mobile tests passed, but mismatch remained essentially unchanged at 28.00%/28.05%; this confirms the dominant remaining Sessions difference is structural (reference filter rail/column layout and visible ancillary columns), not only IDs or timestamps.
- Cross-surface/mobile interaction pass: added reference trace-name values, gave the Human Annotation reference state a semantic page heading, wired the Tracing Ask AI affordance to the existing assistant action boundary, and made Sessions Filters, My Views, Columns, table view, and row-open controls interactive. Clean EU-configured build passed; account-access contract passed 10/10 and the six-viewport captured matrix passed 6/6 across all 14 Sandbox surfaces.
- Sessions reference-structure pass: replaced the generic Sessions table with the capture-shaped filter rail, search/action rows, and Duration/Environment/Scores/User IDs/Traces columns; removed the generic Env/Create controls from Sessions. The isolated build and desktop/mobile paired captures passed, but the raw comparator remains above target, so exact shell spacing and dynamic content parity remain open.
- Tracing table alignment pass: restored the captured leading row-selection column and tightened the desktop Sessions action row so visible data columns and vertical baselines match the supplied reference more closely. Clean EU-configured build passed all 211 routes; the complete six-viewport matrix passed 6/6 across all 14 captured surfaces.
- Shared mobile shell pass: added the captured mobile logo treatment, reorganized the narrow header into breadcrumb and control rows, and kept Home’s dashboard selector on its own toolbar row. TypeScript, focused lint, and diff checks pass; the next production artifact should re-run the six-viewport matrix before visual signoff.
- Shared mobile shell verification: the fresh isolated EU-configured artifact compiled all 211 routes and the complete six-viewport captured matrix passed 6/6 across all 14 Sandbox surfaces after the header reflow.
- Tracing filter regression fix: restored a visible, stateful Filters control and URL-backed filter menu after the control was removed from the captured action row. Fresh isolated build passed all 211 routes; the targeted Tracing flow and full account-access contract both pass, with the full contract at 10/10.
- Inert-control audit: prompt My Views and Add prompt reference now use the existing read-only action boundary, and the Annotation reference Columns/table-view controls do the same. Fresh isolated artifact build passed all 211 routes; the targeted Tracing flow passed and the full account-access contract passed 10/10.
- Sessions structure pass: added a real `captured-sessions-layout` with a filter/control rail and table as sibling columns, using 153px desktop/tablet and 40px mobile widths. The rail contains accessible filter/expand/select/more controls and preserves the horizontally scrollable table. TypeScript and focused ESLint pass; clean rebuild and parity comparison are pending.
- Clean rebuild/mobile verification of the Sessions filter rail passed both mobile tests. Mismatch improved slightly to 27.82% at 390x844 and 27.91% at 375x812. Visual inspection showed the content block remained ~22px too far right relative to the reference, so the mobile Sessions surface margin was shifted left by an additional 22px; this final CSS adjustment requires another rebuild/measurement.
- The additional -22px Sessions offset was measured and rejected: clean build/mobile tests passed but mismatch regressed to 28.77%/28.67%. Reverted to the prior -15px margin, retaining the filter rail and the better 27.82%/27.91% baseline. The revert requires a future clean rebuild before final artifact evidence.
- Rebuilt the reverted source and reran both mobile Sessions tests. Both passed; current raw comparator results are 27.11% at 390x844 and 29.54% at 375x812. The narrow result is noisier than the prior baseline, so further Sessions work should use focused geometry inspection rather than chasing the raw percentage alone.
- Users audit: the reference mobile Users page is a search/environment/filter toolbar plus a three-column user table, while the implementation was still the generic collection list with Env/Create controls. Added a dedicated `UsersSurface` with User ID search, environment/filter controls, User ID/Environment/First Event columns, mobile toolbar offset, and responsive overflow. TypeScript and focused ESLint pass; clean build and parity verification are pending.
- Clean build and both mobile Users tests passed for the first dedicated surface, but raw mismatch was 25.06%/25.54%; visual inspection showed controls incorrectly on one row and the surface too far right. Added a mobile Users grid with search+environment on row one, Filters on row two, and a left-edge correction. TypeScript passes; rebuild/measurement pending for this CSS correction.
- Rebuilt and verified the Users mobile correction: both focused mobile tests passed; Users mismatch improved to 22.50% at 390x844 and 22.44% at 375x812. A Tracing desktop comparison then showed the top toolbar did not match the reference: the implementation exposed an extra Filters button while omitting My Views, even though filtering is represented by the left rail. Removed the unreachable top filter popover path and aligned the toolbar controls to Quality, Slow, Cost, My Views, Table, Chart, and Columns. Clean production build and the complete six-viewport paired capture matrix passed; Tracing mismatch improved to 27.89% desktop-wide, 24.10% desktop-compact, 21.74% tablet-landscape, 22.91% tablet-portrait, 23.12% mobile-standard, and 22.60% mobile-narrow. Remaining Tracing differences are shell geometry, exact filter/table metrics, and reference content density.
- Rebuilt after aligning the shared environment label to the reference's `default` text and neutralizing the captured dashboard marker color. The full six-viewport paired screenshot matrix passed again. Fresh Home mismatches are 20.51% desktop-wide, 19.66% desktop-compact, 17.43% tablet-landscape, 21.13% tablet-portrait, 11.78% mobile-standard, and 10.59% mobile-narrow; the change was intentionally small and primarily removes an incorrect `all environments` label and yellow accent.
- Sessions mobile geometry pass: focused screenshots showed the title toolbar inheriting a 30px collapsed-sidebar offset and sitting about 32px too low. Adjusted only the mobile Sessions toolbar and surface edge alignment, then refined the horizontal offset from screenshot edges. Clean production builds and both mobile tests passed through the iterations; the retained final values produce 26.80% mismatch at 390x844 and 26.68% at 375x812, improving over the prior 27.44%/30.23% readings. The exact route remains below pixel-perfect acceptance because table/filter-rail typography and shell details still differ.
- Tablet Sessions audit: the 768x1024 reference collapses the filter rail to an icon-only ~60px strip, while the implementation retained the 153px desktop rail. Added a 701–800px tablet breakpoint that collapses the rail and hides its text controls while preserving the table viewport. Clean production build and both tablet parity tests passed; Sessions mismatch improved from 27.08% to 23.45% at tablet portrait and remained 26.01% at tablet landscape. The tablet landscape result is unchanged because it correctly retains the wider rail.
- Full regression after the tablet breakpoint passed all six viewport cases again. Current Sessions comparator readings are 22.53% desktop-wide, 25.56% desktop-compact, 26.01% tablet-landscape, 23.45% tablet-portrait, 26.80% mobile-standard, and 28.44% mobile-narrow; the narrow-mobile fluctuation is not caused by the tablet-only rule and requires a later focused artifact audit rather than being treated as a tablet regression.
- Playground structural pass: the prior generic two-card form was replaced with a reference-shaped message-builder workspace containing the model/action row, Tools/Schema/Variables controls, System/User message rows, Message/Placeholder controls, Output panel, and Submit action. The shared Playground toolbar no longer renders the generic Env/Filters/Create controls. Clean build and focused mobile tests passed; Playground mismatch improved from 22.75% to 11.82% at tablet landscape and from 25.09%/25.31% to 20.43%/20.22% at mobile standard/narrow. Desktop/tablet and mobile fine geometry still need additional tuning.
- Sessions mobile follow-up: fresh paired screenshots showed the title was clipped left while the search/table surface remained too far right. Restored the toolbar by 16px and shifted only the Sessions surface left by 22px. Clean production build, both mobile tests, and the full six-viewport matrix passed; mobile Sessions mismatch improved to 26.97% standard and 26.57% narrow in the retained artifact.
- Users tablet pass: the reference Users surface has no shared Env/Filters/Create controls, includes four columns (User ID, Environment, First Event, Last Event), and places the page block 24px lower at narrow-tablet width. Removed the shared controls for Users, added Last Event, and added the 701–800px toolbar offset. Tablet tests and the full six-viewport matrix passed; current Users mismatch is 20.89% landscape and 22.30% portrait, with remaining differences primarily row content and typography.
- Users fixture/content pass: extracted the captured `u-*` identifiers from page 027 and applied them to Sandbox Users records without touching the live adapter. Added localized `M/D/YYYY h:mm:ss AM/PM` event display and fixed four-column widths so Last Event remains visible. Restored the final mobile surface edge rule after the fixed-table rule had overridden it. TypeScript, production build, focused tablet/mobile tests, and the full six-viewport matrix passed; current Users readings are 23.48% landscape, 23.45% portrait, 26.15% standard mobile, and 25.84% narrow mobile. The fixture is now reference-shaped, but remaining text clipping/typography differences are not yet resolved.
- Tracing table-width pass: the leading selection column had caused all subsequent width selectors to be off by one, compressing Start Time to the Type width. Added corrected selection-aware widths for Start Time, Type, Name, Trace Name, Input, and Output, and replaced the textual Type value with an accessible reference-style icon. Clean production build and desktop pair tests passed; current Tracing readings are 28.40% desktop-wide and 24.54% desktop-compact, so the visual geometry is improved but the comparator remains noisy and further shell/content parity is open.
- Tracing vertical-spacing experiment was rejected: reducing the chart strip and changing header/body padding worsened the desktop comparator to 28.75%/25.06%, so those rules were removed. The rebuilt retained artifact is back at 28.40%/24.54%; the selection-aware widths and Type icon remain.
- Rebuilt after rejecting the Tracing vertical experiment and reran the desktop pair: both tests passed and the retained Tracing readings remain 28.40% desktop-wide and 24.54% desktop-compact. No additional geometry change was accepted in this pass.
- Final current-artifact verification: the isolated EU-configured `.next-filter-fix` build compiles all 211 routes; the targeted Tracing interaction contract passes, the full account-access contract passes 10/10, and the complete six-viewport captured matrix passes 6/6 across all 14 Sandbox surfaces after restoring the URL-backed Tracing Filters menu. Raw screenshot comparison still reports residual structural/content mismatch, so pixel-perfect parity is not complete.
- Sessions mobile offset experiment: a `-15px` surface offset with independently widened search/actions regressed the fresh paired comparator to 29.18% at 390x844 and 26.83% at 375x812. Reverted to the prior `-30px` surface-only offset, whose fresh paired run measured 26.68% and 26.28%; mobile route assertions remained green in both runs.
- Playground mobile fidelity pass: aligned the captured Playground toolbar/card geometry, fixed the mobile model-control sizing, constrained message/add rows to the reference inner width, and brought the output/submit block back inside the viewport. Fresh paired screenshots improved Playground mismatch to 11.41% at 390x844 and 11.62% at 375x812; the complete six-viewport route matrix passed 6/6 across all 14 Sandbox surfaces against the same EU-configured build.
- Tracing toolbar fidelity pass: desktop now keeps the URL-backed Filters action in the captured left rail and removes the extra top-row Filters control; the account contract was updated to exercise the rail control. Focused lint, the complete account-access contract (10/10), and desktop paired capture pass. Raw desktop-wide Tracing mismatch is effectively unchanged at 27.89%, so remaining differences are still table density/content and shell geometry.
- Users tablet structure pass: applied the extracted reference user IDs, kept four visible event columns, and added the 701–800px captured control grid so search/environment share the first row and Filters occupies the second row. The EU-configured build compiles all 211 routes and the complete six-viewport route matrix passes 6/6; fresh tablet paired capture passes, with raw mismatch remaining sensitive to timestamp/content differences.
- Sessions mobile control-row pass: retained the captured `-30px` surface offset and shifted only the search/actions row by `-22px`, matching the reference’s left alignment without moving the table/rail. Fresh paired mobile captures pass; standard mismatch improved to 26.68%, while narrow mismatch is noisier at 27.49%, so no further speculative offset was layered on.
- Deployment verification: the branch head `b93d2165` now has Ready Vercel previews for both surfaces: marketing `https://tracify-kyi83g6vf-tracify-tech.vercel.app` and EU cloud `https://tracify-cloud-mvhgikvf1-tracify-tech.vercel.app`. GitHub reports both Vercel checks and the activation/adapter checks as passing.
- Users mobile edge pass: fresh paired captures showed the page title, controls, and table consistently 7px too far right; the final mobile surface offset is now `-36px`. Both mobile captures pass, with mismatch at 26.51% standard and 26.13% narrow; this is retained without further offset stacking.

## 2026-10-07 — Create-form alias redirects moved to next.config
- `/dashboard/:projectId/alerts/new` and `/dashboard/:projectId/dashboards/new` crashed the authenticated workspace with React error #310 when reached by client navigation (a page whose only job was a server `redirect()`). The two alias pages were removed; `next.config.ts` `redirects()` now answers them with a 307 before rendering, passing incoming query values through and merging `view=create`.
- In-app create actions in `captured-workspace.tsx` now push `?view=create` directly, so normal clicks never hit a redirect.
- Verified: build with placeholder Convex env, 307s for document and `RSC: 1` requests with query passthrough. Authenticated browser check still owed on a Vercel preview.
- Pre-existing, unrelated: `src/lib/stripe.ts` pins `2026-08-26.dahlia`, which the locked `stripe@22.4.0` types reject, so `tsc`/`next build` fail on main with the committed lockfile.

## 2026-10-16 Compare page (draft PR, branch `claude/project-thread-rfvu3q`)
- `/dashboard/[projectId]/compare` is now a real page (it used to redirect into Tracing). Tab "Two runs": pick two runs, totals with % change, similar failures bundled across both runs, steps lined up side by side (`src/lib/trace-diff.ts`, vitest). Tab "Models and releases": runs grouped by main model or release with failure rate, avg cost, median/p95 latency; "best" badges ignore groups under 5 runs. API: `/api/projects/[projectId]/traces/compare?by=model|release` (`traceGroupComparison` in `tinybird.ts`). Prompt version is not in the analytics table (only Convex), so prompts are compared through the release field for now. Error groups in Tracing were already shipped and are untouched. Checked with mocked data only, not yet against real traces.
## 2026-10-15 — Saved views implementation (draft, live backend verification pending)
- Worktree `Tracify-views`, branch `codex/tracing-saved-views`, based on steps PR #166. Project-scoped Convex savedViews table, owner-only mutations, private/team visibility, shared links with membership checks; bounded indexed reads and server-normalized snapshots.
- Traces and Steps have a Saved views menu; trace columns are URL-backed. Relative/fixed ranges, filters, sort and grouped mode are restored once. No production backend deployment performed: server has no Convex deployment credentials, and repo rules require merged code before production deployment. Owner was asked for an isolated preview backend; this remains the live-verification dependency.
- Local Convex tests cover private/team access, owner-only update/delete, anonymous/foreign-project denial, rename and time-range persistence. The generated API declaration includes the new module; CLI codegen could not authenticate, so regenerate it with an authorized isolated deployment before release.

- Follow-up: an anonymous local Convex backend successfully compiled and deployed the complete app at 00:34 UTC; CLI-generated API bindings are now regenerated. This gives actual schema/function deployment proof without touching production. Six Convex/state tests pass. An authenticated hosted preview still requires the owner’s isolated deployment.

- Deployed local backend smoke passed actual create/read/private-ID/team-sharing/outsider-denial/owner-only-update/delete/rename/fixed-date/deletion persistence. Temporary local seed function removed. No hosted production data/schema changed.
## 2026-10-15 — Cross-trace steps, draft PR #166
- `codex/tracing-steps-table`, worktree `Tracify-steps`, stacked on sorting #164. Authenticated `/steps` API and page, individual and canonical type/name grouped modes, 11 server sorts, direct step facets/search/errors/latency/cost, complete-set metrics, current-page CSV, exact-step detail links and live polling with back-off/access cache. No Sessions page edits.
- Initial Ready EU preview: https://tracify-cloud-eu-git-codex-tracing-steps-table-tracify-tech.vercel.app. Direct ClickHouse proof matches all/tool/cost/latency-filter totals and costs; all 11 sorts succeed in both modes/directions. Full feature suite passes 47 checks after correcting obsolete CSV assertions and resetting the long-tree filter before error-group checks. Click suite 26/26 and live suite 7/7; known Better Auth identify CORS only.
- Screenshots inspected under `/root/tracify-tools/shots-steps/`; initial capture exposed stale presentation during mode changes. Follow-up keys tables per mode, hides mismatched old-mode rows, and adds Steps to the actual project sidebar. Final preview/screenshot verification follows this commit. Server proof script `/root/tracify-tools/steps-data-proof.mjs`.

- Current GitHub main advanced to #165 search exclusions/numeric comparisons during verification. Auth base now includes it. Remaining frontend stack is being refreshed against that base; saved views must include the new exclusion/token-limit query fields before final review. Vercel inspection tools/CLI report access denied, so readiness is verified through GitHub deployment statuses and authenticated preview requests.
## 2026-10-15 — Every-column trace sorting, draft PR #164
- Branch `codex/tracing-all-column-sort`, worktree `Tracify-sort`, stacked on selected-column CSV #163. All 32 built-ins plus safe metadata keys sort in SQL before LIMIT/OFFSET; stable runId ties and accessible direction indicators. Optional sort aggregates run without requiring their visible column. Metadata extraction matches displayed first nonempty values.
- Local allow-list/CSV tests, focused lint, full tsc and EU build pass. Cumulative steps preview passes feature/click/live suites. Exhaustive live sorting proof caught a ClickHouse alias collision for Models; qualify raw spans.modelId in its aggregate. Final exhaustive proof remains required on the corrected Ready preview.
## 2026-10-15 — Selected-column CSV, draft PR #163
- `codex/tracing-selected-csv`, `Tracify-csv`, stacked on auth #162. Pure shared column definitions and CSV helpers export selected built-ins/metadata in display order, with explicit units, exact numeric values/full IDs, blanks for missing data and existing formula/quote protection.
- Five CSV tests cover all 32 built-ins, metadata, zeroes/precision, missing values, quotes/newlines/formulas. Focused lint, full tsc and EU build passed. The cumulative Ready steps preview passes 47 feature checks including the new CSV header contract, 26 click checks and seven live-update checks. Exhaustive selected-column browser/download proof is being recorded with sorting.
## 2026-10-15 — Project refresh stability, draft PR #162
- `codex/project-loading-refresh`, `Tracify-loading`. Keep only a previously authorized same-project/same-viewer subtree during token/query refresh; clear on denial, errors, logout or identity/project changes. Initial JWT subject is a UI scope key, never an authorization grant. APIs/Convex retain their access checks.
- Fourteen gate/auth tests pass, plus focused ESLint, full tsc and EU build. Ready preview https://tracify-cloud-eu-git-codex-project-loading-refresh-tracify-tech.vercel.app passed click 26/26, features 47/47 and live 7/7 (known Better Auth identify CORS only).
- `scripts/project-refresh-regression.mjs`: 12 immediate menu/input retention checks across reloads, exactly one initial list request each; phone overflow check passes. Desktop/phone screenshots inspected under `/root/tracify-tools/shots-loading-refresh/`.
- Included newly merged #165 search behavior in the base; its own code is not part of this auth PR's diff. Owner reviews/merges with a merge commit. Sessions page files untouched.

- Saved-view refinements: new #165 exclusions/token limits and long checkbox selections persist; relative ranges resolve on reopen; reset columns updates the URL. A full URL snapshot preserves unsaved edits on reload instead of restoring the saved record over them. Saved-view backend/state tests now 7/7, plus three preview-build safety tests. Preview build setup is documented in `docs/saved-views-preview.md`, rejects `prod:` keys, and never changes production backend config. Owner confirmed the existing Vercel key is production-scoped; a branch Preview override is required.
- Vercel hit a build rate limit at Steps head `9c959a8`; local EU build passes, but hosted polish verification remains pending. Earlier Ready runtime `a0633c2` passed 47 core features and three new Steps checks (exact selection/counts/grouping/CSV, live retention, 360/390 px).
## 2026-10-15 — Provider integration SDKs, unreleased draft
- Branch `codex/sdk-provider-integrations`, worktree `Tracify-integrations`, independent of frontend stack. TypeScript wrapOpenAI/wrapAnthropic and TracifyLangGraphHandler; Python sync/async equivalents and optional LangGraph callback. Existing ingestion/storage contract, inherited custom clients, independent standalone roots, provider usage/model/TTFT, streaming/cancellation/error capture, configurable cost calculation and capture controls. Provider/framework dependencies stay optional for consumers.
- Real official SDKs against deterministic HTTP/SSE protocol fixtures and real LangGraph graphs/tools: TypeScript 42 tests and Python 34 tests pass. No paid provider calls were made. Node raw-response helpers remain unconsumed; unsupported stream conversion helpers are documented as pass-through. Cost is never guessed and unknown prices are explicit in metadata.
- Both SDK README files document next-release APIs and limits. Publish workflow installs optional Python test dependencies. No SDK tag or registry publication; owner reviews/merges first. EU application build and full application tsc passed; SDK lint uses the existing SDK's dynamic provider type allowance (`no-explicit-any` disabled), with no other rules relaxed.

- SDK follow-up validation: standalone manual roots generate a run ID in both languages, and LangGraph invoked inside them inherits that context. Python optional `None` string fields are omitted: the actual preview ingestion check caught their prior HTTP 422 rejection. Both provider protocol fixtures now return 202 through both SDKs, and direct ClickHouse reads show 3 linked observations / 1 root / 16 input + 6 output tokens for each language. Tests now pass TypeScript 44/44 and Python 36/36. These are labelled test fixtures, without paid provider calls.

## 2026-10-15 Pricing and checkout redesign — draft PR (branch `claude/project-thread-7pyfz3`, stacked on #177 shared nav/footer)
- `/pricing` rebuilt: PageHeader with dithered stairs art, plan grid with pixel capacity meters, a runs-per-day x steps-per-run span estimator that highlights the fitting plan, comparison table, accordion FAQ, horizon CTA. `/pricing/checkout` is now a split page (plan summary over dithered gate art, 3-step account/project/pay flow); checkout logic and Stripe call are unchanged. Plan data lives in `src/lib/pricing-plans.ts`; the landing pricing teaser still mirrors it by hand. New art functions `pricing_stairs`/`checkout_gate` in `scripts/generate-landing-art.py` (pass function names to regenerate only those).

## 2026-10-16 Alerts rules and email — draft PR (branch `claude/project-thread-ydgats`)
- New `alertRules` table, `convex/alertRules.ts` (overview, preview, create, pause, delete), a 5-minute check in `convex/crons.ts`, and email through Resend. Metrics: failed runs, spend, p95 speed, minutes without runs. A rule opens one alert when it crosses its limit and resolves it on recovery. Four Convex tests pass; ESLint and tsc are clean on the changed files.
- `/dashboard/[projectId]/alerts` is now `src/components/dashboard/alerts/` (Cards | List, new-rule box with 7-day preview, history). A boundary shows a calm message if the backend functions are not deployed yet.
- Convex `_generated/api.d.ts` was edited by hand because no deployment was available for codegen; run `npx convex codegen` against a real deployment to confirm. Needs the manual Convex deploy and `RESEND_API_KEY` (and optionally `EMAIL_FROM`) in the Convex environment before emails send.
## 2026-10-16 Dashboard sidebar redesign — draft PR (branch `claude/project-thread-qqx3gc`)
- Sidebar in `dashboard-sidebar.tsx` is now a 72px icon rail (Observe, Analyze, Improve, Operate, Manage, Help popup) plus a 224px page panel for the selected group, with Dissolve logo, project switcher, "Jump to…" (Ctrl K), New alert and region footer. Rail icons are plain lucide line icons, no pixel art. Collapse (Ctrl+\) keeps only the rail; phone uses the existing slide-in drawer. Widths in `dashboard-shell.tsx` are 72 collapsed / 296 expanded. Only the sidebar changed: no page content. Saved views, pinned pages, recent runs, alert counts and "finish setup" from the mockups were left out because nothing backs them yet.

## 2026-10-16 Sidebar follow-ups — draft PR (branch `claude/project-thread-qqx3gc`)
- Collapsed strip now has an expand button (the old one was missing on Tracing). Search removed from the sidebar. Account menu (upgrade for free plans, account, billing, region, sign out) at the bottom of the panel and as an avatar in the collapsed strip. Project switcher: recents first, current project checked, Manage per row, New project, works from the collapsed strip too (recents live in localStorage `tracify.recentProjects`). Menus portaled by Radix are styled dark in `globals.css` via `body:has(.tracify-cloud-shell) [role="menu"]`. A slim top bar was tried and removed at Kristoffer's request ("doesn't look good"); do not re-add one.

## 2026-10-16 Collapse button moved into the page header (draft PR)
- The sidebar collapse button no longer sits next to the tracify name. `dashboard-shell.tsx` renders a zero-height anchor at the top of `<main>` with the toggle (Ctrl+\ and `tracify:toggle-sidebar` unchanged); `globals.css` shifts the first page `h1` and `.tracify-dashboard-topbar` right to make room, so every page gets it automatically. Pages with their own toggle (captured workspace, empty overview) hide the shell one. The rail `»` expand button stays in the collapsed strip. No top bar.
- Project switcher moved to the bottom of the sidebar panel (above New alert/Account) and, when collapsed, to the bottom of the rail above the account avatar. Menus use `modal={false}` so opening them no longer locks scroll or shifts the sidebar; the switcher opens upward (collapsed: to the right). Same on the account menu.

## 2026-10-16 SEO + AI search pass (branch `claude/project-thread-4ta1tq`)
- Added `/compare` hub + `/compare/[slug]` (Langfuse, LangSmith, Helicone, Arize Phoenix, Braintrust, Datadog), `/integrations/[slug]` (OpenAI, Anthropic, LangGraph, OpenTelemetry, CrewAI, Vercel AI SDK) and `/glossary/[term]` (27 terms in `src/lib/glossary.ts`). Content lives in `src/lib/seo-pages.ts`; competitor claims are kept high level on purpose.
- robots.ts names AI crawlers explicitly; `/llms-full.txt` serves docs + glossary + comparisons as plain text; llms.txt and sitemap list the new pages; Organization schema has sameAs.
- Not done: more use-case pages (bespoke art, needs a design-preview PR), best-tools listicle, Search Console/Bing, backlinks.

## 2026-10-16 Public demo project (draft PR, branch `claude/project-thread-c6f532`)
- `/demo/project` is a read-only, no-sign-up demo of the real dashboard. It runs the real Tracing page against a generated "support-agent" project: ~500 runs/day for 90 days, deterministic per 5-minute slot, so new runs keep appearing live. A built-in story: release v1.14.0 made `issue_refund` time out, v1.14.1 fixed it.
- Data lives in `src/lib/demo/` (generator + in-memory twins of the analytics queries). The API answers from literal `api/projects/demo/*` routes, which win over `[projectId]`; nothing touches Convex or the analytics backend. Saved views return an empty list and refuse saves.
- It renders inside the real `DashboardShell`/`DashboardSidebar` (new `demo` prop) so it looks like a normal project: Home, Tracing, Costs, Sessions, Users, Alerts have real sample data; other sidebar pages are generic sample pages (`sample-pages.ts`). Pages are `noindex`, no marketing chrome. The landing hero, nav menu, "try the live demo" card and `/demo` page link to it.
- `vitest.config.ts` now maps `@/` to `src/` so tests can import app code.
## 2026-10-16 Teams and sharing (branch `claude/project-thread-uzz5wa`)
- Public share links: `sharedTraces` table, `convex/sharedTraces.ts` (create/revoke/getForRun, public `resolve` by token), public page `/share/[token]` (read-only, noindex, no user ids/metadata/stack traces). `/share` is allowed on the cloud host in `src/proxy.ts` and has no marketing chrome.
- Run notes: `comments.createRunNote/listRunNotes/remove` (stored under spanId `run:<runId>`), panel in the trace viewer.
- Roles: added a read-only `viewer` role (`convex/betterAuth/roles.ts`, used by server and client auth config). Members screen: change role, remove, pending invites with copy/cancel. Invite emails are not sent; links are copied by hand.
- Needs a manual Convex deploy (schema, functions, auth config).
## 2026-10-16 Cost budgets + weekly summary (branch `claude/project-thread-bh6ufi`)
- Alerts page now has three tabs: Alert rules, Cost budgets, Weekly summary (`src/components/dashboard/alerts/alerts-sections.tsx`).
- Convex: `costBudgets` + `weeklySummaries` tables, `convex/budgets.ts` (15 min cron, warns once at the chosen % and once when over, per UTC week/month), `convex/weeklySummary.ts` (Monday 08:00 UTC cron, week claimed before sending so it never double-sends), shared sending in `convex/notify.ts`, pure maths in `convex/spendMetrics.ts`.
- Needs a manual Convex deploy. Email needs `RESEND_API_KEY` (and optionally `EMAIL_FROM`, `SITE_URL`) in the backend env; without it emails are skipped and logged, Slack/webhook still work.
- `convex/_generated/api.d.ts` was hand-edited (codegen needs a deployment); re-run `npx convex codegen` when convenient.
## 2026-10-16 SEO round 2: use cases + best tools (branch `claude/project-thread-4ta1tq`, draft PR)
- Six new use-case pages (coding, rag, voice, browser, multi-agent, mcp) in the existing use-case template: data in `use-cases/[slug]/page.tsx`, copy/rows in `use-case-page.tsx`, SDK snippets in `code-section.tsx`. Art generated by `scripts/generate-usecase-art.py` into `public/images/pages/*-hero.png` and `public/images/landing/uc-*.png`.
- New `/best-llm-observability-tools` page (ItemList + FAQ schema, reuses compare data). Footer links Compare tools, Glossary and all use cases; sitemap and llms.txt updated.
- Local screenshots need `pnpm install --config.minimumReleaseAge=0` and stub Convex env vars; dev mode shows blank page headings in headless, use `next build` + `next start`.
## 2026-10-16 Sidebar extras — draft PR (branch `claude/project-thread-bx8sfj`)
- Dashboard sidebar panel gets a Pinned section (pin icon on hover per page, kept per project in this browser's localStorage `tracify.sidebar.pins.<projectId>`, max 8), a Saved views list under the page links (up to 5, from the existing saved-views API, hidden if unavailable) and a dismissible "Finish setup" card (API key, first trace, saved view; hides when all done or dismissed, key `tracify.sidebar.setupDismissed.<projectId>`). Frontend only, no backend deploy. Code: `src/components/dashboard/sidebar-extras.tsx`.
- Admin page: /admin (admins only, read-only) shows users, projects, usage, alerts, recent runs. Access enforced in convex/admin.ts (allowlist + verified email). Needs a manual Convex deploy.
## 2026-10-17 SEO round 3 from Search Console data — draft PR (branch `claude/project-thread-3zfbrr`)
- GSC (3 months): 23 clicks / 1,387 impressions; Norway/Germany clicks are the owner's own (home + VPS), so real outside clicks are ~0. Guide ranks ~81, brand search "tracify" ~12.
- Search-style titles/descriptions for pricing, security, status, blog, docs, changelog, integrations, contact, roadmap. Footer links the observability guide and tracing guide on every page, plus Alternatives. Guide gets a sharper opening, related posts and a 2026 meta title.
- 5 new integration pages (LlamaIndex, AutoGen, Mastra, Pydantic AI, OpenAI Agents SDK), listed on /integrations with a Setup guides link row (the grid had no links to detail pages). 4 new glossary terms (trace viewer, tool call tracking, AI pipeline tracing, AI agent tracking). Organization schema sameAs now points at real npm and PyPI package pages. LinkedIn and X links still pending: need the real profile URLs.
- Outside-links kit (post text and directory list): /mnt/project-files/seo/outside-links-kit.md. Owner posts these himself.
- Local run: `npm ci` fails (lockfile out of sync on main); use `npm install --no-package-lock --no-save better-auth@1.6.26`, stub CONVEX_SITE_URL with a local server, and use reduced motion plus an opacity override for headless screenshots.

## 2026-10-17 Free tools suite — draft PR (branch `claude/project-thread-ozfy2i`)
- Nine free browser tools under `/tools/*` plus an index (agent log checker, token counter, model price comparison, prompt cost checker, context window checker, tool definition checker, AI API status, JSON fixer, rate limit calculator). Logic in `src/lib/tools/` (tested by `npm run test:tools`), UI in `src/components/marketing/tools/`, list in `src/lib/tools/registry.ts` (feeds index, sitemap, llms.txt). One shared price/limits list in `models.ts` (prices from the LiteLLM public list, checked 2026-10-17; update `PRICES_CHECKED`). OpenAI token counts use the real o200k tokenizer (`gpt-tokenizer`), other families are labelled scaled estimates. AI API status reads provider status feeds via `/api/tools/ai-status` (cached 60s); unreadable feeds show Unknown, never green. Feed URLs for non-OpenAI/Anthropic providers were not verifiable from the build sandbox.

## 2026-10-19 SEO and AI-search pass
- Root layout only reads the login token on the cloud deployment (`isCloudDeployment`), so public marketing pages are static and CDN-cached. Cloud-app route folders carry `export const dynamic = "force-dynamic"` in their layouts; add it to any new cloud-only route folder or its build will fail prerendering.
- Each "X vs Tracify" post now has its full text rendered on `/compare/<slug>`, and the post canonicalises there (and is left out of the sitemap). Hero/page H1s no longer start at opacity 0.
- AI search: `/blog/<slug>.md` plain-text copies, blog guides listed in `llms-full.txt`, extra AI crawlers in robots, `dateModified` on posts. Sitemap lastmod for non-blog pages is `SITE_REVIEWED` in sitemap.ts; bump it on meaningful page changes.

## 2026-10-19 — Scores redesign (charts-first report)
Scores page rebuilt as its own report layout (trend hero, distribution, sources, "worth a look", small multiples, raw log, drawers). Helpers in `src/lib/score-utils.ts`; UI in `src/components/dashboard/scores/`. Part of the "every page completely different" redesign; next: Evaluators board, Prompts editor, Playground bench, Sessions inbox, Users cards.

## 2026-10-19 — Evaluators board
Evaluators page is now a three-column board (Live / Manual only / Off) with pass-rate rings; detail opens as a right overlay with failing examples first. Next: Prompts editor, Playground bench, Sessions inbox, Users cards.

## 2026-10-19 — Prompts editor layout
Prompts page is now an IDE-style view: prompt rail on the left, release pipeline (development → staging → production, with roll back) on top, version history timeline plus line-numbered text/compare/usage/test on the right. Next: Playground bench, Sessions inbox, Users cards.

## 2026-10-19 — Playground bench layout
Playground is now a bench: model chips + temperature + Run in the top bar, collapsible prompt text with a variables row, big side-by-side answer lanes (one per model), run history as a filmstrip at the bottom. Next: Sessions inbox + transcript, Users people cards.

## 2026-10-19 — Sessions inbox and Users cards
Sessions is an inbox (list left, sort select) with a chat-style transcript reader on the right; Users is a people-card grid (initials, runs/sessions/cost, failure bar) with a profile drawer. Same data and API as before; sort moved from table headers to a select. All six pages from the "completely different layouts" request are done; next up per plan: Datasets+Experiments (distinct from the start).

## 2026-10-19 — Datasets (spreadsheet layout)
Datasets page is a spreadsheet: editable grid (click a cell, Ctrl+Enter saves), add-row line on top, paste-rows import (spreadsheet tabs, JSON lines, JSON list; `src/lib/dataset-import.ts`), sheet tabs along the bottom for switching datasets. New Convex module `convex/datasets.ts` (overview, items, updateItem, deleteItem; 3 tests) registered by hand in `_generated/api.d.ts` — Kristoffer must redeploy Convex. Next: Experiments as side-by-side comparison.

## 2026-10-19 — Experiments (side-by-side)
Experiments page is a comparison: pick baseline and candidate runs of one dataset, metric band (matches expected, score, speed, cost, failed rows with deltas), verdict filters (worse/better/changed/same/not run) and a row-by-row table with both answers. Logic in `src/lib/experiment-compare.ts` (+tests). New-experiment sheet; "Run it now" calls /api/experiments/run (needs OPENAI_API_KEY). Next: Human labelling queue, Dashboards+Widgets, Automations, Alerts views.

## 2026-10-19 — Human review deck
Human labelling (annotation-queues and human-annotation routes) is now a review deck: one trace at a time, question and answer side by side, label with keys 1-4 (Good / Needs work / Bad / Unsure), notes, Enter saves and pulls the next; sidebar has progress, counts, up-next, add-a-trace, agreement; "Reviewed" tab lists history. Backend: submitReview now copies label/notes onto the item (agreement never worked before), new `annotations.release` ("Give back"); tests in convex/annotations.test.ts. Logic `src/lib/review-utils.ts`. Needs Convex redeploy. Next: Dashboards+Widgets, Automations, Alerts views.

## Dashboards and widgets canvas (PR #237)
- Dashboards page is now a canvas of widgets (8 catalog widgets in `src/lib/widget-utils.ts`), with edit mode (move/remove) and a widget library drawer; widgets page shows the same library. Data comes from the existing traces and stats APIs, no new backend.
- Charts are pixel-sized SVGs (`useWidth`), one axis, hover tooltips, red only for failures.

## 2026-10-19 — Automations (rule sentences)
Automations page is a list of "when X then Y" rules drawn as trigger node -> arrow -> action node, with a pause switch, inline edit sentence and two-step delete; new rules are written as one sentence. Backend: `automations.update/setActive/remove`, https/owner-repo destination checks, tests in convex/automations.test.ts. Needs Convex redeploy. (Delivery now built, see next entry.)

## 2026-10-19 — Alert tags, saved views, and automations that actually send
- Alerts: status filters existed; added tags (`alertRules.setTags`, up to 8 per rule, inline editor, tag filter chips) and saved views (name + status/tag/search combo, stored in the browser's localStorage, so per browser not per team).
- Automations now fire: `convex/automationRuntime.ts` (`dispatch`, `buildDelivery`). Triggers: run.failed (scheduled from run ingestion, 1 per minute per rule), alert.created and cost.threshold (from the alert rule and budget checks). Actions: webhook, Slack, GitHub workflow (needs server env AUTOMATIONS_GITHUB_TOKEN). Each rule records last result/count, shown on the page. Private/internal addresses refused. Needs Convex redeploy. Email as an automation action is not built (alert rules already email).
- Demo project Playground (`/demo/project/playground`) now reuses `PlaygroundWorkspace` with `demo` prop (sample prompts, canned answers, `src/lib/demo/playground-demo-data.ts`). `/dashboard/playground` and `/playground/playground` redirect there; old `prompt-playground.tsx` removed.

## Glossary to 100 terms (Oct 20)
- `src/lib/glossary.ts` now merges core terms with `src/lib/glossary-data/{tracing,models,agents,ops}.ts` (100 terms). New fields: `group`, `example`, `link` (rendered on `/glossary/[term]`). All related slugs and docs links were validated; keep terms distinct and grounded in real docs/product pages.

## 2026-10-20 — Admin reachable on cloud host, Admin menu link, cloud prewarm
- `/admin` was missing from the cloud app path list in `src/proxy.ts`, so `eu.cloud.tracify.tech/admin` bounced to the marketing host where nobody is signed in. It is now a cloud app path (marketing-host visits go through region selection).
- `api.admin.access` (convex/admin.ts) returns `{ authenticated, allowed }` with the exact rule the admin data uses (allowlisted email/user id or @tracify.tech, verified email). The `/admin` page guard and the dashboard account menu "Admin" item both use it, so the link only appears for allowed users.
- Marketing layout now renders `CloudPrewarm` (preconnect plus speculation rules for the EU cloud mode/sign-in/sign-up/demo pages). Region handoff delays cut from 300ms+1200ms to 120ms+400ms.
- Admin "Users" count reads only the Convex deployment the host points at; older accounts may live on `focused-otter-289`.
- Auth emails: `convex/betterAuth/auth.ts` used `sendEmail` from `@better-auth/infra` (Better Auth's hosted sender, Pro plan only), so password-reset emails never sent and no verification email existed. Now both go through our own Resend (`RESEND_API_KEY`, optional `EMAIL_FROM`). Verification is sent on sign-up but NOT required to sign in. `dash` and `sentinel` plugins (BETTER_AUTH_API_KEY) are still connected to the hosted dashboard. Needs backend deploy.

## 2026-10-20 — Distinct Sessions, Users and Dashboards pages (draft PR)
- Sessions = dark "flight recorder": reel of conversations with pixel run cells, selected one read as a cream transcript (ticket stats, to-scale run timeline, numbered conversation spine). Users = cream ranked ledger (default sort: highest cost) with sortable headers, spend-share bar, pixel identicons, failure meters, black profile drawer. Dashboards = control room: boards as floor-plan cards on the left, dotted canvas, readout strip (runs, failure rate, typical, slowest 5%, spend), framed instrument panels.
- Code: `src/components/dashboard/groups/` (explorer keeps data/live logic, `sessions-view`, `users-view`, `session-reader`, `user-profile`, `use-group-detail`), `src/components/dashboard/widgets/` (`dashboards-board` over a `BoardStore` from `board-store.ts`: Convex for real projects, local state for the demo).
- Demo project now serves these pages from sample data: `/demo/project/{sessions,users,dashboards}`, plus demo API routes `/api/projects/demo/groups/[kind]` and `/api/projects/demo/stats`.
- Gotcha: the cloud shell CSS (`globals.css`, `.tracify-cloud-shell main [class*="bg-[#eceae3]"]` etc.) rewrites any class containing `bg-[#eceae3]`, `bg-white`, `text-black`, `border-black` to dark. Use uppercase hex (`bg-[#ECEAE3]`) for cream backgrounds inside dashboard pages.
- Local preview needs dummy `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` in `.env.local`, or hydration silently dies.
- Costs page rebuilt on real data only: `/dashboard/[projectId]/costs` renders `src/components/dashboard/costs/costs-explorer.tsx`, fed by `GET /api/projects/[projectId]/costs` (`costBreakdown` in `src/lib/tinybird.ts`, step-level ClickHouse sums, same filter clauses as Tracing). No estimates or sandbox fixtures; calls with tokens but no price are counted and called out on the page. Demo costs page and `CostDashboard` are untouched.

## 2026-10-20 Compare works on small projects — draft PR (branch `claude/project-thread-ly2i9d`)
- Two runs: if the range has fewer than two runs, it steps out to longer ranges (up to 90 days) and says so; each picker also takes a pasted run ID; A/B badges are yellow/cream. Models and releases tab widens the same way when only one group exists. Front end only (`compare-page.tsx`), no Convex deploy. Checked with mocked responses only.
- Oct 21: Removed our own Gemini usage (Ask AI, site assistant, Playground); tracing of customer Gemini calls is unchanged.

## 2026-10-21 Green GitHub checks — draft PR (branch `claude/project-thread-d21l4z`)
- Fixed the red Checks workflow with no product change: `vite` added as devDependency (Convex backend tests use `import.meta.glob`), `packages/ts-sdk` excluded from root `tsc` (own CI job), 21 lint errors fixed (hook order, `any` types, setState-in-effect suppressed with reasons), SEO test no longer expects a public `/playground` layout (playground lives under the already-noindex dashboard). Checked locally with pnpm: tsc, lint, all site tests, marketing and cloud builds.

## 2026-10-21 Auto-scoring rules — draft PR (branch `claude/project-thread-qcw3w4`)
- Built on the existing live-evaluation path (`/evaluation/online` in `convex/http.ts`), no new page. A rule = an evaluator version with an optional `config.trigger` { when: every | failed | run_end, modelContains, dailyLimit } plus the existing share (`sampleRate`). Logic lives in `convex/autoScoring.ts` (pure, tested in `src/lib/auto-scoring.test.ts`, in `test:tools`).
- Daily cap counts that evaluator's results since UTC midnight (`evaluators.gradesToday`). AI judges are limited to the approved list in `JUDGE_MODELS` (gpt-4o-mini, gpt-4.1-mini); the form shows an estimated cost per grade. "End of a run" matches the `run_end` span.
- Needs a Convex deploy (schema field is optional; old versions behave as "every step"). Checked with typecheck, unit tests and a mocked form screenshot only; not against live traces.
## 2026-10-25 Private data masked by default in the SDKs — draft PR (branch `claude/project-thread-vsj42w`)
- TS and Python SDKs now mask emails, phone numbers and card numbers before sending, with no setup. Opt out with `redact: { pii: false }` / `redact={"pii": False}`. Card numbers are only masked when they pass the card check (Luhn), so 13+ digit ids and timestamps stay readable. Custom `patterns`/`fn` no longer switch masking off. Code: `buildRedactor` (`packages/ts-sdk/src/index.ts`, `packages/python-sdk/src/tracify/__init__.py`). SDKs not published; needs a version bump + "Publish SDKs" run. Server-side masking in `/api/ingest` not changed.
## 2026-10-23 Slack and webhook alerts made clear and tested — draft PR (branch `claude/project-thread-9v0qsr`)
- Alert rules already sent Slack/webhook; now each send is checked and recorded. `postJson` (`convex/notify.ts`) returns `{ok,status,error}`, retries once on network/5xx, treats a Slack 200 with an error word as failed, and gives plain-words reasons (`explainFailure`). Budgets and weekly summary share it unchanged.
- New: Slack message with a button to the alerts page and a matching "back to normal" message (also webhook `alert.resolved`), shapes in `convex/alertMessages.ts` (webhook event `alert.fired|alert.resolved|alert.test`, adds `dashboardUrl`). Table `alertDeliveries` (newest 20 per rule), shown per rule on the Alerts page as "last alert delivered/failed" with the reason. "Send a test" on saved rules (`alertRules.sendTest`) and a "Send a test message" button in the new-rule form (`alertRules.testLink`, saves nothing). Needs a manual Convex deploy (new table + actions). `_generated/api.d.ts` edited by hand for `alertMessages` (no codegen deployment here). Tests: `convex/notify.test.ts`, extra cases in `alertRules.test.ts`. Not done: signed webhooks, Teams, email on recovery.


## 2026-10-24 Cloudflare-style dashboard sidebar — draft PR (branch `claude/project-thread-z0t3bn`)
- Sidebar is now one column (280px, 64px icon-only when collapsed) instead of rail + panel: project switcher and "Quick search… Ctrl K" on top, Home, Dashboards, Recents (last 5 pages, localStorage `tracify.sidebar.recents.<projectId>`), then small-heading groups Observe / Improve / Manage / Help. Rows have icons; Tracing, Prompt management, Evaluation and Settings expand in place (auto-open on the page you are on). Alerts carries a dashed "New" badge. "Manage account" row (opens the account menu) and the collapse toggle sit at the bottom. Pins, saved views (under Tracing) and Finish setup are kept; the old "New alert" footer link is gone (Alerts page has the button).
- The Ctrl K dialog now lives in the sidebar only; `DashboardCommandMenu showTrigger` is a plain button that fires `tracify:open-command`. The in-page sidebar toggle in the shell shows only on phones.
- Recents follow the last 5 pages you opened (menu pages by menu name; a single trace/session/prompt page is named from its address, e.g. "Session sess_8f2a…"), per project, in this browser only.

## 2026-10-25 — PR previews on Coolify
- Every PR gets a preview at `<PR number>.preview.tracify.tech` (Coolify preview deployments on tracify-cloud-eu, wildcard DNS `*.preview` + Caddy on-demand TLS). Previews use the staging Convex deployment and share the live trace database.
- Auth: `*.preview.tracify.tech` is in Better Auth `allowedHosts`/`trustedOrigins`; the staging Convex backend must be deployed with this for preview sign-in to work.
## 2026-10-25 SEO round after first 100-impression day
- Search Console (3 months to Oct 22): 28 clicks, 1,695 views; views rose from ~15/day to 100/day Oct 19-22. "tracify" ranks ~7.7 but few clicks; the observability guide has ~580 views at position ~81.
- New `/about` (brand + "other Tracify" note, Organization sameAs from `src/lib/about.ts`) and `/answers` hub plus 8 direct-answer pages (`src/lib/answers.ts`), all in sitemap, footer and llms.txt. Guide gained a best-practices section; 4 blog posts got sharper SEO titles.
- Note: `validate:blog` already failed on rollback, orchestration, reliability and Braintrust posts before this work (highlight/panel/note counts); not fixed here.

## 2026-10-25 Founding deal, demo Start Pro, sign-up plan line, profile picture, sample traces
- Pricing page shows a yellow "Founding members: first 20 paying teams get 40% off for life" strip only while env `STRIPE_FOUNDING_COUPON_ID` is set (pages are `force-dynamic` for this). Checkout (`/api/stripe/checkout`) adds that coupon as a discount and falls back to the normal price if Stripe rejects it. The 20 cap is the coupon's own max redemptions in Stripe (create it: 40% off, duration forever, max redemptions 20). Not created yet.
- Demo project: floating "Start Pro · $19" button next to "Start your own free". Sign-up form: one line on Free limits and Pro/Team prices from `pricing-plans.ts`.
- Account > Profile: upload/change/remove picture (centre-cropped 192px WebP data URL saved as the Better Auth user image; shows in the sidebar account row).
- `scripts/seed-sample-traces.mjs` sends a week of sample support-agent runs through `/api/ingest` (needs `SEED_API_KEY` + `SEED_BASE_URL`; staging has no analytics DB yet, so it only shows data once one exists). Backup file names with time live on the agent server, not in this repo; not changed.

## 2026-10-25 Site audit: slow pages, IndexNow, long URL — draft PR (branch `claude/project-thread-spwo5y`)
- IndexNow: public key file `public/<key>.txt` (the script reads the key from that file name), `npm run seo:indexnow` (dry run; `-- --submit [--since ISO]` sends sitemap URLs to api.indexnow.org, refuses if the live key file is wrong), and `.github/workflows/indexnow.yml` (after each push to main: waits for the key to be live, submits URLs with sitemap lastmod in the last 2 days; manual run with empty `since` sends everything). Tests in `scripts/indexnow.test.mjs` (part of `test:seo`). Not yet run against the live site.
- Slow pages: `/pricing` and `/[locale]/pricing` were `force-dynamic` since the founding strip; now `revalidate = 300` (static, strip appears within 5 minutes of the env var). The seven slow URLs were not named in the audit paste, so other causes are not ruled out; recheck after the next crawl.
- Four-parameter URL: the demo overview's "See the failing traces" link dropped `errors=1` (`status=error` already shows only failing traces).
## 2026-10-25 Ahrefs audit: titles, descriptions, share tags
- `pageMetadata` (`src/lib/seo.ts`) now runs every title and description through `fitTitle` / `fitDescription`: full title kept to 60 characters (brand suffix dropped, or cut at a colon/dash, when needed) and descriptions kept to 110-160 (long ones trimmed at a sentence, short ones topped up with a Tracify line). Blog posts use the same helpers and now also send `og:url` (same as canonical) and `og:site_name`. Docs pages render one H1 (the body's own `# Title` is skipped). Home and Norwegian/English home descriptions adjusted. A local crawl of all 312 sitemap pages is clean for these checks; German/Norwegian pricing text and legal/docs guide copy were not touched.

## 2026-10-25 One-line framework setup — draft PR (branch `claude/project-thread-wyfm87`)
- New `init()` in both SDKs (`packages/ts-sdk/src/integrations/auto.ts`, `packages/python-sdk/src/tracify/auto.py`; returns a switch-off via `uninit()`): patches installed OpenAI and Anthropic classes so every call is traced with no client wrapping. JS patches both the CommonJS and ES-module builds (ESM lands a tick later: `await init().ready`). Python also registers a LangChain/LangGraph handler through `register_configure_hook`, and skips the provider patch inside LangChain runs so a model call is recorded once. Wrapped clients are not double-recorded. JS LangChain still needs `TracifyLangGraphHandler`, Vercel AI SDK still needs `tracifyMiddleware`. Shared call logic moved to `traced` (TS) / `_traced_call` (Python). SDK `dist/` not rebuilt and SDKs not published or version-bumped. Tests: `__tests__/auto.test.ts`, `tests/test_auto.py`.
## 2026-10-25 Alert history, snooze, quiet hours — draft PR (branch `claude/project-thread-hdvsny`)
- Alerts page has a new History tab (all fired alerts, filter open/resolved/held back, how long each lasted). `alerts` rows gained `silencedBy` ("snoozed" | "quiet_hours") and `resolvedAt`.
- Per-rule Snooze (1 h / 4 h / 24 h / 7 d, Wake now) via `alertRules.snooze` sets `snoozedUntil`. Per-project quiet hours (`alertQuietHours` table, `alertRules.setQuietHours`, window may cross midnight, any IANA time zone, logic in `convex/quietHours.ts`).
- While snoozed or quiet: the rule still checks and the alert is recorded in History, but no email, Slack, webhook or automation goes out, and the "back to normal" message is skipped too. If still over the limit when the snooze or quiet window ends, no late message is sent (it already counts as firing).
- Needs a staging Convex deploy (schema change) before the local preview shows it.
## 2026-10-25 SDK setup checker
- Both SDKs have a setup checker that tests the key shape, region/host match and network, then sends one test trace (named "Tracify setup check", tag `tracify-doctor`, run id `doctor_...`). JS: `npx tracify-sdk doctor` (`packages/ts-sdk/src/doctor.ts` + `cli.ts`, also `runDoctor()` export, bins `tracify-sdk` / `tracify-doctor`). Python: `tracify-doctor` or `python -m tracify doctor` (`packages/python-sdk/src/tracify/doctor.py`). Flags: `--key --region --host --no-send --json`; exit 1 on failure. Needs a publish (Publish SDKs Action) before users get it; no version bump made.
## 2026-10-25 Error grouping: looser matching — draft PR (branch `claude/project-thread-k3sxbo`)
- Error grouping already existed on the Tracing page (panel "Error groups", `traceErrorGroups` in `src/lib/tinybird.ts`, groups by tool + error type + normalized message). The message key now also masks urls, emails, quoted values and `sk-`/`ghp_`-style keys (on top of uuids, paths, hex ids, numbers), so "this broke 40 times" bundles more. Group ids change, so old `errorGroup` links/saved views stop matching. SQL checked only through a JS mirror, not against the real ClickHouse.

## Crash tracking (Oct 25)
- Server errors (`onRequestError` in `src/instrumentation.ts`) and browser error screens (`/api/crash`) email `CRASH_ALERT_EMAIL` (default `EMAIL_REPLY_TO`/kb@tracify.tech) via Resend. One email per distinct error per hour, max 20/hour, emails and keys scrubbed. Also logged as `[crash]` JSON in the Coolify container log. No new vendor.

## 2026-10-27 Dashboard assistant that takes actions — draft PR (branch `claude/project-thread-plbv0n`)
- New side-panel chat inside every `/dashboard/*` page (yellow "Assistant" button bottom right, Ctrl+J). Code: `src/lib/assistant.ts` (tool list, checks, prompt, reply parsing, tests in `assistant.test.ts`), `src/app/(frontend)/api/assistant/route.ts` (model call, same provider chain as Ask AI, per-IP limits `TRACIFY_ASSISTANT_ACTIONS_PER_MINUTE/DAY`), `src/components/dashboard/assistant/assistant-panel.tsx` (chat + permission cards + executor).
- The model only PROPOSES one action per turn. The browser runs it after the person clicks Allow, using their own sign-in and the existing Convex mutations, so it can never do more than they can. Opening pages/saved views runs without a card. API keys and invite links are shown to the person only, never sent back to the model.
- Actions: create project, new API key (replaces old, red card), alert, budget, invite teammate, open page with filters, open/save view, delete alert, remove teammate, delete project (red cards), change plan (opens Stripe checkout/portal; nothing is charged until confirmed there).
- Not run against the live model or a signed-in preview yet; needs the `ASK_AI_ALT_*` settings.
- Follow-up (Oct 27): assistant panel got open/close and button motion, a twinkling pixel mark, a typed greeting, a dotted background that follows the cursor, and saved chats (this browser only, `tracify.assistant.chats`, up to 30; keys and invite links are never saved). The expand button now opens a full-screen view with a chats sidebar (Today / Past week / Older, search, delete). Motion classes live at the end of `globals.css` (`asst-*`) and switch off for reduced motion.
