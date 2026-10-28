# 13 DASHBOARD OVERVIEW

**Route:** `/dashboard/[projectId]`
**Purpose:** Summarize agent health, cost, and activity at a glance.

## Layout

```
[Page header: Project name] [Live • 12s ago]

[Stat cards row]

[Cost over time chart]  [Model breakdown table]

[Recent runs table]
```

## Stat Cards (row of 4)

| Card | Value | Delta |
|------|-------|-------|
| Total runs today | 1,432 | ↑ 14% |
| Failed runs | 23 | ↑ 2 |
| Total cost today | $12.43 | ↓ 8% |
| Avg run latency | 4.2s | ↑ 0.3s |

Cards use the Stat Card component. Red delta if metric worsened, green if improved.

## Cost Over Time Chart

- Type: Line chart (Recharts)
- X-axis: 24 hours (hourly granularity) or 7/30 days
- Y-axis: Dollar cost
- Color: `--chart-1` (indigo)
- Date range selector: top right of card (Today / 7d / 30d)

## Model Breakdown (table)

| Model | Runs | Tokens | Cost |
|-------|------|--------|------|
| gpt-4o | 832 | 2.1M | $8.40 |
| claude-3-5-sonnet | 412 | 890K | $2.67 |
| gemini-1.5-pro | 188 | 445K | $1.36 |

## Recent Runs Table (last 10)

| Run ID | Agent | Status | Spans | Cost | Duration | Started |
|--------|-------|--------|-------|------|----------|---------|
| run_a3f2b1 | research_agent | COMPLETED | 14 | $0.023 | 4.1s | 2m ago |

Row click → navigates to `/runs/[runId]`

## Empty State (no runs yet)

```
[□] NO RUNS YET

Your agent hasn't sent any spans to this project.
Install the SDK and run your agent to see it here.

[SDK Quickstart →]  [Copy API key]
```

## New Project Setup Checklist

Shown when project is newly created and no spans received:

```
GETTING STARTED
──────────────────────────────────────────────
[■] Create project                    ✓ Done
[□] Install SDK                       →
[□] Send your first span              Waiting...
[□] Set up cost alerts                →
```

## Live Update Behavior

Poll interval: 10 seconds. "Live · updated 12s ago" shown in header. If Convex websocket is available, runs table updates reactively without polling.

---

# 14 RUNS LIST

**Route:** `/dashboard/[projectId]/runs`
**Purpose:** Browse, filter, and search all agent runs.

## Filter Bar

```
[Search by run ID, agent name...] [Status ▾] [Agent ▾] [Date range] [Cost range] [Clear]
```

- Search: debounced 300ms
- Status filter: multi-select pill (RUNNING / COMPLETED / FAILED / CANCELLED)
- Date range: date picker component (From / To)
- Cost range: min/max number inputs

## Runs Table

| Column | Type | Notes |
|--------|------|-------|
| Run ID | monospace short ID | click → trace viewer |
| Agent | string | agent function name |
| Status | status badge | colored |
| Spans | number | total spans in run |
| Duration | time | e.g. "4.1s" |
| Cost | $ | e.g. "$0.023" |
| Model | string | primary model used |
| Started | relative time | "2m ago" on hover: absolute timestamp |

**Default sort:** Started desc (newest first).
**Row click:** Navigates to trace viewer.
**Row hover:** `--surface-3` background, cursor pointer.

## Pagination

Standard pagination: 25 / 50 / 100 rows. Page controls: `<< < 1 2 3 ... 14 > >>`.

## Empty State

```
NO RUNS MATCH YOUR FILTERS

Try clearing your filters or adjusting the date range.

[Clear filters]
```

## Loading State

Skeleton rows: 10 rows, each with same column widths, shimmer animation.

## Error State

```
FAILED TO LOAD RUNS

We couldn't fetch your runs. This might be a temporary issue.

[Try again]  [Check status]
```

## Mobile Behavior

Table collapses to card-list. Each card shows: Run ID, Agent, Status badge, Cost, Duration, Started. Tap to open.

