import { groupReleases } from "@/lib/error-group-release";
import { FACET_KEYS, TOPIC_TRACE_LIMIT, activityTimeZone, type ActivityDay, type ErrorGroup, type FacetCounts, type FacetKey, type HistogramBucket, type TraceListFilters, type TraceStats } from "@/lib/tinybird";
import { groupTraceTopics, topicRunIds } from "@/lib/trace-topics";
import { flowGraph, flowPairId, type FlowStep } from "@/lib/trace-flow";
import { validTraceSort } from "@/lib/trace-sort";
import type { GroupFilters, GroupKind } from "@/lib/group-filters";
import type { GroupRow, GroupStats } from "@/lib/tinybird-groups";
import { demoGroupId, demoRuns, demoSteps, type DemoRun } from "./demo-project";

/** In-memory twins of the analytics queries behind the Tracing page, run over the demo project's runs. */

const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

function facetValues(run: DemoRun, key: FacetKey): string[] {
  switch (key) {
    case "traceName": return [run.traceName];
    case "spanType": return run.spanTypes;
    case "toolName": return run.tools;
    case "modelId": return run.models;
    case "errorType": return run.errors.map((error) => error.type);
    case "environment": return [run.environment];
    case "release": return [run.release];
    case "endUserId": return [run.endUserId];
    case "sessionId": return [run.sessionId];
    case "tag": return run.tags;
  }
}

const tokens = (run: DemoRun) => run.inputTokens + run.outputTokens;

function flowSteps(run: DemoRun): FlowStep[] {
  return demoSteps(run).map((span) => ({
    id: span.spanId, parentSpanId: span.parentSpanId, type: span.spanType, name: span.toolName || span.modelId || span.traceName,
    latencyMs: span.latencyMs, costUsd: span.costUsd, startedAt: span.startMs, failed: Boolean(span.errorType),
  }));
}

/** Runs matching every filter. `ownFacet` leaves one facet out, which is how facet counts are worked out. */
export function demoFilter(filters: TraceListFilters, ownFacet?: FacetKey, nowMs = Date.now()): DemoRun[] {
  const query = filters.query?.toLowerCase();
  let runs = demoRuns(nowMs).filter((run) => run.startMs >= filters.fromMs && run.startMs <= filters.toMs);
  for (const key of FACET_KEYS) {
    const wanted = filters.facets?.[key];
    if (key !== ownFacet && wanted?.length) runs = runs.filter((run) => facetValues(run, key).some((value) => wanted.includes(value)));
    const unwanted = filters.excludeFacets?.[key];
    if (unwanted?.length) runs = runs.filter((run) => !facetValues(run, key).some((value) => unwanted.includes(value)));
  }
  if (query) runs = runs.filter((run) => run.runId.toLowerCase().includes(query) || run.traceName.toLowerCase().includes(query) || run.input.toLowerCase().includes(query) || run.output.toLowerCase().includes(query));
  if (filters.errorGroup) runs = runs.filter((run) => run.errors.some((error) => demoGroupId(error.tool, error.type, error.message) === filters.errorGroup));
  if (filters.node && !["__start__", "__end__"].includes(filters.node)) runs = runs.filter((run) => run.nodeKeys.includes(filters.node!));
  if (filters.edge) {
    const wanted = flowPairId(filters.edge.from, filters.edge.to);
    runs = runs.slice(-4000).filter((run) => flowGraph(flowSteps(run), false).edges.some((edge) => flowPairId(edge.source, edge.target) === wanted));
  }
  if (filters.status === "error") runs = runs.filter((run) => run.errorCount > 0);
  if (filters.status === "healthy") runs = runs.filter((run) => run.errorCount === 0);
  if (filters.minLatencyMs !== undefined) runs = runs.filter((run) => run.durationMs >= filters.minLatencyMs!);
  if (filters.maxLatencyMs !== undefined) runs = runs.filter((run) => run.durationMs <= filters.maxLatencyMs!);
  if (filters.minCostUsd !== undefined) runs = runs.filter((run) => run.totalCostUsd >= filters.minCostUsd!);
  if (filters.maxCostUsd !== undefined) runs = runs.filter((run) => run.totalCostUsd <= filters.maxCostUsd!);
  if (filters.minTokens !== undefined) runs = runs.filter((run) => tokens(run) >= filters.minTokens!);
  if (filters.maxTokens !== undefined) runs = runs.filter((run) => tokens(run) <= filters.maxTokens!);
  if (filters.topic) {
    // Same membership rule as the real query: topics are grouped over the newest matching runs.
    const newest = [...runs].sort((a, b) => b.startMs - a.startMs).slice(0, TOPIC_TRACE_LIMIT);
    const members = new Set(topicRunIds(newest.map((run) => ({ runId: run.runId, input: run.input, hasError: run.errorCount > 0, timedOut: run.timeouts > 0 })), filters.topic));
    runs = runs.filter((run) => members.has(run.runId));
  }
  return runs;
}

