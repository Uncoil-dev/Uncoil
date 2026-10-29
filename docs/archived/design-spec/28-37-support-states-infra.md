# 28 CONTACT / SUPPORT / STATUS

---

## Support — `/support`

```
SUPPORT
────────────────────────────────────────────────
Get help with uncoil.

[Docs →]  [Status ↗]  [GitHub Issues ↗]  [Discord ↗]

CONTACT SUPPORT

Name:        [________________________]
Email:       [________________________]
Subject:     [________________________]
Description: [________________________]
             [________________________]
             [________________________]
             
Project ID (optional):
             [________________________]
             
[Send message]

─────────────────────────────────────────────────
RESPONSE TIMES
Free:       Community (Discord, GitHub)
Pro:        Email within 24h
Team:       Email within 4h
Enterprise: Dedicated Slack channel
```

**Success state:**
```
✓ MESSAGE SENT
We'll get back to you within 24 hours.
Your ticket ID: #12345
```

---

## Contact Sales — `/contact`

```
TALK TO SALES
────────────────────────────────────────────────
Tell us about your use case.

Name:        [________________________]
Work email:  [________________________]
Company:     [________________________]
Team size:   [5–10 ▾]
Monthly runs:[________________________]
Use case:    [________________________]

[Send →]
```

---

## Status

`/status` redirects to `status.uncoil.dev` (external Statuspage or Betterstack).

---

# 29 LEGAL PAGES

**Routes:** `/privacy` | `/terms` | `/security` | `/dpa` | `/subprocessors`

**Layout:** Simple content layout. Max-width 760px. Geist Sans 16px prose.

**All pages include:**
- H1: Page title
- Last updated: `Last updated: May 12, 2026` (Geist Mono 12px, `--muted`)
- Table of contents (anchor links, sticky left on desktop)
- Section headings: Geist Mono
- Body: Geist Sans

**Privacy Policy sections:**
1. What we collect
2. How we use it
3. Data retention
4. Third-party processors
5. Your rights
6. Contact

**Terms of Service sections:**
1. Acceptance
2. Account registration
3. Permitted use
4. Prohibited conduct
5. Intellectual property
6. Limitation of liability
7. Governing law

---

# 30 ERROR PAGES

| Route / Trigger | Code | Headline | Body | CTA |
|-----------------|------|----------|------|-----|
| Unknown route | 404 | PAGE NOT FOUND | This page doesn't exist or has been moved. | [Go to Dashboard] [Go home] |
| Server error | 500 | SOMETHING WENT WRONG | An unexpected error occurred. We've been notified. | [Try again] [Check status] |
| Clerk failure | auth | AUTHENTICATION ERROR | Sign-in failed. Try again or contact support. | [Try again] [Contact support] |
| Wrong project | 403 | ACCESS DENIED | You don't have permission to view this project. | [Go to your projects] |
| Run missing | — | RUN NOT FOUND | `run_abc123` doesn't exist in this project. | [← Back to runs] |
| Billing failure | — | PAYMENT REQUIRED | Your plan has lapsed. Update payment to continue. | [Update billing] |
| Rate limited | 429 | SLOW DOWN | You've exceeded the API rate limit. Retry in 60s. | [View rate limits in docs] |

**Error page layout:**
```
[Logo]

[ERROR CODE — Geist Mono 11px --muted uppercase]

HEADLINE

Body copy explaining what happened and what to do.

[Primary CTA]  [Secondary CTA]
```

Background: `--bg`. No illustration. Monochrome only.

---

# 31 EMPTY / LOADING / ERROR STATES LIBRARY

| State | Icon | Title | Body | CTA |
|-------|------|-------|------|-----|
| No projects | `FolderOpen` | No projects yet | Create your first project to start observing your agents. | [Create project] |
| No runs | `Activity` | No runs yet | Your agent hasn't sent any spans to this project. | [Install SDK →] |
| No spans | `Layers` | No spans found | No spans match your current filters. | [Clear filters] |
| No alerts | `Bell` | No alerts | All quiet. Configure thresholds to get notified. | [Configure alerts] |
| No billing history | `Receipt` | No invoices yet | Your first invoice will appear after your next billing cycle. | — |
| No team members | `Users` | Just you | Invite your team to give them access. | [Invite member] |
| No search results | `Search` | No results | No items match "{query}". Try a different search. | [Clear search] |
| API key created | `Key` | Key created | Copy your API key now — you won't see it again. | [Copy key] |
| API key expired | `KeyRound` | Key revoked | This API key has been revoked and is no longer valid. | [Create new key] |
| Failed to load | `AlertCircle` | Failed to load | We couldn't fetch this data. This might be temporary. | [Try again] |
| Network error | `WifiOff` | No connection | Check your internet connection and try again. | [Retry] |
| Tinybird unavailable | `Database` | Analytics unavailable | Span data is temporarily unavailable. Runs are still being collected. | [Check status] |
| Convex unavailable | `Server` | Database unavailable | We're having trouble reaching our database. | [Check status] |
| Clerk unavailable | `Lock` | Auth unavailable | Authentication is temporarily unavailable. | [Check status] |
| Stripe unavailable | `CreditCard` | Billing unavailable | We can't reach our billing provider right now. | [Try again] |

