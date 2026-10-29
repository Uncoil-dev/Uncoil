# uncoil — Agent Observability Platform

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read `node_modules/next/dist/docs/` before writing any Next.js code.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->
This project uses Convex as its backend. **Always read `convex/_generated/ai/guidelines.md` first** before writing Convex code. The file contains rules that override what you may have learned about Convex from training data.
<!-- convex-ai-end -->

**Critical:** Read `memory.md` at session start. Update `memory.md`, `task.md`, `implementation_plan.md` after every major task. Task-file hygiene is mandatory: when an agent finishes a task, remove the completed item from the active task file rather than leaving it as a permanent checked-off backlog entry. Preserve durable history in `memory.md`, a changelog, PR history, or another explicitly historical section when that history is useful; do not duplicate completed work in active task lists. Before finishing, scan the task files it touched and remove completed entries, stale empty headings, and superseded duplicates while preserving unresolved owner/blocker items.

## Commands
- `npm run dev` — Next.js dev server on :3000
- `npm run build` — Builds Next.js (Convex generated bindings are committed, not generated at build time)
- `npm run lint` — ESLint
- `npm run test:content` — Validate the Markdoc blog loader, rendering inputs, reading time, and legacy conversion
- `npm run deploy:convex` — Deploy Convex to production
- `npm run smoke:beta` — Beta smoke tests (requires env vars for full coverage)
- `npx convex dev` — Run Convex dev backend (runs alongside `npm run dev`)
- `npx convex dev --once --typecheck disable` — Sync Convex once after schema/function changes
- `npx convex codegen` — Regenerate Convex type bindings after schema changes
- `npm run build` (in `packages/ts-sdk/`) — Build the TypeScript SDK

## Architecture
- **Path aliases:** `@/*` → `./src/*`, `convex/*` → `./convex/*`
- **Ingestion:** SDK → `POST /api/ingest` → Inngest → Tinybird (raw spans) + Convex (run summaries). Tinybird = time-series telemetry. Convex = app metadata (projects, agentRuns, alerts, comments). Redis = API cache between Tinybird and dashboard.
- **Auth:** Clerk Keyless mode for local dev. Convex authenticates via Clerk JWT template named `convex` with `aud: "convex"`. Clerk v7 uses `<Show>`, not deprecated `<SignedIn>`/`<SignedOut>`.
- **API keys:** HMAC-SHA256 with `UNCOIL_API_KEY_HASH_SECRET`. Prefix: `uncoil_sk_live_` (legacy `uncoil_sk_live_` accepted). Plaintext never stored server-side — shown once during onboarding.

## Conventions
- **Design:** Marketing pages (`/`, `/pricing`, `/product/[feature]`, shared navbar/footer) use exactly three colors — cream/off-white (`#eceae3`) backgrounds, near-black (`#090909`) text/panels, and yellow (`#f4d44d`/`#fff4b5`) as the only accent. No navy, no rainbow accent system, no blue. 0px border-radius everywhere. Geist Pixel Square for logos/H1s, Geist Mono for UI/data, Geist Sans for prose. Tailwind v4 + shadcn/ui (`base-nova`). This is the current, intentional design — do not reintroduce a multi-color/navy "rebrand" system without the user explicitly asking for it (one was tried and reverted; see git history around commit 334ad09 for the exact revert point if this needs restoring again).
- **Design quality bar (owner rule):** The landing page and Dissolve logo from PR #171 are the minimum standard for all visual work. Read `docs/design-quality-bar.md` before any design task; only work that matches or beats that benchmark may be proposed or merged.
- **Design exploration workflow:** Never redesign or restyle marketing pages directly on `main`. Any new visual direction — palette change, new homepage layout, new component treatment — goes on its own branch with its own draft PR and Vercel preview link, so it can be reviewed live before anything touches production. Only merge a design PR when the user explicitly approves what they see in the preview. Multiple competing ideas can exist as separate open draft PRs at once; don't feel pressure to pick one before the user has seen previews of each.
- **Dashboard pages:** Every live dashboard page follows `docs/dashboard-page-standard.md`; the Tracing page (`src/components/dashboard/tracing/`) is the reference implementation.
- **Dashboard localStorage keys:** `uncoil.sidebar.collapsed`, `uncoil.lastProjectId`, `uncoil:dashboard-sidebar-groups`, `uncoil.onboarding.*`, `uncoil.tracing.columns`, `uncoil.tracing.live`
- **`legacy-peer-deps=true`** in `.npmrc`. Use `npx.cmd` on Windows for shadcn additions.
- **React:** Server Components by default, Client Components at leaf nodes.

