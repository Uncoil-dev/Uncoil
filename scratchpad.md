# Implementation Scratchpad

# Login / Dashboard Redirect Fix
- **Status:** Implemented and scoped-lint validated.
- **Files Updated:**
  - `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
  - `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/components/dashboard/dashboard-entry-router.tsx`
  - `src/components/dashboard/dashboard-start-state.tsx`
  - `src/components/dashboard/dashboard-topbar.tsx`
  - `src/lib/onboarding-navigation.ts`
  - `.env.local`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Behavior Change:**
  - Clerk sign-in and sign-up now force/fallback redirect to `/dashboard`.
  - `/dashboard` renders the dashboard start state directly and no longer redirects to onboarding.
  - The dashboard top bar has an explicit `Onboarding` button back into the setup flow.
- **Validation:**
  - Scoped ESLint passed for the touched navigation files.
  - Full `npm.cmd run build` is still blocked by an unrelated Convex type error in `convex/agentRuns.ts`.

## Project Creation Auth-State Split
- **Status:** Implemented and lint-validated.
- **Files Updated:**
  - `src/components/onboarding/project-step.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Behavior Change:**
  - Clerk-loaded but unsigned users still get the sign-in message.
  - Signed-in users who are waiting on Convex auth now get `Preparing project creation...`.
  - The create button remains clickable once the form is visible.

## Project Creation Auth Boundary Fix
- **Status:** Implemented and lint-validated.
- **Files Updated:**
  - `src/components/onboarding/project-step.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Behavior Change:**
  - `ProjectStep` now renders the form only inside `Authenticated`.
  - `AuthLoading` shows a short waiting message while Convex auth initializes.
  - `Unauthenticated` shows a sign-in message.
- **Reason:**
  - This avoids calling `createProject` before Convex has a user identity, which was surfacing as `ctx.auth.getUserIdentity() === null`.

## Convex Sync Recovery
- **Status:** Implemented and deployment sync validated.
- **Files Updated:**
  - `convex/schema.ts`
  - `convex/agentRuns.ts`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Issue:**
  - `npx convex dev` initially failed because an existing `agentRuns` row lacked `createdAt`.
- **Fix:**
  - Changed `agentRuns.createdAt` to `v.optional(v.string())`.
  - Kept new writes setting `createdAt`.
  - Added a fallback to `startedAt` for onboarding state reads.
- **Verification:**
  - Fresh `npx convex dev` now reports `Convex functions ready!`.

## Root Routing Stability Fix
- **Status:** Implemented and targeted-lint validated.
- **Files Updated:**
  - `src/components/onboarding/onboarding-entry-router.tsx`
  - `src/components/dashboard/dashboard-entry-router.tsx`
  - `src/components/onboarding/project-step.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Behavior Change:**
  - Removed the Convex `projects.getProjectsByUserOrOrg` call from root redirect logic.
  - `sessionStorage` project id and `localStorage` last project id now drive `/dashboard` and `/onboarding` redirects.
  - Project creation now writes `uncoil.lastProjectId` so the next root visit can route into the dashboard without querying Convex.
- **Reason:**
  - A missing public function in Convex should not break route entry.

## Onboarding Routing + Install Step Refinement
- **Status:** Implemented and targeted-lint validated.
- **Files Updated:**
  - `src/app/onboarding/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/components/onboarding/onboarding-entry-router.tsx`
  - `src/components/dashboard/dashboard-entry-router.tsx`
  - `src/components/onboarding/install-step.tsx`
  - `src/components/onboarding/code-copy-block.tsx`
  - `src/components/onboarding/project-step.tsx`
  - `src/components/onboarding/api-key-step.tsx`
  - `src/components/onboarding/onboarding-escape-link.tsx`
  - `src/components/onboarding/waiting-step.tsx`
  - `src/components/dashboard/dashboard-start-state.tsx`
  - `src/lib/onboarding-client-state.ts`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Onboarding Routing Rules:**
  - Unauthenticated users are protected by Clerk proxy and route to `/sign-in`.
  - `/onboarding` sends users with no project to `/onboarding/project`.
  - `/onboarding` sends users with an existing project to `/dashboard/[projectId]`.
  - `/dashboard` sends users with an existing project to `/dashboard/[projectId]`.
  - `/dashboard` sends users with no project to `/onboarding/project`.
  - Users with a project but no spans stay in the dashboard start state with Quickstart visible.