---

# 15 RUN DETAIL / TRACE VIEWER

**Route:** `/dashboard/[projectId]/runs/[runId]`
**Purpose:** The hero page of uncoil. Full visibility into a single agent run.

> **This is the product.** Every design decision should prioritize comprehension and debuggability over aesthetics.

---

## 15.1 Run Header

```
[← Runs]  run_a3f2b1c9d2e4f6  research_agent  [COMPLETED ✓]  [Share] [Replay]

┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Duration │  Cost    │  Spans   │  Tokens  │  Model   │
│  4.13s   │ $0.023   │   14     │  12,400  │  gpt-4o  │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

- Stat chips: `--surface-2`, `--border`, Geist Mono. Hover shows tooltip with additional detail.
- Share button: copies sharable URL to clipboard.
- Replay button: re-runs agent with same input (if supported by project config).

**Failed run banner:**
```
┌─ ✗ RUN FAILED ─────────────────────────────────────────────────────┐
│ This run failed at span 9/14. See the error span below for details. │
└────────────────────────────────────────────────────────────────────┘
```
Background: `rgba(239,68,68,0.08)`, border-left: `3px solid --error`.

**Live run banner (running):**
```
┌─ ● LIVE RUN ──────────────────────────────────────────────────────┐
│ This run is currently executing. Spans updating in real time.      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 15.2 Span Overview Chart

A mini horizontal bar chart showing the full run duration with each span as a colored block (Gantt-style).

```
SPAN TIMELINE

0ms        1000ms      2000ms      3000ms     4130ms
│──────────────────────────────────────────────────│
├─ llm_call_1    [━━━━━━━━━━━━━]                   │ LLM 1,240ms
├─ tool_search   [━━━━━]                           │ Tool 480ms
├─ tool_fetch    [━━]                              │ Tool 220ms
├─ llm_call_2    [━━━━━━━━━━━━━━━━]                │ LLM 1,580ms
├─ tool_parse    [━]                               │ Tool 120ms
```

Colors match span type colors. Hover over block: tooltip shows span name, duration, type, cost.

---

## 15.3 Vertical Span Timeline

Main content area. Each span is a card in vertical sequence.

### Span Card — Collapsed State

```
▶ [━] llm_call_1                    LLM    gpt-4o    1,240ms    $0.012    [↗]
      SPAN_ID: span_a1b2c3 · Started: 2026-05-12 14:23:01.123
```

- Left colored bar: 3px solid span-type color
- `▶` expand icon (Chevron Right)
- Span name: Geist Mono 14px `--white`
- Type badge: right-aligned
- Model: `--muted`
- Duration + cost: right side, `--body`
- `[↗]` icon: links to model provider docs for that model

### Span Card — Expanded State

```
▼ [━] llm_call_1                    LLM    gpt-4o    1,240ms    $0.012

  ┌─ INPUT ──────────────────────────────────────────────────┐
  │ {                                                         │
  │   "model": "gpt-4o",                                     │
  │   "messages": [                                          │
  │     {"role": "user", "content": "Research topic: ..."}   │
  │   ],                                                      │
  │   "temperature": 0.7                                     │
  │ }                                        [Copy]           │
  └────────────────────────────────────────────────────────┘

  ┌─ OUTPUT ─────────────────────────────────────────────────┐
  │ {                                                         │
  │   "content": "Based on my research...",                  │
  │   "usage": {                                             │
  │     "prompt_tokens": 840,                                │
  │     "completion_tokens": 320,                            │
  │     "total_tokens": 1160                                 │
  │   }                                      [Copy]           │
  │ }                                                         │
  └────────────────────────────────────────────────────────┘

  TOKENS: 1,160 (840 in / 320 out)    COST: $0.012    LATENCY: 1,240ms
```

### Error Span — Expanded State

