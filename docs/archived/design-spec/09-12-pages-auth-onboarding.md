# 09 PUBLIC MARKETING PAGES

---

## 9.1 Landing Page — `/`

### Purpose
Convert developers who understand agent observability problems into trial users.

### Sections

---

#### SECTION 1 — Hero

**Layout:** Full-width, max-width 1200px container. Left: copy. Right: live terminal animation.

**Copy:**
```
AGENT OBSERVABILITY INFRASTRUCTURE

Every step your agent takes.

uncoil instruments your AI agents in two lines of code.
See every tool call, LLM decision, and dollar spent —
in real time. Debug in minutes, not hours.

[Start free →]   [View live demo]
```

**Supporting proof:** `★ 4.9 on ProductHunt · 2,400+ developers · Open source SDK`

**Right panel:** Animated terminal showing a live Python snippet with spans arriving in real-time.

**Background:** `--bg`. Subtle ambient glow: `radial-gradient` centered behind terminal panel, indigo at 6% opacity.

**Mobile:** Stack copy above terminal. Terminal collapses to static code snippet.

---

#### SECTION 2 — Problem

**Layout:** `--surface-1` background, full-width. Three problem cards in a row.

**Copy:**
```
THE PROBLEM
─────────────────────────────────────────
Agents fail silently. You have no idea why.
```

**Cards:**
```
NO VISIBILITY
Your agent calls 12 tools and 6 LLMs in a single run. Which step 
cost $40? Which one failed? Right now, you have no way to know.

NO DEBUGGING
When something goes wrong, you stare at raw logs and try to 
reconstruct what happened. A failed run takes hours to diagnose.

NO COST CONTROL
Runaway loops. Infinite context windows. Retries. Your LLM bill 
arrives and you have no idea what ran up the cost.
```

---

#### SECTION 3 — Product Features

**Layout:** Alternating left/right sections with terminal/screenshot panel and copy.

**Feature 1:**
```
REAL-TIME TRACE VIEWER
Watch your agent execute live. Expand any step to see full 
JSON payloads, tool arguments, and exact reasoning.
```

**Feature 2:**
```
PRECISE COST TRACKING
Never get surprised by an OpenAI bill. Track token costs at 
the run level, and see daily aggregate spend instantly.
```

**Feature 3:**
```
ZERO-CONFIG SDK
Import the library, wrap your agent. Spans stream asynchronously 
without blocking your agent's execution.
```

---

#### SECTION 4 — How It Works

**Layout:** Numbered 3-step horizontal flow.

```
01 INSTALL
pip install uncoil-sdk
or: npm install uncoil-sdk

02 INSTRUMENT
@trace_agent(api_key="uncoil_sk_live_sk_...")
async def my_agent(query):
    ...

03 OBSERVE
Open uncoil. See every span, cost, and failure in real time.
```

---

#### SECTION 5 — Live Trace Preview

**Layout:** Full-width dark panel showing a realistic trace viewer screenshot/mockup.

**Copy:**
```
SEE YOUR AGENT THINK
Every decision, every tool call, every cost — structured and 
searchable. This is what your agent's execution actually looks like.
```

Panel shows: span timeline, cost breakdown, LLM call details with token counts.

---

#### SECTION 6 — SDK Quickstart

**Layout:** Tabbed code block (Python | TypeScript), centered, max-width 760px.

**Python:**
```python
from uncoil import trace_agent

@trace_agent(api_key="uncoil_sk_live_sk_your_key_here")
async def research_agent(query: str) -> str:
    result = await llm_call(query)
    sources = await search_tool(query)
    return result
```

**TypeScript:**
```typescript
import { traceAgent } from "uncoil-sdk"

const researchAgent = traceAgent(
  async (query: string) => {
    const result = await llmCall(query)
    const sources = await searchTool(query)
    return result
  },
  { apiKey: "uncoil_sk_live_sk_your_key_here" }
)
```

---

#### SECTION 7 — Use Cases

**Layout:** 2×3 grid of use case cards.

```
Research Agents      | Customer Support Bots
Code Generation      | Multi-step Workflows
RAG Pipelines        | Autonomous Agents
```

Each card: icon, title, one-sentence description.

---

#### SECTION 8 — Integrations

**Layout:** Horizontal logo strip on dark background.

```
Works with: LangChain · LlamaIndex · Vercel AI SDK · OpenAI · Anthropic 
Gemini · AWS Bedrock · Cohere · Pinecone · Weaviate
```

---

#### SECTION 9 — Social Proof

**Layout:** 3-column testimonial cards.

