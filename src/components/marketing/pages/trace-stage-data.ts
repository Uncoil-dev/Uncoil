export type TraceSpan = readonly [name: string, start: number, end: number, kind: "root" | "model" | "tool" | "error"];

export const traceSpans: readonly TraceSpan[] = [
  ["agent.run", 0, 100, "root"],
  ["llm.plan", 2, 16, "model"],
  ["tool.search", 16, 42, "tool"],
  ["tool.search  retry", 42, 66, "error"],
  ["llm.answer", 66, 94, "model"],
];

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Summary chips for the replay, worked out from the listed spans so they cannot drift. */
export function traceSummary(spans: readonly TraceSpan[]): string[] {
  const of = (kind: TraceSpan[3]) => spans.filter((span) => span[3] === kind).length;
  return [count(spans.length, "span", "spans"), count(of("model"), "model call", "model calls"), count(of("error"), "retry", "retries")];
}
