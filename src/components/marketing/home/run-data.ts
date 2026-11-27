// The page's one example run, as spans the real trace timeline can draw, plus the re-run after
// the fix. Every value is example data and is labelled so on the page. Model calls are priced the
// way Uncoil prices them, from their tokens at list price (gpt-4o in src/lib/tools/models.ts:
// $2.50 per million input tokens, $10 per million output tokens), and add up to $0.42 before the
// fix (a retry loop of seven model calls) and $0.06 after.

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
  /** What the step called, in the shape the Compare view lines steps up by. */
  toolName?: string;
  modelId?: string;
  errorType?: string;
  errorMessage?: string;
  /** What the side panel shows for this step. */
  detail: { input: string; output: string };
};

/** The model every example call uses. */
export const MODEL = "gpt-4o";

const T0 = Date.parse("2026-11-20T09:14:02.000Z");
const at = (ms: number) => new Date(T0 + ms).toISOString();

// Each retry resends the whole conversation so far, so its prompt grows by about 2,000 tokens.
const RETRIES = Array.from({ length: 7 }, (_, i): ExampleSpan => ({
  spanId: `a-retry-${i + 1}`,
  parentSpanId: "a-loop",
  spanType: "llm_call",
  name: "llm.chat",
  modelId: MODEL,
  createdAt: at(1300 + i * 660),
  latencyMs: 620,
  inputTokens: 16_500 + i * 2000,
  outputTokens: 200,
  costUsd: [0.04325, 0.04825, 0.05325, 0.05825, 0.06325, 0.06825, 0.07325][i],
  detail: { input: "Is order 4821 eligible for a refund? (no policy found)", output: i < 6 ? "I can't confirm the policy. Retrying." : "Refund approved." },
}));

/** Step 02, the planning call. The diagram, the trace and the product list all read it from here. */
export const PLAN_CALL: ExampleSpan = {
  spanId: "a-plan",
  parentSpanId: "a-root",
  spanType: "llm_call",
  name: "llm.chat",
  modelId: MODEL,
  createdAt: at(20),
  latencyMs: 820,
  inputTokens: 3000,
  outputTokens: 500,
  costUsd: 0.0125,
  detail: { input: "Customer wants a refund for order 4821.", output: "Look up the order, then check the refund policy." },
};

/** Run A: the failing run, read in the trace view. */
export const RUN_A: readonly ExampleSpan[] = [
  { spanId: "a-root", parentSpanId: "", spanType: "agent", name: "support-agent", createdAt: at(0), latencyMs: 6400, costUsd: 0, detail: { input: "Customer asks for a refund on order 4821.", output: "422 from refund.issue: order outside the refund window" } },
  PLAN_CALL,
  { spanId: "a-order", parentSpanId: "a-root", spanType: "tool_call", name: "order.lookup", toolName: "order.lookup", createdAt: at(860), latencyMs: 140, costUsd: 0, detail: { input: 'order.lookup("4821")', output: "$64 · delivered 9 days ago" } },
  { spanId: "a-search", parentSpanId: "a-root", spanType: "tool_call", name: "docs.search", toolName: "docs.search", createdAt: at(1040), latencyMs: 210, costUsd: 0, detail: { input: 'docs.search("refund window, delivered orders")', output: "[ ] · 0 results" } },
  { spanId: "a-loop", parentSpanId: "a-root", spanType: "agent", name: "llm.chat · retry", createdAt: at(1280), latencyMs: 4600, costUsd: 0, detail: { input: "Seven attempts to answer without a policy.", output: "Guessed: refund approved." } },
  ...RETRIES,
  { spanId: "a-refund", parentSpanId: "a-root", spanType: "tool_call", name: "refund.issue", toolName: "refund.issue", createdAt: at(6140), latencyMs: 240, costUsd: 0, errorType: "HTTPError", errorMessage: "422 Unprocessable Entity", detail: { input: 'refund.issue({ order: "4821", amount: 64 })', output: "422 · order 4821 is outside the 7-day refund window" } },
];

/** Run B: the same request after the search was fixed. */
export const RUN_B: readonly ExampleSpan[] = [
  { spanId: "b-root", parentSpanId: "", spanType: "agent", name: "support-agent", createdAt: at(0), latencyMs: 2360, costUsd: 0, detail: { input: "Customer asks for a refund on order 4821.", output: "Explained the 7-day refund window." } },
  { ...PLAN_CALL, spanId: "b-plan", parentSpanId: "b-root" },
  { spanId: "b-order", parentSpanId: "b-root", spanType: "tool_call", name: "order.lookup", toolName: "order.lookup", createdAt: at(860), latencyMs: 140, costUsd: 0, detail: { input: 'order.lookup("4821")', output: "$64 · delivered 9 days ago" } },
  { spanId: "b-search", parentSpanId: "b-root", spanType: "tool_call", name: "docs.search", toolName: "docs.search", createdAt: at(1040), latencyMs: 230, costUsd: 0, detail: { input: 'docs.search("refund policy")', output: "3 results · refunds within 7 days of delivery" } },
  { spanId: "b-answer", parentSpanId: "b-root", spanType: "llm_call", name: "llm.chat", modelId: MODEL, createdAt: at(1300), latencyMs: 1040, inputTokens: 17_000, outputTokens: 300, costUsd: 0.0455, detail: { input: "Order delivered 9 days ago. Policy: 7-day window.", output: "This order is outside the 7-day refund window." } },
];

export const totalCost = (run: readonly ExampleSpan[]) => run.reduce((sum, s) => sum + s.costUsd, 0);
export const tokens = (s: Pick<ExampleSpan, "inputTokens" | "outputTokens">) => (s.inputTokens ?? 0) + (s.outputTokens ?? 0);
export const modelCalls = (run: readonly ExampleSpan[]) => run.filter((s) => s.spanType === "llm_call").length;
/** "$0.42": whole cents, the way the page quotes a run's cost in prose. */
export const usd = (n: number) => `$${n.toFixed(2)}`;
