@AGENTS.md

# Uncoil — rules for every session

Product name is **Uncoil**. Never write "Tracify", except the legal notice "formerly Tracify – not affiliated with Tracify GmbH". Where this file and `AGENTS.md` differ, this file wins (AGENTS.md still mentions Clerk, Tinybird and Vercel; those are old).

## Workflow
- Plans, decisions and open questions live in the owner's private notes, not in this repo. Read and update them as the user-level instructions say.
- When you hand work to a subagent or another session, give a full brief: files involved, goal, what "done" looks like. Log each result in the private notes.
- Check GitHub state (PRs, tags) before you state it. Do not answer from memory.
- Other agents (for example Codex) also work this codebase. Avoid overlap; check open PRs first.

## Stack
- Next.js app (marketing + cloud dashboard), Convex backend, Better Auth, ClickHouse for traces, Redis, Stripe, Inngest.
- SDKs: `packages/ts-sdk`, `packages/python-sdk`.

## Commands (from package.json)
- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`
- Tests: `npm run test:content`, `test:tools`, `test:ask-ai`, `test:seo`, `test:sdk:ts`, `test:sdk:python`
- Blog gate: `npm run validate:blog -- <slug>`
- Smoke: `npm run smoke:beta`, `npm run smoke:platform`
- Local PR preview (Windows): `.\preview.cmd <PR#>`

## Git and release
- Draft PR → local preview → merge **only on the owner's explicit OK**. Open PRs against `main`.
- Merges do **not** auto-deploy. Never say a merge is "live" or "updating".
- Check GitHub tags before you suggest a version. SDKs publish through the "Publish SDKs" Action (merge the bump first).

## Design
- Bar = landing redesign PR #171 and the "Dissolve" pixel-bar logo. Black, cream, yellow only. Show previews or screenshots first. Read `docs/design-quality-bar.md`.

## Never
- Mention OpenCode, Big Pickle or "free" in Ask AI code, PRs or site.
- Touch legal page dates, deep docs guides or product-page FAQ copy.
- Rename live infrastructure (databases, buckets, hosts) without a safe plan.
- Rotate payment webhook secrets or signing keys.
- Commit secrets, `.env` files or private notes. This repo is public.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
