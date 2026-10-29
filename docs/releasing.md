# Releasing Uncoil

Every promoted artifact must be traceable to a verified commit. The application and SDK packages may version independently, but each release records all included versions and compatibility notes.

The canonical release history is [`docs/releases.md`](releases.md). Add and review the matching versioned entry before creating a GitHub Release; the public `/changelog` page reads the same record.

## Required checks

```bash
npm ci --legacy-peer-deps
npm run typecheck
npm run lint
npm run test:content
npm run test:activation
npm run test:regions
npm run test:sdk:ts
npm run test:sdk:python
npm run build
```

Provider-backed checks are also required when changing regional infrastructure, billing, authentication, ingestion, or deployment configuration.

## Candidate procedure

1. Confirm the checkout contains only intended, reviewed changes.
2. Confirm the candidate commit is on `main` or is an explicitly reviewed release tag.
3. Generate release metadata with `npm run release:metadata`.
4. Validate the canonical release log with `npm run validate:release-log`.
4. Build and smoke-test the application and both SDK artifacts.
5. Deploy the exact candidate commit to staging.
6. Run platform, authentication, ingestion, trace-display, evaluation, billing, and regional checks.
7. Create a draft GitHub Release with categorized changes, migration notes, limitations, artifact versions, and rollback notes.
8. Obtain human approval before production promotion.
9. Verify the production deployment resolves to the candidate commit.
10. Run and record post-release checks.

## Publishing rules

- Publishing credentials belong in a protected `release` environment.
- Prefer npm provenance/trusted publishing and PyPI trusted publishing where supported.
- Never publish from a dirty worktree or from an unverified commit.
- Never print API keys, package tokens, trace payloads, or customer data in CI logs.
- Publish only artifacts built and validated in the same workflow run.

## Rollback

Application rollback reassigns the deployment alias to the last verified application commit. It does not automatically roll back Convex schema or data. SDK packages are immutable after publication; a broken SDK receives a corrective patch release and migration note.

## Known limitation

The EU deployment currently uses Inngest Cloud in the United States for asynchronous event processing. Do not describe the EU path as end-to-end EU-resident until the queue/worker boundary is changed and verified by a completed trace canary.
