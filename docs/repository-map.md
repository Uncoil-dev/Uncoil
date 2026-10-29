# Uncoil repository map

| Area | Responsibility | Source of truth |
| --- | --- | --- |
| Application | Next.js routes, dashboard, public pages, API endpoints | `src/` |
| Application metadata | Projects, runs, alerts, comments, prompts, datasets, evaluations | `convex/` |
| Telemetry analytics | Raw spans, analytical queries, evaluation scores | `tinybird/` |
| Background processing | Queue and asynchronous writes | `src/lib/inngest*`, ingest routes |
| TypeScript SDK | Node/edge tracing and feedback helpers | `packages/ts-sdk/` |
| Python SDK | Sync/async tracing and feedback helpers | `packages/python-sdk/` |
| Browser instrumentation | Playwright tracing and reporter | `packages/playwright/` |
| Documentation | Markdoc product and API documentation | `content/docs/`, `docs/` |
| Deployment | Region registry, health checks, and cloud runbooks | `config/`, `scripts/`, `docs/` |
| Verification | Contract, unit, browser, and release checks | `scripts/`, `src/`, `convex/`, `tests/`, `.github/` |

Use `implemented`, `partial`, `documented-only`, or `not implemented` in capability reviews. A page, schema field, or draft document is not proof of shipped runtime behavior by itself.
