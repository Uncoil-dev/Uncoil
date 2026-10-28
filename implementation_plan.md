## 2026-10-15 — Authorized tracing roadmap

- Owner review/merge of draft PRs #162 (auth), #163 (CSV), #164 (sorting), #166 (steps), SDK #167 (independent), and saved views #168 after #166. Merge frontend stack in that order, using merge commits.
- Saved-view live verification requires an isolated Convex deployment; no production backend deployment from feature branches.
- SDK registry publication is a separate owner-controlled release after review.

# Langfuse parity-plus product epic — 2026-09-03

## Google Analytics 4 — 2026-09-15

- Implemented the consent-aware GA4 tag, environment contract, cookie-policy disclosure, and deterministic browser coverage.
- Created the live Uncoil GA4 property/web stream and configured the production Vercel measurement ID.
- Release gate: publish and merge the clean analytics branch, allow the GitHub/Vercel integration to deploy once, verify the deployment SHA, then confirm a production page view in GA4.

## Captured dashboard integration hardening — 2026-09-08

- [pending owner] Run provider-backed signed-in workflows with EU credentials; these cannot be verified from the public/local deterministic Sandbox.

## Captured Uncoil dashboard implementation — 2026-09-08

### Current implementation slice

- [pending] Wire the captured-depth Sandbox controls to the equivalent authenticated Build state and verify nested detail routes end to end.

Implementation contract:

1. Treat `C:\opencrawl\output\langfuse-capture` only as the supplied visual authority; the product, routes, fixtures, and visible labels remain Uncoil-branded.
2. Maintain two distinct adapters behind one visual system: a deterministic, populated, public read-only Sandbox and authenticated Build routes backed by existing Uncoil APIs.
3. Match the captured shell and 14 primary surfaces without a redesign; keep nested list/detail URLs, filters, selectors, prompt execution, and explicit Sandbox write boundaries functional.
4. Select region first at `/cloud`; show Sandbox and Build only after the browser reaches `/cloud/mode` on the selected regional host.
5. Keep the capture-style Home stable before and after first trace data arrives, rather than switching authenticated projects to a second dashboard design.
6. Prevent login loops by waiting for both Better Auth and Convex readiness and preserving validated return paths.
7. Gate release on TypeScript, lint, auth-state tests, browser route/interaction coverage, a production build, matching-viewport visual review, and a clean PR containing no unrelated generated or scratch changes.

Implemented locally. The only unverified runtime boundary is provider-backed signed-in mutation and ingestion behavior because this machine has no EU test-account credentials.

## Account access and onboarding flow — 2026-09-06

Implementation slice completed: centralized redirect validation, preserved Explore/Build intent through regional selection and Better Auth, added OAuth callback timeout/retry behavior, kept auth region changes local-safe, persisted project onboarding step/SDK/dismissal state in Convex, resumed setup from the dashboard, preserved recovery redirects, classified invitation failures, activated the accepted organization, and derived direct-host region display. Full Playwright journey coverage remains pending on a healthy auth-capable test host.

Verification update: production-style build and server smoke passed all public browser tests (3/3) on port 3100. Authenticated browser journeys remain pending provider-backed credentials.
Added deterministic account-access browser contract coverage; its production-style run passes 4/4 for Explore/Build entry, auth/recovery forms, missing invitations, and mobile keyboard/overflow behavior.
Cloud entry is now explicitly sequential: path selection at `/cloud`, region confirmation at `/cloud/region`, then the regional auth/playground destination.

## Cloud app auth and dashboard recovery — 2026-09-07

Implemented the approved cloud-app recovery slice: bounded Convex auth readiness and retry states, preserved dashboard return paths, safe unauthenticated playground behavior, persisted dashboard create/detail/widget actions, and working Tracing/account controls. The stable empty-project behavior remains read-only and does not synthesize user data.

Verification passed: production build, TypeScript, focused ESLint, local EU-backed 88-route dashboard sweep, CUA browser review, and the account-access Playwright contract (5/5 with one worker). Full provider-backed authenticated journeys remain a credential-dependent follow-up.

## Objective

Build an Uncoil-native version of the complete trace-to-release workflow signaled by the Langfuse August update, with a sharper focus on consequential agent failures: fast investigation, trustworthy evidence, repeatable evaluation, cost-aware decisions, and an operational path from finding to ship/rollback. “Everything they have, just better” means covering the capability surface, not copying the implementation or committing to one giant release.

## Product thesis

Langfuse’s release is one coherent system: capture observations → select comparable evidence → configure and preview an evaluator → run scores across text and rich media → compare versions → alert and visualize → operate through APIs/CLI/self-hosting. Uncoil should own the stronger outcome: explain why an agent failed, prove whether a fix works, and make the release decision auditable.

## Detailed capability backlog

### P0 — Failure-evidence and evaluation loop (first paid-review multiplier)

1. **Representative evidence sets** — curate traces, spans, attachments, and expected outcomes into named regression sets; support inclusion from Runs/Trace Viewer and immutable snapshot membership for a review or release.
2. **Evaluator workbench** — create LLM-as-a-Judge, deterministic/code, rubric, and threshold evaluators; preview against real observations before saving; expose the exact inputs, mapped variables, model, prompt, score definition, and failure explanation.
3. **Visual variable mapping** — map evaluator inputs by selecting fields from a real trace/span/attachment rather than hand-writing paths; show missing/null values before execution.
4. **Reusable evaluation rules** — separate “which observations are selected” from “how they are scored”; support filters, sampling, environment/release/status constraints, and a visible matched-volume preview.
5. **Cost and latency preview** — estimate evaluation token cost, model cost, expected run time, and sample count before online execution; block or warn when a configured budget is exceeded.
6. **Comparable runs** — pin evaluator version, rule version, sample membership, model, and prompt; guarantee that side-by-side evaluators can run over the same evidence set and expose comparability metadata.
7. **Trace-linked results** — every score must link back to the source trace/span and preserve evaluator version, input snapshot, explanation, timestamp, and execution status.
8. **Failure review report export** — generate an annotated trace, evidence summary, mechanism hypothesis, tested-fix result, regression table, and ship/fix/rollback recommendation for the paid review workflow.
9. **Release gate** — define pass/fail thresholds and required regression cases; compare baseline versus candidate release and produce a deterministic decision with override reason and actor.

### P1 — Multimodal and rich-agent evidence

10. **Attachment-aware traces** — model images, audio, video, PDFs, and files as inspectable evidence with safe previews, metadata, size/type limits, retention behavior, and redaction boundaries.
11. **Multimodal evaluators** — allow evaluators to score rich attachments alongside text; support multiple prompt messages for criteria, evaluated content, and example output.
12. **Agent-specific templates** — ship templates for coding agents, browser agents, voice agents, RAG groundedness, tool correctness, policy adherence, exact match, and customer-defined failure taxonomies.
13. **Evidence quality controls** — detect missing attachments, unsupported formats, truncated payloads, inaccessible URLs, and non-comparable samples before an evaluation run starts.

### P1 — Investigation and scale

14. **Full-text and structured trace search** — search trace/span input, output, errors, tools, models, sessions, environments, releases, and evaluator results with composable filters.
15. **Large-run timeline** — provide a zoomable, pan-able timeline for hundreds or thousands of observations; color and group by observation type; preserve keyboard and mobile alternatives.
16. **Trace comparison** — compare two runs, two releases, or baseline/candidate evidence sets with synchronized spans, latency, cost, errors, and score deltas.
17. **Saved investigation views** — save/share filter, sort, time window, and comparison context with project-scoped permissions and URL deep links.
18. **Performance budgets** — define measurable targets for run-list load, trace load, search, timeline rendering, and evaluation result queries; instrument p50/p95/p99 rather than claim generic speed improvements.

### P1 — Alerts and operational feedback

19. **Score and cost alerts** — alert on score regression, failure-rate change, cost ceiling, latency tail, evaluator execution failure, and missing evidence; support active/resolved/muted lifecycle.
20. **Dashboard widgets** — turn score trends, cost, failure classes, evaluator coverage, and release gates into configurable project widgets.
21. **Annotation queues** — route uncertain or high-impact failures to reviewers from the trace/results surface; record ownership, decision, labels, and resolution.
22. **Evaluator version recovery** — restore any prior evaluator configuration as a draft, compare versions, and require an explicit publish action.

### P2 — Developer platform and ecosystem

23. **Stable public API v2** — expose ID-based endpoints for evaluators, rules, evidence sets, runs, scores, alerts, annotations, and release decisions with pagination and machine-readable errors.
24. **Production CLI** — provide typed flags, fast startup, pagination, JSON/NDJSON output, deterministic exit codes, project/environment selection, and API-version detection; keep runtime dependencies minimal.
25. **Prompt and configuration portability** — import/export prompts, evaluators, rules, templates, and release gates as versioned JSON with validation and secret redaction.
26. **SDK parity** — add typed TypeScript and Python helpers for tracing rich evidence, starting evaluations, retrieving scores, and checking release gates; publish compatibility and clean-install smoke tests.
27. **Integration breadth** — prioritize integrations by customer demand and failure-review relevance, beginning with model providers, agent frameworks, browser/voice tooling, RAG/retrieval, and MCP/tool servers.
28. **OpenTelemetry compatibility** — accept and normalize OTel-compatible spans without weakening Uncoil’s agent-specific evidence model.

### P2 — Trust, governance, and deployment depth

29. **Accurate model/token/cost accounting** — version pricing tables, account for model parameters and provider modes, show source and uncertainty, and allow audited corrections.
30. **Team governance** — roles, evaluator/rule permissions, approval/publish controls, audit log, ownership, and organization-level feature flags.
31. **Retention/export controls** — configure evidence retention, deletion, export, and redaction with explicit regional-processing behavior.
32. **Self-hosting and air-gapped operation** — document deployment, API reference, migrations, health checks, exports, and offline/air-gapped constraints without overstating residency.
33. **Release operating system** — canonical application versioning, changeset/conventional-commit policy, CI release gates, signed/immutable artifacts, synchronized SDK releases, changelog generation, rollback ownership, and production smoke verification.