const NUMERIC_EXTRAS = ["llmCalls", "toolCalls", "slowestStepMs", "avgStepMs", "ttftMs", "retries", "timeouts"] as const;
const TEXT_EXTRAS = ["firstErrorType", "firstErrorMessage"] as const;

function sortValue(run: DemoRun, sort: string): number | string {
  switch (sort) {
    case "lastSeen": return run.startMs + run.durationMs;
    case "status": return run.errorCount > 0 ? 1 : 0;
    case "name": return run.traceName;
    case "traceId": return run.runId;
    case "input": return run.input.toLowerCase();
    case "output": return run.output.toLowerCase();
    case "latency": return run.durationMs;
    case "steps": return run.spanCount;
    case "cost": return run.totalCostUsd;
    case "tokens": return tokens(run);
    case "inputTokens": return run.inputTokens;
    case "outputTokens": return run.outputTokens;
    case "model": return run.modelId;
    case "user": return run.endUserId;
    case "session": return run.sessionId;
    case "environment": return run.environment;
    case "release": return run.release;
    case "tags": return [...run.tags].sort().join(", ");
    case "errors": return run.errorCount;
    case "tools": return run.tools.join(", ");
    case "models": return run.models.join(", ");
    case "rootType": return "agent";
    default:
      if (sort.startsWith("meta:")) return run.meta[sort.slice(5)] ?? "";
      if ((NUMERIC_EXTRAS as readonly string[]).includes(sort)) return Number(run[sort as (typeof NUMERIC_EXTRAS)[number]]);
      if ((TEXT_EXTRAS as readonly string[]).includes(sort)) return String(run[sort as (typeof TEXT_EXTRAS)[number]]);
      return run.startMs;
  }
}

export function demoList(runs: DemoRun[], filters: TraceListFilters, options: { extras?: string[]; meta?: string[] } = {}) {
  const pageSize = Math.min(Math.max(Math.floor(filters.pageSize ?? 50), 10), 200);
  const page = Math.max(Math.floor(filters.page ?? 0), 0);
  const sort = validTraceSort(filters.sort);
  const direction = filters.direction === "asc" ? 1 : -1;
  const sorted = [...runs].sort((a, b) => {
    const left = sortValue(a, sort), right = sortValue(b, sort);
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return order * direction || a.runId.localeCompare(b.runId);
  });
  const rows = sorted.slice(page * pageSize, page * pageSize + pageSize).map((run) => {
    const row: Record<string, unknown> = {
      runId: run.runId, traceName: run.traceName, startedAt: stamp(run.startMs), lastSeenAt: stamp(run.startMs + run.durationMs), durationMs: run.durationMs,
      spanCount: run.spanCount, errorCount: run.errorCount, totalCostUsd: run.totalCostUsd, inputTokens: run.inputTokens, outputTokens: run.outputTokens,
      modelId: run.modelId, endUserId: run.endUserId, sessionId: run.sessionId, environment: run.environment, release: run.release, tags: run.tags,
      inputPreview: run.input.slice(0, 280), outputPreview: run.output.slice(0, 280),
    };
    for (const id of options.extras ?? []) {
      if ((NUMERIC_EXTRAS as readonly string[]).includes(id)) row[id] = Number(run[id as (typeof NUMERIC_EXTRAS)[number]]);
      else if (id === "firstErrorType") row[id] = run.firstErrorType;
      else if (id === "firstErrorMessage") row[id] = run.firstErrorMessage;
      else if (id === "tools") row[id] = run.tools.join(", ");
      else if (id === "models") row[id] = run.models.join(", ");
      else if (id === "rootType") row[id] = "agent";
    }
    if (options.meta?.length) row.meta = Object.fromEntries(options.meta.map((key) => [key, run.meta[key] ?? ""]));
    return row;
  });
  return { rows, total: runs.length, page, pageSize };
}

function percentile(values: number[], level: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * level))]!;
}