- **Package Publication Check:**
  - npm registry check for `uncoil` returned `E404 Not Found`.
  - PyPI JSON check for `uncoil` returned `{"message": "Not Found"}`.
  - Current install commands use beta GitHub sources:
    - Python: `pip install git+https://github.com/uncoil/sdk-python`
    - TypeScript: `npm install github:uncoil/sdk-typescript`
  - TODO: Replace beta install commands with PyPI/npm commands once packages are published.
- **AI Setup Prompt:**
  - `/onboarding/install` now has a third `AI setup prompt` mode.
  - The setup prompt is copyable with `Copy setup prompt`.
  - The prompt uses `UNCOIL_API_KEY=your_key_here` and does not include the real API key.
  - A visible warning tells users not to paste live API keys into AI coding tools unless they trust the environment.
- **API Key Handling:**
  - Project creation still receives the one-time plaintext key from Convex.
  - Plaintext key handoff is now in-memory only via `src/lib/onboarding-client-state.ts`; it is not written to `sessionStorage`.
  - Copying the key marks `uncoil.onboarding.apiKeyCopied` and clears the in-memory key.
- **Scope Notes:**
  - Did not build trace viewer, runs list, cost dashboard, or landing page changes.

## Onboarding/Dashboard Navigation Escape Hatches
- **Status:** Implemented and targeted-lint validated.
- **Files Updated:**
  - `src/components/onboarding/onboarding-escape-link.tsx`
  - `src/components/onboarding/onboarding-shell.tsx`
  - `src/components/onboarding/api-key-step.tsx`
  - `src/components/onboarding/project-step.tsx`
  - `src/components/dashboard/dashboard-sidebar.tsx`
  - `src/components/dashboard/dashboard-start-state.tsx`
  - `src/app/dashboard/[projectId]/page.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Routes Added/Changed:**
  - `/onboarding/project`, `/onboarding/api-key`, `/onboarding/install`, `/onboarding/waiting`, and `/onboarding/success` inherit a quiet top-left Home/Dashboard escape link from the onboarding shell.
  - Dashboard Resources includes `Quickstart` -> `/onboarding/install`.
  - Dashboard empty-state `View quickstart` routes to `/onboarding/project` when no project context exists, `/onboarding/api-key` when a one-time key is still available and not copied, and `/onboarding/install` otherwise.
  - `Open sample trace` remains `/demo`; no `#` CTA destinations were added.
- **API Key Leave Warning:**
  - `/onboarding/api-key` records `uncoil.onboarding.apiKeyCopied` after Copy key.
  - The escape link shows the API key warning only when the key exists and has not been copied.
- **Context-Aware `/onboarding`:**
  - Deferred for this pass. It still redirects to `/onboarding/project`; direct dashboard/onboarding links now cover the required escape hatches without adding server-side state assumptions.
- **Scope Notes:**
  - Navigation-only change. No landing, auth, pricing, ingestion, Convex, Inngest, trace viewer, runs list, cost dashboard, or alerts changes were made for this task.

