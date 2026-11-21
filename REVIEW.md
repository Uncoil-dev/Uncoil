# Review rulebook

Rules for the bug-review pass on a pull request. Keep it focused: find real problems, skip taste.

## Scope

- Review only code the PR adds or makes worse. Do not report problems that already exist on `main`.
- Judge the diff against its stated task. Unrelated changes are a finding.

## Blockers

A finding blocks merge if it:

- Breaks behavior, loses or corrupts data, or crashes a user-facing path.
- Weakens auth, billing, secret handling, or CI and branch protection.
- Breaks the ingest pipeline (`/api/ingest` -> Inngest -> Tinybird + Convex).
- Adds a code change without tests.
- Fails lint, `npx tsc --noEmit`, or the tests for the touched area.

Everything else is a suggestion. Say so and do not hold the PR for it.

## Standards to check against

- Dashboard pages: `docs/dashboard-page-standard.md`.
- Visual work: `docs/design-quality-bar.md` and the design rules in `AGENTS.md`.
- Blog and docs content: the blog rules in `AGENTS.md` and `docs/blog-canonical-format-playbook.md`; content must pass `npm run test:content`.

## Security checklist

- Auth: every route, server action and Convex function checks the caller and their access to the project.
- Billing: plan limits and usage cannot be bypassed or set from the client.
- Secrets: nothing sensitive in code, logs, errors, client bundles or PR text. API key plaintext is never stored.
- Outbound URLs: user-supplied URLs are validated and restricted (no internal hosts, no open redirects).
- Data deletion: scoped to the right project, and recoverable or confirmed where expected.

## Reporting findings

- List findings by severity, highest first: blocker, then suggestion.
- Give each one a file and line, one sentence on the problem, and a suggested fix.
- If there are no findings, say so plainly.
