# Uncoil blog publishing

Blog posts are Markdoc files (`.mdoc`) in this directory. The filename is for authors; the public URL comes from the `slug` frontmatter field.

To publish a post:

1. Copy `.agents/skills/uncoil-blog-tool/assets/blog-post.mdoc`, replace every placeholder, and keep the post a draft until publication is explicitly requested.
2. Put referenced images in `public/media` and use paths such as `/media/example.jpg`. Use a unique, article-specific hero and article-specific teaching visuals; never reuse another post's image as a shortcut.
3. Set `draft: false` and provide an ISO `publishedAt` timestamp.
4. Run `npm run validate:blog -- <slug>`, `npm run test:content`, `npm run lint`, and `npm run build` before merging.

Required frontmatter fields are `title`, `slug`, `excerpt`, `publishedAt`, and `author`. `categories`, `tags`, and `relatedPosts` are string arrays. Related posts use slugs. `heroImage` accepts `src`, `alt`, and optional `card`, `hero`, `og`, and `caption` variants. SEO overrides live under `seo`.

Markdoc supports CommonMark plus Markdoc tags and annotations. The application validates every file before rendering, so malformed frontmatter or Markdoc fails the build instead of publishing a broken article.

### Non-negotiable length requirement

Every new or materially rewritten published post must be **3,000–10,000 body words**, excluding frontmatter. This is a hard content-contract gate. Posts around 300 or 1,000 words are incomplete and must not be published. Reach the minimum with original, topic-specific teaching: a clear operating model, evidence, worked examples, failure modes, trade-offs, security boundaries, rollout guidance, FAQs, and a practical next action. Never reach the count through repeated paragraphs, keyword stuffing, or generic filler. Run `npm run validate:blog -- <slug>` and confirm the exact count before opening a PR.

## Mandatory Uncoil editorial framework

Every published post follows the same editorial shape. This is a product requirement for the blog, not an optional style preference:

1. **Promise:** a specific title, useful excerpt, author/date metadata, and a meaningful hero image created for that article. Do not share hero assets between posts or pass off a recolor as a new composition; card, hero, and OG crops may derive from the same article-specific source.
2. **Orientation:** open with the reader’s production situation, the decision they need to make, and the boundary of the article.
3. **Navigation:** the page automatically renders a collapsible table of contents from the article’s H2/H3 headings.
4. **Operating model:** name the article’s framework or decision model and explain its parts before diving into implementation.
5. **Evidence:** include at least one concrete example, code block, table, formula, trace, screenshot, or diagram where it improves understanding.
6. **Composition:** use natural two-part title structures for the shared slash treatment and reserve the centralized `highlight` tag for important decisions, risks, and outcomes. Keep highlights sparse and readable.
7. **Interaction:** include one deterministic, accessible Markdoc interaction—normally a trace scenario, evaluation explorer, calculator, checklist, or focused decision widget.
8. **Trade-offs:** state limitations, failure modes, security boundaries, and what the recommendation does not solve.
9. **Action:** close with a practical checklist, next step, or release decision and contextual links to the next Uncoil guides.
10. **FAQ and recommendations:** finish with exactly one late FAQ containing exactly five article-specific questions. Never add an in-body “Recommended next reads” block; the shared related-post component resolves curated, category, and recency fallbacks dynamically.

Use this article rhythm for each major section:

> Point → evidence → example → trade-off → reader action

Do not satisfy the framework with decorative headings or a link dump. The content test checks the structural requirements for every published post, and the renderer supplies the shared table of contents and heading anchors automatically.

## Article archetype repertoire

Choose one primary archetype before outlining. The mandatory framework still applies, but the article's modules and pacing should match the reader's job instead of repeating one universal template.

