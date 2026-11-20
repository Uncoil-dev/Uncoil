@AGENTS.md

## Pull request rules

- One task per PR, under about 200 changed lines. Open PRs against `main`.
- Code changes need tests. Content changes must pass the blog and docs validators.
- Open every PR with auto-merge on (squash), except anything touching auth, billing, secrets, infra or data deletion, or visible UI changes. Leave those for owner review.
- Run a separate review pass for bugs before enabling auto-merge. Fix or flag what it finds.
- Never push to `main`. Never weaken CI or branch protection.
- Keep PR titles and text neutral and general. Never put setup or launch notes in PR text (unfinished steps, products, env var names, deploy steps). Keep internal plans out of the repo.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