## Sequencing and dependency graph

```text
#1 Evidence sets ─┬─> #2 Evaluator workbench ─> #4 Rules ─> #6 Comparable runs
                 └─> #10 Rich evidence ───────> #11 Multimodal evaluators
#6 Comparable runs ─> #7 Trace-linked results ─> #8 Review report ─> #9 Release gate
#14 Search ─────────> #16 Trace comparison ────> #19 Alerts/widgets
#23 API v2 ──────────> #24 CLI ────────────────> #26 SDK parity
#29 Cost correctness ─────────────────────────> #5 Cost preview / #19 Cost alerts
#30 Governance + #31 Retention + #32 Deployment ─> #33 Release operating system
```

Phase 1 should make the first paid review repeatable. Phase 2 should make the evidence system compelling for multimodal and high-volume agents. Phase 3 should make it adoptable as a developer platform and trustworthy in larger organizations. Do not begin with broad integrations or enterprise controls before the core evidence/evaluation loop produces a useful release decision.

## Epic acceptance criteria

1. A user can create a named evidence set from real Uncoil runs, freeze its membership, and see the source trace/span for every case.
2. A user can configure an evaluator against a real observation, preview missing mappings, matched volume, estimated cost, and sample count, then run it without writing a path expression by hand.
3. Two evaluator configurations can score the same frozen evidence set, and the result records enough version metadata to reproduce and compare the run.
4. A result opens the source trace and explains the score, evaluator inputs, execution status, and any missing or unsupported evidence.
5. A baseline/candidate comparison produces a deterministic release recommendation from configured thresholds and lists the failing cases.
6. Text and at least one rich evidence type are supported through the same evidence/evaluator model, with explicit size, type, retention, and failure behavior.
7. Public API and CLI workflows can create/list/run evaluators and retrieve machine-readable results with pagination and stable errors.
8. Performance, cost, and reliability claims are backed by instrumented benchmarks and production-safe verification; no “10x” or residency claim is made without evidence.

## Planning rule

Each numbered capability becomes its own 1–3 day implementation issue or a small epic with explicit dependencies. Before implementation, use `/spec` on the selected slice after an `/office-hours` prioritization pass. Every spec must tie the work to a customer outcome, identify current Uncoil files and interfaces, and define pass/fail acceptance criteria. Completed items must be removed from active task files under the repository task-file hygiene rule in `AGENTS.md`.

# First-customer execution — 2026-09-02

6. [pending owner] Create and test the live one-time $1,000 Stripe Payment Link in the intended account; store the URL privately.
7. [pending owner] Qualify the remaining account gap, personally send 10 initial messages per weekday plus follow-ups, run discovery, send same-day offers, collect payment before evidence, and deliver one review using the operating kit.

# AI evaluation metrics editorial rebuild — 2026-08-26

- [pending] Publish through the PR workflow after repository review permissions are available.

# Sitewide link audit — 2026-08-12

3. [pending] Complete a clean production-build verification once the existing build finishes.

# uncoil Strategic Implementation Plan

## Better Auth Migration (2026-08-10)

- Better Auth now owns sessions, credentials, OAuth, and organizations through a Convex component, with Next.js proxying `/api/auth/*` and hydrating authenticated Convex clients with the Better Auth JWT.
- Clerk UI/runtime packages and middleware were removed. Custom Uncoil forms now provide email/password and Google sign-in, while dashboard controls use Better Auth session and organization APIs.
- Authorization keeps project-owner and active-organization semantics. JWT payloads include the active organization and membership role so Convex admin checks continue to distinguish owners/admins from members.
- Security defaults include database-backed rate limiting, CSRF/origin checks, encrypted OAuth tokens, explicit trusted origins, and disabled organization deletion.
- Better Auth Infrastructure is integrated through `dash()`; development and production Convex environments have the Infra key. The canonical production origin is `https://www.uncoil.dev` because the bare domain redirects.
- Development Convex synchronization and production build pass. Production deployment remains a deliberate follow-up because unrelated local changes share the worktree.

## Homepage Reference Refinement (2026-08-07)
- Added a compact lifecycle rail to the landing page, linking each stage to the relevant product workflow.
- Kept the Better Auth/Langfuse editorial structure, Linear-style product evidence, and monochrome Uncoil system intact.
- Added distinct section compositions rather than repeating a two-column text/visual template: workflow canvas, centered white connection statement, integration matrix, README quickstart, and FAQ.
- Upgraded public product feature pages with feature-specific evidence panels and action-oriented next steps.
- Verification: focused ESLint, standalone TypeScript, `git diff --check`, and production build pass.

## Marketing Visual Redesign (2026-08-07)

- Reframed the homepage as a command-center incident journey: a production timeout, trace inspection, root-cause recommendation, evaluation, and improved release form one coherent story.
- Replaced the broad client-page implementation with a server-rendered route and isolated interactive workflow, product-signal, code-runtime, and trace-inspector components.
- Added product-specific Open Graph/X metadata and a generated incident-style Open Graph image route.
- Corrected legacy final-CTA installation examples to `uncoil`, linked footer status to the public status surface, and added accessible tabs, pressed states, focus rings, copy feedback, and reduced-motion-compatible interaction.
- Verification: `npx.cmd tsc --noEmit`, focused marketing ESLint, `git diff --check`, and the full production build pass; Next generates all 58 routes, including `/opengraph-image`.

- Reworked the public homepage into a smaller editorial, monochrome composition inspired by Better Auth and Langfuse.
- Kept Geist Pixel, Geist Mono, Geist Sans, zero-radius controls, and existing marketing routes/CTAs.
- Centered the first viewport on the live trace preview, then added integrations, trace-to-fix feature rows, a README-style quickstart, and a focused final CTA.
- Added a restrained grid treatment and preserved purposeful motion/reduced-motion behavior.
- Verification: TypeScript, homepage/platform lint, diff check, and the full production build pass; the build generates all 57 routes.
- Follow-up: tightened the hero to a single viewport composition so the primary CTAs remain visible without scrolling.
- Added lightweight interaction to the hero trace preview: selectable span rows, selected-span context, and a live/inspection toggle.
- Rebuilt the marketing homepage into distinct interactive moments on a pure-black canvas: workflow map, before/after failure lab, five-state product showcase, runtime selector/code lab, ecosystem rail, and line/grid CTA motif.
- Verification: focused ESLint, TypeScript, diff check, and full production build pass across 57 routes.

## Dashboard Excellence Foundation (2026-08-07)

- Added project-scoped saved Runs views. Users can name the current filter/sort/page-size state, restore it into controls and URL state, or delete it; storage is bounded to the most recent 12 views.
- Added keyboard navigation to the Runs table: Arrow Up/Down, Home/End, and Enter-to-open trace work from focused rows.
- Added URL-persisted Runs time windows (24h, 7d, 30d, 90d) backed by a Convex `startedAt` lower-bound filter; saved views now restore the time window too.
- Added dashboard-level `loading.tsx` and `error.tsx` boundaries with layout-matched skeletons, retry recovery, and a project-selector escape hatch.
- Extended the command menu with active-project run and session lookup actions when a query is entered, preserving deep-linkable context.
- Added a dashboard-specific not-found boundary with a clear explanation and project-selector recovery path.
- Added confirmation before muting an alert; resolve/reopen remain reversible through the alert center.
- Expanded Overview health summary with sample-labeled failure rate and p95 latency metrics, each linking directly to the relevant Runs investigation view.
- Live beta smoke now passes 5/5 available checks; 2 credential-dependent ingestion checks are skipped without smoke credentials. Also restored legacy `uncoil_sk_live_` API-key prefix acceptance so malformed legacy-key payloads reach the documented 422 validation path.
- Final `npm run build` passes after the latest changes and generates 58 routes. In-app browser visual inspection was attempted against the local dashboard but timed out before a reliable authenticated render; manual authenticated visual QA remains pending.
- Fresh browser inspection now confirms the public entry page renders its trace-first hierarchy and interactive controls; `/dashboard` consistently redirects to Clerk sign-in without an authenticated session, so authenticated dashboard visual QA remains the only browser-gated check.
- Hardened trace payload copying with failure recovery, live-region feedback, accessible labels, and visible keyboard focus on copy actions.
- Made the selected trace span deep-linkable via the `span` query parameter; clicking a span, using the replay slider, and focusing the first error synchronize the evidence panel and URL.
- Expanded Alerts into a lifecycle-aware center with backward-compatible active defaults, URL-persisted active/resolved/muted tabs, resolve/mute/reopen actions, and accessible action labels.
- Added a global `prefers-reduced-motion` override covering dashboard animations, transitions, and smooth scrolling.
- Standardized Trace Search around the shared empty state, distinguishing first-use from no-match results, and added an inline retry action for analytics outages.
- Full production verification completed: `npm run lint:platform`, `npx.cmd tsc --noEmit`, and `npm run build` all pass; Next generated all 57 routes.
- Audited and cleaned the dashboard lint surface; `npx.cmd eslint src/components/dashboard src/app/dashboard` now passes cleanly. Remaining full-lint errors are outside the dashboard scope (blog, marketing, shared hooks, and unrelated APIs).
- Verification: focused Runs ESLint, TypeScript, and `git diff --check` pass.

