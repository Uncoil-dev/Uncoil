---
name: git-workflow
description: Branch, commit and pull request conventions for this repository. Use when preparing, pushing or opening a change.
---

# Git workflow

Rules live in `AGENTS.md` (Pull request rules, Git workflow). This is the short version.

## Before you start

- Branch from the latest `main` as `claude/<description>` or `codex/<description>`.
- Never push to `main`. Never weaken CI or branch protection.
- One task per PR, under about 200 changed lines.

## Before you commit

- Run `npm run lint` and `npx tsc --noEmit`, plus the tests for the area you touched.
- Content changes also run `npm run test:content`.
- Code changes need tests.
- Inspect the staged diff. Leave out scratch files, logs and unrelated edits.
- Keep both lockfiles (`pnpm-lock.yaml`, `package-lock.json`) in sync when dependencies change.

## Opening the PR

- Open against `main`, as a draft unless told otherwise.
- Keep the title and text neutral and general.
- Do not put setup notes, unfinished steps, env var names, deploy steps or internal plans in PR text or in the repo.
- Record decisions in the PR description, not in new files at the repo root.

## Merging

- Run a separate bug-review pass first (see the `code-review` skill and `REVIEW.md`). Fix or flag what it finds.
- Auto-merge (squash) is fine for ordinary changes.
- Leave these for owner review, with no auto-merge: auth, billing, secrets, infra, data deletion, and visible UI changes.
- Design work goes on its own branch with a preview link and merges only after explicit approval.

## After merge

- A commit pushed after a PR merges is not on `main`. Open a follow-up PR instead.
