# uncoil — Full Frontend Design Package
**Dark-mode-only design system, pages, flows, components, and implementation spec**
*CONFIDENTIAL — v1.0 — 2026-05-12*

---

# 01 COVER PAGE

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ■ uncoil                                                    ║
║                                                              ║
║   Full Frontend Design Package                               ║
║   Dark-mode-only design system, pages, flows,                ║
║   components, and implementation specification               ║
║                                                              ║
║   Version 1.0 · Confidential · 2026-05-12                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

# 02 PRODUCT & DESIGN PRINCIPLES

## Product Overview

uncoil is an agent observability infrastructure platform for developers building AI agents. In two lines of SDK code, it instruments every tool call, LLM decision, token cost, latency measurement, and failure event — streaming them in real time into a structured trace viewer. Unlike generic logging or APM tools, uncoil understands the semantics of agent execution: it knows the difference between a reasoning span and a tool-call span, it tracks cost at the model level, and it surfaces failures before they become invisible production bugs. The product is built for teams who ship AI agents into production and need the same debugging confidence they have with distributed systems.

## Design Principles

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Precision over decoration** | Every pixel serves information. No gradients, glows, or shadows unless they carry semantic meaning. |
| 2 | **Traceability over abstraction** | Show raw data close to the surface. IDs, timestamps, token counts, and latency are always visible — never hidden behind "friendly" summaries. |
| 3 | **Developer speed over marketing fluff** | Copy is direct. CTAs are clear. No vague AI buzzwords. The UI respects the developer's time. |
| 4 | **Dark-only identity** | uncoil has no light mode. The dark theme is not a preference — it is the product's visual DNA. |
| 5 | **Every element earns its place** | If a UI element cannot be justified by user need, it is removed. Empty space is used intentionally, not filled. |
| 6 | **No UI element without a job** | No decorative icons, no filler illustrations, no padding-as-content. |
| 7 | **Dashboard clarity over visual noise** | Data-dense views prefer tables over cards, monochrome over color, alignment over ornamentation. |
| 8 | **Auth and onboarding must reduce friction** | Sign-up is < 30 seconds. First span appears within 5 minutes of registration. |

---

# 03 DESIGN TOKENS

## 3.1 CSS Custom Properties

```css
:root {
  /* Backgrounds */
  --bg:           #0A0A0A;
  --surface-1:    #111111;
  --surface-2:    #161616;
  --surface-3:    #1C1C1C;

  /* Borders */
  --border:       #2A2A2A;
  --border-focus: #6366F1;

  /* Text */
  --muted:        #666666;
  --body:         #CCCCCC;
  --white:        #FFFFFF;

  /* Accent */
  --accent:       #6366F1;
  --accent-light: #818CF8;
  --accent-dim:   rgba(99,102,241,0.12);

  /* Semantic */
  --success:      #10B981;
  --warning:      #F59E0B;
  --error:        #EF4444;
  --success-dim:  rgba(16,185,129,0.10);
  --warning-dim:  rgba(245,158,11,0.10);
  --error-dim:    rgba(239,68,68,0.10);

  /* Span type colors */
  --span-llm:       #818CF8;
  --span-tool:      #34D399;
  --span-decision:  #FBBF24;
  --span-error:     #F87171;
  --span-retrieval: #60A5FA;
  --span-embed:     #C084FC;
  --span-memory:    #94A3B8;

  /* Layout */
  --radius:       0px;
  --sidebar-w:    240px;
  --topbar-h:     56px;
  --max-w:        1200px;
  --docs-w:       720px;
  --content-pad:  32px;
  --mobile-pad:   24px;

  /* Z-index scale */
  --z-base:       0;
  --z-raised:     10;
  --z-dropdown:   100;
  --z-sticky:     200;
  --z-overlay:    300;
  --z-modal:      400;
  --z-toast:      500;
  --z-tooltip:    600;

  /* Chart colors */
  --chart-1: #6366F1;
  --chart-2: #10B981;
  --chart-3: #F59E0B;
  --chart-4: #60A5FA;
  --chart-5: #C084FC;
  --chart-6: #F87171;
}
```

## 3.2 Color Tokens Table

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0A0A0A` | Page background, outermost layer |
| `--surface-1` | `#111111` | Cards, sidebars, modals |
| `--surface-2` | `#161616` | Nested cards, input backgrounds |
| `--surface-3` | `#1C1C1C` | Table rows hover, code blocks |
| `--border` | `#2A2A2A` | All borders, dividers, separators |
| `--muted` | `#666666` | Placeholder text, disabled labels, metadata |
| `--body` | `#CCCCCC` | Body text, table values, form labels |
| `--white` | `#FFFFFF` | Headlines, primary labels, active icons |
| `--accent` | `#6366F1` | Primary CTA, active nav, focus rings, links |
| `--accent-light` | `#818CF8` | Span type: LLM, hover accents |
| `--success` | `#10B981` | Run completed, alert resolved, span OK |
| `--warning` | `#F59E0B` | Latency warn, cost threshold approaching |
| `--error` | `#EF4444` | Failed runs, error spans, destructive |

