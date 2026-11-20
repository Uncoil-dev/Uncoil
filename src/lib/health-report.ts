/**
 * Agent health report: turns a week or two of spans into cost, errors, slow steps and fixes.
 * Pure functions only, so the same code builds the paid report, the public sample and the tests.
 * Input is the same span shape the SDKs send to /api/ingest.
 */

export type ReportSpan = {
  spanId: string;
  runId: string;
  spanType: string;
  createdAt: string;
  latencyMs: number;
  costUsd?: number;
  modelId?: string;
  toolName?: string;
  traceName?: string;
  inputTokens?: number;
  outputTokens?: number;
  retryCount?: number;
  errorType?: string;
  errorMessage?: string;
  timedOut?: boolean;
};

export type Finding = {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  /** Rough saving or exposure per month in USD, when the data supports an estimate. */
  monthlyUsd?: number;
  fix: string;
};

export type HealthReport = {
  version: 1;
  generatedAt: string;
  period: { from: string; to: string; days: number };
  skippedRows: number;
  totals: {
    runs: number;
    spans: number;
    failedRuns: number;
    recoveredRuns: number;
    failureRate: number;
    costUsd: number;
    avgCostPerRunUsd: number;
    p50RunMs: number;
    p95RunMs: number;
    inputTokens: number;
    outputTokens: number;
    retriedSpans: number;
    retryCostUsd: number;
  };
  costByModel: { model: string; costUsd: number; share: number; calls: number; avgCostPerCallUsd: number }[];
  costByAgent: { name: string; runs: number; costUsd: number; failureRate: number }[];
  costliestRuns: { runId: string; name: string; costUsd: number; spans: number; failed: boolean }[];
  errors: { label: string; step: string; count: number; example: string; lastSeen: string }[];
  steps: { step: string; kind: string; calls: number; errors: number; errorRate: number; p50Ms: number; p95Ms: number; totalMs: number; shareOfTime: number }[];
  daily: { day: string; runs: number; failedRuns: number; costUsd: number }[];
  findings: Finding[];
};

export const MAX_REPORT_SPANS = 50_000;
export const MIN_REPORT_SPANS = 10;

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined);
const text = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined);
const camel = (key: string) => key.replace(/[_-]+([a-z])/g, (_, c: string) => c.toUpperCase());

const ALIASES: Record<string, string> = {
  id: "spanId", span: "spanId", trace: "runId", traceId: "runId", run: "runId", type: "spanType", kind: "spanType",
  timestamp: "createdAt", time: "createdAt", startedAt: "createdAt", startTime: "createdAt",
  latency: "latencyMs", durationMs: "latencyMs", duration: "latencyMs",
  cost: "costUsd", costUSD: "costUsd", model: "modelId", tool: "toolName", name: "traceName",
  promptTokens: "inputTokens", completionTokens: "outputTokens", retries: "retryCount", error: "errorMessage",
};

function normalize(raw: unknown): ReportSpan | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const k = camel(key);
    row[ALIASES[k] ?? k] = value;
  }
  const runId = text(row.runId);
  const createdAt = text(row.createdAt);
  if (!runId || !createdAt || Number.isNaN(Date.parse(createdAt))) return undefined;
  const errorMessage = text(row.errorMessage);
  return {
    spanId: text(row.spanId) ?? `${runId}:${createdAt}`,
    runId,
    spanType: text(row.spanType) ?? "step",
    createdAt: new Date(createdAt).toISOString(),
    latencyMs: Math.max(0, num(row.latencyMs) ?? 0),
    costUsd: Math.max(0, num(row.costUsd) ?? 0),
    modelId: text(row.modelId),
    toolName: text(row.toolName),
    traceName: text(row.traceName),
    inputTokens: num(row.inputTokens),
    outputTokens: num(row.outputTokens),
    retryCount: num(row.retryCount),
    errorType: text(row.errorType),
    errorMessage,
    timedOut: row.timedOut === true || row.timedOut === "true" || row.timedOut === "1",
  };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { cells.push(cell); cell = ""; }
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}

