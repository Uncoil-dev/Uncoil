# 38 IMPLEMENTATION CHECKLIST

## Phase 0 — Foundation
- [ ] Install fonts: `geist`, `next/font/google` (Geist, Geist Mono)
- [ ] Install Geist Pixel Square from `geist/font/pixel`
- [ ] Configure CSS custom properties in `globals.css`
- [ ] Configure Tailwind to extend with design tokens (colors, spacing, fonts)
- [ ] Configure shadcn/ui theme with 0px radius and dark palette
- [ ] Configure Clerk appearance object in `components/auth/clerk-appearance.ts`
- [ ] Configure Convex client provider
- [ ] Configure Sonner toast provider
- [ ] Set up route groups: `(marketing)`, `(auth)`, `dashboard`, `onboarding`, `account`

## Phase 1 — Layouts
- [ ] Build public marketing layout (nav + footer)
- [ ] Build auth split-panel layout (brand panel + form panel)
- [ ] Build onboarding layout (progress bar + step container)
- [ ] Build dashboard shell (sidebar + topbar + content area)
- [ ] Build docs layout (left nav + prose + right ToC)
- [ ] Build legal/simple content layout
- [ ] Make all layouts mobile-responsive

## Phase 2 — Components
- [ ] Button (all 5 variants + loading + disabled)
- [ ] Input, Textarea, Select
- [ ] Badge, Status badge, Span type badge
- [ ] Card (default + clickable variant)
- [ ] Table (with sortable headers)
- [ ] Dialog / Modal
- [ ] Drawer (Sheet from shadcn)
- [ ] Tabs
- [ ] Toast (Sonner, themed)
- [ ] Skeleton / shimmer
- [ ] Empty state (generic + per-context)
- [ ] Code block (with copy button, optional filename)
- [ ] API key field (masked, reveal, copy, rotate, revoke)
- [ ] Stat card (with count-up animation)
- [ ] Sidebar nav item (active + hover states)
- [ ] Status badge (RUNNING/COMPLETED/FAILED/CANCELLED)
- [ ] Span card (collapsed + expanded)
- [ ] Command menu (⌘K)
- [ ] Project switcher dropdown
- [ ] User menu
- [ ] Breadcrumb
- [ ] Date range picker
- [ ] Pagination

## Phase 3 — Marketing Pages
- [ ] Landing page (all 8 sections)
- [ ] Pricing page (toggle + 4 plans + FAQ)
- [ ] Changelog page
- [ ] Blog index
- [ ] Blog article layout
- [ ] Support/Contact pages
- [ ] Legal pages (privacy, terms, security)

## Phase 4 — Auth Pages
- [ ] /sign-in (Clerk wrapped)
- [ ] /sign-up (Clerk wrapped, → /onboarding/project)
- [ ] /forgot-password (with success/error states)
- [ ] /reset-password
- [ ] /verify-email (60s resend cooldown)

## Phase 5 — Onboarding
- [ ] /onboarding/project (create project step)
- [ ] /onboarding/api-key (copy key + download .env)
- [ ] /onboarding/install (Python/TS tabs + skip)
- [ ] /onboarding/first-run (pulsing dot + 60s timeout + accordion)
- [ ] /onboarding/complete (open trace viewer CTA)

## Phase 6 — Dashboard Pages
- [ ] Dashboard overview (stat cards + charts + recent runs)
- [ ] Runs list (filters + table + pagination)
- [ ] Trace viewer (header + Gantt + span cards + sidebar)
- [ ] Cost dashboard (hero + charts + tables)
- [ ] Alerts (list + drawer + rule config)
- [ ] Project settings (all sections + danger zone)
- [ ] API keys page
- [ ] Webhooks page
- [ ] Integrations page
- [ ] Team page (table + invite modal)
- [ ] Billing page (plan + usage + invoices)

## Phase 7 — Account Pages
- [ ] /account/profile
- [ ] /account/security
- [ ] /account/notifications
- [ ] /account/sessions

## Phase 8 — Charts
- [ ] Cost over time (Recharts line chart)
- [ ] Model breakdown (bar or table)
- [ ] Span Gantt (custom SVG/canvas timeline)
- [ ] Stat count-up animation (framer-motion)

