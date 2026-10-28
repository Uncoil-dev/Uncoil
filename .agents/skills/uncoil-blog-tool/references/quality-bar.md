# Uncoil writing quality bar

## Standard for every piece

Before drafting, define:

- Reader: the specific engineer, operator, evaluator, or buyer.
- Job: the decision or task they need to complete.
- Evidence: source files, commands, API behavior, or approved product facts.
- Boundary: what the piece deliberately does not cover.
- Archetype: the primary structure selected from the repertoire in `content/blog/README.md`.

The finished content must be accurate, useful without insider context, and scannable. Cut sentences that only restate the heading or make unsupported claims.

## Blog article

Use a strong explanatory arc:

1. Title names the problem or outcome without clickbait.
2. Excerpt says what the reader will learn and why it matters.
3. Opening establishes the production situation quickly; avoid generic AI introductions.
4. Body moves from model/framework to concrete practice, example, tradeoff, and checklist.
5. Examples use Uncoil concepts naturally without turning the article into an advertisement.
6. Ending gives a practical next action rather than repeating the introduction.

For new or materially edited posts, include at least two distinct contextual links to other published Uncoil articles when eligible targets exist. Anchor the link in words that name the target topic, distribute links through explanatory prose, and confirm every `/blog/<slug>` target exists and is public. Do not use a standalone SEO link list, self-links, raw URLs, `click here`, `read more`, or `Related guide`.

For each new post, decide whether reader-controlled state makes the central lesson clearer. Use a trace/evaluation demo for execution reasoning, editable sandboxed code for implementation learning, or a focused calculator/checklist/explorer for operational decisions. One purposeful interaction is better than several distractions; keep prose sufficient when interaction adds no learning value.

Prefer specific failure modes, decisions, and operating consequences. Distinguish fact, recommendation, and opinion. Use headings every few paragraphs, but do not fragment the piece into shallow listicles.

Match the article modules to its archetype. A guide needs sequential steps and visual proof; a decision framework needs criteria, a worked decision, and trade-offs; a practical library needs a fast starter set, grouped entries, copyable artifacts, and a method for adapting them. Tutorials need prerequisites, runnable steps, expected output, and troubleshooting. Comparisons need explicit criteria, evidence, scenarios, and conditions that could change the recommendation.

## Documentation

Optimize for successful execution:

1. Start with the outcome and prerequisites.
2. Give the shortest correct path first.
3. Use complete, copyable commands and code with current package names.
4. Explain what success looks like after each meaningful step.
5. Cover likely errors, security boundaries, and rollback/cleanup where relevant.
6. Link to the canonical deeper reference instead of duplicating volatile details.

Use imperative headings such as “Install the SDK” or “Verify the first trace.” Keep conceptual explanations beside the step they clarify.

## Voice and style

- Direct, calm, technical, and evidence-led.
- Plain English over marketing jargon.
- Sentence case for headings unless the existing surface dictates otherwise.
- Short paragraphs, meaningful lists, and descriptive link text.
- No fake quotes, customers, metrics, guarantees, compliance claims, or future dates.
- Avoid “seamless,” “revolutionary,” “powerful,” “simply,” and similar unsupported filler.

## Editing pass

Verify:

- The title, excerpt, headings, and body promise the same outcome.
- Every technical claim matches current source or an authoritative primary reference.
- Code is syntactically valid and internally consistent.
- Terms, route names, environment variables, and commands match the repository.
- Internal links resolve and related-post slugs exist.
- Blog body links pass `npm run test:content`: two distinct published targets, descriptive anchors, and no self/missing/draft targets.
- Images exist, render at useful dimensions, and have correct alt text.
- SEO metadata is specific and non-duplicative.
- Draft/public status matches explicit intent.
- The piece works on a narrow viewport and contains no broken overflow.
- Any interaction has instructions, useful defaults, keyboard access, accessible labels, a static explanation/fallback, deterministic local behavior, and no secret or production-data access.
