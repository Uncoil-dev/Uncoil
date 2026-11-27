// The four failures the page can tell, picked by the visitor in the hero: each is one example run
// of six steps that fails at step 06, the step that caused it, and the run after the fix. The
// hero, the "where it broke" figure, the log wall, the trace view and the fix all read from here,
// so the whole page tells the same story. Model calls are priced from their tokens at gpt-4o list
// price, the same way as the page's main run (see run-data.ts); every case is labelled as example
// data on the page.

import { MODEL, PLAN_CALL, RUN_A, RUN_B, tokens, totalCost, usd, type ExampleSpan } from "./run-data.ts";

export type CaseId = "empty" | "loop" | "timeout" | "wrong";

/** The icons the "where it broke" figure can draw on a step's plate. */
export type StepIcon = "agent" | "chat" | "parcel" | "search" | "retry" | "coin" | "page" | "calendar" | "pin" | "cross" | "house";

export type Step = { name: string; note: string; icon: StepIcon };

export type Case = {
  id: CaseId;
  /** The picker: how the visitor would describe the bug, long and short. */
  label: string;
  short: string;
  /** The six top-level steps, 01 to 06. Step 06 is always where the run failed. */
  steps: readonly [Step, Step, Step, Step, Step, Step];
  /** The step (1-6) that caused the failure. 6 means the failing step is its own cause. */
  cause: 3 | 4 | 5 | 6;
  /** One-line notes the hero and the figure use: what step 06 did and what the cause did. */
  failShort: string;
  causeShort: string;
  /** The "where it broke" headline's second line, and the figure's three reading lines. */
  brokeAt: string;
  reading: readonly [string, string, string];
  /** One line under the trace: what Uncoil shows for it. */
  shows: string;
  run: readonly ExampleSpan[];
  /** The span the trace view opens on: the one that explains the failure. */
  causeSpan: string;
  /** A group the trace view may fold on phones. */
  fold?: string;
  agent: string;
  runId: string;
  fix: {
    after: readonly ExampleSpan[];
    afterId: string;
    /** The headline's end, after "Fix step N.". */
    result: string;
    /** Ask AI's example answer and the paragraph under it. */
    answer: string;
    body: string;
    /** The big number before and after, what it measures and what made it big. */
    metric: string;
    before: string;
    afterValue: string;
    why: string;
  };
};

const T0 = Date.parse("2026-11-21T14:02:10.000Z");
const at = (ms: number) => new Date(T0 + ms).toISOString();
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

// ── A retry loop ──────────────────────────────────────────────────────────────────────────────
// A research agent searches without asking for links, so its summary can never fill "sources".
// It asks the model again eight times, then the save step rejects the summary anyway.

