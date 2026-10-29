# Design Spec Addendum — Sections 14–24 Corrections & Detail

## §14 RUNS LIST — Corrections

**Runs Table Columns (corrected order):**
Status | Run ID | Spans | Cost | Duration | Model | Started

**Mobile:** Status + Run ID + Cost only (all other columns hidden).

**Filter bar:** Search (run ID / model) | Status | Date range | Cost range | Clear filters

---

## §15 TRACE VIEWER — Corrections & Detail

### Span Overview Chart
- Component: `Recharts ComposedChart`
- Height: **48px** (compact)
- Each segment width proportional to `latencyMs`
- Color by span type (use span type tokens)
- Click segment → scroll to corresponding span card

### Span Card
- Collapsed height: **56px**
- Left border: **3px** solid span-type color
- Expanded: shows JSON input block + JSON output block
- Error spans: red border + stack trace block

### Replay Mode
- Controls: `[⏮ Previous]` `[▶ Play]` `[⏭ Next]`
- Active span: full opacity, highlighted with accent border
- All other spans: `opacity: 0.3` (dimmed)
- Play advances through spans sequentially at 800ms intervals

### Summary Sidebar (corrected)
- Cost donut chart (by span type)
- Latency breakdown (table: span name / latency)
- Model usage (model / calls / tokens)
- Tool usage (tool name / calls / avg latency)
- Token usage (prompt / completion / total)

---

## §16 COST DASHBOARD — Corrections

**Hero stat copy:** `$284.17 total spend — last 30 days`

**Controls:** Date range picker (top right) + `Export CSV` button

**Main chart:** Time series with **span-type toggles** (toggle each type on/off as a series)

**Most expensive runs:** Bar chart (horizontal, Recharts), not just a table

**Cost alerts section:** Inline below charts — shows configured alerts + CTA if none set

---

## §17 ALERTS — Detail confirmed

- Table with tabs: `Unresolved (n)` | `Resolved (n)`
- Alert detail → right Drawer
- Drawer actions: Mark resolved | View run
- Inline settings panel: configure thresholds without leaving page
- Empty state: "No alerts — configure thresholds to get notified"

---

## §23 DOCS — Corrections

**Deployment:** Separate subdomain `docs.uncoil.dev`
**Platform:** Mintlify or Nextra (dark theme, maintains uncoil visual identity)
**Search:** Cmd+K

### Full Navigation Tree

```
GETTING STARTED
  Overview / Quickstart / Concepts / Architecture / FAQ

PYTHON SDK
  Installation / @trace_agent / llm_call / tool_call / decision / Configuration

TYPESCRIPT SDK
  Installation / traceAgent / Helpers / Configuration / Type reference

API REFERENCE
  POST /api/ingest / Span schema / Run schema / Error codes / Rate limits

INTEGRATIONS
  LangChain / LlamaIndex / Vercel AI SDK / Autogen / CrewAI

GUIDES
  Debug failing agent / Cost alerts / Evals in CI / Export spans
```

---

## §24 BLOG — Hero copy correction

**Hero headline:** `Blog — Engineering, observability, and the future of AI agents.`

**Categories:** Engineering / Agents / Observability / Cost Control / Product / Company

**Layout:** Featured article (full width) → 3-column grid → Newsletter → Pagination