## Milestone 2 Part 3 - Ingestion + First Span Activation
- **Status:** Implemented and build-validated.
- **Files Updated:**
  - `convex/schema.ts`
  - `convex/agentRuns.ts`
  - `src/app/api/ingest/route.ts`
  - `src/lib/api-keys.ts`
  - `src/lib/inngest-functions.ts`
  - `src/lib/tinybird.ts`
  - `src/components/onboarding/waiting-step.tsx`
  - `src/components/onboarding/success-step.tsx`
  - `src/app/onboarding/success/page.tsx`
  - `src/components/dashboard/project-switcher.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **API Route:**
  - `POST /api/ingest` validates Bearer keys, rejects missing/invalid keys with `401`, rejects invalid payloads with field-specific `422`, rejects >1MB payloads with `413`, updates API key last-used time, and sends `uncoil/span.received`.
- **Inngest Function:**
  - `processSpan` handles `uncoil/span.received`.
  - Writes span data to Tinybird.
  - Calls `agentRuns.upsertRunFromSpan` to create/update run summaries.
- **Convex Functions Created/Updated:**
  - `agentRuns.upsertRunFromSpan`
  - `agentRuns.getFirstRunForProject`
  - `agentRuns.getProjectOnboardingState`
  - `agentRuns.getRecentRunsByProject`
  - Compatibility upserts retained for existing callers.
- **Schema Changes:**
  - `agentRuns` now tracks `status`, `spanCount`, `totalCostUsd`, `startedAt`, `finishedAt`, `lastSpanAt`, optional `primaryModel`, `createdAt`, and `updatedAt`.
  - Added indexes `by_projectId_createdAt` and `by_projectId_status`.
  - Kept existing `by_projectId_and_runId` instead of adding duplicate `by_projectId_runId`.
- **Tinybird Write Status:**
  - `ingestSpan` writes project/run/span IDs, span type, input, output, latency, cost, model, tool, parent span, metadata, and created time.
  - Production requires `TINYBIRD_TOKEN`; missing token throws instead of silently skipping.
- **Onboarding Wiring:**
  - Waiting screen reads `uncoil.onboarding.projectId`, subscribes to `agentRuns.getProjectOnboardingState`, and routes to `/onboarding/success?projectId=<projectId>&runId=<runId>` only after a real run exists.
  - Success screen reads `projectId` and `runId` from query params and links to `/dashboard/[projectId]/runs/[runId]`.
  - Dev-only first-span simulation was removed.
- **Runtime Error Fix:**
  - Dashboard project switcher no longer calls Convex project-list queries during this pass.
  - It reads `uncoil.onboarding.projectId` and `uncoil.onboarding.projectName` from `sessionStorage` when available, then falls back to existing mock projects.
  - TODO: Reconnect to Convex-backed project listing once `npx convex dev`/deployment registration is stable for the new functions.
- **Manual Curl Test:**
  ```bash
  curl -X POST http://localhost:3000/api/ingest \
    -H "Authorization: Bearer uncoil_sk_live_REPLACE_WITH_REAL_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "spanId": "span_test_001",
      "runId": "run_test_001",
      "spanType": "llm_call",
      "input": "{\"query\":\"hello\"}",
      "output": "{\"result\":\"world\"}",
      "latencyMs": 420,
      "costUsd": 0.0004,
      "modelId": "claude-sonnet-4-5",
      "createdAt": "2026-05-14T00:00:00.000Z"
    }'
  ```
  Expected:
  - response `202`
  - Inngest event created
  - Tinybird row written
  - Convex `agentRun` created
  - onboarding waiting screen auto-advances
  - success page opens `/dashboard/[projectId]/runs/run_test_001`
- **Local Test Results:**
  - Missing auth returned `401`.
  - Invalid key format returned `401`.
  - Missing required field returned `422`.
  - Payload over 1MB returned `413`.
  - Valid-key end-to-end test requires a signed-in onboarding project key plus matching `UNCOIL_API_KEY_HASH_SECRET` in Next.js and Convex and `TINYBIRD_TOKEN` for span writes.
- **Known TODOs:**
  - Run the valid-key curl test after generating a real onboarding key in the browser.
  - Add key rotation/revocation UI later.
  - Build the real trace viewer in the next milestone.

## Milestone 2 Part 2 - Project Creation + API Key Backend
- **Status:** Implemented and build-validated.
- **Files Updated:**
  - `convex/schema.ts`
  - `convex/projects.ts`
  - `convex/agentRuns.ts`
  - `convex/_generated/api.d.ts`
  - `convex/_generated/api.js`
  - `convex/_generated/dataModel.d.ts`
  - `convex/_generated/server.d.ts`
  - `convex/_generated/server.js`
  - `src/components/onboarding/project-step.tsx`
  - `src/components/onboarding/api-key-step.tsx`
  - `src/components/onboarding/waiting-step.tsx`
  - `src/components/dashboard/project-switcher.tsx`
  - `.env.local.example`
  - `.env.prod`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Convex Functions Created/Updated:**
  - `projects.createProject`
  - `projects.getProjectsByUserOrOrg`
  - `projects.getProjectById`
  - `projects.getProjectOnboardingState`
  - Existing compatibility aliases retained: `projects.getProjectsByOrg`, `projects.getProject`, `projects.getProjectByApiKey`, `projects.markApiKeyUsed`, `projects.listByOrg`.
- **Schema Changes:**
  - Added `slug`, `clerkUserId`, optional `clerkOrgId`, `createdAt`, `updatedAt`, `planTier`, `costThresholdUsd`, `maxDurationSeconds`, and `maxStallMinutes`.
  - API key fields remain hash-only: `apiKeyPrefix`, `apiKeyLast4`, `apiKeyHash`, `apiKeyStatus`, `apiKeyCreatedAt`, optional `apiKeyLastUsedAt`.
  - Added indexes `by_clerkUserId` and `by_slug`; retained `by_clerkOrgId` and `by_apiKeyHash`.
- **Security Notes:**
  - API key format: `uncoil_sk_live_` + 32 random hex chars.
  - API keys are generated with `crypto.getRandomValues`.
  - API key hashes use HMAC-SHA256 with `UNCOIL_API_KEY_HASH_SECRET`.
  - Plaintext API key is returned once from `createProject` and stored only in `sessionStorage` under `uncoil.onboarding.apiKey`.
  - Plaintext API key is not stored in Convex, memory, scratchpad, or localStorage.
- **Onboarding Client Storage:**
  - `uncoil.onboarding.apiKey`
  - `uncoil.onboarding.projectId`
  - `uncoil.onboarding.projectName`
- **Environment Variable Required:**
  - Set `UNCOIL_API_KEY_HASH_SECRET` in Convex deployment env before creating projects.
- **Temporary Mocks / Deferred Work:**
  - Project switcher now prefers real Convex projects and falls back to mock projects if none are returned.
  - API route ingestion still uses the older local hashing helper and is intentionally not updated in this Part 2 pass.
  - Key rotation, key revocation, settings UI, ingestion validation, and first-span backend detection remain deferred.
- **Manual Testing Steps:**
  - Sign in through Clerk.
  - Visit `/onboarding/project`.
  - Create a project named `research-agent-prod`.
  - Confirm `/onboarding/api-key` shows a key matching `uncoil_sk_live_[32 hex chars]`.
  - Copy key and confirm Continue unlocks.
  - Download `.env` and confirm it contains `UNCOIL_API_KEY=<one-time key>`.
  - Continue to `/onboarding/install`.
  - Confirm Convex `projects` row stores hash/prefix/last4 but not plaintext.

## Milestone 2 Part 1 - Onboarding UI Flow
- **Status:** Implemented and build-validated.
- **Files Created:**
  - `src/components/onboarding/onboarding-progress.tsx`
  - `src/components/onboarding/code-copy-block.tsx`
- **Files Updated:**
  - `src/app/onboarding/api-key/page.tsx`
  - `src/app/onboarding/install/page.tsx`
  - `src/app/onboarding/waiting/page.tsx`
  - `src/app/onboarding/success/page.tsx`
  - `src/components/onboarding/onboarding-shell.tsx`
  - `src/components/onboarding/project-step.tsx`
  - `src/components/onboarding/api-key-step.tsx`
  - `src/components/onboarding/install-step.tsx`
  - `src/components/onboarding/waiting-step.tsx`
  - `src/components/onboarding/success-step.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Routes:**
  - `/onboarding/project`
  - `/onboarding/api-key`
  - `/onboarding/install`
  - `/onboarding/waiting`
  - `/onboarding/success`