## Phase 9 — States & Polish
- [ ] All empty states implemented per page
- [ ] All loading skeletons implemented per page
- [ ] All error states implemented per page
- [ ] 404 page
- [ ] 500 page
- [ ] Auth error page

## Phase 10 — QA
- [ ] Contrast audit (all text/bg combos)
- [ ] Keyboard navigation audit (Tab, Arrow, Enter, Escape)
- [ ] Focus ring visible on all interactive elements
- [ ] ARIA labels on icon-only buttons
- [ ] Mobile test (320px, 375px, 414px, 768px)
- [ ] Reduced motion test
- [ ] Clerk themed correctly in all auth flows
- [ ] Stripe billing states all covered
- [ ] No blue/purple/non-palette colors remain
- [ ] No rounded corners (grep for `rounded-` in Tailwind classes)
- [ ] All buttons have loading and disabled states
- [ ] Sonner toasts appear for all mutations

---

# 39 CLAUDE / CURSOR BUILD PROMPTS

---

## Prompt A — Design Tokens + globals.css

```
Create src/app/globals.css for the uncoil SaaS platform.

Requirements:
- Dark mode only. Background: #0A0A0A. No light mode variables.
- Define all CSS custom properties:
  --bg, --surface-1, --surface-2, --surface-3, --border, --muted, --body, --white
  --accent (#6366F1), --accent-light (#818CF8), --accent-dim (rgba(99,102,241,0.12))
  --success (#10B981), --warning (#F59E0B), --error (#EF4444)
  --success-dim, --warning-dim, --error-dim (rgba versions at 0.10 opacity)
  --span-llm (#818CF8), --span-tool (#34D399), --span-decision (#FBBF24),
  --span-error (#F87171), --span-retrieval (#60A5FA), --span-embed (#C084FC)
  --chart-1 through --chart-6
  --radius: 0px
  --sidebar-w: 240px, --topbar-h: 56px
  --font-pixel, --font-mono, --font-sans

- Configure Tailwind @theme extension to map these tokens to Tailwind classes.
- Set border-radius to 0 globally.
- Set body font to Geist Sans, monospace elements to Geist Mono.
- Configure font-variant-numeric: tabular-nums on .mono class.
- Add shimmer keyframe animation for skeleton loading.
- Add pulse keyframe for running dot.
- No light mode media query.
```

---

## Prompt B — Landing Page

```
Build src/app/(marketing)/page.tsx — the uncoil landing page.

Tech stack: Next.js 15 App Router, Tailwind CSS, Framer Motion, Lucide React, shadcn/ui.

Design rules:
- Background: #0A0A0A. No white backgrounds.
- Border radius: 0px everywhere (rounded-none on all elements).
- No shadows (shadow-none).
- Typography: Geist Pixel for logo, Geist Mono for UI/headers, Geist Sans for prose.
- Accent color: #6366F1.

Build these sections in order:
1. HERO
   - Left: eyebrow "AGENT OBSERVABILITY INFRASTRUCTURE" (badge, Geist Mono 11px uppercase)
   - Headline: "Every step your agent takes." (Geist Mono, clamp(48px,7vw,80px), font-weight 700)
   - Subheadline: "uncoil instruments your AI agents in two lines of code. See every tool call, 
     LLM decision, and dollar spent — in real time. Debug in minutes, not hours."
   - CTA: "Start free — no credit card" → /sign-up (primary button)
   - Ghost CTA: "View live demo" (ghost button)
   - Right: static code block showing:
     from uncoil import trace_agent, llm_call, tool_call
     
     @trace_agent(api_key=os.environ["UNCOIL_API_KEY"])
     async def research_agent(query: str) -> str:
         result = await llm_call(model="claude-sonnet-4-5", prompt=query)
         sources = await tool_call("web_search", query=query)
         return result
   - Layout: 2-col flex (desktop), stacked (mobile)
   
2. PROBLEM SECTION (bg: #111111)
   - Headline: "Agents fail silently. You have no idea why."
   - 3 cards: "No visibility" / "No debugging" / "No cost control"
   - Cards: bg #111111, border 1px #2A2A2A, no icons, Geist Mono title, Geist Sans body.

3. PRODUCT FEATURES (3 feature rows, alternating layout)
   - "Real-time trace viewer" / "Cost dashboard" / "Run replay"

4. HOW IT WORKS
   - 3 numbered steps: 01 Install / 02 Add two lines / 03 Open the dashboard
   - Horizontal on desktop, vertical on mobile

5. INTEGRATIONS GRID
   - Frameworks: LangChain, LlamaIndex, Vercel AI SDK, Autogen, CrewAI, Haystack, DSPy, Semantic Kernel
   - Models: Claude, GPT-4o, Gemini, Mistral, Llama, Cohere, Groq, Together
   - Text-only grid (no logos), Geist Mono 13px, #666666

6. FINAL CTA
   - Headline: "Start observing your agents today."
   - Body: "Free forever up to 50,000 spans per month. No credit card. No infrastructure. Works in 5 minutes."
   - CTA: "Create free account" → /sign-up

Export default as LandingPage. Use Show from @clerk/nextjs for signed-in/signed-out states on CTAs.
```