```
▼ [━] tool_external_api              TOOL   http_call    220ms    [✗ ERROR]

  ┌─ ERROR ─────────────────────────────────────────────────┐  ← border-left: 3px --error
  │ ConnectionError: Upstream API timeout after 200ms       │
  │                                                         │
  │ Traceback:                                              │
  │   File "agent.py", line 42, in fetch_data               │
  │     response = await client.get(url, timeout=0.2)       │
  │   ...                                                    │
  │                                          [Copy]          │
  └────────────────────────────────────────────────────────┘
```

---

## 15.4 Summary Sidebar

Right panel (280px, visible on desktop). Sticky.

```
RUN SUMMARY
─────────────────────────
Run ID:    run_a3f2b1c9
Agent:     research_agent
Status:    COMPLETED
Started:   14:23:01
Duration:  4.13s
─────────────────────────
COST BREAKDOWN
LLM calls:    $0.020
Tool calls:   $0.001
Retrievals:   $0.002
Total:        $0.023
─────────────────────────
TOKEN USAGE
Prompt:       8,400
Completion:   2,100
Total:        10,500
─────────────────────────
MODEL USAGE
gpt-4o:       2 calls
─────────────────────────
SPAN TYPES
LLM:    4    Tool:   6
Ret:    2    Mem:    2
─────────────────────────
LATENCY BREAKDOWN
P50:  2.1s   P95: 4.0s
Max:  1.58s (llm_call_2)
```

---

## 15.5 Loading State (skeleton)

- Header: skeleton for run ID, stat chips
- Timeline: 5 skeleton span cards (varying widths)
- Sidebar: skeleton for all sections

## 15.6 Missing Run State

```
RUN NOT FOUND

run_abc123def456 doesn't exist in this project,
or you don't have permission to view it.

[← Back to runs]
```

## 15.7 Mobile Behavior

- Sidebar hidden; tap "Summary" button to open as drawer
- Span timeline: full width, no overview chart
- Collapsed spans only; expand one at a time
- JSON blocks: horizontally scrollable

---

# 16 COST DASHBOARD

**Route:** `/dashboard/[projectId]/costs`

## Layout

```
[COST OVERVIEW]         [Date range: Last 7 days ▾]  [Export CSV]

[Hero: Total spend $84.32 this period]
[↑ 23% vs previous period]

[Cost over time chart — line, 7 day]

[Model breakdown table]  |  [Tool breakdown table]

[Most expensive runs table]

[Cost alert CTA]
```

## Cost Over Time Chart

- 7 day default, stacked by model
- Colors: chart-1 through chart-4
- Tooltip: per-day breakdown by model

## Model Breakdown Table

| Model | Calls | Tokens | Cost | % Total |
|-------|-------|--------|------|---------|
| gpt-4o | 4,832 | 12.1M | $48.40 | 57% |
| claude-3-5-sonnet | 2,412 | 4.89M | $24.67 | 29% |
| gemini-1.5-pro | 988 | 2.45M | $11.25 | 13% |

## Most Expensive Runs

| Run ID | Agent | Cost | Duration | Date |
|--------|-------|------|----------|------|
| run_abc | summarize_agent | $1.84 | 18.2s | May 10 |

## Cost Alert CTA

```
┌─────────────────────────────────────────────────────┐
│ ⚠ You're spending at a rate of $12/day              │
│   Set a daily cost alert to get notified if         │
│   your spend exceeds a threshold.                   │
│                                          [Set alert] │
└─────────────────────────────────────────────────────┘
```

## Empty State

```
NO COST DATA YET

Run your agent to start seeing cost breakdowns here.

[Install SDK →]
```

---

# 17 ALERTS

**Route:** `/dashboard/[projectId]/alerts`

## Layout

```
[ALERTS]                              [+ New alert rule]

[Unresolved (12)] [Resolved (48)]

[Alerts table]
```

## Alerts Table

| Column | Content |
|--------|---------|
| Severity | CRITICAL / WARNING / INFO badge |
| Alert name | e.g. "Daily cost exceeded $50" |
| Triggered | relative time |
| Run | run_id link |
| Status | UNRESOLVED / RESOLVED |
| Actions | Mark resolved, View run |

Row click → opens Alert Detail Drawer.

## Alert Detail Drawer