- Added reusable dashboard signal, metric, and attention primitives in `src/components/dashboard/dashboard-primitives.tsx`.
- Refreshed Overview with clickable health metrics, failure-aware attention queue, and next-best-action links.
- Added dashboard grid, semantic signal, and tabular-number CSS tokens; enabled dark color-scheme behavior.
- Updated shell group language from Control/Configure toward Operate/Manage while retaining existing routes.
- Verification: TypeScript, focused dashboard ESLint, and `npm run lint:platform` pass.
- Reorganized the dashboard sidebar into intent-based Observe, Analyze, Improve, Operate, Manage, and Resources groups.
- Added operational, API key, and billing destinations to the Manage/Operate areas.
- Made Runs `status` and `q` state URL-addressable so Overview links preserve user context.
- Verification: focused dashboard ESLint and TypeScript pass.
- Added error-first Trace Viewer navigation: the first error span can be focused, highlighted, and scrolled into view.
- Added stable span anchors and keyboard-visible focus styling to support direct debugging navigation.
- Verification: Trace Viewer ESLint and TypeScript pass.
- Added the first global command-menu shell slice with keyboard shortcut support, destination filtering, and project-aware navigation.
- Reused the existing dialog system; no new package dependency.
- Verification: command menu/topbar TypeScript and focused ESLint pass with only existing warnings.
- Made Trace Search query, status, and day-window state URL-addressable and added reusable search presets.
- Improved result hierarchy with stronger error/healthy status signals and focus treatment.
- Verification: Trace Search and Sessions ESLint plus TypeScript pass.
- Made Costs period selection URL-addressable and added explicit measured-spend/source context.
- Added a direct Costs → Runs workflow link and removed an unused chart import found during focused lint.
- Verification: Costs ESLint and TypeScript pass.
- Added explicit supported workspace context to the topbar using Clerk organization state and the authorized project query.
- Replaced the static running badge with organization/project context while preserving existing auth and project boundaries.
- Verification: topbar ESLint and TypeScript pass with existing warnings only.
- Restored the project-level Alerts center with all/unread filters and the existing Convex read-state mutations.
- Kept the topbar popup as the quick-access notification surface while making the full route operational.
- Verification: Alerts page/list ESLint and TypeScript pass.
- Exposed existing environment and release search filters in the Trace Search UI and preserved them in submitted query state.
- Verification: focused Trace Search ESLint and standalone TypeScript pass.
- Improved Runs row hierarchy with primary model and session context from the existing Convex run summary shape; context hides responsively on narrow screens.
- Verification: Runs ESLint and TypeScript pass.
- Ran focused lint across the full dashboard redesign surface; it is clean, and `npm run lint:platform` passes.
- Removed topbar lint warnings by exposing title/description to assistive technology and using dimensioned `next/image` avatars.
- Standalone TypeScript passes; full production build remains timeout-limited on Windows without emitted source errors.
- Added explicit Clerk organization switching to the topbar using the installed `OrganizationSwitcher`, preserving personal workspace support and existing auth boundaries.
- Verification: topbar ESLint and TypeScript pass.
- Made Runs pagination deep-linkable with URL-backed page and row-limit state, preserving status/search context when navigating.
- Verification: Runs ESLint is clean; TypeScript passed in the pagination verification run.
- Made Sessions responsive: desktop keeps the dense grid while mobile uses labeled metric rows with preserved session context and deep links.
- Added stronger focus/hover affordances and tabular-number treatment.
- Verification: Trace Search and Sessions ESLint plus TypeScript pass.
- Added persistent Trace Viewer context strips for trace name, environment, release, and session metadata.
- Added a sticky selected-span evidence panel tied to the active replay span, including output preview and error details.
- Verification: Trace Viewer ESLint and TypeScript pass.

## AI Engineering Platform Pass (2026-08-05)

- Added score analytics in the Evaluation workspace: per-evaluator sample counts, numeric averages, boolean pass rates, and source breakdowns.
- Extended the prompt playground to compare two provider models in parallel with per-model output and latency.
- Replaced evaluation sub-route placeholder copy with working dataset, run-history, monitor, and settings workflows.
- Made dataset versions backward-compatible for legacy Convex documents (missing versions default to v1 on update).
- Verification: production `npm run build`, TypeScript, focused platform lint, and Convex code generation pass. Authenticated browser E2E remains pending until a signed-in test session is available.
- Added independent annotation review records with self-claim, reviewer submission, reviewer rotation support, and agreement reporting in the review queue.
- Added an API-key-authenticated prompt resolver for labeled development/staging/production versions, plus public runtime documentation and smoke coverage.
- Added `getPrompt` / `get_prompt` helpers to the TypeScript and Python SDKs, including prompt-version trace linking examples.
- Added project/restricted dataset access modes, owner-controlled sharing, and permission checks across dataset and experiment reads/writes.
- Added experiment score deltas against the prior run, with a regression/improvement report in the experiment workspace.
- Fixed API-key SDK score ingestion so declared numeric, boolean, categorical, and text data types are persisted and validated correctly.
- Added SDK-side prompt caching with stale-cache and explicit fallback recovery for runtime availability.
- Extended platform smoke coverage to the offline evaluation-run API and verified the full Next production build again (56 routes).
- Made the TypeScript and Python SDK suites runnable from the repository root; both pass (24 TS, 18 Python).
- Corrected pricing copy that still described shipped prompt/evaluation/experiment/runtime workflows as roadmap items.
- Added the OTLP health endpoint to platform smoke coverage and verified the OTLP route plus TypeScript compilation.
- Hardened API-key usage bookkeeping so the public mutation requires the matching hashed key and active project, protecting both native and OTLP ingestion.
- Added a first-class Datasets dashboard route and sidebar navigation entry, backed by the existing dataset workflow, plus smoke coverage.
- Added a one-click “Share trace” action that copies the authenticated deep link from the trace viewer, and cleared the viewer lint gate.
- Added Integrations as a direct dashboard Resources link and kept it covered by the public-route smoke suite.
- Platform-focused lint passes; the repository-wide lint command still reports unrelated legacy errors in blog/marketing files and is intentionally not being widened into this platform pass.
- Closed the production-label bypass: prompt mutations and the editor can promote only to development/staging; production is assigned exclusively by a passed evaluation release gate.
- Expanded the integrations guide with a copy-paste OTLP exporter setup and explicit OpenAI, LangChain, and LlamaIndex instrumentation guidance.
- Expanded `lint:platform` to cover OTLP ingestion, Datasets, sidebar navigation, trace sharing, and all current platform workflow files; the gate passes with TypeScript compilation.
- Made the interactive demo’s production-promotion control functional: clicking it updates the demo state and explains the evaluation-gated release behavior.
- Ran the live platform smoke suite against the existing local server, fixed `/api/evaluation/run` invalid-ID handling (500 → 404), and confirmed every smoke route passes.
- Final `npm run build` passes after all changes: Next.js compiled, TypeScript passed, and all 56 static/dynamic routes generated successfully.
- Added an unauthenticated OTLP POST contract assertion to smoke coverage; the live suite still passes.
- Added the same unauthenticated-boundary assertion for native `/api/ingest`; smoke and focused lint remain green.
- Added dedicated `/docs/lifecycle` and `/product/lifecycle` overview pages explaining the complete Trace → Deploy loop, with both routes in smoke coverage.
- Expanded the interactive demo with a dedicated Datasets tab showing versioned examples, expected outputs, metadata, and project-sharing state.

This plan merges the **Comprehensive Build Plan** and the **What To Do Now** strategic assessment. It prioritises the transition from a verified ingestion pipeline to a functional, high-fidelity developer product.

## Evaluation Engine Integration (2026-08-05)

- Added the durable evaluation domain model in `convex/schema.ts`: evaluator versions, suites, jobs, results, monitors, and feedback.
- Added `convex/evaluationEngine.ts` for authenticated overview, trace-quality reads, evaluator/suite/job/monitor creation, and deduplicated feedback capture.
- Replaced the Evaluation Lab landing surface with a unified Evaluation Engine workspace and added datasets, runs, monitors, and settings routes while preserving existing evaluator/review URLs.
- Added trace-viewer quality evidence and expanded deterministic evaluator rules for exact match, regex, JSON validity, and basic JSON Schema validation.
- Added `/product/evaluation-engine` and marketing navigation copy.
- Remaining integration work at the time was Inngest online execution, provider-backed detectors, reviewer workflows, score aggregation, and release gates.
- Follow-up completion: Online execution, offline jobs, guardrail templates, automatic review queueing, reviewer rotation/agreement, API-key feedback/score helpers, Tinybird score aggregation, recovery alerts, release gates, prompt promotion, and quickstart/SDK documentation are wired.

## Strategic Decision: SaaS Infrastructure
As established in the "What To Do Now" document, uncoil is officially a **Developer Infrastructure SaaS**, not a web agency. All efforts are focused on agent observability.

## Positioning Update
uncoil is now positioned publicly as **agent observability for builders and operators of production AI workflows**. The audience includes developers, AI startups, AI agencies, internal AI teams, and AI operations owners under one niche. Marketing and pricing must avoid claiming replay, evals, runtime orchestration, self-hosting, email alerts, or PDF export until those surfaces are implemented.

## Phase 1: Core Trace Viewer & Infrastructure (Weeks 1-4)

### 3. Core Product: Trace Viewer [IN PROGRESS]
The single most important UI in the product.

### 4b. Reporting And Proof [IN PROGRESS]
- [ ] **Report QA:** Verify report page with no data, normal runs, failed runs, and unavailable analytics fallback.
- [ ] **Export Decision:** Keep browser print as the first delivery path; defer PDF export until beta users ask for it.

### 4c. Marketing And Pricing Honesty [IN PROGRESS]
- [ ] **Screenshots:** Replace abstract marketing visuals with real dashboard/report screenshots.