```
"uncoil is the first observability tool that actually understands 
what an AI agent is doing. We caught a $400/day runaway loop 
in 20 minutes."
— Priya S., Head of AI Engineering, Arco

"I went from 'what is my agent doing' to 'I know exactly where 
it failed' in one afternoon."
— James T., Founder, Loop Labs

"The trace viewer is what I wanted APM tools to be, but for agents."
— Mei C., Senior Engineer, Foundry AI
```

---

#### SECTION 10 — Pricing Teaser

**Layout:** Two plan cards (Free / Pro) centered, with "See full pricing" link.

```
FREE                    PRO
$0/mo                   $29/mo

1 project               Unlimited projects
1,000 spans/day         100,000 spans/day
7-day retention         30-day retention
Community support       Priority support

[Start free]            [Start Pro trial]
```

---

#### SECTION 11 — Final CTA

**Copy:**
```
STOP DEBUGGING IN THE DARK

Your agents are running in production right now.
Do you know what they're doing?

[Start free — no credit card required]
```

**Background:** Subtle indigo ambient glow on `--bg`. Centered, max-width 600px.

---

#### SECTION 12 — Footer

```
■ uncoil                 Product      Developers   Company
                        Overview     Docs         Blog
Agent observability     Trace Viewer Python SDK   Privacy
infrastructure for      Pricing      TypeScript   Terms
developers.             Changelog    API Ref      Security

© 2026 uncoil Inc. · Privacy · Terms · Status
```

---

## 9.2 Pricing Page — `/pricing`

### Purpose
Convert known-intent visitors to paid plan. Remove objections via plan clarity and FAQ.

### Sections

**Plan toggle:** Annual (save 20%) / Monthly — animated toggle switch.

**Plans:**

| | Free | Pro | Team | Enterprise |
|---|------|-----|------|------------|
| Price | $0/mo | $29/mo | $79/mo | Custom |
| Projects | 1 | 5 | Unlimited | Unlimited |
| Spans/day | 1,000 | 100,000 | 1,000,000 | Custom |
| Retention | 7 days | 30 days | 90 days | Custom |
| Users | 1 | 3 | 20 | Unlimited |
| Alerts | 5 | 50 | Unlimited | Unlimited |
| Support | Community | Email | Priority | Dedicated |
| SSO | ✗ | ✗ | ✓ | ✓ |
| Custom webhooks | ✗ | ✓ | ✓ | ✓ |
| Audit log | ✗ | ✗ | ✓ | ✓ |

**Overage policy:**
```
Spans over your daily limit are queued and processed in the 
next billing cycle. You will never be silently charged for overages.
Alerts fire at 80% and 100% of your span limit.
```

**FAQ (7 questions):**
```
Q: Can I change plans at any time?
Q: What counts as a span?
Q: Do unused spans roll over?
Q: What happens at the end of my trial?
Q: Is there a startup discount?
Q: Do you offer annual invoicing for Enterprise?
Q: Can I self-host uncoil?
```

**CTA:** "Talk to sales" link below Enterprise card.

---

## 9.3 Changelog — `/changelog`

### Purpose
Developer trust-building. Show velocity of product iteration.

### Layout

Left: date + version column (sticky on desktop).
Right: entry content.

**Entry format:**
```
v0.8.2 · 2026-05-08

[Added]   Token cost tracking for Gemini 1.5 Pro
[Fixed]   Span timeline misaligned on Firefox
[Improved] Dashboard chart load time reduced by 60%
[Deprecated] v1 API endpoint /ingest/v1 (use /api/ingest)
```

**Badge colors:**
- Added: `--success` dim
- Fixed: `--accent` dim
- Improved: `--warning` dim
- Deprecated: `--muted` dim

**RSS link:** Top right, Lucide `Rss` icon, `--muted` color.

**Filter bar:** Added / Fixed / Improved / Deprecated pill filters.

---

# 10 AUTHENTICATION PAGES

## Auth Design Rules

1. All auth pages use the split-panel layout (brand left / form right).
2. Left panel uses `--surface-1` with terminal demo animation and brand tagline.
3. Right panel uses `--bg` with Clerk-wrapped form.
4. Clerk appearance overrides enforce: `borderRadius: 0`, dark background, `--accent` primary color.
5. On mobile: left panel hidden, logo appears above form.

### Clerk Appearance Override

```typescript
const clerkAppearance = {
  variables: {
    colorBackground:      '#0A0A0A',
    colorInputBackground: '#161616',
    colorInputText:       '#FFFFFF',
    colorText:            '#CCCCCC',
    colorTextSecondary:   '#666666',
    colorPrimary:         '#6366F1',
    borderRadius:         '0px',
    fontFamily:           'Geist Mono, monospace',
    fontFamilyButtons:    'Geist Mono, monospace',
  },
  elements: {
    card:              'border border-[#2A2A2A] shadow-none',
    formButtonPrimary: 'h-10 font-mono uppercase text-sm',
    socialButtonsBlockButton: 'border-[#2A2A2A] text-[#CCCCCC]',
    footerAction:      'text-[#666666]',
  }
}
```

