# Uncoil release log

This is the canonical release record. The public `/changelog` page and GitHub Releases use it as their source.

Every pull request description has a Changelog section: one ticked category and one user-facing line. To draft release notes from merged pull requests, run `gh pr list --state merged --search "merged:>=YYYY-MM-DD" --json number,body | node scripts/changelog-from-prs.mjs` and review the output before adding it to the release entry.

## [Unreleased]

### Features
- Pro and Team plan cards, the in-app upgrade card and the usage banner now show the free trial: 7 days free, once per project.
- New homepage, told as one example agent run: it fails at step 06, Uncoil walks it back to the step that caused it at step 04, and the page follows that run through your logs, the trace view, the fix, setup and pricing. The sign-in and sign-up pages share its pixel art. On phones, the menu is now a full-screen view of the site drawn as a trace.
- New topics endpoint, `GET /api/projects/{projectId}/topics`, groups the traces matching the traces-list filters by what they were asked to do, with error rates and example traces. The public demo shows topics too.
- Codex and OpenCode plugins send each finished coding-agent turn to Uncoil as a trace, with tool calls, token use and cost. Install steps are in the docs.
- The pricing page calculator now links to the tracing bill calculator, which compares the monthly bill across tools for the same traffic.
- New Startups page with discounted plans for early-stage startups, students and educators, and open-source projects. See /startups.
- Error groups have a Suggest a fix button. It opens an example trace with Ask AI ready to explain the likely cause and the change to make.
- RSS feed for the changelog at /changelog/rss.xml.
- New Pro and Team subscriptions start with a 7-day free trial. A card is added at checkout and is charged when the trial ends; each project gets one trial.
- The pricing page calculator now links to the tracing bill calculator, which compares the monthly bill across tools for the same traffic.
- New Pro and Team subscriptions start with a 7-day free trial. A card is added at checkout and is charged when the trial ends; each project gets one trial.
- Error groups have a Suggest a fix button. It opens an example trace with Ask AI ready to explain the likely cause and the change to make.
- Free projects get one email when they reach 80% of the month's spans. Refused requests at the monthly or daily limit now include a link to the plans.
- Updated plan limits: Free is now 10,000 spans a month, 2,000 a day, 2 projects and 300 requests a minute.
- Alerts, custom Ask AI questions and date ranges over 7 days are part of Pro.
- Release-log and SharePoint discovery foundations.
- New free tool: a tracing bill calculator that compares the monthly cost on Langfuse, LangSmith, Helicone and Uncoil for the same traffic.
- New Switch to Uncoil guide for teams moving from Langfuse, LangSmith, Helicone or OpenTelemetry.
- Agent health report: a one-off $79 report on cost, errors and slow steps, built from a file of runs, with ranked fixes, a private link and a print-ready PDF. See /health-report.
- New free tool: prompt caching savings calculator.
- New comparison pages: Uncoil vs Opik, AgentOps and Pydantic Logfire.
- Landing page: a clickable sample weekly agent report (cost, errors, slow steps) that links into the public demo project, no sign-up needed.
- New sign-up question: "What do you want to fix with Uncoil?" on the first-project step. It is optional, and the team reads the answers in the admin page under Goals.

### Fixes
- The traces list topic filter is faster on repeat loads, and the list response now says when a topic was worked out from the newest traces only. The demo project's traces list respects the topic filter.

### SDK changes
- None.

### Breaking changes
- None.

### Migrations
- None.

### Security and operations
- SharePoint exports exclude secrets, customer data, caches, worktrees, and scratch files.

### Known limitations
- Direct SharePoint synchronization requires Microsoft 365 access and a target site.

### Deployment and rollback
- No deployment or publication is associated with this unreleased entry.

## [0.2.0] — 2026-09-03

### Features
- Added release and environment context support across the TypeScript and Python SDKs.
- Added repository, compatibility, release, and regional documentation foundations.

### Fixes
- Corrected SDK quickstart terminology and package usage documentation.

### SDK changes
- Added `release`, `environment`, `deploymentId`, `sessionId`, `endUserId`, and `tags` context fields.

### Breaking changes
- None.

### Migrations
- Existing SDK payloads remain accepted; new context fields are optional.

### Security and operations
- Documented release metadata, generated Convex binding checks, and regional processing limitations.

### Known limitations
- EU asynchronous processing still uses US-based Inngest infrastructure.
- This entry is a local release record until a verified release commit is published.

### Deployment and rollback
- Follow `docs/releasing.md`; application rollback does not automatically roll back Convex data or schema.