### 4d. Beta Smoke Tests [IN PROGRESS]
- [ ] **Full Smoke Run:** Execute with `UNCOIL_SMOKE_API_KEY` and `UNCOIL_SMOKE_PROJECT_ID` against local and production-like environments.
- [ ] **Alert Smoke:** Add a deterministic threshold alert verification once test project configuration can be safely controlled by script.

### 5. Alerting & Notifications [TODO]
- [ ] **Email Alerts:** Deferred until an email provider is configured.

### 7. Settings, Teams, and RBAC [IN PROGRESS]
- [ ] **Organization Switching:** Add explicit Clerk organization switching in the dashboard topbar/sidebar.
- [ ] **Viewer UI Guards:** Hide or disable settings/API-key/destructive controls for viewer roles once role claims are confirmed in the active JWT template.

### 6. Production SDKs [POLISHING]
- [ ] **Python SDK:** Wrap `@trace_agent` decorator logic and publish to PyPI. Package metadata now builds as distribution `uncoil`, docs use `pip install uncoil-sdk`, the `uncoil` import package re-exports the legacy SDK, and local import smoke test passes; upload is pending a PyPI API token.
- [ ] **TS SDK:** Formalise `uncoil` and publish to npm. Build packaging is fixed, app/docs install snippets now use `npm install uncoil-sdk`, and publish is blocked only on npm 2FA/token requirements.

---

## Phase 2: Advanced Features (Post-MVP)

### 1. Run Replay
- [ ] **Replay UI:** Interactive "Play/Step" controls for agent traces.
- [ ] **Payload Storage:** S3 integration for large (>10KB) span payloads.

### 2. Orchestrator Layer
- [ ] **Agent SDK Extension:** Native Agent class with built-in cost ceilings and retries.
- [ ] **Tool Registry:** Versioned tool management and authentication.

---

## Phase 3: Enterprise & Evaluation

### 1. Eval Engine
- [ ] **Eval Framework:** Automated assertions (cost, latency, content) for agent runs.
- [ ] **CI Integration:** CLI tools to run evals in GitHub Actions.

### 2. Enterprise Controls
- [ ] **SSO:** Clerk Enterprise integration.
- [ ] **RBAC:** Fine-grained permissions (Admin, Dev, Viewer).

---

## Verification Plan

### Automated Tests
- `npm run test`: Unit tests for ingestion logic.
- `npx inngest-cli dev`: Local verification of background jobs.
- `curl` pipeline tests: Continuous validation of the API gateway.

### Manual Verification
- **Onboarding E2E:** Verify a new user can sign up, create a project, instrument an agent, and see the first trace.
- **UI Audit:** Ensure 0px radius and monochrome high-contrast styling remains consistent.

### Competitive Product Surface [DONE]
- [ ] Continue the planned program with canonical telemetry/session data, search, redaction, datasets/evaluations, prompt management, and enterprise deployment in separately verifiable milestones.

### Observe Foundation: Sessions and Search [DONE]
- [ ] Next: ingestion-time redaction and object-storage references for large/multimodal payloads.

## Evaluation Engine Integration (2026-08-06)
- [ ] Production validation remains: configure the internal secret and deploy the Tinybird datasource in the active workspace.
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
- Added the existing project evaluation pass rate to the Overview health summary.
- The metric is clickable, sample-labeled, and shows an explicit no-data state until evaluations exist.
- Verification: focused Overview ESLint, standalone TypeScript, and `git diff --check` pass.
## Overview Scope-Preserving Links (2026-08-07)
- Overview run metrics, attention items, and failure actions now carry the selected `days` window into Runs.
- Verification: focused Overview ESLint, standalone TypeScript, and `git diff --check` pass.
## Overview Alert Action (2026-08-07)
- Overview now includes a direct Configure alert coverage action alongside failure, spend, and quality actions.
- All next-best-action links have visible keyboard focus treatment.
- Verification: focused Overview ESLint, standalone TypeScript, and `git diff --check` pass.
- The configuration action points to project settings; alert center remains the review destination.
## Shared Dashboard Contracts (2026-08-07)
- Added a shared dashboard contract module for metric/attention shapes, time ranges, run filters, saved views, alert status, and query state.
- Runs and primitives now consume shared contracts instead of duplicating route-local types.
- Verification: focused ESLint, standalone TypeScript, and `git diff --check` pass.
## Trace Action Focus States (2026-08-07)
- Added consistent focus-visible treatment to Trace Viewer share, refresh, and first-error actions.
- Existing annotation/comment, deep-link, error-first, and cancel workflows remain intact.
- Verification: focused Trace Viewer ESLint, standalone TypeScript, and `git diff --check` pass.
## Trace Annotation Action (2026-08-07)
- Named and focused the icon-only annotation submit control in the Trace Viewer.
- Verification: focused Trace Viewer ESLint, standalone TypeScript, and `git diff --check` pass.
## Critical Route Validation (2026-08-07)
- `npm run build` passes; Next generated 58 routes including the dashboard surfaces.
- `npm run smoke:beta` passes 5 checks with 2 credential-dependent skips and no failures.
- Dashboard-focused ESLint, TypeScript, and `git diff --check` pass.
- Authenticated visual QA remains an explicit follow-up because local dashboard access redirects to Clerk sign-in.
## Accessibility Sweep (2026-08-07)
- Named member actions, analytics refresh state, and documentation navigation focus behavior.
- Verification: focused ESLint, standalone TypeScript, and `git diff --check` pass.
## Explicit Environment Context (2026-08-07)
- Added environment scope to the organization/project context strip in the topbar.
- The context reads the active URL filter and defaults to “all environments” without inventing configuration.
- Verification: focused topbar ESLint, standalone TypeScript, and `git diff --check` pass.
## Route-Aware Time Context (2026-08-07)
- Fixed topbar scope reporting so Runs/Search no longer display Overview’s 7-day default when their default window is 30 days.
- Verification: focused topbar ESLint, standalone TypeScript, and `git diff --check` pass.
## Topbar Time Context (2026-08-07)
- Topbar context now displays environment scope and the active 1d/7d/30d/90d dashboard range.
- Invalid or absent range values use the same 7-day default as Overview.
- Verification: focused topbar ESLint, standalone TypeScript, and `git diff --check` pass.
## Final Dashboard Build Recheck (2026-08-07)
- `npm run build` passes after the latest dashboard/topbar changes and generates all 58 routes.
## Overview Range Semantics (2026-08-07)
- Overview range controls now expose selected state to assistive technology and have consistent keyboard focus treatment.
- Verification: focused Overview ESLint, standalone TypeScript, and `git diff --check` pass.
## Overview Quality Trend (2026-08-07)
- Added a daily quality pass-rate chart from the existing recent evaluation results contract.
- Empty days render as zero while the surrounding label makes the limited sample explicit; no synthetic quality score is created.
- Verification: focused Overview ESLint, standalone TypeScript, and `git diff --check` pass.
## Shell Icon Accessibility (2026-08-07)
- Named the account and alert icon-only controls for screen readers and added visible focus rings.
- Verification: focused topbar ESLint, standalone TypeScript, and `git diff --check` pass.
## Alert Recommended Actions (2026-08-07)
- Alert cards now explain the next useful action for cost and failure alerts.
- Recommendations are deliberately honest: thresholds and trends remain absent until the backend exposes them.
- Verification: focused Alerts ESLint, standalone TypeScript, and `git diff --check` pass.
## Alert Resolve Safeguard (2026-08-07)
- Resolving an alert now requires confirmation and communicates the reversible reopen path.
- Verification: focused Alerts ESLint, standalone TypeScript, and `git diff --check` pass.
## Alert Filter Semantics (2026-08-07)
- Alert lifecycle filters now expose selected state to assistive technology and keyboard users.
- Verification: focused Alerts ESLint, standalone TypeScript, and `git diff --check` pass.
## Overview Run Failure Trend (2026-08-07)
- Added a combined run-volume and failure-rate chart to the Overview cockpit.
- The chart is derived from loaded run summaries and explicitly labels its sample/window to avoid overstating coverage.
- Verification: focused Overview ESLint, standalone TypeScript, and `git diff --check` pass.
## Overview URL Time Range (2026-08-07)
- Overview health windows now use the deep-linkable `range` query parameter for 1d, 7d, 30d, and 90d.
- Range changes preserve other query state and update without scrolling the page.
- Verification: focused Overview ESLint, standalone TypeScript, and `git diff --check` pass.
## Project Skill: Hog Release Notes (2026-08-08)
- Initialized and implemented `.agents/skills/hog-release-notes` with a focused workflow for researching, drafting, and formatting PostHog release notes.
- No bundled resources are needed because the workflow relies on repository history and the existing changelog.
## PostHog Environment Configuration (2026-08-08)
- Added the supplied PostHog browser project token and EU host to `.env.local` and `.env.prod`.
## Marketing Surface Refresh (2026-08-08)
1. Establish page-level content architecture and conversion paths for home, blog, FAQ, docs, pricing, contact, and signup.
2. [Complete 2026-08-09] Redesign the homepage with original Uncoil product visuals, lifecycle proof, integration confidence, customer-ready trust signals, and conversion CTAs.
   - Follow-up: compacted the desktop/tablet composition to a single viewport per primary section and top-aligned the hero health panel.
   - Added a removable three-section exploration set at the bottom for user selection: execution report, developer-first implementation brief, and platform lifecycle matrix.
   - Follow-up round 02: appended ten more removable concepts (04–13), each with a distinct composition and original Uncoil content, while leaving all earlier sections intact.
   - Hero gallery follow-up: appended five removable hero directions (A–E) after all existing concepts, with the production hero left untouched.
   - Definitive follow-up: appended Hero F as a single best-of gallery direction with run health, evidence, diagnosis, evaluation, and release proof visible together.
   - Footer follow-up: appended four removable footer/newsletter directions with distinct editorial, newsroom, control-room, and brand-monument layouts while preserving the production footer.
   - Full-bleed footer follow-up: added Footer 05 with a responsive edge-to-edge `uncoil` wordmark as the final visual anchor.
   - Refined Footer 05 so the wordmark has no horizontal inset and deliberately spans the full viewport from left to right.
   - CTA follow-up: appended five removable conversion directions covering editorial, proof-led, developer, lifecycle, and live-signal structures while preserving existing CTAs.
   - Global polish follow-up: standardized selected text to a faint translucent yellow marker across all routes; moved the rule outside cascade layers so local selection utilities cannot win.
   - Pricing follow-up: appended five removable pricing directions using the existing Free, $19 Pro, $39 Team, and Enterprise plan facts without changing `/pricing`.
   - Pricing clarity refinement: upgraded every direction to surface monthly price, usage allowance, and concrete plan benefits before the conversion action.
   - Pricing billing refinement: added a shared monthly/annual state with exact 20%-off monthly equivalents and a clearly readable normal-font `/mo` suffix in every plan presentation.
   - Extended-surface exploration: appended thirty removable directions (three each for proof, integrations, trust, FAQ, docs, use cases, comparisons, resources, workflow, and contact) after the pricing gallery.
   - Creative gallery rebuild: replaced the uniform left-copy/right-visual pattern with theme-specific layouts, original generated art, placeholder logo treatments, restrained signal colors, and reduced-motion-safe interactive animation.
   - Future-surface exploration: appended 24 further directions spanning product sandbox, calculators, architecture, migration, onboarding, reliability, deployment, personas, evaluation, cost, release gates, trace anatomy, brand/company/community, templates, newsletter, announcements, navigation, hero, pricing, page curation, mobile, and footer.
   - Private-library follow-up: moved every exploration off `/` and into canonical `/admin/library`, with 94 live sections across 16 categories, searchable/filterable cards, direct local anchor links, and five recommended site structures.
   - Lead-generation follow-up: added six concepts covering readiness scoring, trace clinics, benchmark research, cost diagnostics, migration planning, and an operator email course.
   - Access follow-up: every host now requires Clerk authentication plus an approved admin user or an approved organization with `org:admin`; access fails closed when unconfigured, the route is absent from marketing navigation, and it remains excluded from indexing.
   - Owner-access follow-up: added a server-side Clerk email allowlist so `kristoffer.bon@gmail.com` is approved locally and in the project production environment configuration.
   - Alternative-homepage follow-up: added public `/alternative` as one deliberate conversion-first composition using the strongest hero, product, lead-generation, pricing, CTA, nav, and footer patterns; made acid yellow the system-level accent and linked it from the admin library.
   - Composer follow-up: added private `/admin/composer` with seven show/hide controls that generate a shareable section-filtered `/alternative?sections=...` URL; library category links use URL filters for focused Hero, CTA, and other category views.
   - Future 19 system follow-up: translated the new navigation's light-grid, black-panel, yellow-accent visual language into 15 distinct live sections and indexed them under a dedicated library category; the library now contains 114 sections across 17 categories.
   - Future 19 preview follow-up: replaced the mixed `/alternative` composition with a complete preview using only the Future 19 navigation system and its 15 coordinated homepage sections.
   - Homepage promotion follow-up: replaced the public `/` page body with the approved Future 19 composition, while retaining `/alternative` as a comparison preview.
   - Sitewide chrome follow-up: centralized the Future 19 navbar and footer in a route-aware root shell, removed page-local duplicates, and excluded `/dashboard` and its child routes.