---

## 10.1 Sign In — `/sign-in`

```
Left panel:
  ■ uncoil
  "You left something running."
  (animated terminal showing a trace arriving)

Right panel:
  SIGN IN TO uncoil

  [Clerk SignIn component]
  
  — or —

  [Continue with GitHub]
  [Continue with Google]

  Don't have an account? Start free →
```

**Loading state:** Button shows `<Loader2>` spinner.
**Error state:** Clerk handles inline. Custom: show red banner "Invalid credentials" below form.

---

## 10.2 Sign Up — `/sign-up`

```
Left panel:
  ■ uncoil
  "Instrument your agent in 2 lines of code."
  (code snippet + animated span arriving)

Right panel:
  CREATE YOUR ACCOUNT

  [Clerk SignUp component]
  
  By continuing you agree to our Terms of Service 
  and Privacy Policy.

  Already have an account? Sign in →
```

---

## 10.3 Forgot Password — `/forgot-password`

```
Layout: Centered single column (no left panel). Max-width 400px.

Headline: RESET YOUR PASSWORD
Subtext:  Enter the email connected to your uncoil account. 
          We'll send you a reset link.

[Email input]
[Send reset link →]

← Back to sign in

──────────────────────────────────
Success state (after submission):
  ✓ CHECK YOUR INBOX
  We sent a reset link to you@example.com.
  Link expires in 15 minutes.
  
  Didn't receive it? [Resend]

──────────────────────────────────
Invalid email state:
  ✗ No account found with that email address.

──────────────────────────────────
Expired link state (shown on reset page):
  ✗ RESET LINK EXPIRED
  This link was valid for 15 minutes.
  [Request a new link]
```

---

## 10.4 Reset Password — `/reset-password`

```
Headline: SET NEW PASSWORD

[New password input]
[Confirm password input]
[Set password →]

Validation (inline):
  ✓ At least 8 characters
  ✓ Contains a number
  ✓ Passwords match

Success state:
  ✓ PASSWORD UPDATED
  Your password has been changed.
  [Sign in →]
```

---

## 10.5 Verify Email — `/verify-email`

```
Headline: CHECK YOUR EMAIL

We sent a 6-digit code to you@example.com.

[○ ○ ○ ○ ○ ○]  ← OTP input, Geist Mono 32px spaced

[Verify email]

Didn't receive it? [Resend in 0:45]

──────────────────────────────────
Error state:
  ✗ INVALID CODE
  The code you entered is incorrect or has expired.
  [Request new code]
```

---

## 10.6 Auth Error — `/auth/error`

```
Headline: AUTHENTICATION ERROR

Something went wrong during sign in.
This usually happens with OAuth provider issues.

Error code: [ERR_OAUTH_CALLBACK]

[Try again]  [Contact support]
```

---

# 11 ONBOARDING FLOW

## Purpose
Get developers from account creation to first visible span in under 5 minutes.

## Progress Indicator

Fixed at top of page. 5 steps, filled squares (not circles — 0px radius).
```
[■] Create project  [■] API key  [□] Install  [□] First span  [□] Done
     ─────────────────────────────────────────────────────────────────
```

---

## Step 1 — Create Project — `/onboarding`

```
CREATE YOUR FIRST PROJECT

Give your project a name. A project maps to one agent 
or one group of agents you want to observe.

Project name: [________________________]
              e.g. "Production Research Agent"

[Create project →]

Your project is an isolated environment with its own API key.
```

---

## Step 2 — API Key — `/onboarding/api-key`

```
YOUR API KEY

This key authenticates your agent with uncoil.
Copy it now — you won't see it again.

┌─────────────────────────────────────────────────┐
│ uncoil_sk_live_sk_a8f3c2b1d9e4f6a2b8c3d1e9f4a6b2        │ [Copy]
└─────────────────────────────────────────────────┘

⚠ Store this key securely. Do not commit it to source control.

[I've copied my key →]
```

---

## Step 3 — Install SDK — `/onboarding/install`

