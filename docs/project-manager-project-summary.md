# uncoil Project Manager Summary

Last updated: 2026-05-17

## Executive Summary

uncoil is an agent observability SaaS for tracking AI agent runs, spans, cost, latency, failures, alerts, comments, and project-level usage. The product now has a working Next.js 16 dashboard, Clerk authentication, Convex app metadata storage, Tinybird span analytics, Inngest background processing, TypeScript and Python SDK packages, API-key based ingestion, onboarding, project management, safer project deletion, run detail views, costs dashboards, demo data seeding, and deployment wiring for Vercel and Convex.

The current MVP supports a real end-to-end flow:

1. A user signs in with Clerk.
2. The user creates or opens a Convex-backed project.
3. The user gets an API key.
4. A customer app installs `npm install uncoil-sdk` or `pip install uncoil-sdk`.
5. The SDK sends spans to `POST /api/ingest`.
6. The API validates the key, sends a span event to Inngest, writes raw span data to Tinybird, and updates Convex run summaries.
7. The dashboard updates with runs, trace detail, costs, model breakdowns, alerts, saved stats, and project management data.

## Current Technical Stack

| Area | Technology | Purpose |
| --- | --- | --- |
| App framework | Next.js 16.2.6 App Router, React 19.2.4 | Marketing, onboarding, dashboard, API routes |
| Authentication | Clerk | User auth, sign-in/sign-up, JWTs for Convex |
| App database | Convex | Projects, run summaries, alerts, comments, settings, API key metadata |
| Analytics storage | Tinybird | Raw span events and aggregate analytics queries |
| Background jobs | Inngest | Async span processing and alert processing |
| Hosting | Vercel | Frontend and Next.js API deployment |
| Styling | Tailwind 4, shadcn-style local UI, Base UI, lucide-react, Recharts | Dashboard UI and charts |
| SDKs | TypeScript package `uncoil`, Python package `uncoil` | Customer instrumentation |

## Product Areas Completed

### 1. Marketing and Public Pages

Implemented:

- Landing page with uncoil positioning and developer-focused aesthetic.
- Legal pages:
  - `/privacy`
  - `/terms`
- Custom 404 page:
  - `src/app/not-found.tsx`
  - Includes actions back to Dashboard and Home.
  - Uses the same monochrome trace-style visual language.

### 2. Authentication and Dashboard Entry

Implemented:

- Clerk sign-in and sign-up routes:
  - `/sign-in/[[...sign-in]]`
  - `/sign-up/[[...sign-up]]`
- Sign-in/sign-up fallback redirects to `/dashboard`.
- Convex authentication through Clerk JWT template named `convex`.
- Dev and prod Clerk/Convex auth troubleshooting documented in:
  - `docs/troubleshooting-convex-clerk-auth.md`
- `/dashboard` is now an entry route:
  - Redirects signed-in users to their latest/first project.
  - Shows first-project empty state if they have zero projects.
  - Avoids using `/dashboard/no-project` as a fake project id.

Important fixes:

- Removed the old `"no-project"` sentinel from active dashboard routing.
- Added Convex route-state validation before project-scoped dashboard queries mount.
- Fixed the "waiting for auth" issue in both dev and production by creating the Clerk JWT template and syncing/deploying Convex.

### 3. Dashboard Shell and Navigation

Implemented:

- Single dashboard shell in `src/app/dashboard/layout.tsx`.
- Removed nested dashboard shells from child pages to prevent duplicate sidebars.
- Project-aware sidebar navigation.
- Topbar owns global controls:
  - Breadcrumbs
  - Project switcher
  - Account menu
  - Onboarding/docs entry
- Breadcrumbs are now clickable:
  - `Dashboard` links to active project overview.
  - Parent section crumbs like `runs` link back to their list page.
  - Current leaf stays plain text.

Key files:

- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/dashboard/dashboard-sidebar.tsx`
- `src/components/dashboard/dashboard-topbar.tsx`
- `src/components/dashboard/project-route-gate.tsx`
- `src/components/dashboard/project-switcher.tsx`

### 4. Project Onboarding and API Keys

Implemented:

- Multi-step onboarding:
  - Project creation
  - API key display
  - Install/setup instructions
  - Waiting/listening screen
  - Success path
- API key generation and hashing.
- One-time plaintext key return during project creation.
- API key metadata saved in Convex:
  - prefix
  - last four characters
  - hash
  - status
  - created timestamp
  - last-used timestamp
- Manual admin project/API-key issuance through Convex for support/testing.
- API key rotation in project settings.

Important behavior:

- API keys are accepted by ingest only when they match the `uncoil_sk_live_` prefix.
- Full plaintext API keys are not meant to be stored in Convex; the app stores hashes and display metadata.
- The API-key hash secret must match between the environment that creates keys and the environment that validates ingest.

Key Convex functions:

- `projects:createProject`
- `projects:createProjectForUser`
- `projects:getProjectByApiKey`
- `projects:markApiKeyUsed`
- `projects:rotateApiKey`

### 5. Project Management and Deletion

Implemented:

- Project management route:
  - `/dashboard/[projectId]/manage`
- Convex-backed saved stats:
  - total saved runs
  - total spans
  - total saved cost
  - alerts
  - recent runs
  - lifecycle metadata
  - API key last used
  - alert thresholds
- Safer delete flow:
  - User must type the exact project name.
  - User must type `DELETE`.
  - Deletion removes project-associated saved Convex runs, alerts, and comments.

Key files:

- `src/components/dashboard/project-management.tsx`
- `convex/projects.ts`

Key Convex functions:

- `projects:getProjectManagementSummary`
- `projects:updateProject`
- `projects:deleteProject`

### 6. Ingestion Pipeline

Implemented end-to-end ingestion:

1. Customer SDK posts to `POST /api/ingest`.
2. API route validates:
   - authorization header
   - API key prefix
   - body size limit
   - JSON validity
   - required span fields
   - span timestamp format
   - cost/model/tool/metadata field types
3. API route hashes the API key and looks up the project in Convex.
4. API route marks API key last-used time in Convex.
5. API route sends `uncoil/span.received` event to Inngest.
6. Inngest writes span to Tinybird.
7. Inngest upserts Convex run summary.
8. Inngest checks alert thresholds and error spans.
9. Alert events are logged in Convex and optionally sent to Slack.

Key files:

- `src/app/api/ingest/route.ts`
- `src/app/api/inngest/route.ts`
- `src/lib/inngest.ts`
- `src/lib/inngest-functions.ts`
- `src/lib/tinybird.ts`
- `src/lib/api-keys.ts`

Ingest API route:

- `POST /api/ingest`
- Returns `202 Accepted` on successful validation and event enqueue.
- Returns `401` for invalid/missing API key.
- Returns `413` for payloads over 1 MB.
- Returns `422` for invalid JSON or invalid span payload.

Required span fields:

- `spanId`
- `runId`
- `spanType`
- `createdAt`
- `latencyMs`
- at least one of `input` or `output`

Optional span fields:

- `costUsd`
- `modelId`
- `toolName`
- `metadata`
- `parentSpanId`

### 7. Inngest Functions

Implemented:

#### `processSpan`

Trigger:

- `uncoil/span.received`

Responsibilities:

- Writes the raw span row to Tinybird.
- Upserts the run summary in Convex.
- Checks project cost threshold.
- Creates cost-exceeded alert event when a run exceeds threshold.
- Creates run-failed alert event when a span has `spanType === "error"`.
- Retries up to three times.

#### `processAlert`

Trigger:

- `uncoil/alert.triggered`

Responsibilities:

- Writes alert to Convex.
- Looks up the project.
- Sends Slack notification if `slackWebhookUrl` is configured.

### 8. Convex Data Model

Implemented tables:

#### `projects`

Stores project ownership, API key metadata, plan/settings, thresholds, and Slack config.

Important fields:

- `name`
- `slug`
- `clerkUserId`
- `clerkOrgId`
- `planTier`
- `apiKeyPrefix`
- `apiKeyLast4`
- `apiKeyHash`
- `apiKeyStatus`
- `apiKeyCreatedAt`
- `apiKeyLastUsedAt`
- `costThresholdUsd`
- `maxDurationSeconds`
- `maxStallMinutes`
- `slackWebhookUrl`

Indexes:

- `by_clerkOrgId`
- `by_clerkUserId`
- `by_slug`
- `by_apiKeyHash`

#### `agentRuns`

Stores saved run summaries for fast dashboard reads and reactive updates.

Important fields:

- `runId`
- `status`: `running`, `completed`, `failed`, `cancelled`
- `spanCount`
- `totalCostUsd`
- `startedAt`
- `finishedAt`
- `lastSpanAt`
- `primaryModel`
- `projectId`

Indexes:

- `by_projectId`
- `by_runId`
- `by_projectId_and_runId`
- `by_projectId_startedAt`
- `by_projectId_createdAt`
- `by_projectId_status`

#### `alerts`

Stores run/project alerts.

Fields:

- `runId`
- `type`
- `message`
- `triggeredAt`
- `projectId`

Indexes:

- `by_projectId`
- `by_runId`

#### `comments`

Stores span/run comments tied to Tinybird span ids.

Fields:

- `spanId`
- `projectId`
- `runId`
- `userId`
- `userName`
- `content`
- `createdAt`

Indexes:

- `by_spanId`
- `by_runId`
- `by_projectId`

### 9. Convex Public Functions

#### `convex/projects.ts`

- `createProject`
  - Creates a project for the authenticated Clerk user.
  - Generates one-time plaintext API key.
  - Stores only hash/display metadata.

- `createProjectForUser`
  - Admin-only support function.
  - Creates a project and one-time API key for a target Clerk user.
  - Used for manual testing and support workflows.

- `getProjectByApiKey`
  - Looks up a project by API-key hash.
  - Used by `POST /api/ingest`.

- `markApiKeyUsed`
  - Updates API key last-used timestamp.

- `getProjectsByUserOrOrg`
  - Lists projects accessible to the current Clerk identity.

- `getProjectById`
  - Fetches one project by id with access control.

- `getProjectRouteState`
  - Validates a dashboard route param before dashboard project queries mount.
  - Normalizes invalid/stale ids and prevents sentinel strings from reaching project-scoped queries.

- `getById`
  - Internal-style public lookup used by backend processing.

- `getProjectOnboardingState`
  - Returns onboarding/project readiness state.

- `getProjectsByOrg`
  - Lists projects for active organization context.

- `getProject`
  - Access-controlled project lookup.

- `getProjectManagementSummary`
  - Aggregates saved Convex project stats for management/dashboard fallback.

- `listByOrg`
  - Lists projects by organization id.

- `updateProject`
  - Updates project name, thresholds, and Slack webhook settings.

- `deleteProject`
  - Requires exact project name and `DELETE`.
  - Deletes project plus related Convex run summaries, alerts, and comments.

- `rotateApiKey`
  - Generates a new one-time API key and replaces saved key hash/display metadata.

#### `convex/agentRuns.ts`

- `upsertRunFromSpan`
  - Used by Inngest after Tinybird write.
  - Updates run summary from individual span data.
  - Increments span count and cost.
  - Updates primary model when available.

- `upsertRun`
  - Direct run summary upsert.
  - Supports `running`, `completed`, `failed`, and `cancelled`.

- `upsert`
  - Compatibility upsert path.

- `getFirstRunForProject`
  - Used by onboarding/listening state to detect first trace.

- `getRecentRunsByProject`
  - Used by overview/management to show recent saved runs.

- `cancelRun`
  - Authenticated project-access mutation.
  - Marks running saved run summary as `cancelled`.
  - Sets finish/update timestamps.
  - Does not kill an external customer process yet.

- `getProjectOnboardingState`
  - Determines if a project has received traces.

- `listByProject`
  - Lists saved run summaries for a project.

- `getByRunId`
  - Fetches one run summary by project/run id.

#### `convex/alerts.ts`

- `create`
  - Writes alert rows from Inngest.

- `listByProject`
  - Lists alerts for dashboard alert inbox.

#### `convex/comments.ts`

- `create`
  - Creates a comment on a span/run.

- `listBySpan`
  - Lists comments for a span id.

- `listByRun`
  - Lists comments for all spans in a run.

### 10. Tinybird Analytics

Implemented in `src/lib/tinybird.ts`:

- Raw span ingest to Tinybird datasource `spans`.
- `getSpansForRun(runId, projectId)`
  - Fetches trace timeline rows for run detail page.
- `getDailyCosts(projectId, days)`
  - Aggregates cost and span count per day.
- `getCostByModel(projectId, days)`
  - Aggregates LLM cost, span count, and average latency per model.

Important fix:

- Tinybird SQL helpers append `FORMAT JSON`.
- This fixed the dashboard issue where Tinybird returned tab-separated output and the app attempted to parse it as JSON.

Known note:

- Current SQL is built with interpolated strings. Project ids and run ids come from internal routes, but this should eventually move to parameterized Tinybird pipes/endpoints for stronger safety and performance.

### 11. API Routes

Implemented:

- `POST /api/ingest`
  - Customer SDK ingestion endpoint.

- `GET /api/projects/[projectId]/stats?days=...`
  - Returns dashboard analytics from Tinybird.
  - Returns empty/fallback analytics with `unavailable: true` when Tinybird is unavailable so the dashboard does not crash.

- `GET /api/projects/[projectId]/runs/[runId]/spans`
  - Returns span timeline rows from Tinybird for trace viewer.

- `/api/inngest`
  - Serves Inngest functions.

### 12. Dashboard Pages

Implemented routes:

- `/dashboard`
  - Entry redirect/start state.

- `/dashboard/[projectId]`
  - Overview dashboard.

- `/dashboard/[projectId]/runs`
  - Runs list.

- `/dashboard/[projectId]/runs/[runId]`
  - Trace viewer.

- `/dashboard/[projectId]/costs`
  - Cost analytics and savings impact chart.

- `/dashboard/[projectId]/alerts`
  - Alerts feed.

- `/dashboard/[projectId]/manage`
  - Project management and deletion.

- `/dashboard/[projectId]/settings`
  - Settings hub with project settings, API keys, members/teams placeholders.

- `/dashboard/[projectId]/docs`
  - In-app quickstart/docs.

- `/dashboard/[projectId]/quickstart`
  - Project-specific setup guide.

- Legacy/secondary pages still present:
  - `/api-keys`
  - `/billing`

### 13. Dashboard Components

Important components:

- `DashboardOverview`
  - Main project overview cards and charts.
  - Supports 1d/7d/30d/90d period switching.
  - Uses Convex saved totals as fallback when Tinybird is unavailable.

- `CostDashboard`
  - Cost graph, model breakdown, saved/avoidable spend visualizations.
  - Uses Recharts.
  - Shows savings impact against a peak-day baseline.

- `RunsTable`
  - Live saved run list from Convex.
  - Filters by status: all, running, completed, failed, cancelled.
  - Exposes compact stop button for running runs.

- `TraceViewer`
  - Timeline view for one run.
  - Fetches spans from Tinybird.
  - Shows run status, cost, span count, start time, and run-control panel.

- `CancelRunButton`
  - Two-step confirmation control.
  - Calls `agentRuns:cancelRun`.
  - Prevents accidental stop clicks.

- `ProjectManagement`
  - Saved stats, lifecycle, recent runs, API key usage, thresholds, delete flow.

- `ProjectRouteGate`
  - Prevents invalid project ids from causing dashboard crashes.

- `ProjectSwitcher`
  - Project selection in topbar/sidebar context.

### 14. Dashboard Analytics and Refresh Behavior

Implemented:

- Dashboard overview and costs pages poll stats while the tab is visible.
- Baseline polling is four seconds.
- A hybrid refresh hook uses Convex activity signals to trigger faster refreshes when saved run summaries update.
- This makes the UI feel closer to real-time without hammering Tinybird every second all the time.
- Fetches use `cache: "no-store"` for stats.
- Existing chart data stays on screen while refreshes happen to avoid loading flicker.

Important corrections:

- Range-scoped cards now use Tinybird range totals when available.
- Convex saved totals are fallback/all-time-ish data only when analytics is unavailable.
- This fixed the issue where 1d, 7d, 30d, and 90d showed the same cost.

### 15. Cost and Savings Visualization

Implemented:

- Spend-first cards with secondary savings numbers.
- Total selected-period savings instead of per-day savings.
- 1d/7d/30d/90d range switcher.
- Cost graph with:
  - actual spend
  - shaded avoided-spend area
  - peak-day baseline
  - max two decimal display on main graph values
- Costs page impact cards:
  - peak day
  - latest day
  - estimated avoided spend

Demo data:

- `scratch/user-test-uncoil/seed-history.mjs`
  - Seeds previous-day dashboard data.

- `scratch/user-test-uncoil/seed-savings.mjs`
  - Seeds an expensive-to-optimized pattern to show savings.

### 16. Alerts and Notifications

Implemented:

- Cost threshold alerting.
- Error-span alerting.
- Alert storage in Convex.
- Slack webhook notification path if configured on the project.
- Alerts dashboard list.

Limitations:

- Email alerts are not implemented.
- Alert resolution states are not yet implemented.
- Duration/stall alerting settings exist in schema/project settings, but runtime enforcement is not complete.

### 17. Comments and Human-in-the-Loop

Implemented:

- Convex comments table.
- Create comment mutation.
- List comments by span.
- List comments by run.
- Intended for trace/span review and annotation workflows.

### 18. SDKs and Distribution

#### TypeScript SDK

Package:

- `uncoil`

Install:

```bash
npm install uncoil-sdk
```

Implemented exports:

- `UncoilClient`
- `traceAgent`
- `llmCall`
- `toolCall`
- `decision`

Package status:

- `packages/ts-sdk/package.json` publishes as `uncoil`.
- Build output configured through TypeScript.
- `npm publish` succeeded for `uncoil@0.1.0`.
- Site/docs/onboarding install copy updated away from old `uncoil`.

#### Python SDK

Distribution:

- `uncoil`

Install:

```bash
pip install uncoil-sdk
```

Import module:

```python
from uncoil import UncoilClient, trace_agent, llm_call, tool_call
```

Reason:

- PyPI package is named `uncoil`, with a `uncoil` import package and a legacy `uncoil` compatibility import.

Package status:

- `packages/python-sdk/pyproject.toml` uses distribution name `uncoil`.
- Local wheel build passed.
- Local wheel smoke test imported the expected symbols.
- PyPI upload eventually succeeded after using a valid PyPI API token through `uv publish --token`.

### 19. User Testing and Demo Scripts

Implemented local scripts:

- `scratch/user-test-uncoil/send-test-span.mjs`
  - Sends a basic span through local ingest.

- `scratch/user-test-uncoil/agentic-workflow.mjs`
  - Sends a more comprehensive agentic workflow with expensive model spans.

- `scratch/user-test-uncoil/seed-history.mjs`
  - Seeds previous days of dashboard telemetry.

- `scratch/user-test-uncoil/seed-savings.mjs`
  - Seeds savings-impact demo data.

Tested behavior:

- Local ingest returned `202 Accepted`.
- Convex saved run summaries updated.
- Tinybird returned daily JSON rollups.
- Dashboard charts and model breakdowns displayed seeded data.
- Root `npm run build` passed repeatedly after major changes.

### 20. Deployment and Environment Work

Implemented/fixed:

- Vercel project linked.
- Production deployment created.
- Convex generated bindings committed so Vercel does not need interactive Convex deploy during frontend build.
- `package.json` build simplified to `next build`.
- Convex deploy separated into `npm run deploy:convex`.
- Vercel production env configured with Clerk and Convex values.
- Production switched to Convex prod deployment `focused-otter-289`.
- Local dev uses Convex dev deployment `diligent-dragon-604`.
- Convex prod and dev both have the required Clerk issuer configuration.
- `agentRuns:cancelRun` deployed and verified in both dev and prod after initial missing-function error.

Important deployment lesson:

- If the frontend calls a new Convex function before `npx convex dev --once` or `npx convex deploy`, the browser throws:

```text
Could not find public function for 'module:functionName'
```

Resolution:

```bash
npx convex dev --once --typecheck disable
npx convex deploy --yes
```

Verification:

```bash
npx convex function-spec
npx convex function-spec --prod
```

### 21. Major Bugs Fixed

#### `/dashboard/no-project` crash

Problem:

- `"no-project"` was passed into Convex queries expecting `v.id("projects")`.

Fix:

- `/dashboard` now handles zero-project state.
- `/dashboard/[projectId]` route params are validated by Convex route-state query.
- Stale browser state normalizes old `/dashboard/no-project` values back to `/dashboard`.

#### Waiting for auth

Problem:

- Clerk lacked a `convex` JWT template, so Convex auth never became ready.

Fix:

- Created Clerk JWT template `convex`.
- Synced Convex auth config.
- Documented dev/prod troubleshooting.

#### Missing Convex function after code change

Problem:

- Frontend referenced new Convex functions before deployment registered them.

Fix:

- Ran Convex dev sync and production deploy.
- Verified with `convex function-spec`.

#### Duplicate sidebars

Problem:

- Nested dashboard shells rendered multiple sidebar instances with different collapsed states.

Fix:

- Only root dashboard layout owns `DashboardShell`.

#### Tinybird unavailable / JSON parsing

Problem:

- Tinybird SQL endpoint returned TSV while app parsed JSON.

Fix:

- Added `FORMAT JSON` to analytics SQL queries.

#### Wrong cost totals for time ranges

Problem:

- 1d/7d/30d/90d cards could show the same all-time Convex totals.

Fix:

- Use Tinybird range-scoped analytics when available.
- Use Convex saved totals only as fallback.

#### Stats endpoint dashboard crash

Problem:

- Tinybird failure surfaced as frontend console errors.

Fix:

- Stats route returns empty analytics payload with `unavailable: true`.

#### Package naming confusion

Problem:

- Docs and prompts still referenced old package names like `uncoil` or Python install variants.

Fix:

- Standardized installs:
  - `npm install uncoil-sdk`
  - `pip install uncoil-sdk`

### 22. Known Limitations and Open Work

High priority:

- True run cancellation is not implemented in SDK/runtime yet.
  - Current stop button marks the saved dashboard run as `cancelled`.
  - It does not terminate the user's external process.
  - A future SDK should poll/check cancellation state or accept a cancellation signal.

- Teams/RBAC are not complete.
  - Clerk organization support exists conceptually.
  - Project deletion should eventually enforce role-based permissions.

- Tinybird analytics should move from raw SQL strings to proper Tinybird pipes/endpoints.

- Alerting is partial.
  - Cost and error alerts exist.
  - Duration/stall thresholds are stored but not fully enforced.
  - Alert resolution and email are not complete.

- Billing is not production-complete.
  - Billing UI/page exists, but real Stripe checkout/plans are pending.

- Screenshots/marketing polish remain pending.
  - Landing page should eventually use real dashboard screenshots.

- Production observability for the app itself is basic.
  - Need structured logs/error monitoring for ingest, Inngest, Tinybird, and Convex failures.

### 23. Current Verification Commands

Frontend build:

```bash
npm run build
```

Convex dev sync:

```bash
npx convex dev --once --typecheck disable
```

Convex production deploy:

```bash
npx convex deploy --yes
```

Convex function inventory:

```bash
npx convex function-spec
npx convex function-spec --prod
```

Python SDK local smoke test pattern:

```bash
uv build
uv publish --dry-run
```

TypeScript SDK build:

```bash
cd packages/ts-sdk
npm run build
```

### 24. Current Project State

The app is in a functional MVP state:

- Users can authenticate.
- Users can create projects.
- API keys can be issued and rotated.
- SDK installs are published/standardized as `uncoil`.
- Spans can be ingested.
- Runs and costs appear in dashboard.
- Trace detail pages can show span timelines.
- Project management and deletion exist.
- Alerts and Slack notification path exist.
- Demo data can be generated for previous-day and savings-impact visuals.
- Dev and prod Convex deployments are both aware of the latest run-cancel mutation.

The next phase should focus on converting the MVP into a reliable production beta:

1. Add real SDK/runtime cancellation support.
2. Finish Teams/RBAC.
3. Harden Tinybird analytics through pipes/endpoints.
4. Complete alert lifecycle and duration/stall enforcement.
5. Add Stripe billing.
6. Add app-level monitoring and operational dashboards.
7. Polish marketing with real screenshots and production-ready copy.