---

## Prompt C — Auth Shell with Clerk

```
Build the auth layout and auth pages for uncoil.

Files to create:
- src/app/(auth)/layout.tsx
- src/components/auth/brand-panel.tsx  
- src/components/auth/clerk-appearance.ts
- src/app/(auth)/sign-in/page.tsx
- src/app/(auth)/sign-up/page.tsx
- src/app/(auth)/forgot-password/page.tsx

Auth layout (layout.tsx):
- Split panel: left 50% (brand), right 50% (form)
- Mobile: single column, left panel hidden
- Background: #0A0A0A
- Left panel: bg #111111, border-right 1px #2A2A2A

Brand panel (brand-panel.tsx):
- Logo: "■ uncoil" in Geist Pixel
- Tagline: "Five signals. One truth."
- Feature list:
  • Real-time agent observability
  • Free up to 50,000 spans
  • Works with any LLM

clerk-appearance.ts:
export const clerkAppearance = {
  variables: {
    colorBackground: "#0A0A0A",
    colorInputBackground: "#1C1C1C",
    colorInputText: "#FFFFFF",
    colorText: "#CCCCCC",
    colorPrimary: "#6366F1",
    borderRadius: "0px",
    fontFamily: "var(--geist-mono)",
  }
}

sign-up/page.tsx:
- Use Clerk SignUp component with appearance override
- afterSignUpUrl="/onboarding/project"
- Tagline in brand panel: "Five signals. One truth."

sign-in/page.tsx:
- Use Clerk SignIn component with appearance override
- Brand panel headline: "Welcome back."
- Footer: "Don't have an account? Start free →" link to /sign-up

forgot-password/page.tsx:
- Custom form (not Clerk component)
- States: default / loading / success / invalid-email
- Success state shows: "Check your inbox. We sent a reset link to {email}."
- Back link: "← Back to sign in"
```

---

## Prompt D — Dashboard Shell

```
Build the authenticated dashboard shell for uncoil.

Files:
- src/app/dashboard/layout.tsx
- src/components/dashboard/sidebar.tsx
- src/components/dashboard/topbar.tsx
- src/components/dashboard/project-switcher.tsx
- src/components/dashboard/user-menu.tsx
- src/components/dashboard/command-menu.tsx

Requirements:
- Dashboard layout: fixed sidebar (240px) + main content area
- Topbar: 56px height, bg #111111, border-bottom 1px #2A2A2A
- Sidebar: bg #111111, border-right 1px #2A2A2A, 240px fixed

Sidebar nav order:
  Overview / Runs / Costs / Alerts
  ─────────
  API Keys / Team / Settings
  ─────────
  Docs ↗

Sidebar bottom: notification bell icon + Clerk UserButton

Active nav item: border-left 2px #6366F1, bg #161616, text #FFFFFF
Hover nav item: bg #161616

Project switcher: shows current project name, click opens dropdown with project list + "New project"

Command menu: triggered by ⌘K, searches runs/pages/actions
- Use cmdk library or shadcn Command component

Mobile: sidebar hidden, topbar shows hamburger → Sheet drawer

Auth: wrap layout with auth().protect() or middleware redirect.
Use useOrganization from @clerk/nextjs for org switcher.
```

---

## Prompt E — Trace Viewer