3. Turn the existing Sanity-backed blog into an editorial hub with featured stories, categories, article templates, RSS, and a working subscription path.
4. Replace the three-card FAQ with an accessible accordion and a dedicated route or full FAQ index if content volume warrants it.
5. Validate responsive behavior, keyboard accessibility, metadata/schema, and builds; measure the funnel with privacy-appropriate events.

# Stripe subscription billing — 2026-08-11

7. [pending] Roll the exposed live secret, add a replacement restricted key directly to Vercel, and run a live-mode checkout smoke test.

# Payload Neon initialization — 2026-08-12

6. [pending] Let the owner create the first administrator credentials at `/cms`.
7. [pending] Review, commit, and deploy the integrated worktree safely.

# Unified production release — 2026-08-12

3. [pending] Commit the unified release and push its branch.
4. [pending] Fast-forward `main`, push it, and verify Vercel's Git-backed production deployment.
## Direct pricing checkout (2026-08-12)

1. Centralize paid-plan checkout links with plan and interval query parameters. — Complete
2. Add an authenticated project-aware checkout page, including inline first-project creation. — Complete
3. Preserve checkout redirects across email and social authentication. — Complete
4. Verify lint/build, production environment, and deploy. — In progress

# Page-specific site redesign — 2026-08-14

7. [pending] Review staged scope, commit the feature branch, publish a draft PR, and verify Preview.

# SEO release guardrails — 2026-08-14

## SAML login integration (2026-08-14)
1. Install the official `@better-auth/sso` plugin.
2. Enable SAML and domain verification in the Better Auth server and client.
3. Add the plugin’s `ssoProvider` table to the Convex Better Auth schema.
4. Start SAML login from the existing sign-in form using the entered email domain.
5. For each enterprise customer, register and verify their SAML provider before enabling login.
# Docs deployment reliability

- Include dynamically loaded `content/docs/*.mdoc` files in Next/Vercel output tracing.
- Verify content tests, TypeScript, and production build before updating the docs PR.

# Docs information architecture refinement

- Keep persistent product-area navigation on the left.
- Make quickstarts and product areas first-class overview sections.
- Add an on-page rail and grouped all-guides index without copying reference branding or unsupported claims.

# EU/US regional cloud — 2026-08-15

6. [in progress] Provision independent Tinybird, Redis, and Inngest resources; current provider credentials do not permit unattended workspace creation.
7. [pending] Configure regional OAuth callbacks and Stripe webhook signing secrets.
8. [pending] Verify DNS/TLS, deep health, authentication, onboarding, ingestion isolation, wrong-region rejection, and dashboards in both regions.

# EU-first regional launch revision — 2026-08-16

1. [pending] Revise PR #14 to expose only EU while preserving the dormant US implementation behind a disabled launch gate.
2. [pending] Reuse and verify the existing free-plan EU service configuration; do not imply strict residency where Redis or Inngest cannot prove it.
3. [pending] Configure only `eu.cloud.uncoil.dev` DNS, TLS, authentication callbacks, EU Stripe webhook, and existing provider credentials.
4. [pending] Merge through the pull-request workflow, deploy the exact merged `origin/main` commit to `uncoil-cloud-eu`, and complete EU end-to-end verification.
5. [deferred] Enable US only after physically US stateful infrastructure, unique credentials, operational controls, and cross-region isolation tests are available.

# EU-first regional launch — SHIPPED 2026-08-19

Supersedes the 2026-08-16 revision above; items 1-4 there are now complete.

   `src/lib/regions.ts`, rejects dormant regions server-side in `/api/region/select`, and filters
   the status board. The US implementation stays defined and routable but unadvertised.
   GCP `europe-west2` is London, UK — not the EU. Tinybird workspace recreated as
   `uncoil_eu_west1` (AWS eu-west-1) with all four datafiles deployed; Redis moved to Upstash
   (primary eu-west-1, TLS) because Redis Cloud's free tier gates TLS behind a paid plan.
   Every region verified by IP against the provider's published ranges.
   TLS issued, Google/GitHub callbacks registered, EU Stripe webhook
   `we_1U5YRMV05QqKbrt9FFuI0zWx` created with its signing secret set.
   `uncoil` project from a clean detached worktree. `/api/health/region` returns 200 with all
   four dependencies healthy, which also proved the two write-only Vercel values
   (`TINYBIRD_TOKEN`, `REDIS_URL`) are correct.
5. [accepted limitation] Inngest Cloud runs in AWS us-east-2 (Ohio) with no EU region, and sits
   on the primary ingestion path carrying span `input`/`output`. Decision: keep Inngest, apply
   the existing default-on PII redaction before send, and disclose US event processing plainly in
   the "Data residency" section of `/security` rather than claim end-to-end EU residency.
6. [deferred] Enable US only after physically US stateful infrastructure, unique credentials,
   operational controls, and cross-region isolation tests exist.

## Follow-ups

1. [pending] Rotate the `uncoil_eu_west1` Tinybird token; this also invalidates the MCP URL,
   which embeds the same token. Update `TINYBIRD_MCP_TOKEN` afterwards.
2. [pending] Delete the superseded Redis Cloud databases `database-MSZ2JEQR` (London; its
   password was exposed in a chat transcript) and `uncoil-eu-west1` (Ireland).
3. [pending] Add `STRIPE_SECRET_KEY` and the four `STRIPE_PRICE_*` values to `uncoil-cloud-eu`;
   billing on the EU host returns 503 until they exist.
4. [pending] Reconnect Git automation for `uncoil-cloud-eu`. Now safe: the project has a real
   production deployment on `main`, so Vercel can no longer misclassify a first build.
5. [optional] Replace Inngest with Upstash QStash on the EU deployment to close the residency
   gap — 2 functions, 5 `inngest.send()` sites.

# PR #19 conflict recovery — 2026-08-20

5. [follow-up] Run the authenticated browser smoke test over the high-risk dashboard visualization surfaces; the app browser runtime could not initialize during recovery.

# SDK publishing dry-run repair — 2026-08-20

6. [follow-up] Configure npm and PyPI trusted publishers for tokenless future releases; npm staged publishing is now available because the package exists.

# Google Search Console indexing triage — 2026-08-24

6. [pending] Merge/deploy through the production `origin/main` workflow, then validate the exact affected URLs and request reindexing in Search Console.