- **Mock Data:**
  - Mock API key: `uncoil_sk_live_mock_1234567890abcdef1234567890abcdef`.
  - Mock success project/run target: `/dashboard/research-agent-prod/runs/run_test_001`.
  - Temporary project name storage: `sessionStorage` key `uncoil.onboarding.mockProjectName`.
- **Behavior Notes:**
  - Project button is disabled until project name has a value.
  - API key Continue is disabled until Copy key is clicked.
  - `.env` download writes `UNCOIL_API_KEY=<mock key>`.
  - Install step has Python and TypeScript tabs plus copy buttons for command/code.
  - Waiting step uses elapsed client time for secondary help: 30s sample trace, 60s troubleshooting, 120s support email.
  - Waiting step has a development-only `Simulate first span (dev only)` button that routes to success and must be replaced in Part 3.
- **TODO Part 2:**
  - Connect project creation to Convex.
  - Generate and display a real one-time API key.
  - Replace temporary browser/session state with backend-backed onboarding state.
- **TODO Part 3:**
  - Wire ingestion and first-span detection.
  - Replace development simulation with real activation.
  - Route success with the real `projectId` and `runId`.

## Dashboard Sidebar Simplification
- **Status:** Implemented and build-validated.
- **Files Updated:**
  - `src/components/dashboard/dashboard-shell.tsx`
  - `src/components/dashboard/dashboard-sidebar.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Behavior Removed:**
  - Removed collapsed hover-peek state and mouse enter/leave timers.
  - Removed draggable resize handle and pointer/keyboard resizing handlers.
  - Removed shell usage of `uncoil.sidebar.width`.
- **Current Sidebar Widths:**
  - Expanded: `240px`.
  - Collapsed: `64px`.
- **Persisted State:**
  - `uncoil.sidebar.collapsed` remains active.
  - `uncoil:dashboard-sidebar-groups` remains active.
  - `uncoil.lastProjectId` remains active.
  - `uncoil.sidebar.width` is deprecated/unused after this simplification.
- **Preserved Interactions:**
  - Header icon toggles collapse/expand.
  - Collapsed nav-icon clicks expand the sidebar before letting `Link` navigation continue.
  - The clicked item's group opens if it was closed.

## Dashboard Sidebar Workspace Assistance
- **Status:** Implemented and build-validated.
- **Files Updated:**
  - `src/components/dashboard/dashboard-shell.tsx`
  - `src/components/dashboard/dashboard-sidebar.tsx`
  - `src/components/dashboard/project-switcher.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **localStorage Keys:**
  - `uncoil.sidebar.collapsed`: `"true"` or `"false"` for permanent collapse state.
  - `uncoil.sidebar.width`: saved permanent expanded width in pixels.
  - `uncoil:dashboard-sidebar-groups`: existing persisted group state, preserved.
  - `uncoil.lastProjectId`: last selected mock project id.