**Empty state visual template:**
```
         [Icon 40px color=--muted]
         
         TITLE
         Geist Mono 16px --white
         
         Body copy — Geist Sans 14px --muted
         Max width 360px, centered, line-height 1.6
         
         [CTA Button]
```

---

# 32 MOBILE & RESPONSIVE SPEC

## Breakpoints

| Name | Width | Layout change |
|------|-------|---------------|
| Mobile | < 640px | Stack everything, drawer nav, table → cards |
| Tablet | 640–1023px | Two column where useful, sidebar collapses |
| Desktop | 1024–1439px | Full layout, sidebar visible |
| Wide | 1440px+ | Max-width containers hit ceiling |

## Per-Page Mobile Behavior

**Landing page:**
- Hero: stack copy above code block
- Code block: static (no animation), horizontally scrollable
- Integration grid: 2×4 → 2×8
- Nav: hamburger → full-screen overlay

**Auth pages:**
- Left brand panel: hidden
- Logo appears above form
- Form: full width, 24px padding

**Dashboard:**
- Sidebar: hidden, topbar hamburger → Sheet drawer
- Content: full width, 24px padding

**Runs table:**
- Table → card list (each row = card)
- Card shows: Run ID, Status badge, Agent, Cost, Duration
- Tap card → trace viewer

**Trace viewer:**
- Summary sidebar → hidden, accessible via "Summary" drawer button
- Span overview chart: hidden on < 640px
- JSON blocks: horizontally scrollable

**Charts:**
- Recharts responsive containers (100% width)
- Legend: below chart on mobile
- Tooltip: tap to show (no hover)

**Docs:**
- Left sidebar → hidden, top nav dropdown
- Right ToC → "On this page" button
- Code blocks: horizontally scrollable

**Pricing:**
- Plan cards: single column scroll
- Comparison table: horizontally scrollable

---

# 33 ACCESSIBILITY SPEC

## Contrast Requirements

| Context | Minimum ratio |
|---------|--------------|
| Body text (`--body` on `--bg`) | 7.2:1 ✓ |
| Muted text (`--muted` on `--surface-1`) | 4.6:1 ✓ |
| Accent (`--accent` on `--bg`) | 4.8:1 ✓ |
| Error (`--error` on `--bg`) | 5.1:1 ✓ |
| White on accent button | 14.5:1 ✓ |

Never use color as the only status indicator. Always pair color with:
- An icon (Lucide icons with `aria-hidden="true"`)
- A text label
- A shape difference (e.g., border-left on error spans)

## Keyboard Navigation

- All interactive elements reachable via Tab
- Logical tab order: nav → page header → content → sidebar
- Focus ring: `outline: 2px solid var(--accent); outline-offset: 2px`
- Focus ring never hidden (no `outline: none` without replacement)
- Dialog: focus trapped inside modal while open
- Dialog close: Escape key
- Dropdown: Arrow keys navigate, Enter/Space select, Escape close
- Table: Arrow key navigation between cells
- Command menu: Arrow keys, Enter selects, Escape closes

## ARIA Labels

```
Sidebar nav: role="navigation" aria-label="Main navigation"
Topbar: role="banner"
Main content: role="main"
Table: role="table" with proper thead/tbody
Status badge: aria-label="Status: Completed"
Stat card: aria-label="Total spend today: $12.43, up 14%"
Run ID (truncated): title="run_a3f2b1c9d4e5f6a7" (full ID in tooltip)
Icon-only button: aria-label="Copy API key"
Loading spinner: aria-busy="true" aria-label="Loading..."
```

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The running dot animation, count-up animation, and shimmer skeleton are all suppressed under reduced motion. Functional state changes (dialog open, toast appear) use instant transitions.

## Form Accessibility

- Every input has a visible `<label>` (not placeholder only)
- Error messages use `role="alert"` and are associated via `aria-describedby`
- Required fields marked with `aria-required="true"`
- Form validation: inline, adjacent to the field, not in a banner

---

# 34 ANIMATION & MOTION SPEC

## Principles