# LLM tracing article refinement — 2026-08-25

4. [pending] Run the full build and rendered desktop/mobile route checks with the required Convex environment configured, then open a focused PR.

# LLM observability metrics refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# AI agent regression testing guide refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# Production debugging guide refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# RAG evaluation guide refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# AI agent testing guide refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# AI agent observability guide refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# AI agent reliability guide refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# AI agent evaluation guide refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# Production-ready AI agents article refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# AI agent architecture article refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# LLM latency article refinement — 2026-08-25

4. [pending] Publish the branch, inspect the rendered preview at desktop/mobile widths, and merge after hosted checks pass.

# Long-form blog corpus enforcement — 2026-08-26

4. [in_progress] Create branch/commit, open PR, inspect hosted checks, and merge after release verification.

# AI evaluation metrics editorial and UX rebuild — 2026-08-26

6. [pending] Keep the pass local and uncommitted until visual approval, then force-add the ignored media assets and create the requested focused PR.

# Reusable Uncoil blog-quality skill — 2026-08-26

6. [pending] Force-add ignored `.agents` additions and media assets, then include them in the focused article/renderer/skill PR after approval.

# Rename project blog skill — 2026-08-26

4. [pending] Force-add the renamed skill directory when preparing the focused PR because the local repository exclude rule hides new `.agents` paths.
# 2026-09-02 — Trust-first lifecycle implementation

Implemented the first slice: consent-gated analytics, a reusable consent utility/banner, real contact lead submission endpoint, Convex lead and note storage with admin authorization, and a Resend-compatible email adapter that logs safely when `RESEND_API_KEY` is absent. Remaining verification is Convex codegen plus lint/type/build checks; the current Windows shell cannot locate Node.
# EU deployment readiness audit — 2026-09-02

- [ ] Owner: restore/verify EU Redis, configure EU Stripe billing variables, and decide on an EU queue replacement if strict processing residency is required.
# Activation path follow-up — 2026-09-02

3. [pending] Verify focused contracts, lint/typecheck, and desktop/mobile routes.
## Consent analytics verification (2026-09-02)

1. Audit all PostHog initialization and capture paths — completed.
2. Harden consent storage/event lifecycle and PostHog gating — completed.
3. Finish accessible consent UI and align privacy copy — completed.
4. Run focused tests, lint, typecheck, and browser coverage — blocked by unavailable Node tooling in current shell.
# Lead workflow completion

1. Preserve the existing first slice and inspect its auth, schema, and UI conventions.
2. Harden the public route and Convex persistence with strict bounds, rate limiting, dedupe, safe email handling, and admin-only operations.
3. Complete the admin inbox interaction model for metadata, filtering, statuses, assignment, notes, and recoverable states.
4. Run focused tests, codegen, lint/typecheck/build, and diff hygiene checks; record environment blockers.
## Lead workflow completion audit — 2026-09-02

The existing lead slice already covers Convex persistence, admin authorization, status transitions, assignment, notes, Redis rate limiting, deduplication, and non-fatal email delivery. This pass added aggregate request-size and JSON-object validation and expanded the inbox presentation of required lead metadata. Verification is pending because Node/npm are unavailable in the current shell.

# SEO/AEO blog ideation — 2026-09-03

## Email sender configuration
- [ ] Owner adds the Resend API key and verifies `kb@uncoil.dev`/`uncoil.dev` in Vercel and Resend.
# 2026-09-03 — Langfuse parity and release operating model

## Findings

- The Langfuse release corpus contains 672 releases from v1.0.0 through the current v4/v3 maintenance streams.
- Uncoil already has early slices for prompts, datasets, evaluators, experiments, alerts, agent tracing, typed scores, cost ceilings, and TS/Python SDKs.
- The largest parity gaps are production-grade evaluation execution, richer trace/observation querying, model/token/cost correctness, team governance, OpenTelemetry/MCP breadth, and a trustworthy release lifecycle.
- Current release automation only publishes SDKs manually or on `sdk-v*` tags; there is no single application release manifest, changelog pipeline, release PR, provenance/attestation policy, or rollback runbook.

## Recommended sequence

1. Establish release foundations: canonical version source, Conventional Commit/changeset policy, CI release gate, GitHub Release generation, immutable artifacts, and rollback/runbook documentation.
2. Make the SDKs production-ready: API compatibility tests, package smoke installs, npm trusted publishing, PyPI trusted publishing, provenance, and synchronized release notes.
3. Ship the highest-value product parity slice: representative datasets → evaluation suites → trace-linked results → regression thresholds → canary release decision.
4. Add query and platform depth: full-text/filter search, monitors/alerts, saved views, trace comparison, accurate model pricing/token accounting, and OTel-compatible ingestion.
5. Add enterprise depth only after the core lifecycle is reliable: RBAC/SCIM, audit log, SSO enforcement, retention/export controls, and regional processing guarantees.

## First release target

Use a v0.3.0 product release plus synchronized SDK patch/minor releases. Do not publish until the release workflow passes application tests, SDK tests, typecheck/build, security checks, package smoke installs, migration checks, and a production smoke test. The first release should include a human-readable changelog with upgrade notes and a rollback owner.

## Favicon candidates — 2026-09-04

The first literal trace-path and pixel-`T` drafts were rejected as too busy and too close to a superhero-style badge. The refined candidates are a measured telemetry signal (`favicon-signal.svg`) and a restrained open trace loop (`favicon-open-trace.svg`), each with 16/32/48px PNG and ICO fallbacks. The signal mark is now the default multi-size app ICO; keep the open-trace version ready as the alternate.

# ERPNext integration — 2026-09-03

- First slice: outbound Uncoil alerts to ERPNext `ToDo` records through the Frappe REST API.
- Keep trace/span evidence in Uncoil; send bounded alert metadata and a trace link.
- Implement validation, secret-safe persistence/read paths, server-only actions, idempotency, timeout/no-redirect behavior, and project/admin authorization.
- Do not claim end-to-end completion until a customer-provided ERPNext sandbox is tested successfully.
- Added the initial REST client boundary in `src/lib/erpnext.ts`; next code work is credential storage, project authorization, delivery wiring, and settings UI.

3. [pending] Validate the documentation route and content contracts.

# Private Plane workspace — 2026-09-03

3. [pending] Provision and harden the VPS, configure a Cloudflare Tunnel for `plane.uncoil.dev`, Cloudflare Access/MFA, SMTP, backups, and the private Uncoil workspace.
# Explore / Build playground and site assistant — 2026-09-04

## Completed

1. Added a pre-region Explore / Build entry choice. Explore goes through the existing EU authentication boundary and enters a simulated `/playground`; Build continues to the existing region-scoped onboarding.
2. Added a populated, interactive simulated dashboard surface with healthy, latency, and tool-failure scenarios, persisted account state, filters, alert dismissal, and a real-project CTA. Simulation data never enters the real project/ingestion path.
3. Added a public Uncoil assistant with curated product/setup context, cited internal links, deterministic no-provider fallback, bounded input/rate limiting, and server-only OpenAI usage when configured.
4. Added optional redacted assistant traces to a dedicated internal Uncoil ingestion target and made tracing non-blocking.
5. Focused ESLint and TypeScript pass. Local assistant API smoke test returns a cited response. Full page smoke is limited by the existing unavailable local Convex service at `127.0.0.1:3211`.
6. Switched the assistant to `gpt-5.6-luna` with low reasoning effort and added per-IP, daily-global, and output-token guards before enabling paid model calls.

## Follow-up

- Deploy the Convex schema/function change through the normal authenticated Convex deployment/codegen workflow.
- Add browser E2E coverage for Explore/Build, playground persistence/isolation, and assistant citations/fallbacks.
- Configure `UNCOIL_INTERNAL_INGEST_URL` and `UNCOIL_INTERNAL_API_KEY` only in the intended server deployment environment.
- Commit/review/merge the local implementation before treating the playground and assistant as production-live; the Vercel guardrail redeploy used `main` commit `fbd51b1`.
- Favicon cascade-T preview is pushed as `19082d7`; production promotion remains pending merge/owner approval. Only the approved Cascade A family is stored under `public/logos/cascade-t-a/`; the Photoshop-ready transparent lockup is available as both PNG and SVG, and unselected favicon experiments are archived outside `public/`.
- Configure the provider-side OpenAI organization/project budget after the owner signs in; application caps are already configured in Vercel Production.

# 2026-09-05 — EU cloud TLS regression

4. [pending] Resolve Vercel custom-domain TLS renegotiation or migrate to a one-level hostname covered by the free certificate.

# Langfuse clone surface — 2026-09-06

Latest parity pass (2026-09-08): corrected visible captured-workspace labels and scoped accent styling to match the reference product. The complete static reference is hosted separately at `https://uncoil-dashboard-reference.vercel.app`, with the populated baseline at `/pages/023.html`; focused TypeScript and ESLint passed, while implementation screenshot comparison is pending local server availability.

- Implemented the first local parity slice for the requested demo and empty-project views.
- Follow-up scope: add authenticated data wiring and expand remaining project modules only if the user wants a full product-surface parity pass.

# Langfuse empty dashboard parity — 2026-09-06

8. [pending] Repeat the comparison through the authenticated production route once the local browser session has a usable project identity.

# Uncoil dashboard feature parity — 2026-09-06

