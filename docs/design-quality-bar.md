# Design quality bar

The owner set this rule on 2026-10-15: the landing page rebuilt in PR #171 is the **minimum standard** for every future visual change to Uncoil. New design work must match it or beat it. Anything that looks plainer, flatter, more generic or less polished than that page is not acceptable and must not be proposed or merged.

## The benchmark

The reference implementation is the landing page in `src/components/marketing/landing/`, plus the Dissolve logo (`src/components/brand/tracify-mark.tsx`, `scripts/generate-logo.py`, `public/logos/dissolve/`). Before starting any design work, open that page locally, scroll the whole thing on desktop and phone, and compare your work against it side by side.

What makes it the bar:

- **Built from zero, not a reskin.** Reworking the old layout with new colors was rejected as "just a remake". New directions start from a blank page.
- **Image-led.** Every section carries real visuals: dithered procedural artwork (`scripts/generate-landing-art.py`), product-like UI, diagrams. No section is just a heading over a paragraph.
- **Motion with a purpose.** Scroll-driven sticky sections, clip-path reveals, a trace waterfall that plays as you scroll, a before/after slider that moves on its own. Motion explains the product; it is never decoration for its own sake.
- **One coherent visual language.** The pixel/dither style runs through the logo, the art, the timeline bars and the favicon. New elements reuse that language instead of inventing a new one.
- **Strict brand rules.** Three colors only (`#eceae3`, `#090909`, `#f4d44d`/`#fff4b5`), 0px radius, Geist Pixel Square / Geist Mono / Geist Sans. Text must stay readable: no yellow text on cream.
- **Finished details.** Works at phone width with no horizontal scroll, respects reduced motion, has no blocked clicks or overlapping elements, and passes lint and typecheck on changed files.

## Rules for every agent

1. Read this file before any design, marketing, landing, logo, dashboard-styling or visual task.
2. Aim to surpass the benchmark, not to reach "good enough". If a draft is not clearly at the benchmark's level, keep working before showing it.
3. Show the owner screenshots or a short video next to the preview link, and get explicit approval before merging (see the design exploration workflow in `AGENTS.md`).
4. Never replace or water down benchmark work (the landing page, the Dissolve logo) without the owner explicitly asking for it.
5. When a new design is approved as better than the current benchmark, update this file to point at it so the bar only ever goes up.
