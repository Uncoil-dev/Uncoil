/**
 * Lean SQL for the trace list. A "lean" trace row reads only numeric and time columns, so a query over thousands of
 * runs never loads the large input/output/metadata text of every step. The text columns are read later, for the
 * runs on the visible page only. No imports from the app, so Node can test it on its own.
 */

/** A step that failed; the same rule as a trace's errorCount. */
export const IS_ERROR = `(spanType = 'error' OR errorType != '')`;
export const DURATION_EXPR = `if(countIf(parentSpanId = '') > 0, maxIf(latencyMs, parentSpanId = ''), greatest(dateDiff('millisecond', min(createdAt), max(createdAt)), max(latencyMs)))`;
export const ERROR_COUNT_EXPR = `countIf(${IS_ERROR})`;

/** One row per run with only the cheap columns: enough for sorting, HAVING filters, totals and the chart. */
export const LEAN_AGGREGATE = `
  runId,
  min(createdAt) AS startedAt,
  max(createdAt) AS lastSeenAt,
  ${DURATION_EXPR} AS durationMs,
  count() AS spanCount,
  ${ERROR_COUNT_EXPR} AS errorCount,
  sum(costUsd) AS totalCostUsd,
  sum(inputTokens) AS inputTokens,
  sum(outputTokens) AS outputTokens`;

/** Sort columns that the lean row can answer. Anything else (names, previews, models) sorts on the full row. */
export const LEAN_SORT_IDS = new Set(["startedAt", "lastSeen", "status", "traceId", "latency", "steps", "cost", "tokens", "inputTokens", "outputTokens", "errors"]);

export function isLeanSort(sortId: string) {
  return LEAN_SORT_IDS.has(sortId);
}

/** Step 1 of the list: the run ids of one page, ordered, from lean rows. */
export function leanPageSql(args: { where: string; having: string; sortColumn: string; direction: "ASC" | "DESC"; pageSize: number; page: number }) {
  return `SELECT runId FROM (SELECT ${LEAN_AGGREGATE} FROM spans WHERE ${args.where} GROUP BY runId ${args.having})
    ORDER BY ${args.sortColumn} ${args.direction}, runId LIMIT ${args.pageSize} OFFSET ${args.page * args.pageSize}`;
}

/** The number of matching runs. Without HAVING filters a plain distinct count is enough and reads one column. */
export function leanCountSql(args: { where: string; having: string }) {
  return args.having
    ? `SELECT count() AS total FROM (SELECT ${LEAN_AGGREGATE} FROM spans WHERE ${args.where} GROUP BY runId ${args.having})`
    : `SELECT uniqExact(runId) AS total FROM spans WHERE ${args.where}`;
}

/** Step 2 of the list: full rows (previews, tags, model) for the page's runs only. */
export function pageRowsSql(args: { aggregate: string; where: string; runIds: string[]; quote: (value: string) => string }) {
  const ids = args.runIds.map((id) => `'${args.quote(id)}'`).join(",");
  return `SELECT ${args.aggregate} FROM spans WHERE ${args.where} AND runId IN (${ids}) GROUP BY runId`;
}

/** Puts hydrated rows back into the order the lean query chose. */
export function inPageOrder<T extends { runId: string }>(runIds: string[], rows: T[]) {
  const byRun = new Map(rows.map((row) => [row.runId, row]));
  return runIds.flatMap((id) => { const row = byRun.get(id); return row ? [row] : []; });
}
