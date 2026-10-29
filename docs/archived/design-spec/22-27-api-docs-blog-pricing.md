# 22 API KEYS & DEVELOPER SETTINGS

**Route:** `/dashboard/[projectId]/api-keys`

## API Key List

```
API KEYS                                           [+ Create key]

──────────────────────────────────────────────────────────────────
Name            Key (masked)          Created    Last used  Actions
Production      uncoil_sk_live_sk_a3f2••••      Apr 20     2m ago     [Reveal] [Copy] [Rotate] [Revoke]
Staging         uncoil_sk_live_sk_b1c2••••      Apr 21     1h ago     [Reveal] [Copy] [Rotate] [Revoke]
CI/CD           uncoil_sk_live_sk_c3d4••••      Apr 22     Never      [Reveal] [Copy] [Rotate] [Revoke]
──────────────────────────────────────────────────────────────────
```

## Create Key Modal

```
CREATE API KEY

Key name (for your reference):
[________________________]

[Create key]

─────────────────────────────────────────
After creation — shown ONCE:

YOUR NEW API KEY

uncoil_sk_live_sk_a3f2b1c9d4e5f6a7b8c9d0e1f2a3b4

⚠ Copy this key now. It will not be shown again.

[Copy key]  [Done]
```

## Key States

- **Active:** green dot, full interactions enabled
- **Rotated:** old key immediately revoked, new key generated
- **Revoked:** red strike-through, `[Revoked]` label, no actions

## Revoke Confirmation Dialog

```
REVOKE API KEY?

Revoking "Production" will immediately invalidate this key.
Any agents using it will stop sending spans.

[Cancel]  [Revoke key]
```

---

## Webhooks — `/dashboard/[projectId]/webhooks`

```
WEBHOOKS                                           [+ Add endpoint]

Endpoint                        Events            Status   Actions
https://hooks.myapp.com/uncoil   run.failed        Active   [Edit] [Test] [Delete]
https://hooks.myapp.com/alerts  alert.triggered   Active   [Edit] [Test] [Delete]
```

Test webhook: sends a sample payload to the endpoint, shows response status inline.

---

## Integrations — `/dashboard/[projectId]/integrations`

Integration cards (2-column grid):

| Integration | Status | Action |
|-------------|--------|--------|
| Slack | Connected | [Configure] |
| GitHub | Not connected | [Connect] |
| Vercel | Not connected | [Connect] |
| PagerDuty | Not connected | [Connect] |
| LangChain | Docs only | [View guide →] |
| Vercel AI SDK | Docs only | [View guide →] |
| LlamaIndex | Docs only | [View guide →] |
| OpenAI | Auto-detected | [View usage] |

Integration card anatomy:
```
┌──────────────────────────────────┐
│ [Logo]  Integration Name         │
│         One-line description     │
│                                  │
│ Status: Connected ✓              │
│                          [Button]│
└──────────────────────────────────┘
```

---

# 23 DOCS WEBSITE

**Route:** `/docs` or `docs.uncoil.dev`

## Docs Navigation Tree

```
GETTING STARTED
  ├─ Introduction
  ├─ Quickstart (Python)
  ├─ Quickstart (TypeScript)
  └─ Core concepts

CONCEPTS
  ├─ What is a span?
  ├─ What is a run?
  ├─ Span types
  ├─ Cost tracking
  ├─ Latency measurement
  └─ Alerting

PYTHON SDK
  ├─ Installation
  ├─ trace_agent decorator
  ├─ Manual span creation
  ├─ Custom span attributes
  ├─ Async support
  └─ Configuration reference

TYPESCRIPT SDK
  ├─ Installation
  ├─ traceAgent wrapper
  ├─ Manual span creation
  ├─ Streaming support
  └─ Configuration reference

API REFERENCE
  ├─ Authentication
  ├─ POST /api/ingest
  ├─ GET /api/runs
  ├─ GET /api/runs/{id}
  ├─ GET /api/spans
  └─ Error codes

GUIDES
  ├─ LangChain integration
  ├─ Vercel AI SDK integration
  ├─ LlamaIndex integration
  ├─ Cost budgeting
  ├─ Setting up alerts
  └─ Multi-agent tracing

SELF-HOSTING (Enterprise)
  ├─ Architecture overview
  ├─ Docker deployment
  └─ Configuration

CHANGELOG
  └─ (links to /changelog)
```