```
Build the trace viewer page at src/app/dashboard/[projectId]/runs/[runId]/page.tsx

This is the hero page of uncoil. It must be extremely detailed.

Layout:
- Run header (full width)
- Stat chips row
- Span overview chart (Gantt, full width)
- Two-column: [Span timeline 70%] | [Summary sidebar 30%]

Run header:
- Back link "← Runs"
- Run ID (Geist Mono, monospace)
- Agent name
- Status badge (COMPLETED / FAILED / RUNNING)
- Share button (copy URL to clipboard)

Stat chips (5 in a row):
- Duration / Total cost / Spans / Tokens / Primary model
- Each: bg #161616, border 1px #2A2A2A, Geist Mono 13px

Span overview chart:
- Horizontal Gantt chart showing all spans
- Each span = colored horizontal bar (color by span type)
- X-axis: time in ms from run start
- Click span in chart → scroll to span card in timeline
- Use SVG or canvas, not a charting library (for precision)

Span timeline:
- Vertical list of SpanCard components
- SpanCard collapsed: [expand chevron] [type-colored left bar] [span name] [type badge] [model?] [duration] [cost]
- SpanCard expanded: shows INPUT json block + OUTPUT json block (code blocks with copy buttons)
- Error span: red left border, shows error message + traceback
- Framer Motion: height animation on expand (150ms ease-out)

Summary sidebar (sticky):
- Run summary (ID, agent, status, started, duration)
- Cost breakdown by span type
- Token usage (prompt / completion / total)
- Model usage table
- Span type distribution

Loading: skeleton for header + 5 skeleton span cards
Error: "Run not found" empty state with back button
Live state: show "● LIVE RUN" banner if status=RUNNING, poll every 5s

Data: fetch from Convex api.runs.getById and api.spans.listByRun
```

---

## Prompt F — Build Prompts: Runs List + Cost Dashboard

```
Build the Runs List page: src/app/dashboard/[projectId]/runs/page.tsx

Filter bar:
- Text search (debounced 300ms): searches run ID and agent name
- Status multi-select: RUNNING / COMPLETED / FAILED / CANCELLED
- Date range picker
- Clear filters button

Runs table columns:
Run ID | Agent | Status | Spans | Duration | Cost | Model | Started

- Status: StatusBadge component
- Cost: format as $0.023 (4 decimal places if < $0.01)
- Started: relative time (2m ago), title attr with full ISO timestamp
- Row click → /dashboard/[projectId]/runs/[runId]
- Sort by any column (default: Started desc)
- Pagination: 25 per page

Empty state: "No runs match your filters" with clear filters button
Loading state: 10 skeleton rows
Error state: "Failed to load runs" with retry button

─────────────────────────────────────────────────────────────────

Build the Cost Dashboard: src/app/dashboard/[projectId]/costs/page.tsx

Sections:
1. Hero stat: "Total spend this period: $84.32" with delta vs previous period
2. Date range selector (Last 7 days / 30 days / 90 days / custom)
3. Cost over time: Recharts AreaChart, stacked by model, colors from chart-1..chart-4
4. Model breakdown table: Model | Calls | Tokens | Cost | % Total
5. Most expensive runs table: Run ID | Agent | Cost | Duration | Date | Link
6. Export CSV button (top right)
7. Cost alert CTA card (if no alert configured)

All charts: bg transparent, grid lines 1px #2A2A2A horizontal, Geist Mono axis labels, custom tooltip.
```

---

## Prompt G — Empty / Error States Library

```
Build reusable EmptyState component: src/components/dashboard/empty-state.tsx

Props:
  icon: LucideIcon
  title: string
  body: string
  cta?: { label: string; href?: string; onClick?: () => void }
  secondaryCta?: { label: string; href?: string; onClick?: () => void }

Style:
  - Centered vertically and horizontally
  - Icon: 40px, color #666666
  - Title: Geist Mono 16px #FFFFFF
  - Body: Geist Sans 14px #666666, max-width 360px, text-center
  - CTA: primary button (or ghost for secondary)
  - min-height: 300px for the container

Create typed constants for all app states:
  EMPTY_STATES.NO_RUNS
  EMPTY_STATES.NO_SPANS
  EMPTY_STATES.NO_ALERTS
  EMPTY_STATES.NO_PROJECTS
  EMPTY_STATES.NO_TEAM_MEMBERS
  EMPTY_STATES.NO_API_KEYS
  EMPTY_STATES.FAILED_TO_LOAD
  EMPTY_STATES.NETWORK_ERROR

Each constant: { icon, title, body, ctaLabel }

Also build SkeletonTable component:
  Props: rows?: number (default 10), columns: number[]  (widths as percentages)
  Renders: table structure with skeleton cells using shimmer animation
  
And ErrorBanner component:
  Props: title: string, body?: string, onRetry?: () => void
  Style: bg rgba(239,68,68,0.08), border-left 3px #EF4444, Geist Mono text
```

