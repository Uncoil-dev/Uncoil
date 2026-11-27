export interface CriticalPathSpan {
  spanId: string;
  parentSpanId: string;
  spanType: string;
  label: string;
  startMs: number;
  latencyMs: number;
  costUsd: number;
}

export interface CriticalPathEntry extends CriticalPathSpan {
  endMs: number;
  /** Share of the run's wall-clock time (0-1). */
  share: number;
}

export interface CriticalPathResult {
  wallClockMs: number;
  /** Spans that set the run's duration, in execution order. */
  path: CriticalPathEntry[];
  pathSpanIds: Set<string>;
  /** Time on the path spent inside spans. */
  busyMs: number;
  /** Time on the path with no span running (waiting between steps). */
  idleMs: number;
  /** Total span time divided by wall-clock time; above 1 means work overlapped. */
  parallelism: number;
  /** Path spans ranked by duration, largest first. */
  bottlenecks: CriticalPathEntry[];
}

/**
 * Finds the chain of spans that set the run's wall-clock time. Walking back from the
 * span that finished last, each step picks the latest-finishing span that ended before
 * the current one started. Spans that only wrap other spans are skipped, so a parent
 * never hides the children that did the work.
 */
export function criticalPath(spans: CriticalPathSpan[]): CriticalPathResult {
  const valid = spans.filter((span) => Number.isFinite(span.startMs));
  const parents = new Set(valid.map((span) => span.parentSpanId).filter(Boolean));
  const leaves = valid.filter((span) => !parents.has(span.spanId));
  const candidates = (leaves.length ? leaves : valid).map((span) => {
    const latencyMs = Math.max(0, span.latencyMs);
    return { ...span, latencyMs, endMs: span.startMs + latencyMs, share: 0 };
  });
  if (!candidates.length) {
    return { wallClockMs: 0, path: [], pathSpanIds: new Set(), busyMs: 0, idleMs: 0, parallelism: 0, bottlenecks: [] };
  }

  const startMs = Math.min(...candidates.map((span) => span.startMs));
  const endMs = Math.max(...candidates.map((span) => span.endMs));
  const wallClockMs = Math.max(1, endMs - startMs);

  const path: CriticalPathEntry[] = [];
  const used = new Set<string>();
  let current = candidates.reduce((best, span) => (span.endMs > best.endMs || (span.endMs === best.endMs && span.latencyMs > best.latencyMs) ? span : best));
  while (current) {
    path.unshift(current);
    used.add(current.spanId);
    const before = candidates.filter((span) => !used.has(span.spanId) && span.endMs <= current.startMs);
    if (!before.length) break;
    current = before.reduce((best, span) => (span.endMs > best.endMs || (span.endMs === best.endMs && span.latencyMs > best.latencyMs) ? span : best));
  }

  for (const entry of path) entry.share = entry.latencyMs / wallClockMs;
  const busyMs = path.reduce((sum, entry) => sum + entry.latencyMs, 0);
  const totalSpanMs = candidates.reduce((sum, span) => sum + span.latencyMs, 0);
  return {
    wallClockMs,
    path,
    pathSpanIds: used,
    busyMs,
    idleMs: Math.max(0, wallClockMs - busyMs),
    parallelism: totalSpanMs / wallClockMs,
    bottlenecks: [...path].sort((a, b) => b.latencyMs - a.latencyMs).slice(0, 5),
  };
}

type StoredSpan = { spanId: string; parentSpanId: string; spanType: string; createdAt: string; latencyMs: number; costUsd?: number };

/**
 * The longest step on a trace's critical path, from spans as the trace panel stores them
 * ("YYYY-MM-DD hh:mm:ss" UTC or ISO start times). Null for traces with fewer than two steps.
 */
export function slowestStep(spans: StoredSpan[]): { spanId: string; latencyMs: number } | null {
  if (spans.length < 2) return null;
  const { bottlenecks } = criticalPath(spans.map((span) => ({
    spanId: span.spanId, parentSpanId: span.parentSpanId, spanType: span.spanType, label: span.spanId,
    startMs: Date.parse(span.createdAt.includes("T") ? span.createdAt : `${span.createdAt.replace(" ", "T")}Z`),
    latencyMs: Number(span.latencyMs ?? 0), costUsd: Number(span.costUsd ?? 0),
  })));
  const top = bottlenecks[0];
  return top && top.latencyMs > 0 ? { spanId: top.spanId, latencyMs: top.latencyMs } : null;
}