export function demoHistogram(runs: DemoRun[], filters: TraceListFilters) {
  const spanSeconds = Math.max(60, Math.floor((filters.toMs - filters.fromMs) / 1000));
  const bucketSeconds = [60, 300, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400].find((size) => spanSeconds / size <= 120) ?? 86400;
  const size = bucketSeconds * 1000;
  const groups = new Map<number, DemoRun[]>();
  for (const run of runs) {
    const key = Math.floor(run.startMs / size) * size;
    const list = groups.get(key) ?? [];
    list.push(run);
    groups.set(key, list);
  }
  const buckets = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([key, list]): HistogramBucket => ({
    bucket: stamp(key), traces: list.length, errors: list.filter((run) => run.errorCount > 0).length,
    costUsd: list.reduce((sum, run) => sum + run.totalCostUsd, 0), tokens: list.reduce((sum, run) => sum + tokens(run), 0),
    p50DurationMs: percentile(list.map((run) => run.durationMs), 0.5), p95DurationMs: percentile(list.map((run) => run.durationMs), 0.95),
  }));
  return { bucketSeconds, buckets };
}

export function demoStats(runs: DemoRun[]): TraceStats {
  const durations = runs.map((run) => run.durationMs);
  return {
    traces: runs.length, runningTraces: 0, errors: runs.filter((run) => run.errorCount > 0).length, p50DurationMs: percentile(durations, 0.5), p95DurationMs: percentile(durations, 0.95),
    totalCostUsd: runs.reduce((sum, run) => sum + run.totalCostUsd, 0), inputTokens: runs.reduce((sum, run) => sum + run.inputTokens, 0), outputTokens: runs.reduce((sum, run) => sum + run.outputTokens, 0),
  };
}

export function demoFacets(filters: TraceListFilters, nowMs = Date.now()): FacetCounts {
  const out: FacetCounts = {};
  for (const key of FACET_KEYS) {
    const counts = new Map<string, number>();
    for (const run of demoFilter(filters, key, nowMs)) for (const value of new Set(facetValues(run, key))) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    const list = [...counts.entries()].map(([value, traces]) => ({ value, traces })).sort((a, b) => b.traces - a.traces || a.value.localeCompare(b.value)).slice(0, 100);
    if (list.length) out[key] = list;
  }
  return out;
}

export function demoErrorGroups(runs: DemoRun[]) {
  const groups = new Map<string, ErrorGroup & { runs: Set<string>; sightings: Array<{ release: string; at: string }> }>();
  for (const run of runs) {
    for (const error of run.errors) {
      const id = demoGroupId(error.tool, error.type, error.message);
      const group = groups.get(id) ?? { id, tool: error.tool, errorType: error.type, message: error.message, sample: error.sample, count: 0, traces: 0, firstSeen: stamp(run.startMs), lastSeen: stamp(run.startMs), sampleRunId: run.runId, runs: new Set<string>(), sightings: [] };
      group.count++;
      group.sightings.push({ release: run.release, at: stamp(run.startMs) });
      group.runs.add(run.runId);
      if (stamp(run.startMs) < group.firstSeen) group.firstSeen = stamp(run.startMs);
      if (stamp(run.startMs) > group.lastSeen) { group.lastSeen = stamp(run.startMs); group.sampleRunId = run.runId; }
      groups.set(id, group);
    }
  }
  const sorted = [...groups.values()].map(({ runs: set, sightings, ...group }) => ({ ...group, ...groupReleases(sightings), traces: set.size })).sort((a, b) => b.count - a.count || b.traces - a.traces || a.id.localeCompare(b.id));
  return { total: sorted.length, groups: sorted.slice(0, 20) };
}

/** Topics of the demo runs, grouped by what each run was asked to do. */
export function demoTopics(runs: DemoRun[]) {
  const traces = [...runs].sort((a, b) => b.startMs - a.startMs).slice(0, TOPIC_TRACE_LIMIT);
  return { ...groupTraceTopics(traces.map((run) => ({ runId: run.runId, input: run.input, hasError: run.errorCount > 0, timedOut: run.timeouts > 0 }))), sampled: runs.length > traces.length };
}

