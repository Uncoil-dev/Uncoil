# Uncoil blog and documentation canonical format playbook

This playbook is mandatory whenever an agent creates, edits, reviews, stores, or publishes an Uncoil blog post or public documentation. It applies to every change, including a new article, rewrite, migration, typo-plus edit, metadata update, image change, internal-link change, or documentation update.

## Hard length gate

Every new or materially rewritten published blog post must contain **at least 3,000 and at most 10,000 body words**, excluding YAML frontmatter. This is a release requirement, not an estimate. A 300-word or 1,000-word post is incomplete and must not be published. Reach the minimum with original, topic-specific explanation, evidence, worked examples, trade-offs, failure modes, security boundaries, operational guidance, FAQs, and next actions. Never inflate an article with duplicated paragraphs, keyword stuffing, or generic filler. The repository content contract must reject a published post outside this range.

The canonical visual and editorial reference is the AI Agent Monitoring article:

`/blog/ai-agent-monitoring`

## Copy-paste prompt for the content manager

Use this prompt when refining any of the other 26 published posts:

> Refine this Uncoil blog post to the quality and usefulness of `/blog/ai-agent-monitoring` without changing its slug, publication state, author, published date, or making unsupported product claims.
>
> Hard length requirement: the final body must be 3,000–10,000 words, excluding frontmatter. Do not submit a shorter draft or call a partial expansion complete. Verify the count with the repository content test.
>
> Before editing, read `AGENTS.md`, `.agents/skills/uncoil-blog-tool/SKILL.md`, its required references, `docs/blog-canonical-format-playbook.md`, the complete target article, the complete AI Agent Monitoring reference article, the shared Markdoc renderer and blog styles, the published-slug list, and the relevant Uncoil product source. State the reader, job, promised outcome, article boundary, archetype, evidence, and one interaction before you write.
>
> Preserve the target article’s frontmatter and draft/publication state. Keep the article in CommonMark/Markdoc. Do not add raw JSX, MDX, invented benchmarks, invented integrations, speculative roadmap claims, or unverified runnable code.
>
> Rebuild the article around a clear operating model, using the monitoring article’s rhythm: orient the reader in the opening; provide an “At a glance” section; name a topic-specific framework or decision path; organize the body into numbered H2 phases with nested H3 decision points; and make every major section move from point to evidence, example, trade-off, and reader action. Keep the framework narrower than the whole topic and state what it does not solve.
>
> Add concrete evidence where it teaches the subject: a small tested or clearly illustrative code block, semantic table, formula, trace example, diagram, decision rule, or checklist. Examples must expose the field or condition that changes the decision. Explain failure modes, security boundaries, ownership, cost, latency, rollout, and reversible next actions when relevant to the topic.
> For titles with a natural two-part structure, the shared renderer supplies a decorative slash separator. Keep the source title semantic and unchanged. Use the centralized `highlight` Markdoc tag sparingly for a decision, risk, or outcome that deserves visual priority; do not use raw HTML or style individual posts with one-off classes.
>
> Add exactly one purposeful, deterministic, accessible interaction at the point of need. Prefer an existing centralized Markdoc tag such as `trace-scenario` or `faq-item`; do not create one-off parsing, arbitrary code execution, network-dependent behavior, secrets, or production data access. If interaction would not improve learning, keep the article static and explain that choice in the review notes.
>
> Include one FAQ section using the shared accordion pattern, with useful questions specific to this article. Do not create a second generic FAQ section. Use descriptive contextual links in natural prose to existing published posts only; target roughly 4–7 useful links per 1,000 long-form words, never a link dump, bare URL, self-link, “click here,” or “read more.” Finish with a practical checklist, next action, or release decision. Let the existing related-post cards provide recommendations instead of adding a prose recommendation dump.
>
> Keep the complete page readable on desktop and mobile: structured ToC, layered headings, keyboard-accessible interaction, visible focus states, readable tables and code, meaningful image alt text, no mid-word breaking, and no page-level horizontal overflow. Verify every image path against the repository media inventory and do not guess or add local-only assets.
>
> Review the rendered article, not only the source. Run `npm run test:content`, `npm run lint`, `npm run build`, and `git diff --check`. Audit the final diff for accidental draft changes, dead links, missing images, duplicated sections, fabricated claims, untested examples, and unrelated files. Work in small reviewable batches, one focused commit or PR per article or clearly defined batch, and report the evidence and any blocker before calling the post finished.

