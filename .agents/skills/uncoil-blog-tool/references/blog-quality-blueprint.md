# Uncoil Blog Quality Blueprint

Use this blueprint for every new or materially rewritten Uncoil blog post. The rendered `/blog/ai-evaluation-metrics` article is the current quality benchmark: match its editorial confidence, visual pacing, and reading experience without copying its topic, section names, examples, frameworks, or artwork.

## Define the article before drafting

Write down these six decisions:

1. **Reader:** the specific person doing the work.
2. **Job:** the production decision or implementation they need to complete.
3. **Outcome:** what they can do after reading that they could not do before.
4. **Boundary:** what the article deliberately does not solve.
5. **Archetype:** definitive guide, decision framework, practical library, implementation tutorial, or comparison.
6. **Interaction:** the one reader-controlled element that materially improves the lesson.

If these decisions are vague, do not begin writing 3,000 words. Improve the premise first.

## Compose a long-form reading experience

The article should feel like an editorial report or a well-paced slide deck, not a continuous stream of `H3 → paragraph → H3 → paragraph`.

- Open with one deterministic interaction or concrete decision prompt, then orient the reader quickly.
- Introduce a named operating model and reuse it through the article.
- Alternate prose with evidence: diagrams, screenshots, tables, code, worked examples, blockquote notes, and editorial panels.
- Use H2 headings as major visual chapters. H3 headings are supporting moves, not the entire rhythm.
- Put at least one instructional image, one editorial panel, and two intentional highlights after the article midpoint. The lower half must be as composed as the opening.
- Use two or more editorial panels with different tones. Each panel must teach a decision, diagnostic shortcut, rule, or outcome.
- Use the centralized `highlight` tag only for consequential phrases. Keep 6–14 highlights across a long post, spread through the article, and never add a decorative slash inside paragraph text.
- Keep the decorative yellow slash in shared presentation beside H2 headings only. Do not type presentation slashes into source titles, H1 text, paragraphs, H3 headings, links, or metadata.
- End the teaching with a practical checklist, next move, or release decision. Follow it with exactly one late FAQ containing exactly five article-specific questions.
- Never add an in-body “Recommended next reads” section. The shared related-post component selects resilient recommendations after the article.

Use this rhythm inside important chapters:

> Point → evidence → example → trade-off → reader action

## Minimum evidence mix

A completed new or materially rewritten post must contain all of the following:

- 3,000–10,000 body words, with original topic-specific teaching rather than padding.
- One article-specific hero whose filename contains the article slug and is not used by another post.
- At least two distinct article-specific instructional images in the body, with one after the midpoint.
- At least eight H2 chapters and three useful H3 subsections.
- One tested or explicitly illustrative fenced code example.
- At least two semantic tables.
- At least two labeled notes or decision rules.
- At least two editorial panels using at least two distinct tones.
- 6–14 explicit highlights, with at least two after the midpoint.
- Exactly one approved deterministic interaction.
- At least two natural links to distinct published Uncoil articles.
- Exactly five FAQ accordion items in one FAQ section placed after the main teaching.
- A practical action section in the final 30% of the article.

These are composition floors, not a recipe for identical posts. A tutorial may emphasize code and expected output; a decision framework may emphasize scorecards and scenarios; a practical library may emphasize grouped examples. Do not reproduce the benchmark article’s structure mechanically.

## Image direction

Every post needs its own visual world.

- Inspect existing `heroImage` and `/media/` references before generating or choosing art.
- Make the hero compositionally distinct in subject, camera angle, layout, texture, and visual metaphor—not merely recolored.
- Create instructional visuals for this article’s concepts. Do not reuse another post’s hero or teaching image.
- Keep image text minimal, intentional, and readable. Prefer the canonical cream, black, and acid-yellow palette while allowing each article a different visual concept.
- Use a meaningful alt description that explains the instructional content or scene.
- Verify the exact files exist and render without cropping, distortion, or horizontal overflow.

## Source and presentation boundaries

- Keep content in CommonMark/Markdoc. Never add raw HTML, JSX, MDX, inline styles, or one-off route logic.
- Use centralized tags such as `highlight`, `editorial-panel`, `trace-scenario`, and `faq-item`.
- Preserve semantic titles, slugs, metadata, and anchor text. Decorative treatments belong to the renderer and CSS.
- Keep highlighted text readable on cream, yellow, and dark surfaces, including selection and high-contrast states.
- Keep tables, code, accordions, images, and interactions keyboard accessible and mobile safe.

## Required acceptance pass

Before calling the post finished, run the targeted gate for that post:

```powershell
npm run validate:blog -- <slug>
```

Then run the repository checks:

```powershell
npm run test:content
npm run lint
npm run build
git diff --check
```

Finally inspect the entire rendered article at desktop and mobile widths. Check the opening, midpoint, lower half, FAQ, and related-post cards—not only the hero viewport. A passing source file is not sufficient when the rendered article is visually monotonous, inaccessible, or broken.