## 3.3 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Inline gaps, icon-text spacing |
| `space-2` | 8px | Input padding, badge padding |
| `space-3` | 12px | Small card padding |
| `space-4` | 16px | Standard gap, form field spacing |
| `space-6` | 24px | Section padding mobile, card padding |
| `space-8` | 32px | Dashboard content padding |
| `space-12` | 48px | Section vertical spacing |
| `space-16` | 64px | Hero vertical spacing |
| `space-24` | 96px | Marketing section spacing |

## 3.4 Breakpoints

| Name | Range | Behavior |
|------|-------|----------|
| `mobile` | < 640px | Single column, drawer nav, stacked tables |
| `tablet` | 640–1023px | Two column where applicable, collapsed sidebar |
| `desktop` | 1024–1439px | Full dashboard layout, sidebar visible |
| `wide` | 1440px+ | Max-width containers, wider charts |

## 3.5 Shadows

> **Default: none.** uncoil uses borders, not shadows, to define elevation. The only permitted shadow is a subtle ambient glow on marketing hero sections: `box-shadow: 0 0 120px rgba(99,102,241,0.08)`.

## 3.6 Border Radius

> **Global: 0px.** No rounded corners anywhere in the product UI. Marketing pages may use 0px. Clerk modal overrides must also be set to 0px via appearance API.

## 3.7 Button & Input Heights

| Element | Height |
|---------|--------|
| Button SM | 32px |
| Button MD | 38px (default) |
| Button LG | 44px |
| Input MD | 38px |
| Input LG | 44px |
| Table row | 48px |
| Nav item | 36px |
| Topbar | 56px |

---

# 04 TYPOGRAPHY SYSTEM

## Font Stack

```css
--font-pixel: 'Geist Pixel', 'Geist Pixel Square', monospace;   /* Logo only */
--font-mono:  'Geist Mono', 'JetBrains Mono', monospace;        /* UI, code, data */
--font-sans:  'Geist', 'Inter', system-ui, sans-serif;          /* Prose, body */
```

## Type Scale Table

| Role | Font | Size | Weight | Line Height | Color | Usage |
|------|------|------|--------|-------------|-------|-------|
| Logo | Geist Pixel | 20px | 700 | 1 | `--white` | Wordmark in nav and footer |
| Hero Display | Geist Mono | 64px / 80px | 700 | 0.95 | `--white` | Landing page H1 |
| Page Title | Geist Mono | 28px | 700 | 1.1 | `--white` | Dashboard page headers |
| Section Title | Geist Mono | 20px | 600 | 1.2 | `--white` | Card headers, section headings |
| Card Title | Geist Sans | 15px | 600 | 1.3 | `--white` | Stat card labels |
| UI Label | Geist Mono | 11px | 500 | 1.4 | `--muted` | Form labels, table headers |
| Nav Text | Geist Mono | 13px | 500 | 1 | `--body` | Sidebar nav items |
| Table Text | Geist Mono | 13px | 400 | 1.4 | `--body` | Table cell values |
| Metadata | Geist Mono | 11px | 400 | 1.4 | `--muted` | Timestamps, IDs, run IDs |
| Code | Geist Mono | 13px | 400 | 1.6 | `--body` | Inline and block code |
| Docs Prose | Geist Sans | 16px | 400 | 1.75 | `--body` | Docs body text |
| Blog Prose | Geist Sans | 18px | 400 | 1.8 | `--body` | Article body text |
| Error Copy | Geist Mono | 13px | 400 | 1.5 | `--muted` | Error messages, empty state body |
| Button | Geist Mono | 13px | 500 | 1 | — | All button labels |
| Badge | Geist Mono | 10px | 600 | 1 | — | All badge labels, UPPERCASE |

## Typography Rules

1. **Geist Pixel is logo-only.** Never use it for body text, buttons, or labels.
2. **Geist Mono is the primary UI font.** All data, metadata, IDs, nav, buttons, code.
3. **Geist Sans is for human prose only.** Docs, blog, marketing body copy.
4. **All caps + letter-spacing for metadata.** `text-transform: uppercase; letter-spacing: 0.08em` for run IDs, span types, status labels.
5. **No italic anywhere in the dashboard.** Italic permitted in docs callouts and blog pull quotes only.
6. **Fluid type on marketing pages:** Hero scales from 48px (mobile) to 80px (desktop) using `clamp()`.

```css
.hero-display {
  font-size: clamp(48px, 7vw, 80px);
  font-family: var(--font-mono);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.03em;
  color: var(--white);
}

.page-title {
  font-size: 28px;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--white);
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.ui-label {
  font-size: 11px;
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metadata {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
```
