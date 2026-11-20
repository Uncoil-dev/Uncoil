import type { ReportSpan } from "@/lib/health-report";

/** Deterministic fake week of a support agent. Powers the public sample report and the tests. Not real customer data. */
export function sampleSpans(): ReportSpan[] {
  let seed = 20261109;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const between = (min: number, max: number) => min + rand() * (max - min);
  const spans: ReportSpan[] = [];
  const start = Date.UTC(2026, 10, 9, 6);
  for (let i = 0; i < 360; i++) {
    const runId = `run_${1000 + i}`;
    let at = start + Math.floor(i / 52) * 86_400_000 + Math.floor(between(0, 14 * 3_600_000));
    const name = rand() < 0.72 ? "support-agent" : "refund-agent";
    const push = (partial: Partial<ReportSpan> & { latencyMs: number; spanType: string }) => {
      spans.push({ spanId: `${runId}_${spans.length}`, runId, createdAt: new Date(at).toISOString(), traceName: name, ...partial, costUsd: partial.costUsd === undefined ? undefined : Math.round(partial.costUsd * 45 * 1e6) / 1e6 });
      at += partial.latencyMs + 40;
    };
    push({ spanType: "llm", modelId: "gpt-4.1-mini", latencyMs: between(350, 900), inputTokens: 700, outputTokens: 40, costUsd: 0.0004 });
    const looping = rand() < 0.045;
    const searches = looping ? 8 + Math.floor(rand() * 4) : 1 + Math.floor(rand() * 2);
    for (let s = 0; s < searches; s++) {
      const slow = rand() < 0.08;
      push({ spanType: "tool", toolName: "search_orders", latencyMs: slow ? between(5200, 9000) : between(300, 800) });
    }
    const retried = rand() < 0.06;
    push({ spanType: "llm", modelId: "gpt-4.1", latencyMs: between(1400, 3600), inputTokens: looping ? 9000 : 1900, outputTokens: 160, costUsd: looping ? 0.021 : 0.0055, retryCount: retried ? 1 : 0 });
    if (name === "refund-agent") {
      const timedOut = rand() < 0.11;
      push(timedOut
        ? { spanType: "tool", toolName: "refund_api", latencyMs: 30_000, timedOut: true, errorType: "TimeoutError", errorMessage: `Timeout after ${30000 + Math.floor(rand() * 30)}ms calling refund_api` }
        : { spanType: "tool", toolName: "refund_api", latencyMs: between(500, 1400) });
      if (timedOut && rand() < 0.55) push({ spanType: "llm", modelId: "gpt-4.1", latencyMs: between(900, 1800), inputTokens: 1200, outputTokens: 120, costUsd: 0.0038, errorType: "ToolFailed", errorMessage: `Could not complete refund for order ${Math.floor(between(8000, 9999))}` });
    }
  }
  return spans;
}
