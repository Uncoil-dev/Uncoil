# Uncoil parity and release operating model

Status: proposed
Owner: Uncoil engineering
Date: 2026-09-03

## Problem

Uncoil has working slices for agent tracing, prompts, datasets, evaluators, experiments, scores, alerts, cost ceilings, and TypeScript/Python SDKs. The product is not yet at the maturity demonstrated by Langfuse's release history because those slices are not joined into a trustworthy production lifecycle, and the application has no single repeatable release process.

## Outcome

Users can instrument an agent, create a representative evaluation set from production traces, compare a candidate against production, approve a release using quality/cost/latency evidence, roll it out gradually, and investigate regressions. Maintainers can publish the application and SDKs from one verified commit with reproducible artifacts, migration notes, and a rollback path.

## Scope and order

### Release foundation — P0

- Add `docs/releasing.md` with versioning, branch, approval, rollback, incident, and post-release procedures.
- Add one release workflow for application and SDK validation, artifact creation, draft GitHub Release creation, deployment, smoke verification, and promotion.
- Adopt Conventional Commits or Changesets and generate a human-reviewed changelog.
- Define version ownership: application, TypeScript SDK, Python SDK, and Playwright package may version independently but must publish a compatibility matrix.
- Protect publishing credentials in a required `release` environment; prefer npm/PyPI trusted publishing and provenance over long-lived tokens.
- Add package smoke installs from the produced npm tarball and Python wheel.
- Require the exact release tag to be the deployed commit; prohibit publishing from a dirty or unverified branch.

Acceptance criteria:

1. A maintainer can create a draft release candidate from `main` without editing workflow YAML.
2. The workflow fails before publication if tests, typecheck/build, security checks, SDK tests, package smoke installs, or production smoke checks fail.
3. The GitHub Release contains categorized changes, upgrade notes, migration notes, SDK versions, and known limitations.
4. A release can be rolled back to the previous application deployment and documented package versions remain discoverable.
5. A release artifact records commit SHA, application version, SDK versions, schema/migration state, and build timestamp.

### Agent release evidence — P0

- Add a required `release`/`deployment` field to every trace, span, generation, tool call, score, and evaluation result.
- Add evaluation suites that bind datasets, evaluators, prompt/model configuration, and thresholds.
- Link experiment and evaluator results back to trace IDs and candidate release IDs.
- Compare candidate and baseline on quality, failure rate, latency, cost per successful task, token use, and tool-call count.
- Persist an approval/rejection decision with actor, timestamp, criteria, evidence, and rollback trigger.

Acceptance criteria:

1. A candidate release cannot be marked approved without a named dataset, evaluation suite, baseline, and threshold result.
2. A failed threshold produces a clear reason and links to representative failing traces.
3. The same evaluation run is reproducible from its stored prompt/model/dataset versions.
4. Every production trace can be filtered by release and environment.

### Investigation and monitoring — P1

- Add server-side full-text search across input, output, metadata, and error text.
- Add searchable filter facets, saved views, release comparison, and first-divergence trace comparison.
- Add monitors for errors, latency, cost, score regression, tool failures, and no-data conditions.
- Add alert deduplication, resolution, severity, owner, cooldown, notification delivery, and runbook links.
- Clearly mark truncated or capped traces and approximate counts.

Acceptance criteria:

1. An on-call user can find all traces affected by one release and isolate the first divergent observation.
2. A monitor produces one deduplicated alert, links to affected evidence, and records resolution.
3. Large trace and table views remain usable without page-level overflow or silent data loss.

### Telemetry, cost, and interoperability — P1

- Normalize model/provider aliases and maintain historical pricing.
- Record input, output, cached, and reasoning token classes separately.
- Represent unknown cost explicitly; never silently convert missing usage to zero.
- Add cost-per-successful-task and release-to-release cost regression views.
- Expand OTel ingestion and attribute normalization.
- Add MCP server/tool identity, schema, retries, timeout, and failure information.

Acceptance criteria:

1. A cost report can explain every included token and price with model/provider/source metadata.
2. Changing a model price does not rewrite historical cost without an explicit migration.
3. OTel and native SDK events produce the same canonical observation fields where semantics match.

### Governance — P2

- Add scoped API keys and rotation/revocation.
- Add project and organization RBAC, audit events, and prompt/evaluation deployment permissions.
- Add SSO enforcement and SCIM only after the core permission model is stable.
- Document data storage, queue processing, billing, analytics, retention, and export boundaries per region.

## First release target

Target `v0.3.0` as a product release with compatible TS/Python SDK releases, subject to the release gate. It should prove the release process, not attempt full Langfuse parity. Include stable trace/release identifiers, the existing prompt/dataset/evaluation baseline, typed feedback, cost-ceiling behavior, SDK documentation, production smoke coverage, and a rollback runbook.

## Release checklist

- [ ] Version and changelog reviewed.
- [ ] API/SDK compatibility and breaking changes documented.
- [ ] Convex schema and generated bindings synchronized.
- [ ] Application tests, lint, typecheck, and build pass.
- [ ] TS and Python SDK tests, builds, tarball/wheel checks, and clean-install smoke tests pass.
- [ ] Security and secret scans pass.
- [ ] Staging deployment uses the exact release candidate SHA.
- [ ] Ingest, trace display, prompt resolution, scoring, evaluation, billing, auth, and regional health smoke checks pass.
- [ ] Migration and rollback steps are tested or explicitly marked unnecessary.
- [ ] Draft GitHub Release reviewed by an owner.
- [ ] Production deployment is Ready and resolves to the intended commit.
- [ ] Post-release checks pass and the release is promoted.

## Non-goals for v0.3.0

- Full SCIM/RBAC parity.
- Arbitrary LLM-provider proxying.
- End-to-end regional isolation claims before every stateful and queued processor is verified.
- Automatic production rollout without human release approval.

## Success measures

- 100% of production observations have release and environment identifiers.
- 100% of published SDK artifacts pass clean-install smoke tests.
- 0 releases published when a required gate is red.
- Median time from merge to verified release is under 30 minutes after the workflow is stable.
- A release regression can be identified from dashboard evidence without database access.