5. [pending] Replace seeded preview data with authenticated Convex-backed trace/session/user data and carry the feature treatment through the remaining dashboard modules.
6. [in progress] Finish route-by-route parity for dashboards, users, scores, evaluators, human annotation, and settings using authenticated project data; navigation, Scores, Users, and the authenticated Operations route are now exposed.
7. [pending] Run matching-viewport visual review across the captured route set and fix remaining layout/interaction mismatches.
8. [in progress] Match dashboard editor controls and remaining captured interaction details before the final route audit.
31. Move the regional cloud switcher into the dashboard top bar before the remaining dashboard selectors; preserve the cloud-directory destination and verify it on both local hosts.
32. Add a dedicated Batch Actions settings surface using the existing run selection/export workflow and enable the already-implemented Notifications tab.
33. Add a real project-scoped audit log table, record settings/API-key changes, and expose a dedicated Audit Logs settings page.
34. Add the captured Organization Settings surface using the existing Better Auth organization and member state.
35. Add project-scoped Integrations settings with the existing alert destination backend and developer connection links.
36. Make dashboard editing behavior persistent: named dashboard selector and durable clone action per project.
37. Align the authenticated sidebar Integrations entry with the project-scoped settings route.
38. Add captured-style search and environment filtering to live project Sessions.
39. Add captured-style user detail navigation and live per-user session metrics.
40. Add user detail navigation and live per-user operational metrics.
41. Connect dashboard environment filtering to live Convex summary data.
42. Connect dashboard time range to live summary metrics so cards and charts share the same window.
43. Connect dashboard trace/session/user/release filters to live summary metrics.
44. Populate dashboard environment choices from observed project telemetry.
45. Align Costs summary fallback with selected dashboard range and environment context.
46. Connect dashboard model selection to live project summary metrics.
47. Populate dashboard model choices from observed project runs.
48. Make dashboard usage and consumption tabs change live displayed metrics.
49. Apply selected model filtering consistently to dashboard breakdowns and latency metrics.
50. Distinguish model and tool usage in dashboard type-based tabs.
51. Add real model latency percentile aggregation through Tinybird, Convex cache, stats API, and dashboard rendering.
52. Connect the captured Home Assistant control to the shared dashboard command menu.
53. Connect Home shell sidebar toggle to shared dashboard sidebar state.
54. Remove the stale dashboard sidebar memo dependency after wiring shell controls.
55. Connect dashboard topbar Filters control to the Home filter state.
56. Persist dashboard widget layouts independently for each named dashboard.
57. Add rename and delete actions for custom dashboards while protecting the default Uncoil Home dashboard.
58. Make both local dashboard previews use the authenticated-style Uncoil shell for visual comparison.
59. Continue visual parity review of linked dashboard surfaces against their captured references.
60. Compare linked-surface content and controls against the captured screenshots and wire the highest-value interactions.
61. Verify the upgraded linked-surface controls through the authenticated-style preview and refine visual spacing against the capture.
62. Continue behavior parity audit for dashboard editor actions and linked-surface create flows.
63. Exercise the editor and linked create-flow state changes in-browser at the reference viewport.
64. Complete the remaining capture-path and feature audit across both regional runtimes.
65. Perform final visual comparison of the Home dashboard against the captured reference at the same viewport.
66. Continue feature-depth parity for non-Home captured surfaces with real list/detail interactions.
67. Extend linked forms with persistence-backed project data where the corresponding Uncoil API exists.
68. Replace local draft markers with Convex mutations for surfaces that have backend schemas.
69. Wire prompt and evaluation create forms to their existing typed Convex mutations, then design schemas for the remaining linked surfaces.
70. Verify prompt and evaluation linked routes with authenticated project data and preserve the generic surfaces for schema-less features.
71. Add explicit Convex-backed schemas for the remaining high-value captured surfaces, starting with alerts and automations.
72. Verify the alert creation route against an authenticated project and then design the automation contract.
73. Verify Automations in both regional runtimes and continue the saved-dashboard/widget backend contract.
74. Switch authenticated dashboard editor reads/writes from compatibility local storage to dashboardConfigs/dashboardWidgets.
75. Add persisted rename, delete, reset, and reorder mutations for dashboard editor parity.
76. Verify authenticated editor actions end-to-end against a real project session.
77. Verify the production build artifact and regional runtime URLs after the final editor mutations.
78. Preserve final handoff links and document the remaining backend expansion points.
79. Add a reversible Uncoil-branded dashboard presentation layer with legacy/v2 preview controls while preserving existing functionality.
80. Keep the Explore and region choices as separate steps, carry a stable simulated user ID into the playground URL, and verify the production Vercel and Convex deployments before release.
81. Fix the Better Auth/Convex callback race, preserve the immersive playground return query through sign-in, and align regional Better Auth host resolution.

92. [in progress] Restore action wiring for captured evaluation/admin controls and run the full authenticated route/interactions verification matrix; prompt, evaluator, dataset, alert, dashboard, settings, annotation, and session actions are now connected.
94. [next] Run the complete account-access contract and final Build route/button audit after the latest parity changes.

## Explore/Build parity spec — 2026-09-08

Objective: give first-time visitors a reliable Uncoil Explore experience that visually follows the supplied populated dashboard capture while keeping production account data, authentication, and regional telemetry out of the demo path.

Acceptance contract:

1. Explore opens `/playground?view=home&userId=usr_demo_7f3a9c21` directly; no region selection, Clerk/Convex auth gate, stale project ID, personal dashboard, or Langfuse label is involved.
2. The Explore shell is visibly branded Uncoil, uses the dark cloud dashboard treatment, and uses gray placeholders/skeletons against the dark canvas. The captured populated Home/Tracing information architecture is the visual reference, not archived JavaScript.
3. The logo always returns to `/dashboard` project selection. The synthetic project switcher clearly says `Demo Project (view only)` and offers a Build path.
4. Every visible Explore sidebar item remains inside the simulator and changes the `view` state; Home, Tracing, filters, scenario cards, trace detail, time range, environment, and Build actions have observable behavior.
5. Build remains a separate path: `/cloud/region` lists available regions, and selecting one shows `/cloud/connecting` with a visible `Connecting to … cloud` status before regional API redirect.
6. Verification must pass TypeScript, focused ESLint, production build, and the account-access browser contract. Existing generated Convex changes and unrelated scratch files remain untouched.

Implementation completed:

- Added the `synthetic` dashboard-shell/sidebar/project-switcher mode and routed all simulator navigation through `view` query state.
- Replaced the auth-dependent playground surface with populated synthetic Home, Tracing, and generic simulator surfaces, preserving safe localStorage scenario state.
- Added the regional connecting handoff route and gray dark-dashboard loading treatment.
- Updated `tests/e2e/account-access-contract.spec.ts` to encode the acceptance contract; all 8 tests pass locally.

Production verification:

- PR #99 merged as `7c3ee0f`; PR #100 merged as `312a4df`.
- Marketing production deployment and EU production deployment for `312a4df` reached Ready. Live marketing Explore click reaches `https://eu.cloud.uncoil.dev/playground?view=home&userId=usr_demo_7f3a9c21` and renders the populated synthetic Home.
- Remaining deployment hygiene item: copy the existing production `CONVEX_SITE_URL` config into the EU Vercel Preview environment. The preview deployment for PR #100 fails at page-data collection with `CONVEX_SITE_URL is not set`; this does not affect the verified production deployment.

## 2026-09-08 — Exact captured dashboard parity continuation