The manager should apply this prompt to the remaining posts in small batches, starting with the articles whose structure is thinnest or whose topic has the highest reader value. Do not rewrite all 26 in one unreviewable change. After each batch, compare the rendered result against `/blog/ai-agent-monitoring`, run the content contract, and record which posts are complete and which still need evidence, interaction, FAQ, or visual QA.

## Required article feel

- Open with the reader's job, user-visible outcome, and article boundary.
- Use layered H2/H3/H4 headings. Do not create a flat wall of H2 headings.
- Use restrained emphasis. Avoid bolding several phrases in every paragraph; emphasize only the one idea the reader must remember.
- Add decision-rule notes for limits, trade-offs, ownership, and bounded next actions.
- Use useful tables, tested code, trace examples, formulas, screenshots, or diagrams.
- Include exactly one purposeful deterministic interaction where it materially improves learning.
- Use one FAQ section rendered with the shared accordion pattern. Never add a second generic FAQ section.
- Place the FAQ after the article’s main teaching, examples, and trade-offs; it must not appear in the opening third of the body.
- Include at least one practical code artifact, one meaningful in-article visual, and mid-article decision notes; the hero image alone does not satisfy the visual requirement.
- Use descriptive contextual internal links in natural prose.
- End the article without a prose recommendation dump. The existing related-post cards are the recommendation UI.
- Keep the complete article readable on mobile: no page-level horizontal overflow, mid-word breaking, or unusable tables/code blocks.

## Images

- Every article needs a meaningful hero image and useful in-article visuals where they improve understanding.
- Each article should have a distinct tracked image asset when the media inventory supports it.
- Verify every image path against `git ls-tree -r --name-only origin/main public/media` before publishing.
- Use descriptive alt text that explains the image's job for the reader.
- Never reference local-only, untracked, resized, or guessed image paths. A broken image is not a visual element.
- Prefer diagrams, trace views, signal maps, decision flows, or relevant photography over decorative icons.

## Frontmatter and content contracts

- Preserve `title`, `slug`, `excerpt`, `publishedAt`, `author`, categories, tags, related posts, SEO metadata, and draft state.
- Do not publish drafts implicitly.
- Keep content in CommonMark/Markdoc. Do not add raw JSX or MDX to `.mdoc` files.
- Use centralized Markdoc tags and shared React renderers for interactions and FAQ accordions.
- Related-post cards consume `relatedPosts`; do not duplicate them as a long inline link list.

## Mandatory workflow for every blog or documentation change

1. Read `AGENTS.md`, `.agents/skills/uncoil-blog-tool/SKILL.md`, this playbook, and all required references before touching content or documentation.
2. Inspect the canonical monitoring article, shared blog renderer/CSS, current media inventory, published slugs, and the target article.
3. Write down the reader, job, outcome, boundary, article archetype, evidence, and interaction before editing.
4. Work from a clean `codex/...` branch based on `origin/main`.
5. Keep each PR scoped to the requested article or clearly defined batch. Never include unrelated dirty-worktree files.
6. Run `npm run test:content` and `git diff --check` before opening the PR.
7. Verify rendered HTML and the actual image URLs. Confirm exactly one FAQ heading and no recommendation prose dump.
8. Run required hosted checks, then merge only after they pass.

If this playbook was not read and its checks were not completed, the content or documentation change is not ready for review, PR creation, merge, or publication.

## Current repository context

- There are 27 published Markdoc posts in `content/blog`.
- AI Agent Monitoring is the canonical reference article.
- Its refinements were merged through PRs #42, #43, and #44.
- Future work should bring the other 26 posts toward this format in small, reviewable batches.