1. Motion must serve information. No decorative animation.
2. Duration is as short as possible while remaining perceivable.
3. Easing: `cubic-bezier(0.23, 1, 0.32, 1)` for enters; `ease-in` for exits.
4. Never animate layout shifts (no moving content under user's reading focus).

## Duration Scale

| Purpose | Duration |
|---------|----------|
| Micro (button press, icon swap) | 80ms |
| Fast (tooltip, badge state) | 120ms |
| Standard (dialog, toast, dropdown) | 150ms |
| Moderate (page transition, chart load) | 250ms |
| Slow (onboarding step, stat count-up) | 600–800ms |

## Animation Inventory

| Animation | Trigger | Duration | Easing | Reduced motion |
|-----------|---------|----------|--------|----------------|
| Running dot | Run status = RUNNING | ∞ pulse 1200ms | ease-in-out | Hide dot, show "RUNNING" text only |
| New span arrival | Span added to live run | Slide in from top 200ms | ease-out | Instant appear |
| Span expand | Click span card | Height 0 → auto, 150ms | ease-out | Instant |
| Toast enter | Sonner trigger | Slide up 150ms | ease-out | Instant |
| Toast exit | Dismiss / timeout | Fade + slide 120ms | ease-in | Instant |
| Chart load | Data fetch complete | Draw line 400ms | ease-out | Instant render |
| Stat count-up | Page load | 0 → value 800ms | ease-out | Show final value immediately |
| Dialog open | Trigger click | scale(0.96→1) 150ms | ease-out | Instant |
| Dialog close | Dismiss | scale(1→0.96) + fade 120ms | ease-in | Instant |
| Mobile drawer | Hamburger click | Slide in 200ms | ease-out | Instant |
| Page transition | Route change | Fade 150ms | ease | None (instant) |
| Skeleton shimmer | Loading state | ∞ sweep 1500ms | linear | Static background only |

## Running Dot (RUNNING status)

```css
.running-dot {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%; /* only permitted circle — non-interactive */
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.8); }
}
```

---

# 35 COPYWRITING SYSTEM

## Voice Principles

- **Direct:** Say what it is, not what it "empowers" you to do.
- **Technical:** Use real terms: span, run, token, latency, P95. No euphemisms.
- **Precise:** Numbers over adjectives. "$0.023 per run" not "affordable."
- **No hype:** No "revolutionary," "powerful," "cutting-edge," "game-changing."
- **Developer-first:** Assume the reader knows what a decorator is. Don't explain basic programming.
- **Terse:** If it can be said in 5 words, don't use 10.

## Taglines

```
Primary:    "Five signals. One truth."
Secondary:  "Every step your agent takes."
Tertiary:   "Agent observability infrastructure."
```

## Button Copy Rules

| Action | Copy |
|--------|------|
| Primary sign-up | Start free — no credit card |
| Secondary demo | View live demo |
| Create resource | Create project / Create key / Create alert |
| Save changes | Save / Save changes |
| Destructive | Delete project / Revoke key (never "Remove" for irreversible) |
| Loading | Saving... / Creating... / Loading... |
| Confirm dangerous | Type project name to confirm |

## Empty State Copy Rules

| Pattern | Good | Bad |
|---------|------|-----|
| Title | No runs yet | Nothing to see here! |
| Body | Your agent hasn't sent any spans. Install the SDK. | Looks like you haven't started yet! |
| CTA | Install SDK | Get started |

## Error Copy

```
Generic error:         Something went wrong. Try again.
Network error:         No connection. Check your network.
Auth error:            Session expired. Sign in again.
Permission error:      You don't have access to this project.
Not found:             {resource} not found.
Rate limited:          Too many requests. Wait 60 seconds.
Payment failed:        Payment failed. Update your billing method.
```

## Onboarding Copy Principles

- Each step: one goal, one CTA
- No paragraphs — use 1 sentence max per body copy
- Progress always visible
- "Skip" always available after step 2

---

# 36 SEO METADATA

| Page | Title | Meta description |
|------|-------|-----------------|
| `/` | uncoil — Agent Observability Infrastructure | See every tool call, LLM decision, and cost your AI agents make — in real time. Free up to 50,000 spans/month. |
| `/product` | Product — uncoil | Trace viewer, cost dashboard, real-time span streaming. Everything you need to debug AI agents in production. |
| `/pricing` | Pricing — uncoil | Free, Pro, Team, and Enterprise plans. Start free with 50,000 spans/month. No credit card required. |
| `/docs` | Docs — uncoil | Get started with uncoil in under 5 minutes. Python and TypeScript SDKs, API reference, and guides. |
| `/blog` | Blog — uncoil | Engineering insights, agent patterns, and production AI from the uncoil team. |
| `/changelog` | Changelog — uncoil | Every uncoil product update, release note, and improvement — in chronological order. |
| `/sign-in` | Sign in — uncoil | Sign in to your uncoil dashboard. |
| `/sign-up` | Start free — uncoil | Create your free uncoil account. No credit card required. |
| `/support` | Support — uncoil | Get help with uncoil. Docs, community, and direct support. |
| `/privacy` | Privacy Policy — uncoil | How uncoil collects, uses, and protects your data. |
| `/terms` | Terms of Service — uncoil | uncoil terms of service. |

---

# 37 FRONTEND FILE STRUCTURE

```
c:\uncoil\src\
│
├── app\
│   ├── (marketing)\
│   │   ├── page.tsx                   # /
│   │   ├── product\page.tsx
│   │   ├── pricing\page.tsx
│   │   ├── changelog\page.tsx
│   │   ├── blog\
│   │   │   ├── page.tsx
│   │   │   └── [slug]\page.tsx
│   │   ├── support\page.tsx
│   │   ├── contact\page.tsx
│   │   ├── privacy\page.tsx
│   │   ├── terms\page.tsx
│   │   ├── security\page.tsx
│   │   └── layout.tsx                 # Marketing layout (nav + footer)
│   │
│   ├── (auth)\
│   │   ├── sign-in\page.tsx
│   │   ├── sign-up\page.tsx
│   │   ├── forgot-password\page.tsx
│   │   ├── reset-password\page.tsx
│   │   ├── verify-email\page.tsx
│   │   └── layout.tsx                 # Auth split-panel layout
│   │
│   ├── onboarding\
│   │   ├── project\page.tsx
│   │   ├── api-key\page.tsx
│   │   ├── install\page.tsx
│   │   ├── first-run\page.tsx
│   │   ├── complete\page.tsx
│   │   └── layout.tsx                 # Onboarding layout (progress bar)
│   │
│   ├── dashboard\
│   │   ├── layout.tsx                 # Dashboard shell (sidebar + topbar)
│   │   ├── page.tsx                   # /dashboard redirect
│   │   └── [projectId]\
│   │       ├── page.tsx               # Overview
│   │       ├── runs\
│   │       │   ├── page.tsx           # Runs list
│   │       │   └── [runId]\page.tsx   # Trace viewer
│   │       ├── costs\page.tsx
│   │       ├── alerts\page.tsx
│   │       ├── api-keys\page.tsx
│   │       ├── webhooks\page.tsx
│   │       ├── integrations\page.tsx
│   │       ├── team\page.tsx
│   │       ├── settings\page.tsx
│   │       └── billing\page.tsx
│   │
│   ├── account\
│   │   ├── layout.tsx
│   │   ├── profile\page.tsx
│   │   ├── security\page.tsx
│   │   ├── notifications\page.tsx
│   │   └── sessions\page.tsx
│   │
│   ├── checkout\
│   │   ├── success\page.tsx
│   │   └── cancelled\page.tsx
│   │
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── layout.tsx                     # Root layout (fonts, providers)
│   └── globals.css
│
├── components\
│   ├── ui\                            # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   │
│   ├── marketing\
│   │   ├── nav.tsx                    # Public nav
│   │   ├── footer.tsx
│   │   ├── hero.tsx
│   │   ├── problem-section.tsx
│   │   ├── features-section.tsx
│   │   ├── how-it-works.tsx
│   │   ├── integrations-grid.tsx
│   │   ├── pricing-cards.tsx
│   │   ├── changelog-entry.tsx
│   │   ├── blog-card.tsx
│   │   └── cta-section.tsx
│   │
│   ├── auth\
│   │   ├── auth-layout.tsx            # Split panel wrapper
│   │   ├── brand-panel.tsx
│   │   └── clerk-appearance.ts        # Appearance config export
│   │
│   ├── dashboard\
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── project-switcher.tsx
│   │   ├── user-menu.tsx
│   │   ├── command-menu.tsx
│   │   ├── stat-card.tsx
│   │   ├── runs-table.tsx
│   │   ├── span-card.tsx
│   │   ├── span-timeline.tsx
│   │   ├── run-header.tsx
│   │   ├── run-summary-sidebar.tsx
│   │   ├── alert-drawer.tsx
│   │   ├── api-key-field.tsx
│   │   ├── empty-state.tsx
│   │   └── status-badge.tsx
│   │
│   ├── charts\
│   │   ├── cost-over-time.tsx
│   │   ├── model-breakdown.tsx
│   │   ├── span-gantt.tsx
│   │   └── chart-card.tsx
│   │
│   └── docs\
│       ├── docs-layout.tsx
│       ├── docs-sidebar.tsx
│       ├── docs-toc.tsx
│       ├── callout.tsx
│       └── code-block.tsx
│
├── lib\
│   ├── convex.ts
│   ├── tinybird.ts
│   ├── clerk.ts
│   ├── stripe.ts
│   ├── utils.ts
│   └── constants.ts
│
├── hooks\
│   ├── use-project.ts
│   ├── use-runs.ts
│   ├── use-spans.ts
│   ├── use-command-menu.ts
│   └── use-mobile.ts
│
└── types\
    ├── run.ts
    ├── span.ts
    ├── project.ts
    ├── alert.ts
    └── billing.ts
```