## Docs Layout

```
[Topbar: logo, search, GitHub link, Sign in]
[Left sidebar 240px] | [Prose 720px] | [Right ToC 200px]
```

## Callout Styles

```
NOTE:    left-border: 2px --accent;    bg: --accent-dim
WARNING: left-border: 2px --warning;   bg: --warning-dim
DANGER:  left-border: 2px --error;     bg: --error-dim
TIP:     left-border: 2px --success;   bg: --success-dim
```

## Docs Code Block (enhanced)

```
[filename.py]                                        [Copy ✓]
──────────────────────────────────────────────────────────
 1  from uncoil import trace_agent
 2  
 3  @trace_agent(api_key="uncoil_sk_live_sk_...")
 4  async def research_agent(query: str) -> str:
 5      result = await llm_call(query)
 6      return result
──────────────────────────────────────────────────────────
```

## Right-side Table of Contents

Sticky. Auto-generated from H2/H3 in page. Active heading highlighted with `--accent` left border. Smooth scroll on click.

## Mobile Docs

- Left and right sidebars hidden
- Hamburger opens left nav as full-screen overlay
- ToC accessible via "On this page ↓" button at top of article

---

# 24 BLOG

**Route:** `/blog`

## Blog Index Layout

```
[Nav]

BLOG
──────────────────────────────────────────────────
From the uncoil team: engineering, agents, and AI in production.

[All] [Engineering] [Agents] [Observability] [Cost Control] [Product] [Company]

[FEATURED ARTICLE — full-width card]
  Why AI agents fail in production
  Engineering · 8 min read · May 10, 2026
  "The most common failure mode isn't the model — it's the invisible 
   loop that retries 40 times before you notice."
  [Read article →]

[Blog grid — 3 columns]
  [Card]  [Card]  [Card]
  [Card]  [Card]  [Card]

[Load more]

[Newsletter signup]
  STAY IN THE LOOP
  Engineering insights and product updates — no spam.
  [Email input] [Subscribe]
```

## Blog Card Component

```
┌──────────────────────────────────────────────┐
│ [ENGINEERING]                                │  ← category badge
│                                              │
│ The hidden cost of tool-calling loops        │  ← title: Geist Mono 16px
│                                              │
│ When your agent calls the same tool 40 times │  ← excerpt: Geist Sans 14px --body
│ in a row, you have a loop problem — and a    │
│ $200 billing problem.                        │
│                                              │
│ ● Jane Doe · May 8 · 6 min read             │  ← metadata: Geist Mono 11px --muted
└──────────────────────────────────────────────┘
```

## 10 Suggested Blog Post Titles

1. "Why AI agents fail in production"
2. "The hidden cost of tool-calling loops"
3. "Tracing LLM decisions like distributed systems"
4. "How we built a real-time span ingestion pipeline with Tinybird"
5. "The observability gap in multi-agent systems"
6. "Cost attribution for complex agent workflows"
7. "Debugging a $400/day runaway agent loop"
8. "OpenAI vs Anthropic vs Gemini: cost and latency in production"
9. "Why your agent's P95 latency is 10x worse than P50"
10. "From logs to spans: the evolution of AI agent debugging"

---

# 25 BLOG ARTICLE PAGE

**Route:** `/blog/[slug]`

## Layout

```
[Nav]

[Article header — full width]
  Category badge
  Title (Geist Mono 40px, --white)
  Subtitle (Geist Sans 20px, --body)
  ● Author avatar · Name · Date · X min read
  [Share: Twitter] [Share: LinkedIn] [Copy link]

[Article body 760px + Right ToC 200px]

[Related posts — 3 cards]

[Newsletter CTA]
```

## Article Body Styles

