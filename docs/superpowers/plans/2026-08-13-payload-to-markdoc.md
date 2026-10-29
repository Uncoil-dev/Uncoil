# Payload to Markdoc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Payload CMS with repository-backed Markdoc content while preserving Uncoil's public blog, metadata, filtering, related posts, RSS feed, and sitemap.

**Architecture:** Store one `.mdoc` file per post under `content/blog` with validated YAML frontmatter and public media paths. A server-only content module reads, parses, validates, sorts, and filters posts; a focused React renderer converts the Markdoc render tree using Uncoil components. Existing App Router routes remain stable, while Payload admin/API routes and runtime/database dependencies are removed.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@markdoc/markdoc`, YAML frontmatter, Node test runner.

## Global Constraints

- Read `node_modules/next/dist/docs/` before changing Next.js code.
- Keep `/blog`, `/blog/[slug]`, `/blog/rss.xml`, and sitemap URLs stable.
- Preserve existing user changes and do not modify unrelated scratch artifacts.
- Markdoc is the sole blog content source after migration; no Payload runtime or database fallback remains.
- Follow test-driven development for new content-loading behavior.

---

### Task 1: Inventory and export source content

**Files:**
- Create: `scripts/export-payload-to-markdoc.mjs`
- Create: `content/blog/*.mdoc`
- Create or reuse: `public/media/*`

**Interfaces:**
- Consumes: Payload `posts`, `posts_rels`, `categories`, and `media` records from the configured database.
- Produces: Markdoc files with `title`, `slug`, `excerpt`, `publishedAt`, `author`, `categories`, `tags`, `relatedPosts`, `heroImage`, and `seo` frontmatter.

- [x] Inspect local and configured database counts without exposing credentials.
- [x] Add a dry-run exporter that converts Lexical nodes to Markdoc and copies or downloads referenced media.
- [x] Run the exporter and inspect every produced post and referenced asset.

### Task 2: Tested Markdoc content layer

**Files:**
- Create: `src/lib/markdoc-blog.ts`
- Create: `src/lib/markdoc-blog.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `getPublishedPosts(category?)`, `getPublishedPost(slug)`, `getCategoryOptions()`, `getPostDate(post)`, and Markdown reading-time inputs.

- [x] Write tests proving frontmatter validation, published-post sorting, category filtering, slug lookup, and Markdoc transformation.
- [x] Run `node --test --experimental-strip-types src/lib/markdoc-blog.test.ts` and confirm failure because the module does not exist.
- [x] Implement the loader with explicit filesystem injection for test fixtures and repository defaults for production.
- [x] Run the focused tests until all pass, then refactor without changing behavior.

### Task 3: Public blog rendering and feeds

**Files:**
- Create: `src/components/blog/markdoc-rich-text.tsx`
- Modify: `src/app/(frontend)/blog/page.tsx`
- Modify: `src/app/(frontend)/blog/[slug]/page.tsx`
- Modify: `src/app/(frontend)/blog/rss.xml/route.ts`
- Modify: `src/app/(frontend)/sitemap.ts`
- Modify: `src/components/blog/related-posts.tsx`
- Modify: `src/components/blog/reading-time.ts`

**Interfaces:**
- Consumes: the content-layer functions and `BlogPost` type from Task 2.
- Produces: unchanged public URLs and visual compositions rendered from Markdoc.

- [x] Replace Payload imports and object relationships with Markdoc post metadata.
- [x] Render transformed Markdoc through a server-compatible React component map.
- [x] Preserve category filters, related-post cards, SEO, JSON-LD, RSS, and sitemap entries.
- [x] Run focused tests, ESLint, and TypeScript checks.

### Task 4: Remove Payload runtime

**Files:**
- Delete: `src/app/(payload)/**`
- Delete: `src/payload/**`
- Delete: `src/payload.config.ts`
- Delete: `src/payload-types.ts`
- Delete: `src/lib/payload-blog.ts`
- Delete: `src/components/blog/payload-rich-text.tsx`
- Delete: `src/migrations/**`
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: lockfile
- Modify: dashboard/admin navigation that links to `/cms`

**Interfaces:**
- Consumes: complete Markdoc public path from Task 3.
- Produces: an application with no Payload imports, routes, scripts, dependencies, environment requirements, or CMS navigation.

- [x] Remove the Payload wrapper and all Payload packages/scripts.
- [x] Remove generated CMS routes/config/types/migrations and stale `/cms` navigation.
- [x] Search source, package manifests, and config for remaining Payload CMS references.

### Task 5: Full verification and handoff

**Files:**
- Modify: `memory.md`
- Modify: `task.md`
- Modify: `implementation_plan.md`

**Interfaces:**
- Produces: verified migration evidence and durable project handoff notes.

- [x] Run Markdoc content tests and validate all `.mdoc` files.
- [x] Run focused and full ESLint, TypeScript, `git diff --check`, and `npm run build`; record unrelated full-lint failures rather than expanding scope.
- [x] Start the production server and verify `/blog`, `/blog/rss.xml`, and `/sitemap.xml` return 200, while draft posts and removed CMS routes return 404.
- [x] Audit the objective against the final tree, then update project handoff files.