export function demoActivity(filters: TraceListFilters, timeZone: string, nowMs = Date.now()): ActivityDay[] {
  const zone = activityTimeZone(timeZone);
  let format: Intl.DateTimeFormat;
  try { format = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }); } catch { format = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }); }
  const days = new Map<string, ActivityDay>();
  for (const run of demoFilter({ ...filters, fromMs: nowMs - 371 * 86_400_000, toMs: nowMs }, undefined, nowMs)) {
    const day = format.format(run.startMs);
    const entry = days.get(day) ?? { day, traces: 0, errors: 0, costUsd: 0 };
    entry.traces++; entry.errors += run.errorCount > 0 ? 1 : 0; entry.costUsd += run.totalCostUsd;
    days.set(day, entry);
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function demoMetadataKeys(filters: Pick<TraceListFilters, "fromMs" | "toMs">, nowMs = Date.now()) {
  const counts = new Map<string, number>();
  for (const run of demoFilter({ fromMs: filters.fromMs, toMs: filters.toMs }, undefined, nowMs)) for (const key of Object.keys(run.meta)) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()].map(([key, traces]) => ({ key, traces })).sort((a, b) => b.traces - a.traces || a.key.localeCompare(b.key));
}

/** Everything the Overview and Costs pages show for the last `days` days, with the previous period for comparison. */
export function demoSummary(days: number, nowMs = Date.now()) {
  const span = days * 86_400_000;
  const current = demoFilter({ fromMs: nowMs - span, toMs: nowMs }, undefined, nowMs);
  const before = demoFilter({ fromMs: nowMs - 2 * span, toMs: nowMs - span }, undefined, nowMs);
  const filters: TraceListFilters = { fromMs: nowMs - span, toMs: nowMs };
  const models = new Map<string, { model: string; calls: number; costUsd: number; inputTokens: number; outputTokens: number }>();
  const names = new Map<string, { name: string; traces: number; errors: number; costUsd: number; p95: number[] }>();
  const releases = new Map<string, { release: string; traces: number; errors: number; costUsd: number; durations: number[]; first: number }>();
  const users = new Map<string, { user: string; traces: number; costUsd: number }>();
  const tools = new Map<string, { tool: string; calls: number; failures: number }>();
  const daily = new Map<string, { day: string; costUsd: number; traces: number; errors: number }>();
  for (const run of current) {
    for (const [model, usage] of Object.entries(run.modelUsage)) {
      const entry = models.get(model) ?? { model, calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };
      entry.calls += usage.calls; entry.costUsd += usage.costUsd; entry.inputTokens += usage.inputTokens; entry.outputTokens += usage.outputTokens;
      models.set(model, entry);
    }
    const name = names.get(run.traceName) ?? { name: run.traceName, traces: 0, errors: 0, costUsd: 0, p95: [] };
    name.traces++; name.errors += run.errorCount > 0 ? 1 : 0; name.costUsd += run.totalCostUsd; name.p95.push(run.durationMs); names.set(run.traceName, name);
    if (run.environment === "production") {
      const release = releases.get(run.release) ?? { release: run.release, traces: 0, errors: 0, costUsd: 0, durations: [], first: run.startMs };
      release.traces++; release.errors += run.errorCount > 0 ? 1 : 0; release.costUsd += run.totalCostUsd; release.durations.push(run.durationMs); release.first = Math.min(release.first, run.startMs); releases.set(run.release, release);
    }
    const user = users.get(run.endUserId) ?? { user: run.endUserId, traces: 0, costUsd: 0 };
    user.traces++; user.costUsd += run.totalCostUsd; users.set(run.endUserId, user);
    for (const tool of run.tools) {
      const entry = tools.get(tool) ?? { tool, calls: 0, failures: 0 };
      entry.calls++; entry.failures += run.errors.some((error) => error.tool === tool) ? 1 : 0; tools.set(tool, entry);
    }
    const day = stamp(Math.floor(run.startMs / 86_400_000) * 86_400_000).slice(0, 10);
    const bucket = daily.get(day) ?? { day, costUsd: 0, traces: 0, errors: 0 };
    bucket.costUsd += run.totalCostUsd; bucket.traces++; bucket.errors += run.errorCount > 0 ? 1 : 0; daily.set(day, bucket);
  }
  const failed = [...current].filter((run) => run.errorCount > 0).slice(-6).reverse();
  return {
    days, stats: demoStats(current), previous: demoStats(before), histogram: demoHistogram(current, filters), errorGroups: demoErrorGroups(current),
    models: [...models.values()].sort((a, b) => b.costUsd - a.costUsd),
    traceNames: [...names.values()].map(({ p95, ...rest }) => ({ ...rest, p95DurationMs: percentile(p95, 0.95) })).sort((a, b) => b.traces - a.traces),
    releases: [...releases.values()].map(({ durations, ...rest }) => ({ ...rest, p95DurationMs: percentile(durations, 0.95) })).sort((a, b) => b.first - a.first),
    users: [...users.values()].sort((a, b) => b.costUsd - a.costUsd).slice(0, 8),
    tools: [...tools.values()].sort((a, b) => b.calls - a.calls),
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
    failed: failed.map((run) => ({ runId: run.runId, traceName: run.traceName, startedAt: stamp(run.startMs), durationMs: run.durationMs, errorType: run.firstErrorType, message: run.firstErrorMessage, release: run.release })),
    range: { from: filters.fromMs, to: filters.toMs },
  };
}