- H2: Geist Mono 24px, `--white`, margin-top 48px
- H3: Geist Mono 18px, `--white`, margin-top 32px
- P: Geist Sans 18px, `--body`, line-height 1.8
- Blockquote: border-left 3px `--accent`, padding-left 20px, `--body` italic
- Inline code: `--surface-3` bg, `--accent-light` text, Geist Mono 15px, padding 2px 6px
- Code block: standard code block component

## SEO Metadata (per article)

```html
<title>{article.title} — uncoil Blog</title>
<meta name="description" content="{article.excerpt}" />
<meta property="og:title" content="{article.title}" />
<meta property="og:image" content="{article.coverImage}" />
<meta property="article:published_time" content="{article.date}" />
```

---

# 26 CHANGELOG

**Route:** `/changelog`

## Layout

```
CHANGELOG
────────────────────────────────
Product updates and release notes.

[RSS ↗]

[All] [Added] [Fixed] [Improved] [Deprecated]

v0.9.0 · 2026-05-12
────────────────────────────────
[Added]      Real-time span streaming via WebSocket
[Added]      Cost per span type breakdown in trace viewer
[Improved]   Dashboard overview loads 3x faster
[Fixed]      Span timeline misalignment on Firefox 124

v0.8.5 · 2026-05-05
────────────────────────────────
[Added]      TypeScript SDK v2.0 with full type inference
[Fixed]      API key rotation did not invalidate old key immediately
[Deprecated] /api/ingest/v1 endpoint (migrate to /api/ingest)
```

## Entry Anatomy

```
v{version} · {date}                                [anchor #v090]
────────────────────────────────────────────────────────────────
[badge]  Description text — Geist Sans 15px --body
[badge]  Description text
```

Badge types: Added (success-dim), Fixed (accent-dim), Improved (warning-dim), Deprecated (muted bg).

---

# 27 PRICING PAGE

**Route:** `/pricing`

## Annual/Monthly Toggle

```
  Monthly    [●────] Annual  Save 20%
```

Toggle: `--accent` filled when Annual selected.

## Plan Cards (4 column)

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ FREE       │ │ PRO        │ │ TEAM       │ │ ENTERPRISE │
│            │ │ ★ Popular  │ │            │ │            │
│ $0         │ │ $29/mo     │ │ $79/mo     │ │ Custom     │
│            │ │ $23/mo ann │ │ $63/mo ann │ │            │
│ 1 project  │ │ 5 projects │ │ Unlimited  │ │ Unlimited  │
│ 1K spans/d │ │ 100K/d     │ │ 1M/d       │ │ Custom     │
│ 7d retain  │ │ 30d retain │ │ 90d retain │ │ Custom     │
│ 1 user     │ │ 3 users    │ │ 20 users   │ │ Unlimited  │
│ 5 alerts   │ │ 50 alerts  │ │ Unlimited  │ │ Unlimited  │
│ Community  │ │ Email      │ │ Priority   │ │ Dedicated  │
│            │ │            │ │ SSO ✓      │ │ SSO ✓      │
│            │ │            │ │ Audit log ✓│ │ Audit log ✓│
│[Start free]│ │[Start Pro] │ │[Start Team]│ │[Talk sales]│
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

Pro card: `border: 1px solid --accent` (highlighted).

## Full Comparison Table

Collapsible "See full comparison" section with all feature rows.

## FAQ

```
Q: What counts as a span?
A: A span is a single instrumented unit of work — one LLM call, one tool 
   call, one retrieval. Each trace (run) typically contains 5-30 spans.

Q: What happens if I exceed my span limit?
A: Additional spans are queued but not lost. You'll receive an alert at 
   80% and 100% of your limit. We never silently charge for overages.

Q: Can I downgrade at any time?
A: Yes. Your plan changes at the next billing cycle.

Q: Is there a free trial of Pro?
A: Yes — 14 days, no credit card required.

Q: Do you offer startup discounts?
A: Yes. Email founders@uncoil.com with proof of incorporation.

Q: Do you offer annual invoicing for Enterprise?
A: Yes. Contact sales for a custom contract.

Q: Can I self-host uncoil?
A: Enterprise plans include self-hosted deployment documentation.
```