## Existing Pages
### Marketing (public)
`/` — Landing (Hero → Problem → DebugStream → FirstTrace → WhatYouGet → UseCases → PricingTeaser → FinalCTA)
`/pricing` — Free/Pro/Team/Enterprise
`/product/[feature]` — Static feature pages (trace-viewer, cost-dashboard, tool-calls, llm-calls, failures — all placeholder)
`/use-cases/[slug]` — Use case pages (research, support, automation, tool-calling)
`/blog`, `/blog/[slug]`, `/blog/rss.xml` — Repository-backed Markdoc blog
`/changelog` — Product updates
`/docs`, `/docs/[...slug]` — Documentation (rendered from markdown)
`/privacy`, `/terms` — Legal

### Authenticated (dashboard)
`/dashboard` — Project selector / start state
`/dashboard/[projectId]` — Overview with charts
`/dashboard/[projectId]/runs` — Paginated runs table
`/dashboard/[projectId]/runs/[runId]` — Trace viewer
`/dashboard/[projectId]/costs` — Cost analysis with savings chart
`/dashboard/[projectId]/billing` — Usage + plan tier
`/dashboard/[projectId]/api-keys` — API key management
`/dashboard/[projectId]/alerts` — Redirects to overview
`/dashboard/[projectId]/manage` — Project management + stats
`/dashboard/[projectId]/settings` — Project settings + members
`/dashboard/[projectId]/reports` — Print-friendly project report
`/dashboard/[projectId]/docs` — In-app docs viewer
`/dashboard/[projectId]/quickstart` — Quickstart guide

### Auth / Onboarding
`/sign-in`, `/sign-up` — Clerk auth pages
`/onboarding`, `/onboarding/project`, `/onboarding/api-key`, `/onboarding/install`, `/onboarding/waiting`, `/onboarding/success`

## Public product pages
`/integrations`, `/contact`, `/security`, and `/status` are implemented public surfaces. Keep their claims grounded in the actual integrations, support path, security posture, and regional health checks; do not reintroduce them as missing-page work.

## Gotchas
- **Next.js 16 breaking changes.** Read `node_modules/next/dist/docs/` before writing Next.js code.
- **Convex `_generated/` bindings are committed to git.** Run `npx convex codegen` after schema changes.
- **Verification is layered.** Node contract/content tests, Playwright E2E tests, `npm run smoke:beta`, and `scripts/platform-smoke.mjs` are available; provider-backed checks still require their documented credentials.
- **Convex + Clerk auth mismatch** is the most common production issue. See `docs/troubleshooting-convex-clerk-auth.md`.
- **`scripts/`** and **`scratch/`** excluded from TypeScript compilation.
- **`convex/auth.config.ts`** must point to the correct Clerk issuer per environment.
- **Turbopack may OOM** on Windows during `npm run build` (Rust panic in `globals.css`). This is a system memory issue, not a code problem — use `npm run dev` to verify compilation.
- **Marketing product feature pages** (`/product/[feature]`) have feature-specific content; update the relevant page and its metadata when changing a product surface.
- **SDKs** (`packages/ts-sdk/`, `packages/python-sdk/`) are built but not yet published to npm/PyPI.

## Git workflow

- Default to a `codex/<description>` branch and a draft pull request.
- Use pull requests for features, backend or schema changes, authentication, billing, dependencies, migrations, and broad UI work.
- Direct pushes to `main` are allowed only for small, low-risk content fixes after required checks pass.
- Never push directly to `main` unless the user explicitly requests it.
- Before publishing, inspect the staged diff and exclude unrelated scratch files or user changes.
- **Design/visual changes specifically:** always land on a draft PR with a live Vercel preview link first, regardless of how confident the change seems — screenshots from a headless browser are a sanity check, not a substitute for the user seeing the real preview. Merge only after explicit approval of that preview.

## SEO and production release guardrails