---

# 40 FINAL DESIGN QA CHECKLIST

## Visual

- [ ] **Dark only:** No white, light grey, or cream backgrounds anywhere
- [ ] **No rounded corners:** Zero `border-radius` except running dot (decorative circle)
- [ ] **Borders:** All 1px `#2A2A2A`. No double borders. No drop shadows.
- [ ] **Typography:** Geist Pixel for logo only. Geist Mono for UI. Geist Sans for prose.
- [ ] **Accent color:** Only `#6366F1` and `#818CF8`. No other blues or purples.
- [ ] **Status colors:** COMPLETED=green, FAILED=red, RUNNING=indigo, CANCELLED=muted. Consistent everywhere.
- [ ] **Span type colors:** Consistent with design token table. Never reused for other purposes.
- [ ] **Charts:** Follow chart color sequence. No raw CSS named colors.
- [ ] **White used sparingly:** Only for headlines, active icon/label, CTA button text.

## Pages

- [ ] All 30+ pages built and reachable
- [ ] Every page has: loading state, empty state, error state
- [ ] 404 page exists and is styled
- [ ] 500 page exists and is styled
- [ ] Auth error page exists
- [ ] Forgot password: all 3 states (default, success, invalid email)
- [ ] Reset password: validation + success redirect
- [ ] Verify email: 60s resend cooldown

## Dashboard

- [ ] Sidebar active state visible on all nav items
- [ ] Project switcher functional (switch between projects)
- [ ] Command menu (⌘K) opens and searches
- [ ] Topbar breadcrumb updates on route change
- [ ] Notification bell works
- [ ] User menu opens with all options

## Trace Viewer (hero page)

- [ ] Span Gantt chart renders correctly with span colors
- [ ] Span cards expand/collapse smoothly
- [ ] JSON blocks are copyable
- [ ] Error spans have red left border and traceback
- [ ] Summary sidebar shows all data (cost, tokens, model)
- [ ] Live run banner appears for RUNNING status
- [ ] Failed run banner appears for FAILED status
- [ ] Mobile: summary accessible via drawer

## Functionality

- [ ] All buttons have loading and disabled states
- [ ] All mutations show Sonner toast on success/failure
- [ ] Copy buttons show Check icon for 1.5s after copy
- [ ] API key shown once with clear warning
- [ ] Dangerous actions (delete, revoke) require confirmation
- [ ] Forms validate inline, not just on submit

## Auth & Billing

- [ ] Clerk styled correctly in all auth flows (0px radius, dark theme)
- [ ] Sign-up redirects to /onboarding/project
- [ ] Onboarding 5-step flow all reachable
- [ ] Stripe billing states: active, dunning, cancelled, checkout success/cancelled
- [ ] Plan limits show in billing page

## Mobile

- [ ] All pages usable at 375px width
- [ ] Sidebar replaced by drawer on mobile
- [ ] Tables collapse to card-list on mobile
- [ ] Touch targets minimum 44px
- [ ] No horizontal overflow

## Accessibility

- [ ] All interactive elements keyboard-reachable
- [ ] Focus ring visible on all focused elements
- [ ] Color not the only status indicator (always paired with label or icon)
- [ ] All icon-only buttons have aria-label
- [ ] Dialogs trap focus while open
- [ ] Form errors announced via role="alert"
- [ ] Reduced motion: no decorative animations

## Performance

- [ ] No font FOUT (fonts loaded via next/font)
- [ ] Charts render without layout shift
- [ ] Skeleton shown immediately on data fetch start
- [ ] Images optimized with next/image
- [ ] No client components where server components suffice

## SEO

- [ ] All marketing pages have unique title + meta description
- [ ] OG image configured for home, blog posts, docs
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Canonical URLs set

---

*End of uncoil Full Frontend Design Package — v1.0 — 2026-05-12*
*All sections: 01 through 40 complete.*