- **Width Values:**
  - Default expanded width: `240px`.
  - Minimum expanded width: `200px`.
  - Maximum expanded width: `360px`.
  - Collapsed width: `64px`.
- **Drag Handling:**
  - Uses pointer events on the resize separator.
  - `pointermove` updates width live with clamping.
  - `pointerup` persists the final clamped width.
  - Text selection and cursor are suppressed while dragging.
  - Resize handle supports keyboard arrows: `ArrowLeft` / `ArrowRight` by 16px; `Shift` by 32px.
- **Hover Peek Handling:**
  - `isPeeking` is local React state and never persisted.
  - Open delay: `80ms`.
  - Close delay: `120ms`.
  - Peeking visual width uses the saved expanded width, but main layout remains offset at `64px`.
  - Resize handle is hidden while peeking.
- **Nav Click Handling:**
  - Collapsed or peeking nav click calls expand before allowing Next.js `Link` navigation to continue.
  - The clicked item's group is opened if it was previously closed.
  - Existing group state is otherwise preserved.
- **Accessibility Notes:**
  - Header button aria-label switches between `Collapse sidebar` and `Expand sidebar`.
  - Resize handle has `role="separator"`, `aria-orientation="vertical"`, and `aria-label="Resize sidebar"`.
  - Collapsed nav links retain route aria-labels and tooltips.
- **Deferred Workspace Assist TODOs:**
  - Last selected project is remembered.
  - Last dashboard route per project (`uncoil.lastRoute.[projectId]`) was deferred to avoid modifying dashboard route/content behavior in this sidebar-only pass.
  - No-spans dashboard home behavior was already represented by the existing start-here panel and was not changed.

## Dashboard Shell Usability Pass
- **Status:** Implemented and build-validated.
- **Files Created:**
  - `src/components/dashboard/dashboard-start-state.tsx`
- **Files Updated:**
  - `src/components/dashboard/dashboard-shell.tsx`
  - `src/components/dashboard/dashboard-sidebar.tsx`
  - `src/components/dashboard/dashboard-topbar.tsx`
  - `src/components/dashboard/project-switcher.tsx`
  - `src/app/dashboard/page.tsx`
  - `memory.md`
  - `decisions.md`
  - `scratchpad.md`
  - `task.md`
  - `implementation_plan.md`
- **Sidebar Notes:**
  - Expanded width is `240px`; collapsed width is `64px`.
  - Sidebar collapsed state persists in `localStorage` as `uncoil:dashboard-sidebar`.
  - Group state persists in `localStorage` as `uncoil:dashboard-sidebar-groups`.
  - Groups are OBSERVE, CONFIGURE, and RESOURCES.
  - Deferred Replay, Evals, Integrations, Team, Memory, and Runtime nav items remain hidden.
- **Project Switcher Notes:**
  - Still uses mock projects: `research-agent-prod`, `support-agent-staging`, `automation-dev`.
  - Selecting a project updates local state and routes to `/dashboard/<projectId>`.
  - TODO: Replace local mock state with Convex-backed project context.