Right-side drawer (480px):
```
ALERT: Daily cost exceeded $50

Severity: CRITICAL
Triggered: 2026-05-12 14:23:01
Project: research-agent-prod

DESCRIPTION
Your daily spend of $52.34 exceeded the alert 
threshold of $50.00.

LINKED RUN
→ run_a3f2b1c9 (most expensive run today)

THRESHOLD DETAILS
Type: Daily cost
Threshold: $50.00
Actual: $52.34

[Mark resolved]  [Mute for 24h]

────────────────────────────────
NOTIFICATION SETTINGS
Email: ✓ user@example.com
Slack: ✓ #agent-alerts
PagerDuty: ✗ not connected

[Edit notification channels]
```

## Alert Rules Configuration

Inline panel below alert list:
```
ALERT RULES
──────────────────────────────────────────────────────────
Rule                      Threshold    Channels    Actions
Daily cost                > $50        Email, Slack [Edit] [Delete]
Run duration              > 60s        Email        [Edit] [Delete]
Failed run rate           > 10%        Slack        [Edit] [Delete]
──────────────────────────────────────────────────────────
[+ Add rule]
```

## Empty State

```
NO ALERTS

Everything looks healthy. Configure alert rules 
to get notified when something breaks.

[Configure alerts →]
```

---

# 18 PROJECT SETTINGS

**Route:** `/dashboard/[projectId]/settings`

## Sections

### Project Details
```
PROJECT NAME
[________________________]

PROJECT ID
proj_a3f2b1c9d4e5f6a7    [Copy]

CREATED
2026-04-20 14:23 UTC

[Save changes]
```

### Data Retention
```
RETENTION PERIOD
[30 days ▾]  (Pro plan)

Spans older than 30 days will be permanently deleted.
[Save]
```

### Alert Thresholds
```
DAILY COST ALERT
[$ 50.00              ]

RUN DURATION ALERT
[60                   ] seconds

FAILED RUN RATE ALERT
[10                   ] %

[Save thresholds]
```

### Notification Channels
```
EMAIL NOTIFICATIONS
user@example.com        [✓ Enabled]  [Edit]

SLACK INTEGRATION
#agent-alerts           [✓ Enabled]  [Edit]

PAGERDUTY
Not connected                        [Connect]

WEBHOOK
https://hooks.example.com/...        [Edit] [Test]
```

### Danger Zone
```
┌─ DANGER ZONE ─────────────────────────────────────────────┐
│                                                             │
│ DELETE PROJECT                                              │
│ Permanently delete this project and all its data,          │
│ including all runs, spans, API keys, and alerts.           │
│ This action cannot be undone.                              │
│                                          [Delete project]  │
└─────────────────────────────────────────────────────────────┘
```

Delete confirmation dialog:
```
DELETE PROJECT?

Type the project name to confirm:
[________________________]

[Cancel]  [Delete project]  ← destructive button, only enabled after name typed
```

---

# 19 ACCOUNT / USER SETTINGS

**Routes:** `/account` → `/account/profile` | `/account/security` | `/account/notifications` | `/account/sessions`

**Layout:** Left subnav + main content area (within dashboard shell).

## Profile (`/account/profile`)

```
DISPLAY NAME
[________________________]

EMAIL
user@example.com  [Verified ✓]

AVATAR
[■ initials] [Upload photo]

[Save profile]
```

## Security (`/account/security`)

```
PASSWORD
Managed via Clerk SSO.
[Change password via email →]

TWO-FACTOR AUTHENTICATION
Status: Not enabled
[Enable 2FA]

CONNECTED ACCOUNTS
GitHub ✓ connected
Google ✓ connected
[Disconnect]
```

## Active Sessions (`/account/sessions`)

```
ACTIVE SESSIONS
──────────────────────────────────────────────────────────────────
Device                Browser    IP             Last active  Actions
MacBook Pro           Chrome     192.168.1.1    Just now     [Current]
Windows Desktop       Firefox    10.0.0.42      2h ago       [Revoke]
iPhone 14             Mobile     172.16.0.8     Yesterday    [Revoke]
──────────────────────────────────────────────────────────────────
[Revoke all other sessions]
```

