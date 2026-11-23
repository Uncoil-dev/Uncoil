---
name: good-prs
description: Checklist for opening a good pull request in this repository. Use before opening or updating a PR.
---
1. One task per PR, under about 200 changed lines. Split anything bigger.
2. Branch from `main`, name it `claude/<description>`, and open the PR against `main`. Never push to `main`.
3. Code changes need a focused test that failed before the fix. Content changes must pass `npm run test:content`.
4. Run `npm run lint`, `npx tsc --noEmit` and the tests for the touched area. Quote the result lines.
5. Update docs, README and changelog for anything the change touches.
6. Fill in `.github/PULL_REQUEST_TEMPLATE.md`: a short, neutral summary of what changed. No setup notes, env var names, internal plans or ticket links.
7. Run the `review` skill, then enable auto-merge (squash) unless the change touches auth, billing, secrets, infra or data deletion.
