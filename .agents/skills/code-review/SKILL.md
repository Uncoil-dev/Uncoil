---
name: code-review
description: Bug-review pass for a pull request in this repository. Use before enabling auto-merge or when asked to review a diff.
---

# Code review

Full rules are in `REVIEW.md`. Project conventions are in `AGENTS.md`.

## Approach

1. Read the PR description to learn the intended task.
2. Read the whole diff. Review only what the PR adds or makes worse.
3. Treat unrelated changes as a finding.
4. Run lint, `npx tsc --noEmit` and the relevant tests if you can.

## What blocks merge

- Broken behavior, data loss or corruption, crashes on user-facing paths.
- Weakened auth, billing, secret handling, CI or branch protection.
- A broken ingest pipeline (`/api/ingest` -> Inngest -> Tinybird + Convex).
- Code changes without tests.
- Failing lint, type check or tests.

Everything else is a suggestion. Label it as one and do not hold the PR for it.

## Check against the right standard

- Dashboard pages: `docs/dashboard-page-standard.md`.
- Visual work: `docs/design-quality-bar.md` and the design rules in `AGENTS.md`.
- Blog and docs: the blog rules in `AGENTS.md`; `npm run test:content` must pass.
- Convex code: `convex/_generated/ai/guidelines.md`.
- Next.js code: `node_modules/next/dist/docs/`.

For anything touching access, URLs, secrets or tenant data, also apply the `security-review` skill.

## Reporting

- Order findings by severity: blockers first, then suggestions.
- Give each a file and line, one sentence on the problem, and a suggested fix.
- If nothing is wrong, say so plainly.
