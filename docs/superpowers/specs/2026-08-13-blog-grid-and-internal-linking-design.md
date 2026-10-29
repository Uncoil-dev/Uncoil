# Blog grid and internal-linking design

## Goal

Make the blog index easier to scan, remove its duplicate newsletter signup, and ensure current and future articles use contextual internal links with meaningful anchor text.

## Blog index

Replace the current dominant featured-post layout with a restrained bento grid inside the existing 1240px editorial frame.

- The newest post spans two of three desktop columns, but its image height is capped so it cannot dominate the viewport.
- Remaining posts occupy consistent single-column cards.
- Every card shows its own image, publication date, reading time, title, excerpt, and clear reading affordance.
- Borders, spacing, numbering, and alternating restrained surfaces distinguish adjacent cards without relying on one oversized feature.
- Tablet uses two columns. Mobile uses one column with consistent image aspect ratios.
- Card titles and excerpts have bounded lengths so unusually long content cannot distort the grid.
- Category filtering and existing post ordering continue to work.

Remove the `Monthly dispatch` blog-page band and its `NewsletterCta`. The global site footer remains the single newsletter signup on `/blog`.

## Internal links in articles

Retrofit all 10 existing Markdoc articles with contextual links to relevant Uncoil articles. Links must occur in ordinary explanatory sentences and use descriptive anchor phrases such as `[LLM tracing](/blog/llm-tracing-explained)`.

Each article must contain at least two distinct internal blog links when two relevant targets exist. A link is valid when:

- its target is another existing published post;
- its anchor describes the target topic;
- it supports the surrounding explanation;
- it does not use a raw URL, `click here`, `read more`, or a fabricated claim;
- it does not link the article to itself.

Links should be distributed through the body rather than collected into an artificial SEO block. Existing related-post metadata remains independent of contextual body links.

## Future-agent rule

Update `.agents/skills/uncoil-blog-tool/` so agents writing or materially editing a blog post must:

1. inspect the current published-post inventory;
2. add at least two relevant, descriptive internal links when eligible targets exist;
3. verify every `/blog/<slug>` target exists and is published;
4. preserve natural prose and omit a link when no truthful contextual relationship exists.

Update the reusable blog template with contextual anchored-link examples. The rule applies to new posts and material article edits, not typo-only corrections.

## Automated verification

Extend content tests or add a focused content-validation test that checks published articles for:

- at least two distinct internal blog targets when the corpus provides eligible targets;
- no self-links;
- no missing or draft target slugs;
- no generic anchors such as `click here` or `read more`;
- no bare internal blog URL used as anchor text.

The test should parse Markdown links rather than count raw `/blog/` strings. Existing frontmatter, media, draft behavior, RSS, and sitemap tests remain intact.

## Verification

- Run the internal-link validation and existing `npm run test:content` suite.
- Run focused ESLint and TypeScript checks.
- Run `npm run build` and confirm all blog routes are generated.
- Inspect `/blog` at desktop, tablet, and mobile widths.
- Confirm the footer newsletter remains and no page-level newsletter appears.
- Confirm all 10 article routes render their contextual links and images.

## Scope boundaries

This work does not rewrite article arguments, change publication dates, alter categories, replace the global footer, or introduce a CMS. It does not add unrelated marketing sections to the blog index.