```
INSTALL THE SDK

Choose your runtime:

  [Python]  [TypeScript]

─────────────────────────────────────────────────
PYTHON

pip install uncoil-sdk

─────────────────────────────────────────────────

from uncoil import trace_agent

@trace_agent(api_key="uncoil_sk_live_sk_your_key")
async def my_agent(query: str) -> str:
    # your agent code here
    result = await llm_call(query)
    return result

─────────────────────────────────────────────────
TYPESCRIPT

npm install uncoil-sdk
# or: yarn add uncoil

─────────────────────────────────────────────────

import { traceAgent } from "uncoil-sdk"

const myAgent = traceAgent(
  async (query: string) => {
    const result = await llmCall(query)
    return result
  },
  { apiKey: "uncoil_sk_live_sk_your_key" }
)

[My SDK is installed →]
```

---

## Step 4 — First Run — `/onboarding/first-run`

```
WAITING FOR YOUR FIRST SPAN

Run your instrumented agent and we'll detect it here.

┌─────────────────────────────────────────────────┐
│                                                 │
│   ● Listening for spans...                      │
│                                                 │
│   No spans received yet                         │
│                                                 │
│   Make sure you:                                │
│   ✓ Installed the SDK                           │
│   ✓ Added your API key                          │
│   ✓ Ran your agent at least once                │
│                                                 │
└─────────────────────────────────────────────────┘

[Troubleshoot] [Send test span] [Skip for now]

──────────────────────────────────
Success state (span received):

✓ FIRST SPAN RECEIVED

Your agent sent its first span 2.3 seconds ago.
Run ID: run_a3f2b1c9

[Open trace viewer →]
```

---

## Step 5 — Complete — `/onboarding/complete`

```
■ YOU'RE READY

uncoil is now observing your agent.

What's next:
→ Open your Dashboard to see live runs
→ Set up cost alerts to avoid bill surprises
→ Invite your team

[Open Dashboard →]
```

---

# 12 DASHBOARD APP SHELL

## 12.1 Topbar

```
[≡]  [breadcrumb: Overview / my-agent]           [⌘K]  [🔔]  [●avatar]
```

- `≡` Hamburger (mobile only): opens sidebar drawer
- Breadcrumb: Geist Mono 13px, `--muted` separator `>`, current page white
- `⌘K`: ghost icon button, opens command menu
- `🔔`: ghost icon button, shows notification dot if unread
- Avatar: opens user dropdown (Profile / Settings / Sign out)

## 12.2 Sidebar

```
┌──────────────────────────────┐
│  ■ uncoil   [project name ▾] │  ← project switcher dropdown
├──────────────────────────────┤
│  Overview                    │
│  Runs                        │
│  Costs                       │
│  Alerts                      │
├──────────────────────────────┤
│  API Keys                    │
│  Webhooks                    │
│  Integrations                │
├──────────────────────────────┤
│  Team                        │
│  Settings                    │
│  Billing                     │
├──────────────────────────────┤
│  Docs ↗                      │
└──────────────────────────────┘
[user avatar] Name / Plan
```

## 12.3 Project Switcher Dropdown

Shows all projects the user has access to. Search input at top of dropdown if >5 projects. "+ New project" at bottom.

## 12.4 User Menu (avatar click)

```
● user@example.com
─────────────────────
Profile
Account Settings
Notification Prefs
─────────────────────
New Organization
Manage Organizations
─────────────────────
Docs
Changelog
Support
─────────────────────
Sign out
```

## 12.5 Command Menu (⌘K)

```
> [search...]

RECENT RUNS
  → run_a3f2b1c9 · research_agent · 2m ago
  → run_b1c2d3e4 · code_agent · 14m ago

NAVIGATE
  → Overview
  → Runs
  → Cost Dashboard
  → Alerts

ACTIONS
  → Create new project
  → Invite team member
  → Generate API key

DOCS
  → Quickstart Guide
  → Python SDK reference
```

## 12.6 Dashboard Routes

| Route | Page |
|-------|------|
| `/dashboard` | Project overview (redirect to first project) |
| `/dashboard/[projectId]` | Project overview |
| `/dashboard/[projectId]/runs` | Runs list |
| `/dashboard/[projectId]/runs/[runId]` | Trace viewer |
| `/dashboard/[projectId]/costs` | Cost dashboard |
| `/dashboard/[projectId]/alerts` | Alerts list |
| `/dashboard/[projectId]/api-keys` | API key management |
| `/dashboard/[projectId]/webhooks` | Webhook management |
| `/dashboard/[projectId]/integrations` | Integrations |
| `/dashboard/[projectId]/team` | Team members |
| `/dashboard/[projectId]/settings` | Project settings |
| `/dashboard/[projectId]/billing` | Billing & subscription |
| `/account` | Account settings |
| `/account/profile` | Profile |
| `/account/security` | Security & sessions |
| `/account/notifications` | Notification preferences |
