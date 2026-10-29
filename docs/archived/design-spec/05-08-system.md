# 05 COLOR SYSTEM

## 5.1 Usage Philosophy

White (`#FFFFFF`) is reserved for headlines, primary CTA labels, and active icons. It is never used as a background. The page background is `#0A0A0A` — near-black, not pure black, to prevent harsh contrast on OLED displays. Surfaces layer from `--surface-1` through `--surface-3` to create depth through border contrast, never shadows.

## 5.2 Color Usage Rules

| Situation | Color |
|-----------|-------|
| Page background | `--bg` (#0A0A0A) |
| Card / panel background | `--surface-1` (#111111) |
| Nested card / input bg | `--surface-2` (#161616) |
| Code block / table hover | `--surface-3` (#1C1C1C) |
| All borders | `--border` (#2A2A2A) |
| Disabled text | `--muted` (#666666) |
| Body / secondary text | `--body` (#CCCCCC) |
| Headlines / active labels | `--white` (#FFFFFF) |
| Primary action / active | `--accent` (#6366F1) |

## 5.3 Interactive States

| State | Treatment |
|-------|-----------|
| Hover (surface) | Background: `--surface-3`; no color change |
| Hover (link) | Color: `--accent-light`; underline |
| Hover (button primary) | Opacity: 0.88 |
| Active / pressed | `transform: scale(0.97)` on click |
| Focus | `outline: 2px solid var(--accent); outline-offset: 2px` |
| Disabled | `opacity: 0.38`; `pointer-events: none` |
| Destructive hover | Background: `rgba(239,68,68,0.10)` |

## 5.4 Status & Semantic Colors

| Status | Color | Dim Background | Usage |
|--------|-------|----------------|-------|
| Running | `#6366F1` | `rgba(99,102,241,0.10)` | Active runs, live polling |
| Completed | `#10B981` | `rgba(16,185,129,0.10)` | Successful runs/spans |
| Failed | `#EF4444` | `rgba(239,68,68,0.10)` | Error runs, error spans |
| Warning | `#F59E0B` | `rgba(245,158,11,0.10)` | Cost approaching limit |
| Cancelled | `#666666` | `rgba(102,102,102,0.10)` | User-cancelled runs |

## 5.5 Span Type Colors

| Span Type | Color | Hex |
|-----------|-------|-----|
| LLM / Model Call | Indigo | `#818CF8` |
| Tool Call | Emerald | `#34D399` |
| Decision / Router | Amber | `#FBBF24` |
| Error / Exception | Red | `#F87171` |
| Retrieval / RAG | Blue | `#60A5FA` |
| Embedding | Purple | `#C084FC` |
| Memory Read/Write | Slate | `#94A3B8` |
| HTTP / External | Zinc | `#A1A1AA` |

## 5.6 Badge Color System

```
Status badge:   text + dim background (no border)
Span type badge: colored left-border (2px) + dark background
Severity badge:  filled with semantic dim color
Plan badge:     accent filled (Pro), border-only (Free)
```

## 5.7 Chart Color Sequence

Charts always use the predefined sequence in order:
`--chart-1` → `--chart-2` → `--chart-3` → `--chart-4` → `--chart-5` → `--chart-6`

Never use raw CSS named colors. Never use the same color for two consecutive data series.

## 5.8 Syntax Highlighting (code blocks)

| Token | Color |
|-------|-------|
| Keyword | `#818CF8` (indigo) |
| String | `#34D399` (emerald) |
| Number | `#FBBF24` (amber) |
| Comment | `#4A4A4A` |
| Function | `#60A5FA` (blue) |
| Type / Class | `#C084FC` (purple) |
| Punctuation | `#666666` |
| Default | `#CCCCCC` |

---

# 06 SPACING, GRID, RADIUS, BORDERS

## 6.1 Layout Widths

| Layout | Max Width | Content Padding |
|--------|-----------|-----------------|
| Marketing pages | 1200px | 24px (mobile) / 48px (desktop) |
| Docs pages | 720px prose | 24px (mobile) / 48px (desktop) |
| Dashboard content | fluid | 32px (desktop) / 24px (mobile) |
| Legal pages | 760px | 24px |
| Pricing table | 1100px | 24px |

## 6.2 Dashboard Layout Grid

```
┌─────────────────────────────────────────────┐
│  Topbar (56px height, full width)           │
├────────────┬────────────────────────────────┤
│  Sidebar   │  Content area                  │
│  (240px)   │  padding: 32px                 │
│            │                                │
│            │                                │
└────────────┴────────────────────────────────┘
```

## 6.3 Border System

```css
/* Standard border */
border: 1px solid var(--border);

/* Focused input */
border: 1px solid var(--accent);

/* Divider */
border-top: 1px solid var(--border);

/* Span type left accent */
border-left: 2px solid var(--span-llm);
```

## 6.4 Border Radius

> **0px everywhere.** No exceptions in dashboard or auth UI.

The only partial exception: marketing hero ambient glow uses a `border-radius` of `50%` on a blurred background div (non-interactive, invisible structure element). This is invisible to users.

## 6.5 Standard Component Dimensions

| Component | Height | Padding |
|-----------|--------|---------|
| Button SM | 32px | 8px 12px |
| Button MD | 38px | 10px 16px |
| Button LG | 44px | 12px 24px |
| Input MD | 38px | 10px 12px |
| Textarea | auto min 80px | 10px 12px |
| Table row | 48px | 0 16px |
| Nav item | 36px | 0 12px |
| Card | auto | 24px |
| Dialog | 480px wide max | 24px |
| Toast | 360px wide | 16px |

---

# 07 COMPONENT SYSTEM

## 7.1 Button

**Variants:** `primary` | `secondary` | `ghost` | `destructive` | `link`

```
Primary:      bg=--accent           text=--white  border=none
Secondary:    bg=--surface-2        text=--white  border=1px --border
Ghost:        bg=transparent        text=--body   border=none  hover:bg=--surface-2
Destructive:  bg=--error-dim        text=--error  border=1px --error  hover:bg=--error  hover:text=--white
Link:         bg=transparent        text=--accent  no border  underline on hover
```

**Hover:** Primary → `opacity: 0.88`. No scale on hover. Scale only on `active` (mousedown): `scale(0.97)`.

**States:** Loading shows `<Loader2>` spinner (Lucide) replacing label. Disabled: `opacity: 0.38`.

**Accessibility:** `role="button"`, `aria-disabled` when disabled, `aria-busy` when loading.

**shadcn base:** `Button` from `@/components/ui/button`

---

## 7.2 Input

```
Background: --surface-2
Border:     1px solid --border
Height:     38px
Font:       Geist Mono 13px
Color:      --white
Placeholder: --muted

Focus:      border-color: --accent; outline: none
Error:      border-color: --error
Disabled:   opacity: 0.38
```

**Implementation:** Extend shadcn `Input` with `className` override to enforce above tokens.

---

## 7.3 Badge

```
Structure:  [icon?] LABEL

Variants:
  Status:    bg=dim color, text=color, no border. All caps. Geist Mono 10px.
  Span type: bg=--surface-2, border-left=2px span-color, text=span-color
  Severity:  bg=severity-dim, text=severity-color
  Plan:      "PRO" = bg=--accent, text=--white
             "FREE" = border=1px --border, text=--muted
```

---

## 7.4 Status Badge

| Status | Text | Background | Text Color |
|--------|------|------------|------------|
| RUNNING | RUNNING | `rgba(99,102,241,0.10)` | `#818CF8` |
| COMPLETED | COMPLETED | `rgba(16,185,129,0.10)` | `#10B981` |
| FAILED | FAILED | `rgba(239,68,68,0.10)` | `#EF4444` |
| CANCELLED | CANCELLED | `rgba(102,102,102,0.10)` | `#666666` |
| WARNING | WARNING | `rgba(245,158,11,0.10)` | `#F59E0B` |

---

## 7.5 Card

```
Background: --surface-1
Border:     1px solid --border
Border-radius: 0px
Shadow:     none
Padding:    24px
```

Cards do not have hover states unless they are clickable (runs list, blog cards). Clickable cards add `cursor: pointer` and `hover:border-color: --body` (subtle border brightening).

---

## 7.6 Table

```
Header row: bg=--surface-2, text=--muted, Geist Mono 11px uppercase, height 40px
Data rows:  bg=--surface-1, text=--body, Geist Mono 13px, height 48px
Hover row:  bg=--surface-3
Border:     1px solid --border between rows (no outer border on table)
Divider:    border-top on every row

Sortable column header: shows ChevronUp/Down icon inline
Selected row: bg=--accent-dim; border-left: 2px solid --accent
```

**Mobile:** Tables collapse to card-list layout below 640px. Each row becomes a mini-card with key fields stacked.

---

## 7.7 Dialog / Modal

```
Backdrop: rgba(0,0,0,0.7) blur(4px)
Panel:    bg=--surface-1, border=1px --border, border-radius=0px
Width:    480px (desktop), 100% (mobile)
Padding:  24px
Header:   24px bottom-border --border
Footer:   24px top-border --border, flex justify-end gap-8px
```

Close button: top-right `X` icon (Lucide `X`), ghost variant, 32px.

**Animation:** `scale(0.96) → scale(1.0)` on open, 150ms ease-out. `scale(1.0) → scale(0.96) + opacity 0` on close.

---

## 7.8 Sidebar Nav Item

```
Structure: [Icon 16px] [Label] [Badge?]
Height: 36px
Padding: 0 12px
Border-radius: 0px
Font: Geist Mono 13px

Default:  text=--body, bg=transparent
Hover:    bg=--surface-2, text=--white
Active:   bg=--surface-2, text=--white, border-left=2px solid --accent
```

---

## 7.9 Stat Card

```
Layout:
  ┌─────────────────────┐
  │ LABEL (UI label)    │
  │ 12,432              │ ← value: Geist Mono 32px --white
  │ ↑ +14% vs last week │ ← delta: 12px --success or --error
  └─────────────────────┘

Border: 1px --border
Background: --surface-1
Padding: 24px
```

Count-up animation on load: value animates from 0 to actual in 800ms, ease-out.

---

## 7.10 Code Block

```
Background: --surface-3 (#1C1C1C)
Border: 1px solid --border
Border-radius: 0px
Font: Geist Mono 13px line-height 1.6
Padding: 16px

Header bar (when filename shown):
  bg=--surface-2, filename=--muted, copy button right-aligned

Copy button:
  Ghost, 28px, Lucide Copy icon → Check on success (1.5s)
  
Line numbers:
  color=--muted, right-padded, not selectable
```

---

## 7.11 Toast (Sonner)

```
Position: bottom-right
Width: 360px
Background: --surface-1
Border: 1px solid --border
Border-radius: 0px
Font: Geist Mono 13px

Variants:
  Default:  icon=Info (--muted)
  Success:  icon=CheckCircle (--success), border-left=2px --success
  Error:    icon=AlertCircle (--error), border-left=2px --error
  Warning:  icon=AlertTriangle (--warning), border-left=2px --warning

Duration: 4000ms
Dismiss: X button or click anywhere on toast
```

---

## 7.12 Empty State

```
Layout (centered, flex-col):
  [Icon: 40px, color=--muted]
  [Title: Geist Mono 16px --white]
  [Body: Geist Sans 14px --muted, max-width 360px, centered]
  [CTA button: primary or ghost]

Examples:
  "No runs yet"
  "Your agent hasn't sent any spans to this project."
  [Install SDK]

  "No alerts"
  "All quiet. Configure thresholds to get notified when something breaks."
  [Configure Alerts]
```

---

## 7.13 Skeleton / Loading State

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-2) 25%,
    var(--surface-3) 50%,
    var(--surface-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0 }
  100% { background-position: -200% 0 }
}
```

Skeleton elements are always the same height/width as the content they replace. Never use generic grey boxes — match the exact content shape.

---

## 7.14 API Key Field

```
Layout: [masked key ••••••••••••••••] [Reveal] [Copy] [Rotate]

Background: --surface-2
Border: 1px solid --border
Font: Geist Mono 13px
Padding: 10px 12px

States:
  Masked: shows first 8 chars + •••••••••
  Revealed: shows full key for 15s then auto-masks
  Copied: Copy button shows Check for 1.5s
  Rotating: inline spinner on Rotate button

Important: "Your key will only be shown once." banner shown at creation.
```

---

## 7.15 Chart Card (Tremor / Recharts)

```
Container: Card component
Header: [Title] [date range picker right-aligned]
Chart area: 240px height (default), responsive width
Axis labels: Geist Mono 11px --muted
Grid lines: 1px solid --border (horizontal only)
Tooltip: --surface-1 bg, --border border, Geist Mono 12px
Legend: below chart, Geist Mono 11px

Color usage: follows chart color sequence strictly
No background fill under line charts (transparent, not opaque)
```

---

## 7.16 Command Menu (⌘K)

```
Trigger: Cmd+K / Ctrl+K
Background: --surface-1
Backdrop: rgba(0,0,0,0.7) blur(8px)
Width: 560px
Border: 1px solid --border
Border-radius: 0px
Input: 44px height, Geist Mono 15px, no border (bottom border only)

Results:
  Group header: UI label style, --muted
  Item: 36px height, Geist Mono 13px
  Item hover: bg=--surface-2
  Item active: bg=--accent-dim, text=--white
  Icon: 16px Lucide, --muted

Sections: Recent Runs / Navigate / Actions / Docs
```

---

# 08 GLOBAL LAYOUTS

## A. Public Marketing Layout

```
Routes: /, /product, /pricing, /blog, /changelog, /support, /contact, /docs (if separate domain)

Nav (fixed, top):
  Left: ■ uncoil (logo wordmark, Geist Pixel)
  Center: Product · Pricing · Docs · Blog · Changelog
  Right: Sign in (ghost) · Start free (primary)
  
  Background: rgba(10,10,10,0.85) blur(12px)
  Height: 64px
  Border-bottom: 1px solid --border (on scroll)
  Max-width: 1200px inner

Footer:
  Background: --surface-1
  Border-top: 1px solid --border
  Content: logo, nav columns, copyright, legal links
  Max-width: 1200px

Mobile:
  Nav collapses to hamburger (Lucide Menu)
  Drawer from right: full-height, --surface-1 bg, links stacked
```

## B. Auth Layout

```
Routes: /sign-in, /sign-up, /forgot-password, /reset-password, /verify-email

Layout: two-column (50/50) on desktop, single column on mobile

Left panel (dark brand):
  Background: --surface-1
  Content: ■ uncoil wordmark, tagline, ambient glow, terminal demo snippet
  
Right panel (form):
  Background: --bg
  Content: Clerk-wrapped form, uncoil styling overrides
  Max-width of form: 400px, centered

Mobile:
  Full single column, left panel hidden
  Logo shown at top of form panel
```

## C. Dashboard Authenticated Layout

```
Routes: /dashboard/* /onboarding/*

Structure:
  [Topbar 56px]
  [Sidebar 240px] | [Main content area]

Topbar:
  Left: Hamburger (mobile) | breadcrumb
  Center: (empty)
  Right: notification bell | command menu | user avatar
  Background: --surface-1
  Border-bottom: 1px solid --border

Sidebar:
  Background: --surface-1
  Border-right: 1px solid --border
  Width: 240px (desktop), 0 (mobile, drawer)

  Items:
    [■ uncoil] [project name dropdown]
    ─────────────────
    Overview
    Runs
    Costs
    Alerts
    ─────────────────
    API Keys
    Webhooks
    Integrations
    ─────────────────
    Settings
    Team
    Billing
    ─────────────────
    [Docs ↗]

Main content:
  padding: 32px
  max-width: fluid
  background: --bg

Mobile:
  Topbar hamburger opens sidebar as drawer (full height, 280px wide)
```

## D. Docs Layout

```
Routes: /docs/* or docs.uncoil.dev/*

Left sidebar: 240px, nav tree
Main: 720px prose, centered
Right sidebar: 200px, table of contents (sticky)

Background: --bg
Nav items: same style as dashboard nav
Search: Cmd+K, top of left sidebar

Mobile:
  Left and right sidebars hidden
  Top nav dropdown for section selection
```

## E. Blog Layout

```
Routes: /blog, /blog/[slug]

Nav: Marketing nav
Content: max-width 760px (article), 1200px (index)
Background: --bg

Blog index:
  Hero: featured article (full-width card)
  Grid: 3-column cards (desktop), 1-column (mobile)

Article:
  Full-width header with title + meta
  760px prose column
  Right: sticky ToC (desktop only)
```

## F. Legal / Simple Content Layout

```
Routes: /privacy, /terms, /security, /dpa

Content width: 760px
Background: --bg
Font: Geist Sans 16px --body
Padding top: 80px (below nav)

Last updated date shown below H1.
Table of contents (anchor links) below H1.
No sidebar.
```