/** Accepts a JSON array, `{ "spans": [...] }`, JSON lines, or a CSV with a header row. */
export function parseSpans(input: string): { spans: ReportSpan[]; skipped: number } {
  const body = input.trim();
  let rows: unknown[] = [];
  if (body.startsWith("[") || body.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (Array.isArray(parsed)) rows = parsed;
      else if (parsed && typeof parsed === "object") {
        const holder = parsed as Record<string, unknown>;
        const list = holder.spans ?? holder.data ?? holder.rows ?? holder.traces;
        rows = Array.isArray(list) ? list : [parsed];
      }
    } catch {
      rows = body.split(/\r?\n/).flatMap((line) => { try { return [JSON.parse(line) as unknown]; } catch { return []; } });
    }
  } else if (body.includes(",")) {
    const [head, ...lines] = body.split(/\r?\n/).filter((line) => line.trim() !== "");
    const keys = splitCsvLine(head).map((key) => key.trim());
    rows = lines.map((line) => Object.fromEntries(splitCsvLine(line).map((cell, i) => [keys[i] ?? `col${i}`, cell])));
  }
  const spans: ReportSpan[] = [];
  let skipped = 0;
  for (const row of rows.slice(0, MAX_REPORT_SPANS)) {
    const span = normalize(row);
    if (span) spans.push(span); else skipped++;
  }
  return { spans, skipped: skipped + Math.max(0, rows.length - MAX_REPORT_SPANS) };
}

export function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}
const sortNums = (values: number[]) => [...values].sort((a, b) => a - b);
const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;
const hasError = (span: ReportSpan) => Boolean(span.errorType || span.errorMessage || span.timedOut);
const stepName = (span: ReportSpan) => span.toolName ?? span.modelId ?? span.spanType;
const stepKind = (span: ReportSpan) => (span.toolName ? "tool" : span.modelId ? "model" : span.spanType);

/** Turns "Timeout after 30012ms on order 8841" and "... 29977ms on order 9120" into one group. */
export function errorLabel(span: ReportSpan) {
  const type = span.errorType ?? (span.timedOut ? "Timeout" : "Error");
  const message = (span.errorMessage ?? "").replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "<id>").replace(/\d+(?:[.,:]\d+)*/g, "<n>").replace(/\s+/g, " ").slice(0, 90);
  return message ? `${type}: ${message}` : type;
}