## Notification Preferences (`/account/notifications`)

```
NOTIFICATION CHANNELS

EMAIL NOTIFICATIONS
Alert triggered          [✓]
Weekly summary           [✓]
Billing events           [✓]
Product updates          [ ]

SLACK NOTIFICATIONS
Alert triggered          [✓]
(connected to #agent-alerts)

IN-APP NOTIFICATIONS
All                      [✓]

[Save preferences]
```

## Delete Account

At bottom of Profile page:
```
DELETE YOUR ACCOUNT
This will permanently delete your account, all projects, 
all data, and all organization memberships.
This action is irreversible.

[Delete my account]  ← destructive, opens confirmation dialog
```

---

# 20 BILLING & SUBSCRIPTION

**Route:** `/dashboard/[projectId]/billing`

## Current Plan Card

```
CURRENT PLAN
─────────────────────────────────────────────────────
  PRO                    $29/month · Next billing: Jun 12

  USAGE THIS CYCLE
  Spans:    62,400 / 100,000 per day  [══════════░░░░░░]  62%
  Projects: 3 / 5
  Retention: 30 days

  [Upgrade to Team →]  [Manage billing ↗]
```

## Invoice History

| Date | Amount | Status | Invoice |
|------|--------|--------|---------|
| May 1, 2026 | $29.00 | Paid | [Download PDF] |
| Apr 1, 2026 | $29.00 | Paid | [Download PDF] |

## Payment Method

```
PAYMENT METHOD
Visa ···· 4242   Expires 04/28
[Update payment method ↗]
```

## Dunning Banner (payment failed)

```
┌─ ✗ PAYMENT FAILED ──────────────────────────────────────────────┐
│ We couldn't charge your card ending in 4242.                    │
│ Update your payment method to avoid service interruption.        │
│                                         [Update payment method]  │
└─────────────────────────────────────────────────────────────────┘
```

## Checkout Success — `/checkout/success`

```
✓ SUBSCRIPTION ACTIVATED

You're now on the Pro plan.
Your new limits are active immediately.

[Go to Dashboard →]
```

## Checkout Cancelled — `/checkout/cancelled`

```
CHECKOUT CANCELLED

No changes were made to your plan.
You're still on the Free plan.

[View plans]  [Go to Dashboard]
```

---

# 21 TEAM & ORGANIZATION

**Route:** `/dashboard/[projectId]/team`

## Member List Table

| Member | Role | Status | Joined | Actions |
|--------|------|--------|--------|---------|
| Jane Doe (you) | Owner | Active | Apr 20 | — |
| John Smith | Admin | Active | Apr 22 | [Change role] [Remove] |
| dev@example.com | Developer | Pending invite | — | [Resend] [Revoke] |

## Role Definitions

| Role | Permissions |
|------|-------------|
| Owner | Full access. Delete project. Manage billing. Cannot be removed. |
| Admin | All project actions. Invite/remove members. Cannot change Owner. |
| Developer | View/create runs. Manage API keys. Cannot change settings. |
| Viewer | View-only. Read runs, costs, alerts. No mutations. |

## Invite Modal

```
INVITE TEAM MEMBER

Email address:
[________________________]

Role:
[Developer ▾]

[Send invite]
```

## Permission Matrix

| Action | Owner | Admin | Developer | Viewer |
|--------|-------|-------|-----------|--------|
| View runs | ✓ | ✓ | ✓ | ✓ |
| Create API keys | ✓ | ✓ | ✓ | ✗ |
| Edit settings | ✓ | ✓ | ✗ | ✗ |
| Manage billing | ✓ | ✗ | ✗ | ✗ |
| Invite members | ✓ | ✓ | ✗ | ✗ |
| Delete project | ✓ | ✗ | ✗ | ✗ |

## Empty State

```
YOU'RE THE ONLY ONE HERE

Invite your team to give them access to this project.

[Invite team member]
```