- **Start State Notes:**
  - `/dashboard` and `/dashboard/[projectId]` render the same start-here state.
  - `View quickstart` routes to `/onboarding/install`.
  - `Open sample trace` routes to `/demo`.
  - TODO: Replace `/demo` with a real sample trace route when the trace viewer milestone exists.
  - API Keys and Billing are nav entry points only; their pages were not built in this pass.
- **Validation:**
  - Scoped dashboard ESLint passed.
  - `npm.cmd run build` passed.

## Dashboard Milestone 2 - Onboarding + Ingestion
- **Status:** Implemented and build-validated.
- **Files Created:**
  - `convex/auth.config.ts`
  - `src/app/onboarding/layout.tsx`
  - `src/app/onboarding/page.tsx`
  - `src/app/onboarding/project/page.tsx`
  - `src/app/onboarding/api-key/page.tsx`
  - `src/app/onboarding/install/page.tsx`
  - `src/app/onboarding/waiting/page.tsx`
  - `src/app/onboarding/success/page.tsx`
  - `src/components/onboarding/onboarding-shell.tsx`
  - `src/components/onboarding/project-step.tsx`
  - `src/components/onboarding/api-key-step.tsx`
  - `src/components/onboarding/install-step.tsx`
  - `src/components/onboarding/waiting-step.tsx`
  - `src/components/onboarding/success-step.tsx`
  - `src/lib/api-keys.ts`
  - `src/app/dashboard/[projectId]/runs/[runId]/page.tsx`
- **API Routes Created/Updated:**
  - Updated `src/app/api/ingest/route.ts`
  - Existing `src/app/api/inngest/route.ts` continues to serve Inngest functions.
- **Convex Functions Created/Updated:**
  - `projects.createProject`
  - `projects.getProject`
  - `projects.getProjectsByOrg`
  - `projects.getProjectByApiKey`
  - `projects.markApiKeyUsed`
  - `agentRuns.upsertRun`
  - `agentRuns.getFirstRunForProject`
  - `agentRuns.getRecentRunsByProject`
  - `agentRuns.getProjectOnboardingState`
- **Inngest Functions Created/Updated:**
  - Updated `processSpan` to listen for `uncoil/span.received`.
  - Writes span rows to Tinybird and upserts Convex `agentRuns`.
  - Removed alert side effects from `processSpan`; alerts are outside Milestone 2.
- **Temporary Mocks:**
  - None for activation. Waiting state only advances from a real Convex run returned by `agentRuns.getProjectOnboardingState`.
  - `/dashboard/[projectId]/runs/[runId]` is a temporary receipt placeholder, not a trace viewer.
- **Unresolved Backend/Environment Issues:**
  - `UNCOIL_API_KEY_HMAC_SECRET` must be set in both Next.js runtime env and Convex deployment env to create and validate API keys consistently.
  - `TINYBIRD_TOKEN` and `TINYBIRD_HOST` must be configured for Tinybird ingestion.
  - `convex/auth.config.ts` uses the current Clerk issuer `https://many-crab-79.clerk.accounts.dev`.
- **Manual Curl Test:**
  ```bash
  curl -X POST http://localhost:3000/api/ingest \
    -H "Authorization: Bearer uncoil_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
    -H "Content-Type: application/json" \
    -d '{
      "spanId": "span_test_001",
      "runId": "run_test_001",
      "spanType": "llm_call",
      "input": "{\"query\":\"hello\"}",
      "output": "{\"result\":\"world\"}",
      "latencyMs": 420,
      "costUsd": 0.0004,
      "modelId": "claude-sonnet-4-5",
      "createdAt": "2026-05-14T00:00:00.000Z"
    }'
  ```
  Expected result after using a real onboarding-generated key:
  - API returns `202`.
  - Tinybird receives one `spans` row.
  - Convex creates or updates one `agentRuns` row.
  - `/onboarding/waiting?projectId=<projectId>` auto-advances to `/onboarding/success?projectId=<projectId>&runId=run_test_001`.
  - `/dashboard/<projectId>/runs/run_test_001` shows the temporary run received placeholder.
- **Manual Test Status:**
  - Not run end-to-end in this pass because a valid key must be generated through an authenticated Clerk onboarding session and Tinybird/Inngest environment variables must be configured.