export function formatUsd(value: number) {
  if (value >= 100) return `$${Math.round(value).toLocaleString("en-US")}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
}
export function formatMs(ms: number) {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}

export function buildHealthReport(spans: ReportSpan[], options: { skippedRows?: number; now?: Date } = {}): HealthReport {
  const byRun = new Map<string, ReportSpan[]>();
  for (const span of spans) {
    const list = byRun.get(span.runId);
    if (list) list.push(span); else byRun.set(span.runId, [span]);
  }
  const times = spans.map((span) => Date.parse(span.createdAt));
  const from = new Date(Math.min(...times));
  const to = new Date(Math.max(...times));
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) || 1);

  const modelStats = new Map<string, { costUsd: number; calls: number }>();
  const stepStats = new Map<string, { kind: string; latencies: number[]; errors: number }>();
  const errorStats = new Map<string, { step: string; count: number; example: string; lastSeen: string }>();
  const agentStats = new Map<string, { runs: number; costUsd: number; failed: number }>();
  const dailyStats = new Map<string, { runs: Set<string>; failed: Set<string>; costUsd: number }>();
  let inputTokens = 0, outputTokens = 0, retriedSpans = 0, retryCostUsd = 0, totalCost = 0, timeouts = 0;
  const runInfo: { runId: string; name: string; costUsd: number; spans: number; failed: boolean; recovered: boolean; durationMs: number }[] = [];

  for (const [runId, list] of byRun) {
    list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const last = list[list.length - 1];
    const failed = hasError(last);
    const recovered = !failed && list.some(hasError);
    const costUsd = list.reduce((sum, span) => sum + (span.costUsd ?? 0), 0);
    const name = list.find((span) => span.traceName)?.traceName ?? "Unnamed agent";
    const start = Date.parse(list[0].createdAt);
    const end = Math.max(...list.map((span) => Date.parse(span.createdAt) + span.latencyMs));
    runInfo.push({ runId, name, costUsd, spans: list.length, failed, recovered, durationMs: end - start });
    const agent = agentStats.get(name) ?? { runs: 0, costUsd: 0, failed: 0 };
    agent.runs++; agent.costUsd += costUsd; if (failed) agent.failed++;
    agentStats.set(name, agent);
    const day = list[0].createdAt.slice(0, 10);
    const daily = dailyStats.get(day) ?? { runs: new Set(), failed: new Set(), costUsd: 0 };
    daily.runs.add(runId); if (failed) daily.failed.add(runId); daily.costUsd += costUsd;
    dailyStats.set(day, daily);

    for (const span of list) {
      const cost = span.costUsd ?? 0;
      totalCost += cost;
      inputTokens += span.inputTokens ?? 0;
      outputTokens += span.outputTokens ?? 0;
      if ((span.retryCount ?? 0) > 0) { retriedSpans++; retryCostUsd += cost; }
      if (span.timedOut) timeouts++;
      if (span.modelId) {
        const model = modelStats.get(span.modelId) ?? { costUsd: 0, calls: 0 };
        model.costUsd += cost; model.calls++;
        modelStats.set(span.modelId, model);
      }
      const name = stepName(span);
      const step = stepStats.get(name) ?? { kind: stepKind(span), latencies: [], errors: 0 };
      step.latencies.push(span.latencyMs);
      if (hasError(span)) {
        step.errors++;
        const label = errorLabel(span);
        const entry = errorStats.get(label) ?? { step: name, count: 0, example: (span.errorMessage ?? label).slice(0, 160), lastSeen: span.createdAt };
        entry.count++;
        if (span.createdAt > entry.lastSeen) entry.lastSeen = span.createdAt;
        errorStats.set(label, entry);
      }
      stepStats.set(name, step);
    }
  }

  const runs = runInfo.length;
  const failedRuns = runInfo.filter((run) => run.failed).length;
  const recoveredRuns = runInfo.filter((run) => run.recovered).length;
  const runMs = sortNums(runInfo.map((run) => run.durationMs));
  const totalTime = [...stepStats.values()].reduce((sum, step) => sum + step.latencies.reduce((a, b) => a + b, 0), 0) || 1;

  const steps = [...stepStats.entries()].map(([step, s]) => {
    const sorted = sortNums(s.latencies);
    const totalMs = s.latencies.reduce((a, b) => a + b, 0);
    return { step, kind: s.kind, calls: s.latencies.length, errors: s.errors, errorRate: round(s.errors / s.latencies.length), p50Ms: Math.round(percentile(sorted, 50)), p95Ms: Math.round(percentile(sorted, 95)), totalMs: Math.round(totalMs), shareOfTime: round(totalMs / totalTime) };
  }).sort((a, b) => b.totalMs - a.totalMs).slice(0, 10);

  const costByModel = [...modelStats.entries()].map(([model, m]) => ({ model, costUsd: round(m.costUsd, 4), share: totalCost ? round(m.costUsd / totalCost) : 0, calls: m.calls, avgCostPerCallUsd: round(m.costUsd / m.calls, 5) })).sort((a, b) => b.costUsd - a.costUsd).slice(0, 8);
  const costByAgent = [...agentStats.entries()].map(([name, a]) => ({ name, runs: a.runs, costUsd: round(a.costUsd, 4), failureRate: round(a.failed / a.runs) })).sort((a, b) => b.costUsd - a.costUsd).slice(0, 8);
  const costliestRuns = [...runInfo].sort((a, b) => b.costUsd - a.costUsd).slice(0, 5).map((run) => ({ runId: run.runId, name: run.name, costUsd: round(run.costUsd, 4), spans: run.spans, failed: run.failed }));
  const errors = [...errorStats.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.count - a.count).slice(0, 8);
  const daily = [...dailyStats.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, runs: d.runs.size, failedRuns: d.failed.size, costUsd: round(d.costUsd, 4) }));

  const perMonth = 30 / days;
  const findings: Finding[] = [];
  const failureRate = failedRuns / runs;
  if (failureRate >= 0.03 && errors[0]) {
    findings.push({ severity: failureRate >= 0.1 ? "high" : "medium", title: `${(failureRate * 100).toFixed(1)}% of runs end in an error`, detail: `${failedRuns} of ${runs} runs failed. The most common error is "${errors[0].label}" in ${errors[0].step} (${errors[0].count} times).`, fix: `Start with ${errors[0].step}: add a retry with backoff or a fallback, and return a clear message to the user when it still fails.` });
  }
  const costTotalRuns = runInfo.map((run) => run.costUsd);
  const medianCost = percentile(sortNums(costTotalRuns), 50);
  const heavy = runInfo.filter((run) => medianCost > 0 && run.costUsd >= medianCost * 4);
  if (heavy.length >= 2) {
    const extra = heavy.reduce((sum, run) => sum + (run.costUsd - medianCost), 0);
    findings.push({ severity: extra / (totalCost || 1) >= 0.2 ? "high" : "medium", title: `${heavy.length} runs cost 4x the median or more`, detail: `They account for ${formatUsd(extra)} above a normal run, ${((extra / (totalCost || 1)) * 100).toFixed(0)}% of all spend in this period.`, monthlyUsd: round(extra * perMonth, 2), fix: "Cap steps and tokens per run, and stop a run that repeats the same step. Open the costliest runs below to see where they loop." });
  }
  const loops = runInfo.flatMap((run) => {
    const counts = new Map<string, number>();
    for (const span of byRun.get(run.runId) ?? []) if (span.toolName) counts.set(span.toolName, (counts.get(span.toolName) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top && top[1] >= 6 ? [{ tool: top[0], count: top[1], cost: run.costUsd }] : [];
  });
  if (loops.length >= 2) {
    const tool = loops.map((l) => l.tool).sort((a, b) => loops.filter((l) => l.tool === b).length - loops.filter((l) => l.tool === a).length)[0];
    findings.push({ severity: "medium", title: `${loops.length} runs call the same tool 6+ times`, detail: `Most often ${tool}. That pattern usually means the agent is stuck in a loop or re-asking for data it already has.`, monthlyUsd: round(loops.reduce((s, l) => s + l.cost, 0) * 0.5 * perMonth, 2), fix: `Add a call limit for ${tool}, and give the agent the result of earlier calls so it does not repeat them.` });
  }
  if (retriedSpans > 0 && retryCostUsd / (totalCost || 1) >= 0.03) {
    findings.push({ severity: "medium", title: `Retries cost ${formatUsd(retryCostUsd)} in this period`, detail: `${retriedSpans} steps needed a retry. Each retry pays for the full call again.`, monthlyUsd: round(retryCostUsd * perMonth, 2), fix: "Retry only errors that can succeed (rate limits, timeouts), cap retries at two, and fix the step that fails most." });
  }
  const topModel = costByModel[0];
  if (topModel && topModel.share >= 0.6 && costByModel.length >= 1) {
    const calls = spans.filter((span) => span.modelId === topModel.model);
    const avgOut = calls.reduce((sum, span) => sum + (span.outputTokens ?? 0), 0) / calls.length;
    if (avgOut > 0 && avgOut < 250) {
      findings.push({ severity: "low", title: `${topModel.model} is ${(topModel.share * 100).toFixed(0)}% of spend, with short answers`, detail: `Its calls average ${Math.round(avgOut)} output tokens. Short, structured answers often work on a smaller model.`, monthlyUsd: round(topModel.costUsd * 0.4 * perMonth, 2), fix: `Test a cheaper model on a sample of these calls with the same prompt. Keep ${topModel.model} for the hard cases.` });
    }
  }
  const slow = steps.find((step) => step.shareOfTime >= 0.3 && step.p95Ms >= step.p50Ms * 2.5 && step.calls >= 10);
  if (slow) {
    findings.push({ severity: "medium", title: `${slow.step} takes ${(slow.shareOfTime * 100).toFixed(0)}% of all step time`, detail: `Typical call: ${formatMs(slow.p50Ms)}. Slowest 5%: ${formatMs(slow.p95Ms)} or more. Users feel the slow tail.`, fix: `Set a timeout near ${formatMs(slow.p50Ms * 3)}, cache repeat calls, and run it in parallel with other steps when the inputs allow.` });
  }
  if (timeouts >= 3) {
    findings.push({ severity: "low", title: `${timeouts} steps timed out`, detail: "Timeouts waste the time the user already waited and often trigger costly retries.", fix: "Lower timeouts on slow tools and answer from partial data instead of waiting." });
  }
  const order = { high: 0, medium: 1, low: 2 } as const;
  findings.sort((a, b) => order[a.severity] - order[b.severity] || (b.monthlyUsd ?? 0) - (a.monthlyUsd ?? 0));

  return {
    version: 1,
    generatedAt: (options.now ?? new Date()).toISOString(),
    period: { from: from.toISOString(), to: to.toISOString(), days },
    skippedRows: options.skippedRows ?? 0,
    totals: { runs, spans: spans.length, failedRuns, recoveredRuns, failureRate: round(failureRate), costUsd: round(totalCost, 4), avgCostPerRunUsd: round(totalCost / runs, 5), p50RunMs: Math.round(percentile(runMs, 50)), p95RunMs: Math.round(percentile(runMs, 95)), inputTokens, outputTokens, retriedSpans, retryCostUsd: round(retryCostUsd, 4) },
    costByModel, costByAgent, costliestRuns, errors, steps, daily,
    findings: findings.slice(0, 6),
  };
}

export const HEALTH_REPORT_PRICE_USD = 79;

export const EXAMPLE_SPANS_JSON = `[
  {
    "runId": "run_1042",
    "spanId": "span_1",
    "spanType": "llm",
    "createdAt": "2026-11-10T09:14:02Z",
    "latencyMs": 1830,
    "modelId": "gpt-4.1",
    "inputTokens": 1900,
    "outputTokens": 160,
    "costUsd": 0.0055,
    "traceName": "support-agent"
  },
  {
    "runId": "run_1042",
    "spanId": "span_2",
    "spanType": "tool",
    "createdAt": "2026-11-10T09:14:04Z",
    "latencyMs": 30000,
    "toolName": "refund_api",
    "errorType": "TimeoutError",
    "errorMessage": "Timeout after 30000ms"
  }
]`;