- Shared shell migration started: dashboard content is full-bleed, the sidebar uses the captured dark/reference treatment, and general dashboard access no longer depends on the restricted library allowlist.
- Remaining implementation is route-complete surface migration, live/Sandbox action adapters, deterministic visual baselines, and complete six-viewport zero-pixel verification.
- Users list/detail and Experiments now use live captured-workspace adapters; continue the same migration for remaining legacy routes before visual signoff.
- Human Annotation now uses live Convex annotations through the captured renderer, and legacy Operations redirects to captured Sessions.
- Legacy Search, Compare, Traces, and Runs entry points now canonicalize to the captured Tracing list/detail family with query preservation.
- Project Settings/API Keys now canonicalizes to the captured Settings surface with URL-backed tab state.
- Remaining project settings aliases now preserve their requested destination as `settings?tab=...`, so old bookmarks enter the shared captured settings shell.
- Sandbox metadata and project labels no longer expose Uncoil branding, and the captured interaction accent is violet rather than the old yellow token.
- Browser review of the managed local Sandbox confirms the captured shell is live; legacy Prompt Management, Dashboard Create, Evaluation, and Evals entry points now canonicalize into captured route families. The next parity block is implementing the captured control/detail density and six-viewport screenshot comparison.
- Tracing range, environment, and query filters now persist in the URL and are covered by a reload contract; continue extending URL-backed state to view, columns, pagination, and detail selections.
- Tracing view mode, preset, and column selection now persist through URL parameters and are covered by the Sandbox browser contract; pagination and detail-selection persistence remain.
- Tracing now slices results by URL-backed `page` state and exposes reference-style previous/next controls with disabled boundaries.
- Project Alerts creation now enters the captured Alerts surface through `?view=create` with a responsive reference-styled form; live mutation wiring and remaining create/edit surfaces continue.
- Prompt creation now renders inside the captured Prompts surface through `?view=create` with reference-styled fields and action handling.
- Project Dashboard detail pages now render through the live captured dashboard adapter and preserve the selected dashboard ID for future detail/editor state.
- The captured Dashboard editor now resolves the selected detail ID to its live record and initializes the displayed dashboard accordingly.
- Dashboard selection and Grid/List layout are now URL-backed in the captured editor for reload/share parity.
- Added the first repeatable six-viewport parity harness for all public captured Sandbox surfaces; it records full-page artifacts and asserts reference shell labels with no captured-workspace Uncoil text.
- Playwright test discovery confirms all six viewport cases are registered; targeted ESLint passes for the changed application/test files, with captured CSS excluded by the repository ESLint configuration.
- Expanded the paired reference screenshot harness from two representative surfaces to all 14 primary captured Sandbox surfaces. Each surface is paired with a populated 4173 archive page and exercised through the existing six viewport profiles; a clean full artifact run and pixel-diff review remain required.
- Corrected the paired fixture mapping to use the populated 4173 captures (Home 023, Dashboards 024, Tracing 025, Sessions 026, Users 027, Alerts 028, Prompts 029, Playground 030, Scores 031, Evaluators 032, Annotation 033, Datasets 034, Experiments 035, Settings 036). The rebuilt production artifact now passes the complete desktop-wide 14-surface capture run; six-viewport diff review remains required.
- Stabilized the screenshot suite by disabling trace/video recording for the long-lived paired pages and using an explicit 180-second viewport-test timeout. All six viewport cases now pass individually against the rebuilt production artifact for the full 14-surface set; screenshot diff analysis and page/state corrections remain required.
- Added a deterministic parity comparator that validates all 14×6 screenshot dimensions, produces thresholded visual diff images, and writes a machine-readable summary. Initial complete evidence shows the capture pipeline is healthy; remaining mismatch is primarily structural/content-density and must be corrected surface by surface.
- Corrected the first shared-shell geometry mismatch found through diff inspection: Sandbox now has the reference project context rows and a captured-only compact project selector wrapper, preserving Build behavior while aligning the downstream navigation baseline.
- Measured the shell correction against a fresh production artifact: Home desktop-wide mismatch decreased from 21.57% to 20.62%, confirming the change improved parity; Tracing was unchanged and is now the next focused surface.
- Implemented the first Tracing-specific structural correction from the paired capture: a reference-style query strip now sits between the title toolbar and tracing controls, while generic toolbar controls are omitted on Tracing. URL-backed query behavior remains intact; rebuild and visual diff remeasurement are next.
- Measured and corrected the next Tracing structural mismatch: the desktop/tablet filter rail now uses the reference 153px width instead of the prior 260px width, shifting the results region into the correct baseline while preserving mobile stacking.
- Revalidated the Tracing rail against a fresh production artifact: the full desktop-wide suite passes, while Tracing mismatch remains approximately 26.44%, so the next Tracing pass must reproduce internal filter groups, chart strip, table density, and populated data layout.
- Added the missing Tracing table-mode count strip as a captured-only visual layer with reference-style grid/event bars; table interactions remain unchanged and the next step is fresh production screenshot measurement.
- Runtime evidence: all six viewport cases (1440x900, 1280x800, 1024x768, 768x1024, 390x844, and 375x812) passed all 14 Sandbox surfaces, including hydration, reference-shell, no-Uncoil-text assertions, and screenshot capture.
- Latest verification: the EU-configured isolated production artifact builds all 211 routes; the account-access contract passes 10/10; the six-viewport captured matrix passes 6/6 across the 14 captured Sandbox surfaces. Sessions controls and Tracing Ask AI now have observable behavior, and captured trace names use the reference fixture values.
- Sessions was further aligned to the supplied reference structure: its dedicated filter rail and eight-column table are now present at desktop, tablet, and mobile widths, while generic environment/create controls are omitted from that route. Paired captures pass for the updated surface; pixel-level comparison still identifies residual shell/content differences.
- The Tracing table now includes the captured leading selection column, and Sessions desktop action spacing is closer to the reference baseline. The latest isolated EU build compiled all 211 routes and the six-viewport route matrix passed across all 14 Sandbox surfaces.
- The shared narrow-screen shell now includes the captured logo/breadcrumb row, separate range/assistant controls, and Home toolbar wrapping. This source change is lint/type safe; a fresh production artifact and six-viewport run remain required before accepting the visual effect.
- Shared mobile shell is now verified on a fresh EU-configured production artifact: all 211 routes compiled and all six required viewport profiles passed across the 14 captured Sandbox surfaces.
- Restored the captured Tracing Filters control as a real URL-backed menu; the fresh artifact and full account-access contract now pass again at 10/10. Continue the visual parity audit and deployment verification before completion.
- Completed another captured-control audit: prompt view/reference actions and Annotation columns/table-view controls no longer silently do nothing. The latest build and full account-access contract pass; exact visual parity and external preview deployment remain open.
- Latest parity pass: the Tracing toolbar now matches the reference control order (Quality, Slow, Cost, My Views, Table, Chart, Columns) while filtering remains in the left rail; the full six-viewport matrix passes and Tracing mismatch improved to 27.89% desktop-wide and 22.60% mobile-narrow. The shared environment label now displays `default`, the captured dashboard marker no longer uses the yellow accent, and mobile Sessions toolbar offsets were refined from screenshot geometry. Clean EU-configured production builds and focused mobile Sessions tests pass; remaining route/state parity work is still open.
- Responsive Sessions follow-up: tablet portrait required a separate 60px icon-only filter rail breakpoint at 701–800px. The correction passed the tablet landscape/portrait capture tests and reduced portrait Sessions mismatch to 23.45%; the landscape result remains 26.01% with the wider reference rail.
- Playground follow-up: page 030 required a structural replacement rather than CSS-only tuning. The captured Playground now uses model/actions, Tools/Schema/Variables, System/User message rows, Message/Placeholder actions, Output, and Submit; generic shared Env/Filters/Create controls are suppressed. Focused mobile tests pass and the new surface measures 20.43%/20.22% mismatch on standard/narrow mobile, with desktop/tablet fine-tuning remaining.
- Final current-artifact verification: the isolated EU-configured `.next-filter-fix` build compiles all 211 routes; the targeted Tracing interaction contract passes, the full account-access contract passes 10/10, and the complete six-viewport captured matrix passes 6/6 across all 14 Sandbox surfaces after restoring the URL-backed Tracing Filters menu. Raw screenshot comparison still reports residual structural/content mismatch, so pixel-perfect parity is not complete.
- Sessions mobile offset experiment: a `-15px` surface offset with independently widened search/actions regressed the fresh paired comparator to 29.18% at 390x844 and 26.83% at 375x812. Reverted to the prior `-30px` surface-only offset, whose fresh paired run measured 26.68% and 26.28%; mobile route assertions remained green in both runs.
- Playground mobile fidelity pass: aligned the captured Playground toolbar/card geometry, fixed the mobile model-control sizing, constrained message/add rows to the reference inner width, and brought the output/submit block back inside the viewport. Fresh paired screenshots improved Playground mismatch to 11.41% at 390x844 and 11.62% at 375x812; the complete six-viewport route matrix passed 6/6 across all 14 Sandbox surfaces against the same EU-configured build.
- Tracing toolbar fidelity pass: desktop now keeps the URL-backed Filters action in the captured left rail and removes the extra top-row Filters control; the account contract was updated to exercise the rail control. Focused lint, the complete account-access contract (10/10), and desktop paired capture pass. Raw desktop-wide Tracing mismatch is effectively unchanged at 27.89%, so remaining differences are still table density/content and shell geometry.
- Users tablet structure pass: applied the extracted reference user IDs, kept four visible event columns, and added the 701–800px captured control grid so search/environment share the first row and Filters occupies the second row. The EU-configured build compiles all 211 routes and the complete six-viewport route matrix passes 6/6; fresh tablet paired capture passes, with raw mismatch remaining sensitive to timestamp/content differences.
- Sessions mobile control-row pass: retained the captured `-30px` surface offset and shifted only the search/actions row by `-22px`, matching the reference’s left alignment without moving the table/rail. Fresh paired mobile captures pass; standard mismatch improved to 26.68%, while narrow mismatch is noisier at 27.49%, so no further speculative offset was layered on.
- Deployment verification: the branch head `b93d2165` now has Ready Vercel previews for both surfaces: marketing `https://uncoil-kyi83g6vf-uncoil-tech.vercel.app` and EU cloud `https://uncoil-cloud-mvhgikvf1-uncoil-tech.vercel.app`. GitHub reports both Vercel checks and the activation/adapter checks as passing.
- Sessions mobile follow-up: corrected the independently measured toolbar and content-edge offsets after a fresh screenshot audit. The full six-viewport matrix remains green, with the current mobile Sessions artifact measuring 26.97% standard and 26.57% narrow; fine table density, shell typography, and dynamic reference data differences remain open.
- Users tablet follow-up: removed shared Env/Filters/Create controls from the dedicated Users surface, added the reference Last Event column, and aligned the narrow-tablet toolbar 24px lower. Tablet-focused tests and the complete six-viewport matrix pass; Users mismatch is 20.89% at 1024x768 and 22.30% at 768x1024, so row data/typography still need tuning.
- Users fixture follow-up: page 027 `u-*` identifiers are now used by Sandbox Users rows, event timestamps render in the captured localized format, and fixed widths preserve the four-column layout. The final mobile edge override is ordered after the fixed-table rules. TypeScript/build/focused tests/full six-viewport matrix pass; remaining Users mismatch is predominantly text clipping, font metrics, and exact reference row content.
- Tracing table follow-up: corrected the width selectors to account for the leading selection column and replaced the textual generation cell with an accessible reference-style icon. Desktop pair tests pass on the rebuilt artifact; Tracing remains a high-difference surface at 28.40% desktop-wide and 24.54% desktop-compact and still requires shell/content-density tuning.
- Tracing spacing audit: a 5px chart-strip reduction plus altered header/body padding was measured and rejected because it worsened both desktop comparisons. Those rules were removed; the current EU-configured artifact is verified at the prior 28.40%/24.54% baseline with the accepted width/icon correction intact.
- Rebuilt verification after the rejected spacing experiment: desktop-wide and desktop-compact Tracing pair tests pass on the restored source, retaining the 28.40%/24.54% measurements.
- Users mobile edge pass: fresh paired captures showed the page title, controls, and table consistently 7px too far right; the final mobile surface offset is now `-36px`. Both mobile captures pass, with mismatch at 26.51% standard and 26.13% narrow; this is retained without further offset stacking.