| Archetype | Use when the reader needs to… | Core modules | Best-fit interaction |
| --- | --- | --- | --- |
| Definitive guide | Understand a system and complete a multi-step workflow | Plain-language definition, setup or model, sequential H2 steps, screenshots or diagrams, field notes, troubleshooting, FAQ | Guided checklist, trace walkthrough, or configuration explorer |
| Decision framework | Make or defend an operational choice | Metric chain, named framework, numbered stages, formulas or decision tables, worked example, limitations, operating cadence | Calculator, scenario chooser, or evaluation explorer |
| Practical library | Find and adapt a useful artifact quickly | Short starter set, adaptation framework, grouped library by role/use case, copyable examples, quality checks, navigation shortcuts | Copyable template, filter, generator, or focused sandbox |
| Implementation tutorial | Build and verify a specific capability | Prerequisites, architecture boundary, runnable steps, expected output after each step, failure cases, rollback, final verification | Sandboxed code, trace replay, or step validator |
| Comparison or benchmark | Select between approaches or interpret measured results | Explicit criteria, evidence and methodology, comparison table, scenario-based recommendations, trade-offs, conditions that change the answer | Weighted comparison, benchmark explorer, or cost/latency calculator |

Use a small repertoire of recurring editorial modules rather than a single page recipe: fast answer, named model, numbered decision sequence, note or warning, code artifact, decision table, screenshot or diagram, worked example, FAQ accordion, and final action. Distribute these modules across the full article. Do not place every visual or interactive element in the opening section, and do not add a second widget when a static table or callout teaches the point better.

For a practical library, lead with a small high-value set before the long collection, teach readers how to adapt the artifacts, group entries under descriptive H2/H3 headings, and make each entry independently useful. For a long definitive guide, alternate explanation with proof—screenshots, code, tables, or field notes—so no long stretch becomes undifferentiated prose. For a decision framework, carry one example through the stages so the reader sees the framework produce a decision.
## Future-agent quality gate

Agents editing blog content must follow this sequence and leave evidence for each stage:

1. **Understand:** read `AGENTS.md`, the writing skill and its four references; inspect the current post, product source, published slugs, and media; state the reader job, outcome, boundary, archetype, and interaction.
2. **Build:** preserve frontmatter and draft state; write Markdoc with layered H2/H3/H4 headings, useful evidence, tested or honestly labeled code, a unique article-specific hero, at least two unique instructional visuals distributed across both halves, semantic tables, five accessible late FAQ items, two labeled notes, restrained highlights, at least two instructional panels with different tones, and one deterministic interaction. Audit published image references before selecting filenames or generating art.
3. **Connect:** add at least two descriptive contextual links to distinct existing published posts and finish with a checklist or next action. Keep recommendations in frontmatter; never write an in-body recommendation dump.
4. **Inspect:** render the entire page on desktop and mobile. Check the ToC, heading anchors, interactions, tables, code, images, links, recommendation cards, focus states, word wrapping, and page-level overflow.
5. **Release:** run `npm run validate:blog -- <slug>`, `npm run test:content`, `npm run lint`, `npm run build`, and `git diff --check`; review the exact diff for scope, drafts, fabricated claims, dead links, and untested examples before creating or merging the PR.

If an item cannot be verified, the post is not finished. Explain the blocker or fix it before shipping.

New posts must include exactly one purposeful interactive learning element at the point where it helps most. Use the approved trace scenario now; add a new centralized interaction type only when the topic genuinely requires it and its renderer, accessibility, and validation are implemented first. Do not use MDX or raw JSX. Interactive examples must be deterministic and local; never execute arbitrary code on the server or access secrets or production data.

## Article template anatomy

Every article renders through the same landing-style template in `src/app/(frontend)/blog/[slug]/page.tsx`:

- Dark header with dithered artwork, category chips, author, date and reading time.
- Full-width hero image, then a sticky left rail (section list that follows the reader, share buttons).
- Body: the first paragraph renders as a large lede, `##` headings become the section list, blockquotes render as dark pull-quotes, and `**bold**` gets the yellow highlight.
- End of article: a yellow "Watch your own agent think" call to action, the author card and related posts.

Write for that rhythm: a strong first paragraph, short `##` sections, one pull-quote per major idea. No raw HTML.