const LOOP_PLAN: ExampleSpan = { spanId: "l-plan", parentSpanId: "l-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(20), latencyMs: 700, inputTokens: 2000, outputTokens: 400, costUsd: 0.009, detail: { input: "Summarise this week's papers on retrieval, with sources.", output: "Search, draft the summary as JSON, save the report." } };
const LOOP_DRAFT = (root: string, id: string): ExampleSpan => ({ spanId: id, parentSpanId: root, spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(1420), latencyMs: 1600, inputTokens: 9000, outputTokens: 900, costUsd: 0.0315, detail: { input: "Write the summary as JSON: title, points, sources.", output: id.startsWith("l") ? '{ "title": "…", "points": [ … ], "sources": [] }' : '{ "title": "…", "points": [ … ], "sources": [ 12 links ] }' } });

const LOOP_CALLS = Array.from({ length: 8 }, (_, i): ExampleSpan => ({
  spanId: `l-call-${i + 1}`,
  parentSpanId: "l-loop",
  spanType: "llm_call",
  name: "llm.chat",
  modelId: MODEL,
  createdAt: at(3040 + i * 950),
  latencyMs: 900,
  // Each attempt resends the conversation so far, so its prompt grows by 1,200 tokens.
  inputTokens: 10_500 + i * 1200,
  outputTokens: 400,
  costUsd: [0.03025, 0.03325, 0.03625, 0.03925, 0.04225, 0.04525, 0.04825, 0.05125][i],
  detail: { input: "sources is empty. Return the JSON again with sources filled.", output: '{ …, "sources": [] }' },
}));

const LOOP: readonly ExampleSpan[] = [
  { spanId: "l-root", parentSpanId: "", spanType: "agent", name: "research-agent", createdAt: at(0), latencyMs: 10_840, costUsd: 0, detail: { input: "Summarise this week's papers on retrieval, with sources.", output: "Failed: report.save rejected the summary." } },
  LOOP_PLAN,
  { spanId: "l-search", parentSpanId: "l-root", spanType: "tool_call", name: "web.search", toolName: "web.search", createdAt: at(760), latencyMs: 640, costUsd: 0, detail: { input: 'web.search("retrieval papers this week", { fields: ["title", "snippet"] })', output: "12 results · title and snippet, no links" } },
  LOOP_DRAFT("l-root", "l-draft"),
  { spanId: "l-loop", parentSpanId: "l-root", spanType: "agent", name: "llm.chat · retry", createdAt: at(3040), latencyMs: 7600, costUsd: 0, detail: { input: "Eight attempts to fill sources.", output: "Gave up with sources still empty." } },
  ...LOOP_CALLS,
  { spanId: "l-save", parentSpanId: "l-root", spanType: "tool_call", name: "report.save", toolName: "report.save", createdAt: at(10_700), latencyMs: 120, costUsd: 0, errorType: "ValidationError", errorMessage: 'field "sources" must have at least 1 item', detail: { input: 'report.save({ title: "…", sources: [] })', output: 'ValidationError · "sources" must have at least 1 item' } },
];

const LOOP_FIXED: readonly ExampleSpan[] = [
  { spanId: "lb-root", parentSpanId: "", spanType: "agent", name: "research-agent", createdAt: at(0), latencyMs: 3200, costUsd: 0, detail: { input: "Summarise this week's papers on retrieval, with sources.", output: "Report saved with 12 sources." } },
  { ...LOOP_PLAN, spanId: "lb-plan", parentSpanId: "lb-root" },
  { spanId: "lb-search", parentSpanId: "lb-root", spanType: "tool_call", name: "web.search", toolName: "web.search", createdAt: at(760), latencyMs: 650, costUsd: 0, detail: { input: 'web.search("retrieval papers this week", { fields: ["title", "snippet", "url"] })', output: "12 results with links" } },
  LOOP_DRAFT("lb-root", "lb-draft"),
  { spanId: "lb-save", parentSpanId: "lb-root", spanType: "tool_call", name: "report.save", toolName: "report.save", createdAt: at(3040), latencyMs: 130, costUsd: 0, detail: { input: 'report.save({ title: "…", sources: [ 12 ] })', output: "Saved" } },
];

// ── A tool call that hangs ────────────────────────────────────────────────────────────────────
// A booking agent's payment call never answers. Every step before it was quick, so the step that
// failed is also the cause: the client waits with no timeout.

const PAY_INPUT = 'payments.charge({ amount: 20, currency: "EUR" })';
const TIMEOUT_HEAD = (root: string, p: string): ExampleSpan[] => [
  { spanId: `${p}-plan`, parentSpanId: root, spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(20), latencyMs: 760, inputTokens: 2400, outputTokens: 800, costUsd: 0.014, detail: { input: "Book a table for 4 on Friday at 19:00.", output: "Check the calendar, hold the slot, take the deposit." } },
  { spanId: `${p}-cal`, parentSpanId: root, spanType: "tool_call", name: "calendar.lookup", toolName: "calendar.lookup", createdAt: at(800), latencyMs: 180, costUsd: 0, detail: { input: 'calendar.lookup("fri 19:00", 4)', output: "Table 12 free" } },
  { spanId: `${p}-hold`, parentSpanId: root, spanType: "tool_call", name: "booking.hold", toolName: "booking.hold", createdAt: at(1000), latencyMs: 240, costUsd: 0, detail: { input: "booking.hold(table: 12)", output: "Held for 10 minutes" } },
  { spanId: `${p}-args`, parentSpanId: root, spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(1260), latencyMs: 600, inputTokens: 3000, outputTokens: 120, costUsd: 0.0087, detail: { input: "Take the €20 deposit for table 12.", output: `Call ${PAY_INPUT}` } },
];

const TIMEOUT: readonly ExampleSpan[] = [
  { spanId: "t-root", parentSpanId: "", spanType: "agent", name: "booking-agent", createdAt: at(0), latencyMs: 31_900, costUsd: 0, detail: { input: "Book a table for 4 on Friday at 19:00.", output: "Failed: payments.charge timed out." } },
  ...TIMEOUT_HEAD("t-root", "t"),
  { spanId: "t-pay", parentSpanId: "t-root", spanType: "tool_call", name: "payments.charge", toolName: "payments.charge", createdAt: at(1880), latencyMs: 30_000, costUsd: 0, errorType: "TimeoutError", errorMessage: "no response after 30000 ms", detail: { input: `${PAY_INPUT} · no timeout set`, output: "TimeoutError · no response after 30000 ms" } },
];

const TIMEOUT_FIXED: readonly ExampleSpan[] = [
  { spanId: "tb-root", parentSpanId: "", spanType: "agent", name: "booking-agent", createdAt: at(0), latencyMs: 2540, costUsd: 0, detail: { input: "Book a table for 4 on Friday at 19:00.", output: "Booked table 12, deposit taken." } },
  ...TIMEOUT_HEAD("tb-root", "tb"),
  { spanId: "tb-pay", parentSpanId: "tb-root", spanType: "tool_call", name: "payments.charge", toolName: "payments.charge", createdAt: at(1880), latencyMs: 640, costUsd: 0, detail: { input: `${PAY_INPUT} · timeout 5000 ms, 1 retry`, output: "Charged €20" } },
];

// ── The wrong tool ────────────────────────────────────────────────────────────────────────────
// A support agent asked to change an address cancels the order instead, so the address change
// that follows is refused. The trace shows the tool it chose and the input it sent.

const WRONG_HEAD = (root: string, p: string): ExampleSpan[] => [
  { spanId: `${p}-plan`, parentSpanId: root, spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(20), latencyMs: 820, inputTokens: 2800, outputTokens: 400, costUsd: 0.011, detail: { input: "Please change the delivery address on order 7730.", output: "Look up order 7730, then change its address." } },
  { spanId: `${p}-lookup`, parentSpanId: root, spanType: "tool_call", name: "orders.lookup", toolName: "orders.lookup", createdAt: at(860), latencyMs: 150, costUsd: 0, detail: { input: 'orders.lookup("7730")', output: "Not shipped yet" } },
];

const WRONG: readonly ExampleSpan[] = [
  { spanId: "w-root", parentSpanId: "", spanType: "agent", name: "support-agent", createdAt: at(0), latencyMs: 2320, costUsd: 0, detail: { input: "Please change the delivery address on order 7730.", output: "Failed: orders.update_address refused a cancelled order." } },
  ...WRONG_HEAD("w-root", "w"),
  { spanId: "w-pick", parentSpanId: "w-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(1030), latencyMs: 700, inputTokens: 3400, outputTokens: 120, costUsd: 0.0097, detail: { input: "Tools: orders.cancel (change or cancel an order), orders.update_address.", output: 'Call orders.cancel({ order: "7730" })' } },
  { spanId: "w-cancel", parentSpanId: "w-root", spanType: "tool_call", name: "orders.cancel", toolName: "orders.cancel", createdAt: at(1740), latencyMs: 320, costUsd: 0, detail: { input: 'orders.cancel({ order: "7730" })', output: "Order 7730 cancelled" } },
  { spanId: "w-address", parentSpanId: "w-root", spanType: "tool_call", name: "orders.update_address", toolName: "orders.update_address", createdAt: at(2080), latencyMs: 210, costUsd: 0, errorType: "HTTPError", errorMessage: "409 Conflict · order 7730 is cancelled", detail: { input: 'orders.update_address({ order: "7730", to: "new address" })', output: "409 Conflict · order 7730 is cancelled" } },
];

const WRONG_FIXED: readonly ExampleSpan[] = [
  { spanId: "wb-root", parentSpanId: "", spanType: "agent", name: "support-agent", createdAt: at(0), latencyMs: 1990, costUsd: 0, detail: { input: "Please change the delivery address on order 7730.", output: "Delivery address on order 7730 updated." } },
  ...WRONG_HEAD("wb-root", "wb"),
  { spanId: "wb-pick", parentSpanId: "wb-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(1030), latencyMs: 700, inputTokens: 3400, outputTokens: 120, costUsd: 0.0097, detail: { input: "Tools: orders.cancel (cancel an order), orders.update_address (change where it ships).", output: 'Call orders.update_address({ order: "7730" })' } },
  { spanId: "wb-address", parentSpanId: "wb-root", spanType: "tool_call", name: "orders.update_address", toolName: "orders.update_address", createdAt: at(1760), latencyMs: 210, costUsd: 0, detail: { input: 'orders.update_address({ order: "7730", to: "new address" })', output: "200 OK · address updated" } },
];

const loopCost = (run: readonly ExampleSpan[], group: string) => run.filter((s) => s.parentSpanId === group).reduce((n, s) => n + s.costUsd, 0);

export const CASES: readonly Case[] = [
  {
    id: "empty",
    label: "A search came back empty",
    short: "Empty search",
    steps: [
      { name: "support-agent", note: "run started", icon: "agent" },
      { name: "llm.chat", note: `${tokens(PLAN_CALL).toLocaleString("en-US")} tok · ${PLAN_CALL.latencyMs} ms`, icon: "chat" },
      { name: "order.lookup", note: "140 ms", icon: "parcel" },
      { name: "docs.search", note: "0 results", icon: "search" },
      { name: "llm.chat · retry", note: "guessed the policy", icon: "retry" },
      { name: "refund.issue", note: "502 · 5000 ms", icon: "coin" },
    ],
    cause: 4,
    failShort: "502 · hung 5000 ms",
    causeShort: "0 results",
    brokeAt: "step 4.",
    reading: ["06 · refund.issue failed: 502 after 5000 ms", "05 · llm.chat retried 7 times, guessing the policy", "04 · docs.search returned 0 results: the cause"],
    shows: "docs.search returned 0 results, so the model guessed and refund.issue failed two steps later.",
    run: RUN_A,
    causeSpan: "a-search",
    fold: "a-loop",
    agent: "support-agent",
    runId: "run_9f3a",
    fix: {
      after: RUN_B,
      afterId: "run_b27e",
      result: `The run drops to ${usd(totalCost(RUN_B))}.`,
      answer: "refund.issue failed at step 06, but the run went wrong at step 04: docs.search returned 0 results, so the model retried seven times without the refund policy and guessed. Fix the search first.",
      body: "You change one thing you can point at, here the search query, and run the agent again.",
      metric: "Cost of this run",
      before: usd(totalCost(RUN_A)),
      afterValue: usd(totalCost(RUN_B)),
      why: `retry loop × 7 · ${usd(loopCost(RUN_A, "a-loop"))}`,
    },
  },
  {
    id: "loop",
    label: "A retry loop is burning money",
    short: "Retry loop",
    steps: [
      { name: "research-agent", note: "run started", icon: "agent" },
      { name: "llm.chat", note: "2,400 tok · 700 ms", icon: "chat" },
      { name: "web.search", note: "12 results, no links", icon: "search" },
      { name: "llm.chat", note: "sources: [ ]", icon: "chat" },
      { name: "llm.chat · retry", note: `8 calls · ${usd(loopCost(LOOP, "l-loop"))}`, icon: "retry" },
      { name: "report.save", note: "sources is empty", icon: "page" },
    ],
    cause: 3,
    failShort: "sources is empty",
    causeShort: "no links",
    brokeAt: "step 3.",
    reading: ["06 · report.save rejected it: sources is empty", `05 · llm.chat retried 8 times for ${usd(loopCost(LOOP, "l-loop"))}`, "03 · web.search never asked for links: the cause"],
    shows: `web.search asked for no links, so sources stayed empty. Eight retries cost ${usd(loopCost(LOOP, "l-loop"))} and the save still failed.`,
    run: LOOP,
    causeSpan: "l-search",
    fold: "l-loop",
    agent: "research-agent",
    runId: "run_4c10",
    fix: {
      after: LOOP_FIXED,
      afterId: "run_4c2b",
      result: `The run drops to ${usd(totalCost(LOOP_FIXED))}.`,
      answer: "report.save failed at step 06, but the run went wrong at step 03: web.search asked for titles and snippets only, so sources stayed empty and the model was asked eight more times. Ask for the url field.",
      body: "You add the one field the search left out and run the agent again.",
      metric: "Cost of this run",
      before: usd(totalCost(LOOP)),
      afterValue: usd(totalCost(LOOP_FIXED)),
      why: `retry loop × 8 · ${usd(loopCost(LOOP, "l-loop"))}`,
    },
  },
  {
    id: "timeout",
    label: "A tool call hangs",
    short: "Hung tool",
    steps: [
      { name: "booking-agent", note: "run started", icon: "agent" },
      { name: "llm.chat", note: "3,200 tok · 760 ms", icon: "chat" },
      { name: "calendar.lookup", note: "180 ms", icon: "calendar" },
      { name: "booking.hold", note: "240 ms", icon: "pin" },
      { name: "llm.chat", note: "600 ms", icon: "chat" },
      { name: "payments.charge", note: "no answer · 30 s", icon: "coin" },
    ],
    cause: 6,
    failShort: "no answer in 30 s",
    causeShort: "no timeout set",
    brokeAt: "step 6.",
    reading: ["06 · payments.charge got no answer for 30 s", "05 to 01 · every step answered in under a second", "06 · no timeout on the call: the cause"],
    shows: "Steps 01 to 05 answered in under a second. payments.charge had no timeout and waited 30 s for nothing.",
    run: TIMEOUT,
    causeSpan: "t-pay",
    agent: "booking-agent",
    runId: "run_e81d",
    fix: {
      after: TIMEOUT_FIXED,
      afterId: "run_e93a",
      result: `The run takes ${secs(TIMEOUT_FIXED[0].latencyMs)}.`,
      answer: "payments.charge failed at step 06, and the cause is the same step: the call has no timeout, so the run waited 30 s for an answer. Steps 01 to 05 took under a second. Add a 5 s timeout and one retry.",
      body: "You set a timeout on the call that hung and run again. The charge answered in 640 ms.",
      metric: "Time of this run",
      before: secs(TIMEOUT[0].latencyMs),
      afterValue: secs(TIMEOUT_FIXED[0].latencyMs),
      why: "waited 30 s · no timeout",
    },
  },
  {
    id: "wrong",
    label: "It called the wrong tool",
    short: "Wrong tool",
    steps: [
      { name: "support-agent", note: "run started", icon: "agent" },
      { name: "llm.chat", note: "3,200 tok · 820 ms", icon: "chat" },
      { name: "orders.lookup", note: "not shipped yet", icon: "parcel" },
      { name: "llm.chat", note: "picked a tool", icon: "chat" },
      { name: "orders.cancel", note: "order cancelled", icon: "cross" },
      { name: "orders.update_address", note: "409 · cancelled", icon: "house" },
    ],
    cause: 5,
    failShort: "409 · order is cancelled",
    causeShort: "cancelled the order",
    brokeAt: "step 5.",
    reading: ["06 · orders.update_address refused: 409", "05 · orders.cancel cancelled order 7730", "05 · the wrong tool, picked at step 04: the cause"],
    shows: "No error until step 06. The trace shows the tool picked at step 05: cancel the order, not change the address.",
    run: WRONG,
    causeSpan: "w-cancel",
    agent: "support-agent",
    runId: "run_7730",
    fix: {
      after: WRONG_FIXED,
      afterId: "run_7731",
      result: "The address changes.",
      answer: "orders.update_address failed at step 06 because step 05 had already cancelled the order. The model picked orders.cancel at step 04: its description says it can change an order. Fix the description.",
      body: "You fix the tool description that misled the model and run the agent again.",
      metric: "Step 06 answers",
      before: "409",
      afterValue: "200",
      why: "the order was cancelled first",
    },
  },
];

export const DEFAULT_CASE: CaseId = "empty";
export const caseById = (id: string | null | undefined) => CASES.find((c) => c.id === id) ?? CASES[0];
export const isCaseId = (id: string | null | undefined): id is CaseId => CASES.some((c) => c.id === id);
/** "04": a step number the way the page's boards print it. */
export const two = (n: number) => String(n).padStart(2, "0");