- Read `docs/seo-release-checklist.md` before changing public routes, metadata, sitemap entries, robots rules, canonical URLs, social cards, redirects, or production deployment configuration.
- Before merging, record the intended release commit and confirm every required commit is in the pull request head. A commit pushed after a pull request is merged is not part of `main`; open a follow-up pull request instead of assuming it shipped.
- Before deploying, fetch `origin`, verify the intended commit is an ancestor of `origin/main`, and verify the deployment tree exactly matches `origin/main`. Never deploy a feature branch while describing it as the latest main release.
- The production Vercel project is `uncoil-tech/uncoil`. Confirm `.vercel/project.json` names `uncoil` before a CLI deployment. Deploy from a clean tracked tree or clean worktree so `scratch/`, logs, downloaded references, and unrelated user files are never uploaded.
- A deployment is complete only after Vercel reports `Ready`, `https://www.uncoil.dev` resolves to that deployment, and critical live routes return their expected status and metadata.
- Submit IndexNow only after its verification key returns HTTP 200 from the canonical production host with the exact expected key. Then request a fresh Ahrefs crawl; never treat an older crawl as evidence for the new release.

## Markdoc Blog Rules
- **Required skill:** Read `.agents/skills/uncoil-blog-tool/SKILL.md` before writing, editing, reviewing, storing, or publishing any blog post or documentation.
- **Per-post quality gate:** Every new or materially rewritten blog post must pass `npm run validate:blog -- <slug>`. This targeted gate enforces the approved editorial composition, unique images, lower-half visual pacing, five-item late FAQ, and practical ending; a generic repository test is not a substitute.
- **Hard length gate:** Every new or materially rewritten published post must contain 3,000–10,000 body words, excluding frontmatter. A post below 3,000 words is unfinished; do not publish or merge it. Use `npm run test:content` to verify the count.
- **Canonical presentation gate:** Word count alone is never completion. Every published post also needs a unique article-specific hero, at least two unique teaching visuals distributed through the body, practical or clearly labeled illustrative code, semantic tables, mid-article decision notes, multiple instructional editorial panels, restrained highlights throughout both halves, exactly one late FAQ with five questions, and one purposeful deterministic interaction.
- **Editorial composition:** Rendered blog titles may use decorative slash separators between natural title segments without changing source titles, slugs, metadata, or heading anchors. Use the centralized `highlight` Markdoc tag only for a small number of high-impact concepts; never add raw HTML or one-off styling to `.mdoc` files.
- **Canonical agent instructions:** Follow `docs/blog-canonical-format-playbook.md` as the authoritative content-manager and agent workflow. It overrides informal shortcuts and requires evidence-led expansion rather than keyword stuffing or repeated filler.
- Blog content lives exclusively in `content/blog/*.mdoc`; do not add a database or CMS fallback.
- Start new articles from `.agents/skills/uncoil-blog-tool/assets/blog-post.mdoc`; do not copy a published post’s structure or media. Required frontmatter: `title`, `slug`, `excerpt`, `publishedAt` (ISO timestamp), and `author`. Keep `categories`, `tags`, and `relatedPosts` as string arrays; related posts reference slugs.
- Preserve publication state. `draft: true` must remain private and return 404. Publish only when explicitly requested by changing it to `draft: false`; never publish migrated or unfinished content implicitly.
- Store blog images in `public/media` and reference them with `/media/<filename>`. Every image requires meaningful `alt` text. `heroImage` may also define `card`, `hero`, `og`, and `caption` fields.
- Write article bodies in CommonMark/Markdoc. Do not introduce raw JSX or MDX into `.mdoc` files. Add custom Markdoc tags through the centralized Markdoc configuration and React component map rather than one-off parsing in routes.
- For every new article, include exactly one purposeful interaction at the point of need. Use an approved centralized Markdoc interaction or implement and validate a new centralized type first. Keep interactions deterministic, accessible, mobile-safe, and isolated from secrets and production data.
- Keep blog data access centralized in `src/lib/markdoc-blog.ts` and rendering centralized in `src/components/blog/markdoc-rich-text.tsx`. Blog pages, RSS, sitemap, metadata, and related-post logic must consume that shared content layer.
- Before completing any new or materially rewritten blog post, run `npm run validate:blog -- <slug>`, `npm run test:content`, and `npm run build`. Duplicate slugs, malformed frontmatter, invalid Markdoc, missing required fields, or accidental draft exposure are release blockers.
- Publishing workflow documentation lives in `content/blog/README.md`; update it whenever the authoring contract changes.

## AI discovery
- Keep the curated site guide at `public/llms.txt`. Use only canonical, public, non-draft URLs and concise descriptions grounded in the linked pages.
- Update `public/llms.txt` when core documentation routes or major public product surfaces change. Do not list authenticated routes, unpublished content, secrets, or speculative capabilities.
- Treat `llms.txt` as an emerging agent-discovery convention, not a replacement for crawlable HTML, canonical metadata, structured data, `robots.txt`, or `sitemap.xml`.