- **Validation:**
  - `npx.cmd convex codegen` completed.
  - Scoped Milestone 2 ESLint passed.
  - `npm.cmd run build` passed.

## Dashboard Shell Foundation
- **Status:** Completed initial shell pass.
- **Shadcn Command Run:** `npx shadcn@latest add sidebar-03`
  - PowerShell blocked `npx.ps1`, so the equivalent Windows runner `npx.cmd shadcn@latest add sidebar-03` was used.
  - The command detected existing shadcn primitives and prompted for overwriting `button.tsx`; no overwrite was selected and no new shadcn primitive files were generated.
  - Re-ran `npx.cmd shadcn@latest add sidebar-03` for Milestone 1 verification; existing primitives were still kept.
  - Existing sidebar primitive remains `src/components/ui/sidebar.tsx`.
- **Product Shell Files Added:**
  - `src/components/dashboard/dashboard-shell.tsx`
  - `src/components/dashboard/dashboard-sidebar.tsx`
  - `src/components/dashboard/dashboard-topbar.tsx`
  - `src/components/dashboard/project-switcher.tsx`
- **Routes Added/Updated:**
  - `src/app/dashboard/layout.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/[projectId]/page.tsx`
- **Sidebar Adaptation Notes:**
  - Removed demo team/user/workspace content from the product shell.
  - Sidebar uses text-only uncoil logo, no generic icon.
  - Nav is limited to Overview, Runs, Costs, Alerts, Settings, and Docs.
  - Active state uses white text and a left border, not blue or rounded pill styling.
- **Temporary Data:**
  - Mock project id: `research-agent-prod`
  - Mock project switcher projects: `research-agent-prod`, `support-agent-staging`, `automation-dev`
  - `+ New project` is disabled until onboarding/project creation routing is implemented.
- **Mobile TODOs:**
  - Mobile uses the existing shadcn offcanvas sheet behavior via `SidebarTrigger`.
  - Future pass should verify mobile drawer visually in-browser once the local browser tool/dev server is available.
- **Future TODOs:**
  - Replace mock project data with Convex-backed project data.
  - Build onboarding later; do not add onboarding in Milestone 1.

## SDK Quickstart (FirstTrace) Rebuild
- **Status:** Completed.
- **Narrative:** "Catch the next one" (Connects wasted run to visible run).
- **Visuals:** 
    - Left: Code diff (+ @trace_agent) with green-tinted background for addition.
    - Right: Next run receipt (visible status).
    - Bottom: Subtle comparison line (wasted $18.42 vs visible).
- **Animation:** Under 1.5s (400ms diff -> 600ms values -> visible status).
- **Styling:** Strict monochrome, zero-radius, no blue UI.

## Verified
- Narrative flow: Pain → Proof → Relief → Relevance.
- FirstTrace follows DebugStream (Terminal shock).
- Contrast between $18.42 (wasted) and next run is clear.

## What You Get (WhatYouGet)
- **Status:** Completed.
- **Purpose:** Proof of product value (Trace, Cost, Retries, Failure).
- **Visuals:** 
    - Left: Headline ("Every run becomes inspectable") and subtext.
    - Right: Technical matrix (rows for TRACE, COST, RETRIES, FAILURE).
- **Animation:** Subtle scanning highlight pass (1.5s duration, 0.6s delay).
- **Design:** Grayscale, 0px radius, red/amber restricted to technical status.

