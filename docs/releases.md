# Uncoil release log

This is the canonical release record. The public `/changelog` page and GitHub Releases use it as their source.

## [Unreleased]

### Features
- Error groups have a Suggest a fix button. It opens an example trace with Ask AI ready to explain the likely cause and the change to make.
- RSS feed for the changelog at /changelog/rss.xml.
- New Pro and Team subscriptions start with a 7-day free trial. A card is added at checkout and is charged when the trial ends; each project gets one trial.
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
- None.

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
