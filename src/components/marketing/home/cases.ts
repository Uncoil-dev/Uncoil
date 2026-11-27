// The "What broke?" picker: four failures people building agents hit, each as an example run the
// real trace view can draw. Model calls are priced from their tokens at gpt-4o list price, the
// same way as the page's main run (see run-data.ts); every case is labelled as example data.

import { MODEL, RUN_A, type ExampleSpan } from "./run-data.ts";

export type Case = {
  id: string;
  /** The tab: how the visitor would describe the bug. */
  label: string;
  /** One line under the trace: what Uncoil shows for it. */
  shows: string;
  run: readonly ExampleSpan[];
  /** The step the trace view opens on: the one that explains the failure. */
  cause: string;
  /** A group the trace view may fold on phones. */
  fold?: string;
  crumbs: string;
};

const T0 = Date.parse("2026-11-21T14:02:10.000Z");
const at = (ms: number) => new Date(T0 + ms).toISOString();

// A research agent whose answer fails schema checks: it asks the model again nine times. Nothing
// errors, the run passes, and the loop is where the money went.
const LOOP_CALLS = Array.from({ length: 9 }, (_, i): ExampleSpan => ({
  spanId: `l-call-${i + 1}`,
  parentSpanId: "l-loop",
  spanType: "llm_call",
  name: "llm.chat",
  modelId: MODEL,
  createdAt: at(1500 + i * 900),
  latencyMs: 860,
  inputTokens: 12_000 + i * 1500,
  outputTokens: 600,
  costUsd: [0.036, 0.03975, 0.0435, 0.04725, 0.051, 0.05475, 0.0585, 0.06225, 0.066][i],
  detail: { input: "Return the summary as JSON with title, points and sources.", output: i < 8 ? 'Invalid JSON: missing field "sources". Asking again.' : "Valid JSON returned." },
}));

const LOOP: readonly ExampleSpan[] = [
  { spanId: "l-root", parentSpanId: "", spanType: "agent", name: "research-agent", createdAt: at(0), latencyMs: 9800, costUsd: 0, detail: { input: "Summarise this week's papers on retrieval.", output: "Summary returned after 9 attempts." } },
  { spanId: "l-plan", parentSpanId: "l-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(20), latencyMs: 700, inputTokens: 2000, outputTokens: 1000, costUsd: 0.015, detail: { input: "Plan: search, read, summarise.", output: "Search arXiv, then summarise as JSON." } },
  { spanId: "l-search", parentSpanId: "l-root", spanType: "tool_call", name: "web.search", toolName: "web.search", createdAt: at(760), latencyMs: 640, costUsd: 0, detail: { input: 'web.search("retrieval papers this week")', output: "12 results" } },
  { spanId: "l-loop", parentSpanId: "l-root", spanType: "agent", name: "llm.chat · retry", createdAt: at(1480), latencyMs: 8200, costUsd: 0, detail: { input: "Nine attempts at valid JSON.", output: "Passed on attempt 9." } },
  ...LOOP_CALLS,
];

// A booking agent whose payment call never answers: the run hangs for 30 seconds, then fails.
const TIMEOUT: readonly ExampleSpan[] = [
  { spanId: "t-root", parentSpanId: "", spanType: "agent", name: "booking-agent", createdAt: at(0), latencyMs: 32_400, costUsd: 0, detail: { input: "Book a table for 4 on Friday at 19:00.", output: "Failed: payments.charge timed out." } },
  { spanId: "t-plan", parentSpanId: "t-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(20), latencyMs: 760, inputTokens: 2400, outputTokens: 800, costUsd: 0.014, detail: { input: "Book a table for 4 on Friday at 19:00.", output: "Check the calendar, hold the slot, take the deposit." } },
  { spanId: "t-cal", parentSpanId: "t-root", spanType: "tool_call", name: "calendar.lookup", toolName: "calendar.lookup", createdAt: at(800), latencyMs: 180, costUsd: 0, detail: { input: 'calendar.lookup("fri 19:00", 4)', output: "Table 12 free" } },
  { spanId: "t-hold", parentSpanId: "t-root", spanType: "tool_call", name: "booking.hold", toolName: "booking.hold", createdAt: at(1000), latencyMs: 240, costUsd: 0, detail: { input: "booking.hold(table: 12)", output: "Held for 10 minutes" } },
  { spanId: "t-pay", parentSpanId: "t-root", spanType: "tool_call", name: "payments.charge", toolName: "payments.charge", createdAt: at(1260), latencyMs: 30_000, costUsd: 0, errorType: "TimeoutError", errorMessage: "no response after 30000 ms", detail: { input: "payments.charge({ amount: 20, currency: \"EUR\" })", output: "TimeoutError · no response after 30000 ms" } },
  { spanId: "t-reply", parentSpanId: "t-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(31_300), latencyMs: 1050, inputTokens: 4000, outputTokens: 150, costUsd: 0.0115, detail: { input: "The deposit could not be taken.", output: "Sorry, something went wrong with the booking." } },
];

// A support agent that picks the wrong tool: the customer asked to change an address and the
// agent cancelled the order. Nothing fails; the trace shows the tool it chose and its input.
const WRONG: readonly ExampleSpan[] = [
  { spanId: "w-root", parentSpanId: "", spanType: "agent", name: "support-agent", createdAt: at(0), latencyMs: 2300, costUsd: 0, detail: { input: "Please change the delivery address on order 7730.", output: "Your order 7730 has been cancelled." } },
  { spanId: "w-plan", parentSpanId: "w-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(20), latencyMs: 820, inputTokens: 2800, outputTokens: 400, costUsd: 0.011, detail: { input: "Please change the delivery address on order 7730.", output: "Call orders.cancel for order 7730." } },
  { spanId: "w-lookup", parentSpanId: "w-root", spanType: "tool_call", name: "orders.lookup", toolName: "orders.lookup", createdAt: at(860), latencyMs: 150, costUsd: 0, detail: { input: 'orders.lookup("7730")', output: "Not shipped yet" } },
  { spanId: "w-cancel", parentSpanId: "w-root", spanType: "tool_call", name: "orders.cancel", toolName: "orders.cancel", createdAt: at(1030), latencyMs: 320, costUsd: 0, detail: { input: 'orders.cancel({ order: "7730" })', output: "Order 7730 cancelled" } },
  { spanId: "w-reply", parentSpanId: "w-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(1380), latencyMs: 900, inputTokens: 3600, outputTokens: 180, costUsd: 0.0108, detail: { input: "Tool result: order cancelled.", output: "Your order 7730 has been cancelled." } },
];

export const CASES: readonly Case[] = [
  { id: "empty", label: "A search came back empty", shows: "docs.search returned 0 results, so the model guessed and refund.issue failed two steps later.", run: RUN_A, cause: "a-search", fold: "a-loop", crumbs: "support-agent › run_9f3a" },
  { id: "loop", label: "A retry loop is burning money", shows: "Nothing failed. Nine calls to fix the same JSON, and the loop's row carries the cost.", run: LOOP, cause: "l-loop", fold: "l-loop", crumbs: "research-agent › run_4c10" },
  { id: "timeout", label: "A tool call hangs", shows: "payments.charge waited 30 seconds for an answer that never came. The run fails on that step.", run: TIMEOUT, cause: "t-pay", crumbs: "booking-agent › run_e81d" },
  { id: "wrong", label: "It called the wrong tool", shows: "No error at all. The trace shows the tool it chose and the input it sent: cancel the order, when the customer asked to change the address.", run: WRONG, cause: "w-cancel", crumbs: "support-agent › run_7730" },
];