/** The current time, read outside React components so pages stay pure. */
export const demoNow = () => Date.now();

/** Sessions or users of the demo project in the shape the Sessions and Users pages read, with the same filters, sorting and paging. */
function demoGroupRows(kind: GroupKind, filters: Pick<GroupFilters, "fromMs" | "toMs" | "query" | "environment">, nowMs: number): GroupRow[] {
  const key = kind === "session" ? "sessionId" : "endUserId";
  const otherKey = kind === "session" ? "endUserId" : "sessionId";
  const groups = new Map<string, { runs: DemoRun[]; others: Set<string> }>();
  const needle = filters.query?.toLowerCase();
  for (const run of demoFilter({ fromMs: filters.fromMs, toMs: filters.toMs }, undefined, nowMs)) {
    if (filters.environment && run.environment !== filters.environment) continue;
    if (needle && !run[key].toLowerCase().includes(needle) && !run[otherKey].toLowerCase().includes(needle)) continue;
    const group = groups.get(run[key]) ?? { runs: [], others: new Set<string>() };
    group.runs.push(run); group.others.add(run[otherKey]); groups.set(run[key], group);
  }
  return [...groups.entries()].map(([id, { runs, others }]) => {
    const first = Math.min(...runs.map((run) => run.startMs)), last = Math.max(...runs.map((run) => run.startMs + run.durationMs));
    const cost = new Map<string, number>();
    for (const run of runs) cost.set(run.modelId, (cost.get(run.modelId) ?? 0) + run.totalCostUsd);
    return {
      id, runs: runs.length, spanCount: runs.reduce((sum, run) => sum + run.spanCount, 0), failedRuns: runs.filter((run) => run.errorCount > 0).length,
      totalCostUsd: runs.reduce((sum, run) => sum + run.totalCostUsd, 0), inputTokens: runs.reduce((sum, run) => sum + run.inputTokens, 0), outputTokens: runs.reduce((sum, run) => sum + run.outputTokens, 0),
      firstSeenAt: stamp(first), lastSeenAt: stamp(last), spanSeconds: Math.round((last - first) / 1000), others: others.size, other: runs[0][otherKey],
      environment: runs[0].environment, topModel: [...cost.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
    };
  });
}

export function demoGroups(kind: GroupKind, filters: GroupFilters, nowMs = Date.now()) {
  const all = demoGroupRows(kind, filters, nowMs).filter((row) => (filters.status === "error" ? row.failedRuns > 0 : filters.status === "healthy" ? row.failedRuns === 0 : true));
  const value = (row: GroupRow) => {
    switch (filters.sort) {
      case "firstSeenAt": return row.firstSeenAt;
      case "runs": return row.runs;
      case "failedRuns": return row.failedRuns;
      case "totalCostUsd": return row.totalCostUsd;
      case "tokens": return row.inputTokens + row.outputTokens;
      case "spanSeconds": return row.spanSeconds;
      case "id": return row.id;
      default: return row.lastSeenAt;
    }
  };
  const sign = filters.direction === "asc" ? 1 : -1;
  all.sort((a, b) => { const x = value(a), y = value(b); return (x < y ? -1 : x > y ? 1 : 0) * sign || a.id.localeCompare(b.id); });
  const environments = new Map<string, Set<string>>();
  const key = kind === "session" ? "sessionId" : "endUserId";
  for (const run of demoFilter({ fromMs: filters.fromMs, toMs: filters.toMs }, undefined, nowMs)) { const set = environments.get(run.environment) ?? new Set<string>(); set.add(run[key]); environments.set(run.environment, set); }
  const stats: GroupStats = {
    groups: all.length, runs: all.reduce((sum, row) => sum + row.runs, 0), failedRuns: all.reduce((sum, row) => sum + row.failedRuns, 0), groupsWithErrors: all.filter((row) => row.failedRuns > 0).length,
    totalCostUsd: all.reduce((sum, row) => sum + row.totalCostUsd, 0), tokens: all.reduce((sum, row) => sum + row.inputTokens + row.outputTokens, 0),
  };
  return {
    rows: all.slice(filters.page * filters.pageSize, (filters.page + 1) * filters.pageSize), total: all.length, stats, page: filters.page, pageSize: filters.pageSize,
    environments: [...environments.entries()].map(([value, ids]) => ({ value, groups: ids.size })).sort((a, b) => b.groups - a.groups),
  };
}

export function demoGroupDetail(kind: GroupKind, id: string, nowMs = Date.now()) {
  const key = kind === "session" ? "sessionId" : "endUserId";
  const otherKey = kind === "session" ? "endUserId" : "sessionId";
  const runs = demoFilter({ fromMs: nowMs - 90 * 86_400_000, toMs: nowMs }, undefined, nowMs).filter((run) => run[key] === id);
  const row = demoGroupRows(kind, { fromMs: nowMs - 90 * 86_400_000, toMs: nowMs }, nowMs).find((item) => item.id === id) ?? null;
  const siblings = new Map<string, { id: string; runs: number; failedRuns: number; totalCostUsd: number; lastMs: number }>();
  for (const run of runs) {
    const entry = siblings.get(run[otherKey]) ?? { id: run[otherKey], runs: 0, failedRuns: 0, totalCostUsd: 0, lastMs: 0 };
    entry.runs++; entry.failedRuns += run.errorCount > 0 ? 1 : 0; entry.totalCostUsd += run.totalCostUsd; entry.lastMs = Math.max(entry.lastMs, run.startMs); siblings.set(entry.id, entry);
  }
  return { row, siblings: [...siblings.values()].sort((a, b) => b.lastMs - a.lastMs).slice(0, 25).map(({ lastMs, ...rest }) => ({ ...rest, lastSeenAt: stamp(lastMs) })) };
}

/** The cost breakdowns the dashboard widgets read, for the last `days` days of the demo project. */
export function demoCostStats(days: number, nowMs = Date.now()) {
  const daily = new Map<string, { day: string; totalCostUsd: number; spanCount: number }>();
  const models = new Map<string, { modelId: string; totalCostUsd: number; spanCount: number }>();
  const tools = new Map<string, { toolName: string; totalCostUsd: number; spanCount: number }>();
  const users = new Map<string, { endUserId: string; totalCostUsd: number; totalTokens: number; spanCount: number }>();
  for (const run of demoFilter({ fromMs: nowMs - days * 86_400_000, toMs: nowMs }, undefined, nowMs)) {
    const day = stamp(Math.floor(run.startMs / 86_400_000) * 86_400_000).slice(0, 10);
    const bucket = daily.get(day) ?? { day, totalCostUsd: 0, spanCount: 0 };
    bucket.totalCostUsd += run.totalCostUsd; bucket.spanCount += run.spanCount; daily.set(day, bucket);
    for (const [modelId, usage] of Object.entries(run.modelUsage)) {
      const entry = models.get(modelId) ?? { modelId, totalCostUsd: 0, spanCount: 0 };
      entry.totalCostUsd += usage.costUsd; entry.spanCount += usage.calls; models.set(modelId, entry);
    }
    for (const span of demoSteps(run)) {
      if (!span.toolName) continue;
      const entry = tools.get(span.toolName) ?? { toolName: span.toolName, totalCostUsd: 0, spanCount: 0 };
      entry.totalCostUsd += span.costUsd; entry.spanCount++; tools.set(span.toolName, entry);
    }
    const user = users.get(run.endUserId) ?? { endUserId: run.endUserId, totalCostUsd: 0, totalTokens: 0, spanCount: 0 };
    user.totalCostUsd += run.totalCostUsd; user.totalTokens += run.inputTokens + run.outputTokens; user.spanCount += run.spanCount; users.set(run.endUserId, user);
  }
  const byCost = <T extends { totalCostUsd: number }>(items: Map<string, T>, limit: number) => [...items.values()].sort((a, b) => b.totalCostUsd - a.totalCostUsd).slice(0, limit);
  return { dailyCosts: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)), modelCosts: byCost(models, 10), toolCosts: byCost(tools, 10), userCosts: byCost(users, 10) };
}
