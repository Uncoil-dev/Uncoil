// The page's one example run, as spans the real trace timeline can draw, plus the re-run after
// the fix. Every value is example data and is labelled so on the page. The costs add up to the
// figures in the cost section: $0.42 before (a retry loop of seven model calls), $0.06 after.

export type ExampleSpan = {
  spanId: string;
  parentSpanId: string;
  spanType: string;
  name: string;
  createdAt: string;
  latencyMs: number;
  costUsd: number;
  inputTokens?: number;
  outputTokens?: number;
  errorType?: string;
  /** What the side panel shows for this step. */
  detail: { input: string; output: string; model?: string };
};

const T0 = Date.parse("2026-11-20T09:14:02.000Z");
const at = (ms: number) => new Date(T0 + ms).toISOString();

const RETRIES = Array.from({ length: 7 }, (_, i): ExampleSpan => ({
  spanId: `a-retry-${i + 1}`,
  parentSpanId: "a-loop",
  spanType: "llm_call",
  name: "llm.chat",
  createdAt: at(1300 + i * 660),
  latencyMs: 620,
  costUsd: 0.0586,
  inputTokens: 9200 + i * 40,
  outputTokens: 180,
  detail: { input: "Is order 4821 eligible for a refund? (no policy found)", output: i < 6 ? "I can't confirm the policy. Retrying." : "Refund approved.", model: "gpt-4o" },
}));

/** Run A: the failing run, read in the trace view. */
export const RUN_A: readonly ExampleSpan[] = [
  { spanId: "a-root", parentSpanId: "", spanType: "agent", name: "support-agent", createdAt: at(0), latencyMs: 11_160, costUsd: 0, detail: { input: "Customer asks for a refund on order 4821.", output: "502 from refund.issue after 5000 ms" } },
  { spanId: "a-plan", parentSpanId: "a-root", spanType: "llm_call", name: "llm.chat", createdAt: at(20), latencyMs: 820, costUsd: 0.006, inputTokens: 1000, outputTokens: 180, detail: { input: "Customer wants a refund for order 4821.", output: "Look up the order, then check the refund policy.", model: "gpt-4o" } },
  { spanId: "a-order", parentSpanId: "a-root", spanType: "tool_call", name: "order.lookup", createdAt: at(860), latencyMs: 140, costUsd: 0, detail: { input: 'order.lookup("4821")', output: "$64 · delivered 9 days ago" } },
  { spanId: "a-search", parentSpanId: "a-root", spanType: "tool_call", name: "docs.search", createdAt: at(1040), latencyMs: 210, costUsd: 0, detail: { input: 'docs.search("refund window, delivered orders")', output: "[ ] · 0 results" } },
  { spanId: "a-loop", parentSpanId: "a-root", spanType: "agent", name: "llm.chat · retry", createdAt: at(1280), latencyMs: 4600, costUsd: 0, detail: { input: "Seven attempts to answer without a policy.", output: "Guessed: refund approved." } },
  ...RETRIES,
  { spanId: "a-refund", parentSpanId: "a-root", spanType: "tool_call", name: "refund.issue", createdAt: at(6140), latencyMs: 5000, costUsd: 0, errorType: "HTTPError", detail: { input: 'refund.issue({ order: "4821", amount: 64 })', output: "502 Bad Gateway · hung 5000 ms" } },
];

/** Run B: the same request after the search was fixed. */
export const RUN_B: readonly ExampleSpan[] = [
  { spanId: "b-root", parentSpanId: "", spanType: "agent", name: "support-agent", createdAt: at(0), latencyMs: 2360, costUsd: 0, detail: { input: "Customer asks for a refund on order 4821.", output: "Explained the 7-day refund window." } },
  { spanId: "b-plan", parentSpanId: "b-root", spanType: "llm_call", name: "llm.chat", createdAt: at(20), latencyMs: 820, costUsd: 0.006, inputTokens: 1000, outputTokens: 180, detail: { input: "Customer wants a refund for order 4821.", output: "Look up the order, then check the refund policy.", model: "gpt-4o" } },
  { spanId: "b-order", parentSpanId: "b-root", spanType: "tool_call", name: "order.lookup", createdAt: at(860), latencyMs: 140, costUsd: 0, detail: { input: 'order.lookup("4821")', output: "$64 · delivered 9 days ago" } },
  { spanId: "b-search", parentSpanId: "b-root", spanType: "tool_call", name: "docs.search", createdAt: at(1040), latencyMs: 230, costUsd: 0, detail: { input: 'docs.search("refund policy")', output: "3 results · refunds within 7 days of delivery" } },
  { spanId: "b-answer", parentSpanId: "b-root", spanType: "llm_call", name: "llm.chat", createdAt: at(1300), latencyMs: 1040, costUsd: 0.054, inputTokens: 8400, outputTokens: 210, detail: { input: "Order delivered 9 days ago. Policy: 7-day window.", output: "This order is outside the 7-day refund window.", model: "gpt-4o" } },
];

export const totalCost = (run: readonly ExampleSpan[]) => run.reduce((sum, s) => sum + s.costUsd, 0);
