# Blog Grid and Internal Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a balanced bento blog index and make contextual, descriptive internal links a tested requirement for current and future Uncoil articles.

**Architecture:** Keep the filesystem-backed Markdoc repository as the source of truth. Add a focused Markdown-link validator beside the content repository, exercise it with node:test and the real corpus, then reshape the existing server-rendered blog index without introducing client state or new dependencies.

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, Tailwind CSS v4, Markdoc/CommonMark, Node.js test runner.

## Global Constraints

- Keep the newest post visually prominent but cap its media height; it may span two of three desktop columns and must not become a full-width giant card.
- Use three columns on desktop, two on tablet, and one on mobile.
- Keep the global footer newsletter and remove only the blog-page `Monthly dispatch` band.
- Every published article must contain at least two distinct contextual links to other published posts when the corpus has eligible targets.
- Internal anchors must be descriptive; reject self-links, missing/draft targets, raw URL anchors, `click here`, and `read more`.
- Preserve publication dates, categories, images, article arguments, RSS, sitemap, and the repository-backed Markdoc architecture.

---

### Task 1: Add a contextual internal-link contract

**Files:**
- Create: `src/lib/blog-internal-links.ts`
- Create: `src/lib/blog-internal-links.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `BlogPost` objects from `src/lib/markdoc-blog.ts`, including `slug`, `draft`, and raw article source exposed through a new `source` field if required.
- Produces: `validateBlogInternalLinks(posts: BlogPost[]): BlogInternalLinkIssue[]`, where each issue contains `slug`, `code`, and `message`.

- [ ] **Step 1: Write failing validator tests**

Add node:test cases covering a valid two-link article, fewer than two distinct targets, a self-link, a missing target, a draft target, `click here`, `read more`, and a bare `/blog/<slug>` anchor. Use complete `BlogPost` fixtures or a small source-only fixture type accepted by the validator.

```ts
test("accepts two descriptive links to distinct published posts", () => {
  assert.deepEqual(validateBlogInternalLinks([
    post("first", "Compare [LLM tracing](/blog/tracing) with [production evaluations](/blog/evals)."),
    post("tracing", "Published target."),
    post("evals", "Published target."),
  ]), []);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types src/lib/blog-internal-links.test.ts`

Expected: FAIL because `validateBlogInternalLinks` does not exist.

- [ ] **Step 3: Implement link extraction and validation**

Parse inline Markdown links with a focused expression that captures anchor and destination, restrict validation to destinations matching `/blog/<slug>`, compare against the published corpus, and return deterministic issues. Do not count repeated links to the same target twice.

```ts
export type BlogInternalLinkIssue = {
  slug: string;
  code: "too-few" | "self-link" | "missing-target" | "draft-target" | "generic-anchor" | "bare-anchor";
  message: string;
};

export function validateBlogInternalLinks(posts: BlogPost[]): BlogInternalLinkIssue[];
```

Expose the original Markdoc source on `BlogPost` only if the validator cannot reliably inspect the existing parsed representation.

- [ ] **Step 4: Add the validator test to `test:content`**

Update the script so it runs `src/lib/blog-internal-links.test.ts` alongside the existing repository, reading-time, and conversion tests.

- [ ] **Step 5: Run the focused and full content suites**

Run: `npm run test:content`

Expected: PASS, including every negative validation case.

- [ ] **Step 6: Commit the validator**

```powershell
git add src/lib/blog-internal-links.ts src/lib/blog-internal-links.test.ts src/lib/markdoc-blog.ts package.json
git commit -m "Add blog internal link validation"
```

### Task 2: Retrofit contextual links across the published corpus

**Files:**
- Modify: `content/blog/ai-agent-evaluation-practical-guide.mdoc`
- Modify: `content/blog/ai-agent-observability-complete-guide.mdoc`
- Modify: `content/blog/ai-agent-reliability-failures-retries-guardrails.mdoc`
- Modify: `content/blog/ai-agent-testing-unit-tests-production-evals.mdoc`
- Modify: `content/blog/building-production-ready-ai-agents.mdoc`
- Modify: `content/blog/debug-ai-agents-in-production.mdoc`
- Modify: `content/blog/llm-observability-metrics-that-matter.mdoc`
- Modify: `content/blog/llm-tracing-explained.mdoc`
- Modify: `content/blog/prompt-versioning-and-prompt-management.mdoc`
- Modify: `content/blog/reduce-llm-costs-without-hurting-quality.mdoc`
- Test: `src/lib/blog-internal-links.test.ts`

**Interfaces:**
- Consumes: published slugs from the Markdoc repository and the validator from Task 1.
- Produces: 10 published articles with at least two distinct, relevant body links each.

- [ ] **Step 1: Add a failing real-corpus test**

Load `createBlogRepository().getPublishedPosts()` and assert that `validateBlogInternalLinks(posts)` is empty.

```ts
test("the published Uncoil corpus satisfies the internal-link contract", () => {
  const issues = validateBlogInternalLinks(getPublishedPosts());
  assert.deepEqual(issues, []);
});
```

- [ ] **Step 2: Run the corpus test and verify RED**

Run: `node --test --experimental-strip-types src/lib/blog-internal-links.test.ts`

Expected: FAIL with `too-few` issues for existing articles.

- [ ] **Step 3: Add natural anchored links to every article**

Edit existing explanatory sentences rather than appending an SEO list. Use connections such as observability → tracing/evaluations, reliability → testing/debugging, cost → metrics/prompt management, and production readiness → reliability/observability. Preserve the factual meaning and use root-relative URLs.

```md
Reliable diagnosis starts with [LLM tracing](/blog/llm-tracing-explained), while release confidence comes from [production evaluations](/blog/ai-agent-evaluation-practical-guide).
```

- [ ] **Step 4: Run corpus validation and content tests**

Run: `npm run test:content`

Expected: PASS with no invalid, generic, broken, draft, or self-referential links.

- [ ] **Step 5: Commit the article links**

```powershell
git add content/blog src/lib/blog-internal-links.test.ts
git commit -m "Add contextual links to blog articles"
```

### Task 3: Enforce the rule for future content agents

**Files:**
- Modify: `.agents/skills/uncoil-blog-tool/SKILL.md`
- Modify: `.agents/skills/uncoil-blog-tool/references/quality-bar.md`
- Modify: `.agents/skills/uncoil-blog-tool/assets/blog-post.mdoc`

**Interfaces:**
- Consumes: the validator contract and publication behavior established in Tasks 1–2.
- Produces: concise agent instructions and a reusable template that demonstrate contextual anchored links.

- [ ] **Step 1: Record a failing baseline scenario before editing the skill**

Run a fresh-context agent scenario without the proposed rule: “Draft an Uncoil post about retry loops using the repository template.” Record whether it omits internal links, uses a generic link list, or links to unverified slugs. The expected baseline failure is omission or unverified linking.

- [ ] **Step 2: Add the minimal structural rule**

Add a required workflow slot: inspect published slugs, place two contextual descriptive anchors when eligible targets exist, then run content validation. State that typo-only edits do not require link retrofitting and truthful relevance outranks link count.

- [ ] **Step 3: Update the quality checklist and template**

Add checks for two distinct relevant targets, published target status, descriptive anchor text, no self-links, and no generic/bare anchors. Put two natural example links in separate explanatory paragraphs of `blog-post.mdoc`.

- [ ] **Step 4: Validate the edited skill against the same scenario**

Run the same fresh-context scenario with the updated skill and confirm it inspects the corpus, chooses existing targets, embeds descriptive links in prose, and runs validation.

- [ ] **Step 5: Run skill and template checks**

Run the local skill validator, confirm `SKILL.md` remains below 500 words, parse the template through the real Markdoc repository, and run `npm run test:content`.

- [ ] **Step 6: Commit the future-agent rule**

```powershell
git add .agents/skills/uncoil-blog-tool
git commit -m "Require contextual blog links"
```

### Task 4: Replace the giant feature with a restrained bento grid

**Files:**
- Modify: `src/app/(frontend)/blog/page.tsx`
- Delete if unused: `src/components/blog/newsletter-cta.tsx`

**Interfaces:**
- Consumes: ordered `BlogPost[]` from `getPublishedPosts(category)`.
- Produces: a server-rendered responsive grid; the first card spans two desktop columns, all cards expose consistent metadata and bounded media.

- [ ] **Step 1: Add a structural contract check**

Create or extend a focused script/test that reads the page source and asserts the page-level `NewsletterCta`/`Monthly dispatch` is absent, a three-column desktop grid exists, the first card uses a bounded media aspect or max height, and every mapped card renders an image when available.

- [ ] **Step 2: Run the check and verify RED**

Expected: FAIL because the current page contains `NewsletterCta`, uses a two-column feature/sidebar composition, and lets the featured media flex to a minimum 520px card.

- [ ] **Step 3: Implement the restrained bento grid**

Remove the `NewsletterCta` import and final band. Render all posts in one `md:grid-cols-2 lg:grid-cols-3` grid. Give index zero `lg:col-span-2`, cap its media with `aspect-[16/7]` or an equivalent bounded height, use `aspect-[16/10]` for standard cards, and keep each card’s date, reading time, title, excerpt, and call to action. Apply borders through grid gaps or explicit edge-safe borders so cards remain distinguishable.

- [ ] **Step 4: Run focused checks**

Run:

```powershell
npx eslint "src/app/(frontend)/blog/page.tsx"
npx tsc --noEmit
npm run test:content
```

Expected: PASS.

- [ ] **Step 5: Verify responsive rendering**

Inspect `/blog` at approximately 1440px, 768px, and 375px. Confirm no image dominates the viewport, titles remain distinguishable, category filters work, the first card is restrained, and only the footer newsletter remains.

- [ ] **Step 6: Commit the grid**

```powershell
git add "src/app/(frontend)/blog/page.tsx" src/components/blog/newsletter-cta.tsx
git commit -m "Refine blog bento grid"
```

### Task 5: Run release verification and publish

**Files:**
- Modify: `task.md`
- Modify: `implementation_plan.md`
- Modify: `memory.md`

**Interfaces:**
- Consumes: completed content, skill, validator, and UI changes.
- Produces: verified repository state and an auditable release record.

- [ ] **Step 1: Run the complete verification set**

```powershell
npm run test:content
npx eslint "src/app/(frontend)/blog/page.tsx" src/lib/blog-internal-links.ts src/lib/blog-internal-links.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

Expected: all checks pass and the production build generates the blog index plus all 10 article routes.

- [ ] **Step 2: Update handoff records**

Record the internal-link contract, redesigned grid, newsletter removal, tests, and build result without modifying unrelated historical notes.

- [ ] **Step 3: Review and commit the release**

Stage only intended content, blog UI, skill, tests, and handoff files. Confirm scratch artifacts remain untracked.

```powershell
git commit -m "Improve blog discovery and internal linking"
```

- [ ] **Step 4: Push and verify production**

Push `main`, wait for Vercel Ready, then verify `/blog`, all 10 `/blog/<slug>` routes, all referenced images, and representative contextual links return HTTP 200.