## Pricing Teaser (PricingTeaser)
- **Status:** Completed.
- **Purpose:** Remove pricing anxiety and show clear path from prototype (Free) to scale (Team/Enterprise).
- **Visuals:** 
    - Top row: Pro / Team / Enterprise (3-column grid).
    - Bottom row: Free (full-width horizontal container).
    - Team panel uses a slightly stronger border (#3A3A3A) to draw focus.
- **Pricing:** 
    - Pro: $49/mo (Monthly) -> $36.75/mo (Effective Annual).
    - Team: $299/mo (Monthly) -> $224.25/mo (Effective Annual). 10 seats included.
    - Enterprise: Custom.
    - Free: $0/mo.
- **Math Logic:**
    - Pro Annual: 49 × 9 = 441, 441 / 12 = 36.75.
    - Team Annual: 299 × 9 = 2691, 2691 / 12 = 224.25.
    - Pro Extra Seat: 19 (Monthly) -> 14.25 (Annual).
    - Team Extra Seat: 29 (Monthly) -> 21.75 (Annual).
- **Design:** Strict monochrome, 0px radius, white/black high-contrast buttons.

## Final CTA (FinalCTA)
- **Status:** Completed.
- **Goal:** Direct action ("Run your first trace") after the user has been educated on pricing.
- **Implementation:** 
    - Moved from inline `page.tsx` section to dedicated `src/components/marketing/final-cta.tsx`.
    - Removed old generic copy ("Start observing your agents today").
    - Added compact terminal visual with appear-animations (under 900ms).
    - Uses Geist Mono for headline and code, Geist Sans for subtext.
    - Semantic green (`#34D399`) used for "trace ready" status in terminal.
- **Verification:**
    - Zero rounded corners.
    - Zero blue UI accents.
    - Primary CTA "Start free" (White/Black).
    - Secondary CTA "Read the docs" (Transparent/Border).

## Marketing Navbar (Navbar)
- **Status:** Completed.
- **Goal:** Replace static navbar with a high-fidelity dropdown navigation that exposes product depth.
- **Implementation:** 
    - Created `DropdownNavigation` with `framer-motion` (opacity + 4px y-shift).
    - Created `Navbar` with uncoil product structure (Trace Viewer, Cost Dashboard, etc.).
    - Used `lucide-react` icons (monochrome #999999).
    - Fixed backdrop blur and translucent background.
- **Verification:**
    - Zero rounded corners on dropdown panels or hover states.
    - Zero blue UI accents.
    - Hover opens dropdowns reliably.
    - Mobile: Navbar exists but center nav is hidden (following standard responsive pattern).

## Custom Auth Pages
- **Status:** Completed.
- **Goal:** Create a uncoil-specific auth experience using Clerk.
- **Implementation:** 
    - Created `AuthShell` for the 45/55 split-screen layout.
    - Created `AuthTerminalPanel` with a looping tracer simulation (red/green/amber highlights).
    - Configured `CLERK_APPEARANCE` to enforce 0px radius and monochrome colors.
    - Added routes for `sign-in` and `sign-up` using route groups `(auth)`.
- **Verification:**
    - Zero rounded corners on Clerk inputs, buttons, and cards.
    - Zero blue UI accents (verified `colorPrimary` is `#FFFFFF`).
    - "Home" back-link correctly positioned in top-left.
    - Social buttons (Google, GitHub, Apple) are Clerk-managed and monochrome.

## Landing Page Navigation Wiring
- **Status:** Completed.
- **Goal:** Fix all button/link destinations to route to real auth and app pages.
- **Files Checked:**
    - `src/app/page.tsx` (Footer links)
    - `src/components/marketing/navbar.tsx` (Sign in, Start free)
    - `src/components/marketing/hero.tsx` (Start free, Live demo)
    - `src/components/marketing/pricing-teaser.tsx` (Pro, Team, Free, Enterprise)
    - `src/components/marketing/final-cta.tsx` (Start free, Docs)
    - `src/components/marketing/debug-stream.tsx` (Added anchor ID)
- **Placeholders Replaced:**
    - `SignUpButton` -> `Link href="/sign-up"` or `Link href="/sign-in"`
    - `document.getElementById('debug-demo')?.scrollIntoView` -> `Link href="#workspace-terminal"`
    - `#` in navbar/footer -> real routes or intended paths.
- **Verification:**
    - All conversion CTAs lead to `/sign-up`.
    - Sign-in buttons lead to `/sign-in`.
    - Pricing plan params are correctly appended (`?plan=pro`, `?plan=team`).
    - No visual or styling changes were made during the wiring.

## Custom Auth Implementation (Clerk)
- **Status:** Integrated & Polished.
- **Components:**
    - `src/components/auth/auth-shell.tsx` (Split-screen layout).
    - `src/components/auth/auth-terminal-panel.tsx` (Trace sequence).
    - `src/components/auth/clerk-appearance.ts` (Monochrome, 0px radius, Geist Mono).
- **Social Providers:**
    - Clerk is configured to support Google, GitHub, and Apple.
    - **TODO:** Verify that Apple is enabled/configured in the Clerk Dashboard.
- **Branding Removal:**
    - **IMPORTANT:** Remove "Secured by Clerk" branding in Clerk Dashboard → Settings → Branding. This may require a paid Clerk plan.
- **Routes:**
    - `/sign-in` → `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
    - `/sign-up` → `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
