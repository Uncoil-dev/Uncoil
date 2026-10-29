import { validTraceSort, TRACE_SORT_FIELDS } from "./trace-sort";
import { TYPE_ALIASES } from "@/components/dashboard/tracing/format";
import { flowGraph, collapseFlowReturns, flowPairId, median, type FlowEdge, type FlowStep } from "./trace-flow";
/**
 * Tinybird REST API client.
 * All span analytics queries go through here — never Convex.
 */

const TINYBIRD_HOST = process.env.TINYBIRD_HOST ?? "https://api.tinybird.co";
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN;

// Self-hosted ClickHouse (same SQL dialect) replaces Tinybird when CLICKHOUSE_URL is set.
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL?.replace(/\/$/, "");
// Anything that is not the live site (local dev, PR previews) reads the sample database,
// whatever CLICKHOUSE_DATABASE says, so a preview can never touch live traces.
const IS_PREVIEW_RUNTIME = process.env.NODE_ENV !== "production" || (process.env.UNCOIL_PREVIEW ?? process.env.TRACIFY_PREVIEW) === "1" || /\.preview\.uncoil\.tech/.test(process.env.COOLIFY_FQDN ?? "");
const CLICKHOUSE_DATABASE = IS_PREVIEW_RUNTIME ? "uncoil_preview" : (process.env.CLICKHOUSE_DATABASE ?? "uncoil");

export function analyticsBackend() {
  return CLICKHOUSE_URL ? "clickhouse" : "tinybird";
}

function clickhouseHeaders() {
  const user = process.env.CLICKHOUSE_USER;
  const password = process.env.CLICKHOUSE_PASSWORD;
  if (!user || !password) throw new Error("CLICKHOUSE_USER and CLICKHOUSE_PASSWORD must be set");
  return { Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}` };
}

/** Runs one read query and returns the raw response; the body is `{ data: [...] }` on both backends. */
function analyticsSql(sql: string, init: { signal?: AbortSignal; format?: "JSON" | "JSONEachRow" } = {}) {
  if (CLICKHOUSE_URL) {
    const params = new URLSearchParams({ database: CLICKHOUSE_DATABASE, output_format_json_quote_64bit_integers: "1" });
    return fetch(`${CLICKHOUSE_URL}/?${params}`, {
      method: "POST", headers: clickhouseHeaders(), body: `${sql.trimEnd()}\nFORMAT ${init.format ?? "JSON"}`, cache: "no-store", ...init,
    });
  }
  return fetch(sqlUrl(sql), { headers: getHeaders(), cache: "no-store", ...init });
}

/** Tinybird answers an insert with JSON; ClickHouse answers with an empty body. */
async function insertResult(res: Response) {
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : { ok: true };
}

/** Appends newline-delimited JSON rows to a table (Tinybird Events API or ClickHouse INSERT). */
function analyticsInsert(table: "spans" | "evaluation_scores", ndjson: string) {
  if (CLICKHOUSE_URL) {
    const params = new URLSearchParams({
      database: CLICKHOUSE_DATABASE, query: `INSERT INTO ${table} FORMAT JSONEachRow`,
      date_time_input_format: "best_effort", input_format_skip_unknown_fields: "1",
    });
    return fetch(`${CLICKHOUSE_URL}/?${params}`, { method: "POST", headers: clickhouseHeaders(), body: ndjson });
  }
  return fetch(`${TINYBIRD_HOST}/v0/events?name=${table}`, { method: "POST", headers: getHeaders(), body: ndjson });
}

function sqlUrl(sql: string) {
  const params = new URLSearchParams({
    q: `${sql.trimEnd()}\nFORMAT JSON`,
  });
  return `${TINYBIRD_HOST}/v0/sql?${params.toString()}`;
}

function getHeaders() {
  if (!TINYBIRD_TOKEN) throw new Error("TINYBIRD_TOKEN is not set");
  return {
    Authorization: `Bearer ${TINYBIRD_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function checkTinybirdHealth() {
  const response = await analyticsSql("SELECT 1 AS healthy", { signal: AbortSignal.timeout(4_000) });
  if (!response.ok) throw new Error(`Tinybird returned ${response.status}`);
}

export function sqlString(value: string) {
  // ClickHouse string literals treat backslash as an escape character, so escape it before quotes.
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

/**
 * Ingest a single span row into the Tinybird `spans` datasource.
 */
export async function ingestSpan(span: {
  spanId: string;
  runId: string;
  projectId: string;
  spanType: string;
  input: string;
  output: string;
  attachments: string;
  latencyMs: number;
  costUsd: number;
  modelId: string;
  toolName: string;
  parentSpanId: string;
  metadata: Record<string, unknown>;
  sessionId: string;
  endUserId: string;
  environment: string;
  release: string;
  tags: string[];
  traceName: string;
  inputTokens: number;
  outputTokens: number;
  ttftMs: number;
  retryCount: number;
  errorType: string;
  errorMessage: string;
  isStreamChunk: boolean;
  streamSequence: number;
  streamFinal: boolean;
  payloadFormat: string;
  stackTrace: string;
  timedOut: boolean;
  timeoutMs: number;
  createdAt: string; // ISO 8601 UTC
}) {
  const ndjson = JSON.stringify(span) + "\n";
  const res = await analyticsInsert("spans", ndjson);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Span ingest failed (${analyticsBackend()}): ${res.status} ${body}`);
  }
  return insertResult(res);
}

export async function ingestEvaluationScore(score: {
  scoreId: string;
  projectId: string;
  traceId?: string;
  evaluatorId: string;
  scoreName: string;
  dataType: "boolean" | "numeric" | "categorical" | "text";
  valueNumeric: number;
  valueBoolean: boolean;
  valueCategorical: string;
  status: string;
  modelId?: string;
  environment?: string;
  createdAt: string;
}) {
  const res = await analyticsInsert("evaluation_scores", `${JSON.stringify(score)}\n`);
  if (!res.ok) throw new Error(`Evaluation score ingest failed (${analyticsBackend()}): ${res.status} ${await res.text()}`);
  return insertResult(res);
}

export async function getEvaluationScoreTimeseries(projectId: string, scoreName: string, days = 7) {
  const sql = `SELECT toStartOfHour(createdAt) AS bucket, count() AS sampleCount, avgIf(valueNumeric, dataType = 'numeric') AS averageScore, countIf(status IN ('failed', 'error')) / count() AS failureRate, countIf(dataType = 'boolean' AND valueBoolean = 1) / greatest(countIf(dataType = 'boolean'), 1) AS booleanPassRate FROM evaluation_scores WHERE projectId = '${sqlString(projectId)}' AND scoreName = '${sqlString(scoreName)}' AND createdAt >= now() - INTERVAL ${Math.min(Math.max(days, 1), 90)} DAY GROUP BY bucket ORDER BY bucket ASC`;
  const res = await analyticsSql(sql);
  if (!res.ok) throw new Error(`Tinybird evaluation score query failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data as Array<{ bucket: string; sampleCount: number; averageScore: number; failureRate: number; booleanPassRate: number }>;
}

/**
 * Query spans for a specific run from Tinybird.
 */
export async function getSpansForRun(runId: string, projectId: string) {
  const sql =
    `SELECT * FROM spans WHERE runId = '${sqlString(runId)}' AND projectId = '${sqlString(projectId)}' ORDER BY createdAt ASC`
  const res = await analyticsSql(sql);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tinybird query failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.data as SpanRow[];
}

/**
 * Aggregate cost per day for a project.
 */
export async function getDailyCosts(projectId: string, days = 30) {
  const sql = `
    SELECT
      toDate(createdAt) AS day,
      sum(costUsd)      AS totalCostUsd,
      count()           AS spanCount
    FROM spans
    WHERE projectId = '${projectId}'
      AND createdAt >= now() - INTERVAL ${days} DAY
    GROUP BY day
    ORDER BY day ASC
  `;
  const res = await analyticsSql(sql);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tinybird query failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.data as { day: string; totalCostUsd: number; spanCount: number }[];
}

/**
 * Get per-model cost breakdown for a project.
 */
export async function getCostByModel(projectId: string, days = 30) {
  const sql = `
    SELECT
      modelId,
      sum(costUsd)   AS totalCostUsd,
      count()        AS spanCount,
      avg(latencyMs) AS avgLatencyMs,
      quantile(0.50)(latencyMs) AS p50LatencyMs,
      quantile(0.75)(latencyMs) AS p75LatencyMs,
      quantile(0.90)(latencyMs) AS p90LatencyMs,
      quantile(0.95)(latencyMs) AS p95LatencyMs,
      quantile(0.99)(latencyMs) AS p99LatencyMs
    FROM spans
    WHERE projectId = '${projectId}'
      AND spanType = 'llm_call'
      AND createdAt >= now() - INTERVAL ${days} DAY
    GROUP BY modelId
    ORDER BY totalCostUsd DESC
  `;
  const res = await analyticsSql(sql);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tinybird query failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.data as { modelId: string; totalCostUsd: number; spanCount: number; avgLatencyMs: number; p50LatencyMs: number; p75LatencyMs: number; p90LatencyMs: number; p95LatencyMs: number; p99LatencyMs: number }[];
}

/**
 * Get per-tool cost and latency breakdown for a project.
 */
export async function getCostByTool(projectId: string, days = 30) {
  const sql = `
    SELECT
      toolName,
      sum(costUsd)   AS totalCostUsd,
      count()        AS spanCount,
      avg(latencyMs) AS avgLatencyMs
    FROM spans
    WHERE projectId = '${projectId}'
      AND toolName != ''
      AND createdAt >= now() - INTERVAL ${days} DAY
    GROUP BY toolName
    ORDER BY totalCostUsd DESC
    LIMIT 10
  `;
  const res = await analyticsSql(sql);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tinybird query failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.data as { toolName: string; totalCostUsd: number; spanCount: number; avgLatencyMs: number }[];
}

/** Get cost, token, and latency breakdown per end-user identifier. */
export async function getCostByUser(projectId: string, days = 30) {
  const sql = `
    SELECT
      endUserId,
      sum(costUsd) AS totalCostUsd,
      sum(inputTokens + outputTokens) AS totalTokens,
      count() AS spanCount,
      avg(latencyMs) AS avgLatencyMs
    FROM spans
    WHERE projectId = '${projectId}'
      AND endUserId != ''
      AND createdAt >= now() - INTERVAL ${days} DAY
    GROUP BY endUserId
    ORDER BY totalCostUsd DESC
    LIMIT 20
  `;
  const res = await analyticsSql(sql);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tinybird query failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.data as { endUserId: string; totalCostUsd: number; totalTokens: number; spanCount: number; avgLatencyMs: number }[];
}

export type TraceSearchFilters = {
  query?: string;
  sessionId?: string;
  endUserId?: string;
  environment?: string;
  release?: string;
  modelId?: string;
  tag?: string;
  status?: "all" | "error" | "healthy";
  minCostUsd?: number;
  minLatencyMs?: number;
  days?: number;
  limit?: number;
};

export async function searchTraces(projectId: string, filters: TraceSearchFilters) {
  const where = [`projectId = '${sqlString(projectId)}'`];
  const days = Math.min(Math.max(filters.days ?? 30, 1), 90);
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  where.push(`createdAt >= now() - INTERVAL ${days} DAY`);
  if (filters.sessionId) where.push(`sessionId = '${sqlString(filters.sessionId)}'`);
  if (filters.endUserId) where.push(`endUserId = '${sqlString(filters.endUserId)}'`);
  if (filters.environment) where.push(`environment = '${sqlString(filters.environment)}'`);
  if (filters.release) where.push(`release = '${sqlString(filters.release)}'`);
  if (filters.modelId) where.push(`modelId = '${sqlString(filters.modelId)}'`);
  if (filters.tag) where.push(`has(tags, '${sqlString(filters.tag)}')`);
  if (filters.query) {
    const value = sqlString(filters.query);
    where.push(`(positionCaseInsensitive(runId, '${value}') > 0 OR positionCaseInsensitive(traceName, '${value}') > 0 OR positionCaseInsensitive(metadata, '${value}') > 0 OR positionCaseInsensitive(input, '${value}') > 0 OR positionCaseInsensitive(output, '${value}') > 0)`);
  }

  const having = [];
  if (filters.status === "error") having.push("countIf(spanType = 'error') > 0");
  if (filters.status === "healthy") having.push("countIf(spanType = 'error') = 0");
  if (filters.minCostUsd !== undefined) having.push(`sum(costUsd) >= ${Number(filters.minCostUsd)}`);
  if (filters.minLatencyMs !== undefined) having.push(`max(latencyMs) >= ${Number(filters.minLatencyMs)}`);
  const sql = `
    SELECT
      runId,
      any(sessionId) AS sessionId,
      any(endUserId) AS endUserId,
      any(environment) AS environment,
      any(release) AS release,
      any(traceName) AS traceName,
      min(createdAt) AS startedAt,
      max(createdAt) AS lastSeenAt,
      count() AS spanCount,
      sum(costUsd) AS totalCostUsd,
      max(latencyMs) AS maxLatencyMs,
      max(ttftMs) AS ttftMs,
      sum(retryCount) AS retryCount,
      countIf(spanType = 'error') AS errorCount
    FROM spans
    WHERE ${where.join(" AND ")}
    GROUP BY runId
    ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
    ORDER BY lastSeenAt DESC
    LIMIT ${limit}
  `;
  const res = await analyticsSql(sql);
  if (!res.ok) {
    throw new Error(`Tinybird query failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.data as Array<{
    runId: string; sessionId: string; endUserId: string; environment: string; release: string;
    traceName: string; startedAt: string; lastSeenAt: string; spanCount: number;
    totalCostUsd: number; maxLatencyMs: number; ttftMs: number; retryCount: number; errorCount: number;
  }>;
}

/** Filterable step fields; tags is an array column. */
export const FACET_KEYS = ["traceName", "spanType", "toolName", "modelId", "errorType", "environment", "release", "endUserId", "sessionId", "tag"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

function facetCondition(key: FacetKey, values: string[]) {
  const list = values.map((value) => `'${sqlString(value)}'`).join(", ");
  return key === "tag" ? `hasAny(tags, [${list}])` : `${key} IN (${list})`;
}

export type TraceListFilters = {
  query?: string;
  fromMs: number;
  toMs: number;
  status?: "all" | "error" | "healthy";
  /** Checkbox filters: a trace matches when one of its steps has any of the chosen values (per field). */
  facets?: Partial<Record<FacetKey, string[]>>;
  /** Exclusions: a trace is dropped when one of its steps has any of these values (per field). */
  excludeFacets?: Partial<Record<FacetKey, string[]>>;
  minLatencyMs?: number;
  maxLatencyMs?: number;
  minCostUsd?: number;
  maxCostUsd?: number;
  /** Input plus output tokens of the whole trace. */
  minTokens?: number;
  maxTokens?: number;
  /** Traces containing an error from this group (id from traceErrorGroups). */
  errorGroup?: string;
  /** Traces containing this agent-map step ("tool:<name>" or "model:<id>"). */
  node?: string;
  /** Traces where step `to` ran directly after step `from` (agent-map arrow). */
  edge?: { from: string; to: string };
  /** Internal: matching ids resolved through the same Flow rules as the drawing. */
  flowRunIds?: string[];
  sort?: string;
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type TraceListRow = {
  /** Optional columns, present only when the list asked for them. */
  meta?: Record<string, string>;
  llmCalls?: number; toolCalls?: number; slowestStepMs?: number; avgStepMs?: number; ttftMs?: number; retries?: number; timeouts?: number;
  firstErrorType?: string; firstErrorMessage?: string; tools?: string; models?: string; rootType?: string;
  runId: string; traceName: string; startedAt: string; lastSeenAt: string; durationMs: number;
  spanCount: number; errorCount: number; totalCostUsd: number; inputTokens: number; outputTokens: number;
  modelId: string; endUserId: string; sessionId: string; environment: string; release: string;
  tags: string[]; inputPreview: string; outputPreview: string;
};

/** A step that failed; the same rule as a trace's errorCount. */
export const IS_ERROR = `(spanType = 'error' OR errorType != '')`;
const ERROR_TOOL = `if(toolName != '', toolName, modelId)`;
// The first 120 characters of the error message with the parts that change between occurrences (urls, emails, ids,
// paths, quoted values, long tokens, numbers) replaced, so similar failures group together. Regexes avoid backslashes
// so they read the same in JS and ClickHouse literals.
const ERROR_MESSAGE_KEY = `leftUTF8(trimBoth(replaceRegexpAll(replaceRegexpAll(replaceRegexpAll(replaceRegexpAll(replaceRegexpAll(replaceRegexpAll(replaceRegexpAll(replaceRegexpAll(replaceRegexpAll(
  substring(errorMessage, 1, 600),
  '[a-zA-Z][a-zA-Z0-9+.-]*://[^[:space:]"<>]+', '<url>'),
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}', '<email>'),
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '<id>'),
  '(~|[.]{1,2})?(/[^/[:space:]"(),:;<>]+){2,}/?', '<path>'),
  '(sk|pk|rk|ghp|xox[a-z])[-_][A-Za-z0-9_-]{10,}', '<token>'),
  '[0-9a-fA-F]{8,}', '<id>'),
  '"[^"]*"|[\\x27][^\\x27]*[\\x27]', '<value>'),
  '[0-9]+([.][0-9]+)?', '<n>'),
  '[[:space:]]+', ' ')), 120)`;
const ERROR_GROUP_ID = `lower(hex(cityHash64(${ERROR_TOOL}, errorType, ${ERROR_MESSAGE_KEY})))`;
const STEP_TYPE = `transform(lower(spanType), [${Object.keys(TYPE_ALIASES).map((key) => `'${key}'`).join(",")}], [${Object.values(TYPE_ALIASES).map((key) => `'${key}'`).join(",")}], lower(spanType))`;
const STEP_NAME = `multiIf(toolName != '', toolName, modelId != '', modelId, traceName != '', traceName, spanType != '', spanType, 'span')`;
const NODE_KEY = `concat(${STEP_TYPE}, ':', ${STEP_NAME})`;

function rangeScope(projectId: string, filters: Pick<TraceListFilters, "fromMs" | "toMs">) {
  return `projectId = '${sqlString(projectId)}' AND createdAt >= toDateTime(${Math.floor(filters.fromMs / 1000)}) AND createdAt <= toDateTime(${Math.ceil(filters.toMs / 1000)})`;
}

function traceListClauses(projectId: string, filters: TraceListFilters) {
  const where = [
    `projectId = '${sqlString(projectId)}'`,
    `createdAt >= toDateTime(${Math.floor(filters.fromMs / 1000)})`,
    `createdAt <= toDateTime(${Math.ceil(filters.toMs / 1000)})`,
  ];
  // Facet counts use steps inside the range, so facet filters use the same range and the counts match the list.
  for (const key of FACET_KEYS) {
    const values = filters.facets?.[key];
    if (values?.length) where.push(`runId IN (SELECT runId FROM spans WHERE ${rangeScope(projectId, filters)} AND ${facetCondition(key, values)})`);
  }
  for (const key of FACET_KEYS) {
    const values = filters.excludeFacets?.[key];
    if (values?.length) where.push(`runId NOT IN (SELECT runId FROM spans WHERE ${rangeScope(projectId, filters)} AND ${facetCondition(key, values)})`);
  }
  if (filters.query) {
    const value = sqlString(filters.query);
    where.push(`runId IN (SELECT runId FROM spans WHERE projectId = '${sqlString(projectId)}' AND (positionCaseInsensitive(runId, '${value}') > 0 OR positionCaseInsensitive(traceName, '${value}') > 0 OR positionCaseInsensitive(input, '${value}') > 0 OR positionCaseInsensitive(output, '${value}') > 0))`);
  }
  // Error groups and the agent map are computed from steps inside the range, so their filters use the same range.
  const scope = rangeScope(projectId, filters);
  if (filters.errorGroup) where.push(`runId IN (SELECT runId FROM spans WHERE ${scope} AND ${IS_ERROR} AND ${ERROR_GROUP_ID} = '${sqlString(filters.errorGroup)}')`);
  if (filters.node && !['__start__', '__end__'].includes(filters.node)) where.push(`runId IN (SELECT runId FROM spans WHERE ${scope} AND ${NODE_KEY} = '${sqlString(filters.node)}')`);
  if (filters.edge) where.push(filters.flowRunIds?.length ? `runId IN (${filters.flowRunIds.map((id) => `'${sqlString(id)}'`).join(',')})` : '0');
  const having: string[] = [];
  if (filters.status === "error") having.push("errorCount > 0");
  if (filters.status === "healthy") having.push("errorCount = 0");
  if (filters.minLatencyMs !== undefined) having.push(`durationMs >= ${Number(filters.minLatencyMs)}`);
  if (filters.maxLatencyMs !== undefined) having.push(`durationMs <= ${Number(filters.maxLatencyMs)}`);
  if (filters.minCostUsd !== undefined) having.push(`totalCostUsd >= ${Number(filters.minCostUsd)}`);
  if (filters.maxCostUsd !== undefined) having.push(`totalCostUsd <= ${Number(filters.maxCostUsd)}`);
  if (filters.minTokens !== undefined) having.push(`inputTokens + outputTokens >= ${Number(filters.minTokens)}`);
  if (filters.maxTokens !== undefined) having.push(`inputTokens + outputTokens <= ${Number(filters.maxTokens)}`);
  return { where: where.join(" AND "), having: having.length ? `HAVING ${having.join(" AND ")}` : "" };
}

// Shared by the full trace row and the lighter run-id filter so HAVING clauses mean the same thing in both.
const DURATION_EXPR = `if(countIf(parentSpanId = '') > 0, maxIf(latencyMs, parentSpanId = ''), greatest(dateDiff('millisecond', min(createdAt), max(createdAt)), max(latencyMs)))`;
// A trace whose last span is more than 5 minutes old is finished even without a run_end span, so SDK runs that never send
// one do not show as "running" forever.
const FINISHED_EXPR = `(max(createdAt) < now() - INTERVAL 5 MINUTE OR countIf(spanType = 'run_end') > 0 OR countIf(parentSpanId = '' AND ${IS_ERROR}) > 0 OR argMaxIf(lower(JSONExtractString(metadata, 'status')), createdAt, parentSpanId = '' AND JSONExtractString(metadata, 'status') != '') NOT IN ('', 'running', 'pending', 'queued', 'in_progress', 'started'))`;
const ERROR_COUNT_EXPR = `countIf(${IS_ERROR})`;

/** Run ids of every trace matching the filters, for queries that aggregate steps instead of traces. */
function matchingRunIds(where: string, having: string) {
  return `SELECT runId FROM (SELECT runId, ${DURATION_EXPR} AS durationMs, ${ERROR_COUNT_EXPR} AS errorCount, sum(costUsd) AS totalCostUsd, sum(inputTokens) AS inputTokens, sum(outputTokens) AS outputTokens FROM spans WHERE ${where} GROUP BY runId ${having})`;
}

const TRACE_AGGREGATE = `
  runId,
  argMinIf(traceName, createdAt, traceName != '') AS traceName,
  min(createdAt) AS startedAt,
  max(createdAt) AS lastSeenAt,
  ${DURATION_EXPR} AS durationMs,
  count() AS spanCount,
  ${ERROR_COUNT_EXPR} AS errorCount,
  sum(costUsd) AS totalCostUsd,
  sum(inputTokens) AS inputTokens,
  sum(outputTokens) AS outputTokens,
  argMaxIf(modelId, costUsd, modelId != '') AS modelId,
  anyIf(endUserId, endUserId != '') AS endUserId,
  anyIf(sessionId, sessionId != '') AS sessionId,
  anyIf(environment, environment != '') AS environment,
  anyIf(release, release != '') AS release,
  groupUniqArrayArray(tags) AS tags,
  substring(if(countIf(parentSpanId = '' AND input != '') > 0, argMinIf(input, createdAt, parentSpanId = '' AND input != ''), argMinIf(input, createdAt, input != '')), 1, 280) AS inputPreview,
  substring(if(countIf(parentSpanId = '' AND output != '') > 0, argMaxIf(output, createdAt, parentSpanId = '' AND output != ''), argMaxIf(output, createdAt, output != '' AND spanType NOT IN ('tool', 'retrieval'))), 1, 280) AS outputPreview`;

export async function tinybirdRows<T>(sql: string): Promise<T[]> {
  const res = await analyticsSql(sql);
  if (!res.ok) throw new Error(`Tinybird query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data as T[];
}

/**
 * Per-trace values the list can show as optional columns. They are computed only for the traces on the page
 * and only when a column asks for them, so they cost nothing for the charts, counts and filters.
 */
const EXTRA_COLUMNS: Record<string, { sql: string; numeric?: boolean }> = {
  llmCalls: { sql: `countIf(${STEP_TYPE} = 'llm')`, numeric: true },
  toolCalls: { sql: `countIf(${STEP_TYPE} = 'tool')`, numeric: true },
  slowestStepMs: { sql: `max(latencyMs)`, numeric: true },
  avgStepMs: { sql: `avg(latencyMs)`, numeric: true },
  ttftMs: { sql: `minIf(ttftMs, ttftMs > 0)`, numeric: true },
  retries: { sql: `sum(retryCount)`, numeric: true },
  timeouts: { sql: `countIf(timedOut)`, numeric: true },
  firstErrorType: { sql: `argMinIf(errorType, createdAt, ${IS_ERROR})` },
  firstErrorMessage: { sql: `substring(argMinIf(errorMessage, createdAt, ${IS_ERROR}), 1, 200)` },
  tools: { sql: `arrayStringConcat(arraySlice(arraySort(groupUniqArrayIf(toolName, toolName != '')), 1, 6), ', ')` },
  models: { sql: `arrayStringConcat(arraySlice(arraySort(groupUniqArrayIf(spans.modelId, spans.modelId != '')), 1, 4), ', ')` },
  rootType: { sql: `anyIf(${STEP_TYPE}, parentSpanId = '')` },
};
export const EXTRA_COLUMN_IDS = Object.keys(EXTRA_COLUMNS);
export const MAX_META_COLUMNS = 20;
const META_KEY = /^[\w.\- :/]{1,60}$/;

/** A metadata key that is safe to read; anything else is ignored. */
export function metadataKey(value: string) {
  return META_KEY.test(value) ? value : null;
}

function metadataValueSql(key: string) {
  const value = `substring(replaceRegexpAll(JSONExtractRaw(metadata, '${sqlString(key)}'), '^"|"$', ''), 1, 200)`;
  return `argMinIf(${value}, tuple(createdAt, spanId), JSONExtractRaw(metadata, '${sqlString(key)}') != '')`;
}

export type ListOptions = { extras?: string[]; meta?: string[] };

/** One page of traces (one row per run) plus the total matching count. */
export async function listTraces(projectId: string, filters: TraceListFilters, options: ListOptions = {}) {
  const { where, having } = traceListClauses(projectId, filters);
  const pageSize = Math.min(Math.max(Math.floor(filters.pageSize ?? 50), 10), 200);
  const page = Math.max(Math.floor(filters.page ?? 0), 0);
  const sort = validTraceSort(filters.sort);
  const extra = EXTRA_COLUMNS[sort];
  const meta = sort.startsWith("meta:") ? metadataKey(sort.slice(5)) : null;
  const expression = extra?.sql ?? (meta ? metadataValueSql(meta) : null);
  const sortColumn = expression ? "sortValue" : TRACE_SORT_FIELDS[sort] ?? "startedAt";
  const direction = filters.direction === "asc" ? "ASC" : "DESC";
  const grouped = `SELECT ${TRACE_AGGREGATE}${expression ? `, ${expression} AS sortValue` : ""} FROM spans WHERE ${where} GROUP BY runId ${having}`;
  const [rows, totals] = await Promise.all([
    tinybirdRows<TraceListRow>(`${grouped} ORDER BY ${sortColumn} ${direction}, runId LIMIT ${pageSize} OFFSET ${page * pageSize}`),
    tinybirdRows<{ total: number }>(`SELECT count() AS total FROM (${grouped})`),
  ]);
  return { rows: await withExtraColumns(projectId, filters, rows, options), total: Number(totals[0]?.total ?? 0), page, pageSize };
}

async function withExtraColumns(projectId: string, filters: TraceListFilters, rows: TraceListRow[], options: ListOptions) {
  const extras = (options.extras ?? []).filter((id) => id in EXTRA_COLUMNS);
  const keys = [...new Set((options.meta ?? []).map(metadataKey).filter((key): key is string => key !== null))].slice(0, MAX_META_COLUMNS);
  if (!rows.length || (!extras.length && !keys.length)) return rows;
  const selects = [
    ...extras.map((id) => `${EXTRA_COLUMNS[id]!.sql} AS x_${id}`),
    // The first non-empty value of the key on any step of the trace, unquoted and capped.
    ...keys.map((key, index) => `${metadataValueSql(key)} AS m_${index}`),
  ];
  const runIds = rows.map((row) => `'${sqlString(row.runId)}'`).join(",");
  const found = await tinybirdRows<Record<string, string | number>>(`
    SELECT runId, ${selects.join(", ")} FROM spans
    WHERE ${rangeScope(projectId, filters)} AND runId IN (${runIds}) GROUP BY runId`);
  const byRun = new Map(found.map((row) => [String(row.runId), row]));
  return rows.map((row) => {
    const extra = byRun.get(row.runId);
    if (!extra) return row;
    const merged: Record<string, unknown> = { ...row };
    for (const id of extras) merged[id] = EXTRA_COLUMNS[id]!.numeric ? (Number.isFinite(Number(extra[`x_${id}`])) ? Number(extra[`x_${id}`]) : 0) : String(extra[`x_${id}`] ?? "");
    if (keys.length) merged.meta = Object.fromEntries(keys.map((key, index) => [key, String(extra[`m_${index}`] ?? "")]));
    return merged as TraceListRow;
  });
}

/** Metadata keys seen on traces in the range, most common first, for the list's optional metadata columns. */
export async function traceMetadataKeys(projectId: string, filters: Pick<TraceListFilters, "fromMs" | "toMs">) {
  const rows = await tinybirdRows<{ key: string; traces: number }>(`
    SELECT key, uniqExact(runId) AS traces FROM spans ARRAY JOIN JSONExtractKeys(metadata) AS key
    WHERE ${rangeScope(projectId, filters)} AND metadata != '' AND metadata != '{}'
    GROUP BY key ORDER BY traces DESC, key LIMIT 120`);
  return rows.filter((row) => metadataKey(row.key) !== null).map((row) => ({ key: row.key, traces: Number(row.traces) }));
}

export type HistogramBucket = {
  bucket: string; traces: number; errors: number; costUsd: number; tokens: number;
  /** Duration percentiles of the finished traces in the bucket; null when none finished. */
  p50DurationMs: number | null; p95DurationMs: number | null;
};

/** Per-bucket totals for the list chart and the Chart view; the bucket size follows the selected range. */
export async function traceHistogram(projectId: string, filters: TraceListFilters) {
  const { where, having } = traceListClauses(projectId, filters);
  const spanSeconds = Math.max(60, Math.floor((filters.toMs - filters.fromMs) / 1000));
  // Up to 120 bars: a day is 15 minute bars, a week is 2 hour bars, a month is 6 hour bars.
  const bucketSeconds = [60, 300, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400].find((size) => spanSeconds / size <= 120) ?? 86400;
  const rows = await tinybirdRows<Record<keyof HistogramBucket | "finishedTraces", number | string>>(`
    SELECT toStartOfInterval(startedAt, INTERVAL ${bucketSeconds} SECOND) AS bucket, count() AS traces, countIf(errorCount > 0) AS errors,
      sum(totalCostUsd) AS costUsd, sum(inputTokens + outputTokens) AS tokens, countIf(finished) AS finishedTraces,
      quantileExactIf(0.5)(durationMs, finished) AS p50DurationMs, quantileExactIf(0.95)(durationMs, finished) AS p95DurationMs
    FROM (SELECT ${TRACE_AGGREGATE}, ${FINISHED_EXPR} AS finished FROM spans WHERE ${where} GROUP BY runId ${having})
    GROUP BY bucket ORDER BY bucket`);
  const finite = (value: number | string | undefined) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
  return {
    bucketSeconds,
    buckets: rows.map((row): HistogramBucket => ({
      bucket: String(row.bucket), traces: finite(row.traces), errors: finite(row.errors), costUsd: finite(row.costUsd), tokens: finite(row.tokens),
      p50DurationMs: finite(row.finishedTraces) > 0 ? finite(row.p50DurationMs) : null,
      p95DurationMs: finite(row.finishedTraces) > 0 ? finite(row.p95DurationMs) : null,
    })),
  };
}

export type ActivityDay = { day: string; traces: number; errors: number; costUsd: number };
export const ACTIVITY_DAYS = 371;

/** A time zone name this server can pass to ClickHouse; anything else is read as UTC. */
export function activityTimeZone(value: string | null | undefined) {
  if (!value || value === "UTC") return "UTC";
  try {
    return Intl.supportedValuesOf("timeZone").includes(value) ? value : "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Traces, traces with errors and cost per calendar day (in the reader's time zone) for the last 53 weeks.
 * The filters apply but the page's time range does not, so the grid always shows the longer pattern.
 */
export async function traceActivity(projectId: string, filters: TraceListFilters, timeZone: string, now = Date.now()) {
  const scoped: TraceListFilters = { ...filters, fromMs: now - ACTIVITY_DAYS * 86_400_000, toMs: now };
  const { where, having } = traceListClauses(projectId, scoped);
  const zone = sqlString(activityTimeZone(timeZone));
  const rows = await tinybirdRows<{ day: string; traces: number; errors: number; costUsd: number }>(`
    SELECT toString(toDate(startedAt, '${zone}')) AS day, count() AS traces, countIf(errorCount > 0) AS errors, sum(totalCostUsd) AS costUsd
    FROM (SELECT ${TRACE_AGGREGATE} FROM spans WHERE ${where} GROUP BY runId ${having})
    GROUP BY day ORDER BY day`);
  const finite = (value: number | string) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
  return rows.map((row): ActivityDay => ({ day: String(row.day), traces: finite(row.traces), errors: finite(row.errors), costUsd: finite(row.costUsd) }));
}

export type TraceStats = {
  traces: number; errors: number; p50DurationMs: number; p95DurationMs: number;
  totalCostUsd: number; inputTokens: number; outputTokens: number; runningTraces: number;
};

/** Totals for every trace matching the filters (not just the visible page) for the summary strip. */
export async function traceStats(projectId: string, filters: TraceListFilters): Promise<TraceStats> {
  const { where, having } = traceListClauses(projectId, filters);
  const rows = await tinybirdRows<Record<keyof TraceStats, number | string>>(`
    SELECT count() AS traces, countIf(errorCount > 0) AS errors,
      quantileExactIf(0.5)(durationMs, finished) AS p50DurationMs, quantileExactIf(0.95)(durationMs, finished) AS p95DurationMs, countIf(NOT finished) AS runningTraces,
      sum(totalCostUsd) AS totalCostUsd, sum(inputTokens) AS inputTokens, sum(outputTokens) AS outputTokens
    FROM (SELECT ${TRACE_AGGREGATE}, ${FINISHED_EXPR} AS finished FROM spans WHERE ${where} GROUP BY runId ${having})`);
  const row = rows[0] ?? {};
  const value = (key: keyof TraceStats) => {
    const parsed = Number(row[key] ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    traces: value("traces"), runningTraces: value("runningTraces"), errors: value("errors"), p50DurationMs: value("p50DurationMs"), p95DurationMs: value("p95DurationMs"),
    totalCostUsd: value("totalCostUsd"), inputTokens: value("inputTokens"), outputTokens: value("outputTokens"),
  };
}

export type ErrorGroup = {
  id: string; tool: string; errorType: string; message: string; sample: string;
  count: number; traces: number; firstSeen: string; lastSeen: string;
};

/** The 20 most frequent error groups among the steps of every trace matching the filters. */
export async function traceErrorGroups(projectId: string, filters: TraceListFilters) {
  const { where, having } = traceListClauses(projectId, filters);
  const rows = await tinybirdRows<ErrorGroup & { totalGroups: number }>(`
    SELECT ${ERROR_GROUP_ID} AS id, ${ERROR_TOOL} AS tool, errorType, ${ERROR_MESSAGE_KEY} AS message,
      substring(any(errorMessage), 1, 300) AS sample, count() AS count, uniqExact(runId) AS traces,
      min(createdAt) AS firstSeen, max(createdAt) AS lastSeen, count() OVER () AS totalGroups
    FROM spans
    WHERE ${where} AND ${IS_ERROR} AND runId IN (${matchingRunIds(where, having)})
    GROUP BY id, tool, errorType, message
    ORDER BY count DESC, traces DESC, id
    LIMIT 20`);
  return {
    total: Number(rows[0]?.totalGroups ?? 0),
    groups: rows.map((row): ErrorGroup => ({
      id: row.id, tool: row.tool, errorType: row.errorType, message: row.message, sample: row.sample,
      count: Number(row.count), traces: Number(row.traces), firstSeen: row.firstSeen, lastSeen: row.lastSeen,
    })),
  };
}

export type MapNode = { id: string; kind: string; name: string; count: number; traces: number; errors: number; p50LatencyMs: number };
export type MapEdge = { source: string; target: string; count: number; back?: number; errors: number; traces: number; errorRate: number; p50LatencyMs: number };
export const MAP_NODE_LIMIT = 40;
export const MAP_EDGE_LIMIT = 100;
type FlowRow = { runId: string; steps: Array<[string, string, string, string, number, number, number, number]> };

/** Stream one run at a time: no raw span payloads or whole-range arrays are held in the server. */
async function* flowRuns(projectId: string, filters: TraceListFilters) {
  const { where, having } = traceListClauses(projectId, filters);
  const sql = `SELECT runId, groupArray(tuple(spanId, parentSpanId, spanType, ${STEP_NAME}, latencyMs, costUsd, toUnixTimestamp(createdAt) * 1000, toUInt8(${IS_ERROR}))) AS steps
    FROM spans WHERE ${where} AND runId IN (${matchingRunIds(where, having)}) GROUP BY runId ORDER BY min(createdAt), runId`;
  const convert = (row: FlowRow) => ({ runId: row.runId, steps: row.steps.map(([id, parentSpanId, type, name, latencyMs, costUsd, startedAt, failed]): FlowStep => ({ id, parentSpanId, type, name, latencyMs: Number(latencyMs), costUsd: Number(costUsd), startedAt: Number(startedAt), failed: Boolean(failed) })) });
  if (!CLICKHOUSE_URL) {
    for (const row of await tinybirdRows<FlowRow>(sql)) yield convert(row);
    return;
  }
  const response = await analyticsSql(sql, { format: "JSONEachRow" });
  if (!response.ok || !response.body) throw new Error(`Flow query failed (${response.status})`);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      let newline: number;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
        if (line.trim()) yield convert(JSON.parse(line) as FlowRow);
      }
      if (done) break;
    }
    if (pending.trim()) yield convert(JSON.parse(pending) as FlowRow);
  } finally { await reader.cancel(); }
}

/** Resolve an arrow to traces with the shared caller/return rules before list, facets and stats run. */
export async function resolveTraceFlowFilters(projectId: string, filters: TraceListFilters): Promise<TraceListFilters> {
  if (!filters.edge) return filters;
  const ids: string[] = [], wanted = flowPairId(filters.edge.from, filters.edge.to);
  for await (const run of flowRuns(projectId, { fromMs: filters.fromMs, toMs: filters.toMs })) {
    if (flowGraph(run.steps, false).edges.some((edge) => flowPairId(edge.source, edge.target) === wanted)) ids.push(run.runId);
  }
  return { ...filters, flowRunIds: ids };
}

/** Every matching run contributes to one agent's Flow; node statistics stay exact in ClickHouse. */
export async function traceAgentMap(projectId: string, filters: TraceListFilters) {
  const { where, having } = traceListClauses(projectId, filters);
  const scope = `${where} AND runId IN (${matchingRunIds(where, having)})`;
  const rows = await tinybirdRows<MapNode & { totalNodes: number }>(`SELECT ${NODE_KEY} AS id, count() AS count, uniqExact(runId) AS traces, countIf(${IS_ERROR}) AS errors,
    quantileExact(0.5)(latencyMs) AS p50LatencyMs, count() OVER () AS totalNodes FROM spans WHERE ${scope}
    GROUP BY id ORDER BY count DESC, id LIMIT ${MAP_NODE_LIMIT - 2}`);
  if (!rows.length) return { nodes: [] as MapNode[], edges: [] as MapEdge[], totalNodes: 0, totalEdges: 0 };
  const stats = new Map(rows.map((row) => [row.id, row]));
  const order = new Map<string, MapNode>();
  const edges = new Map<string, FlowEdge>(), pairs = new Map<string, number>();
  let traces = 0;
  const marker = (id: string): MapNode => ({ id, kind: id, name: id === "__start__" ? "start" : "end", count: 0, traces: 0, errors: 0, p50LatencyMs: 0 });
  order.set("__start__", marker("__start__"));
  for await (const run of flowRuns(projectId, filters)) {
    traces++;
    const flow = flowGraph(run.steps, false);
    for (const item of flow.items) {
      const row = stats.get(item.key);
      if (row && !order.has(item.key)) order.set(item.key, { id: item.key, kind: item.type, name: item.name, count: Number(row.count), traces: Number(row.traces), errors: Number(row.errors), p50LatencyMs: Number(row.p50LatencyMs) });
    }
    const seen = new Set<string>();
    for (const edge of flow.edges) {
      if (![edge.source, edge.target].every((id) => stats.has(id) || id === "__start__" || id === "__end__")) continue;
      const current = edges.get(edge.id) ?? { ...edge, count: 0, errors: 0, traces: 0, latencies: [] };
      current.count += edge.count; current.errors += edge.errors; current.traces++; current.latencies.push(...edge.latencies); edges.set(edge.id, current);
      seen.add(flowPairId(edge.source, edge.target));
    }
    for (const pair of seen) pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  order.set("__end__", marker("__end__"));
  for (const key of ["__start__", "__end__"]) Object.assign(order.get(key)!, { count: traces, traces });
  const nodes = [...order.values()];
  const collapsed = collapseFlowReturns(nodes.map((node) => ({ key: node.id })), [...edges.values()], pairs);
  const mapped: MapEdge[] = collapsed.sort((a, b) => b.count + (b.back ?? 0) - a.count - (a.back ?? 0)).slice(0, MAP_EDGE_LIMIT).map((edge) => ({ source: edge.source, target: edge.target, count: edge.count, back: edge.back, errors: edge.errors, traces: edge.traces, errorRate: edge.errors / Math.max(1, edge.count + (edge.back ?? 0)), p50LatencyMs: median(edge.latencies) }));
  return { nodes, edges: mapped, totalNodes: Number(rows[0]?.totalNodes ?? 0) + 2, totalEdges: collapsed.length };
}

export type FacetCounts = Partial<Record<FacetKey, Array<{ value: string; traces: number }>>>;

/**
 * For every filter field, its values with the number of matching traces. Each field is counted with all the
 * other filters applied but not its own, so ticking more values of one field shows what they would add.
 */
export async function traceFacets(projectId: string, filters: TraceListFilters): Promise<FacetCounts> {
  const parts = FACET_KEYS.map((key) => {
    const others: TraceListFilters = { ...filters, facets: { ...filters.facets, [key]: undefined } };
    const { where, having } = traceListClauses(projectId, others);
    const value = key === "tag" ? "arrayJoin(tags)" : key;
    return `SELECT '${key}' AS field, value, traces FROM (
      SELECT value, uniqExact(runId) AS traces FROM (SELECT runId, ${value} AS value FROM spans WHERE ${where} AND runId IN (${matchingRunIds(where, having)}))
      WHERE value != '' GROUP BY value ORDER BY traces DESC, value LIMIT 100)`;
  });
  const rows = await tinybirdRows<{ field: FacetKey; value: string; traces: number | string }>(parts.join("\nUNION ALL\n"));
  const out: FacetCounts = {};
  for (const row of rows) (out[row.field] ??= []).push({ value: row.value, traces: Number(row.traces) });
  for (const list of Object.values(out)) list?.sort((a, b) => b.traces - a.traces || a.value.localeCompare(b.value));
  return out;
}

/** Distinct values per filterable field for the filter sidebar. */
export async function traceFilterOptions(projectId: string, fromMs: number, toMs: number) {
  const scope = `projectId = '${sqlString(projectId)}' AND createdAt >= toDateTime(${Math.floor(fromMs / 1000)}) AND createdAt <= toDateTime(${Math.ceil(toMs / 1000)})`;
  const rows = await tinybirdRows<Record<string, string[]>>(`
    SELECT
      arraySlice(groupUniqArrayIf(traceName, traceName != ''), 1, 200) AS traceName,
      arraySlice(groupUniqArrayIf(spans.modelId, spans.modelId != ''), 1, 200) AS modelId,
      arraySlice(groupUniqArrayIf(environment, environment != ''), 1, 50) AS environment,
      arraySlice(groupUniqArrayIf(release, release != ''), 1, 100) AS release,
      arraySlice(groupUniqArrayIf(endUserId, endUserId != ''), 1, 200) AS endUserId,
      arraySlice(groupUniqArrayIf(sessionId, sessionId != ''), 1, 200) AS sessionId,
      arraySlice(groupUniqArrayArray(tags), 1, 200) AS tag
    FROM spans WHERE ${scope}`);
  const first = rows[0] ?? {};
  return Object.fromEntries(Object.entries(first).map(([key, values]) => [key, [...(values ?? [])].sort()])) as Record<string, string[]>;
}

/**
 * Get orchestration savings summary for a project.
 * Returns calls retried, calls fell back, calls blocked, and estimated cost savings.
 */
export async function getOrchestrationSavings(projectId: string, days = 30) {
  const sql = `
    SELECT
      countIf(
        JSONExtractBool(metadata, 'orchestrationWillRetry') = 1
      ) AS callsRetried,
      countIf(
        JSONExtractBool(metadata, 'orchestrationIsFallback') = 1
          AND JSONExtractBool(metadata, 'orchestrationFinal') = 1
      ) AS callsFellBack,
      countIf(
        JSONExtractBool(metadata, 'orchestrationBlocked') = 1
      ) AS callsBlocked,
      sumIf(
        costUsd,
        JSONExtractBool(metadata, 'orchestrationIsFallback') = 1
          AND JSONExtractBool(metadata, 'orchestrationFinal') = 1
      ) AS fallbackCostUsd,
      sumIf(
        costUsd,
        JSONExtractBool(metadata, 'orchestrationIsFallback') = 0
          AND spanType = 'llm_call'
      ) AS primaryCostUsd
    FROM spans
    WHERE projectId = '${projectId}'
      AND createdAt >= now() - INTERVAL ${days} DAY
      AND JSONHas(metadata, 'orchestrationAttempt')
  `;
  const res = await analyticsSql(sql);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tinybird query failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  const row = data.data?.[0] ?? {
    callsRetried: 0,
    callsFellBack: 0,
    callsBlocked: 0,
    fallbackCostUsd: 0,
    primaryCostUsd: 0,
  };

  return {
    callsRetried: Number(row.callsRetried) || 0,
    callsFellBack: Number(row.callsFellBack) || 0,
    callsBlocked: Number(row.callsBlocked) || 0,
    fallbackCostUsd: Number(row.fallbackCostUsd) || 0,
    primaryCostUsd: Number(row.primaryCostUsd) || 0,
    totalOrchestratedCalls:
      (Number(row.callsRetried) || 0) +
      (Number(row.callsFellBack) || 0) +
      (Number(row.callsBlocked) || 0),
  };
}

/**
 * Get fail-open rate for a project over the last N days.
 * Returns total orchestrations, fail-open count, and rate.
 */
export async function getFailOpenRate(projectId: string, days = 7) {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 365);
  const res = CLICKHOUSE_URL
    ? await analyticsSql(`SELECT projectId, countIf(JSONExtractBool(metadata, 'orchestrationFailOpen') = 1) AS failOpenCount, count() AS totalOrchestrations
        FROM spans WHERE projectId = '${sqlString(projectId)}' AND createdAt >= now() - INTERVAL ${safeDays} DAY
          AND metadata != '' AND JSONHas(metadata, 'orchestrationFailOpen') GROUP BY projectId`)
    : await fetch(`${TINYBIRD_HOST}/v0/pipes/fail_open_rate.json?${new URLSearchParams({ projectId, days: String(safeDays), token: TINYBIRD_TOKEN ?? "" })}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tinybird query failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  const row = data.data?.[0] ?? {
    totalOrchestrations: 0,
    failOpenCount: 0,
  };

  const total = Number(row.totalOrchestrations) || 0;
  const failOpen = Number(row.failOpenCount) || 0;

  return {
    totalOrchestrations: total,
    failOpenCount: failOpen,
    failOpenRate: total > 0 ? failOpen / total : 0,
    elevated: total >= 10 && failOpen / total > 0.05,
  };
}

export interface SpanRow {
  spanId: string;
  runId: string;
  projectId: string;
  spanType: string;
  input: string;
  output: string;
  attachments: string;
  latencyMs: number;
  costUsd: number;
  modelId: string;
  toolName: string;
  parentSpanId: string;
  metadata: Record<string, unknown>;
  sessionId: string;
  endUserId: string;
  environment: string;
  release: string;
  tags: string[];
  traceName: string;
  inputTokens: number;
  outputTokens: number;
  ttftMs: number;
  retryCount: number;
  errorType: string;
  errorMessage: string;
  isStreamChunk: boolean;
  streamSequence: number;
  streamFinal: boolean;
  payloadFormat: string;
  stackTrace: string;
  timedOut: boolean;
  timeoutMs: number;
  createdAt: string;
}

export type ComparisonGroup = {
  key: string; runs: number; failedRuns: number; avgCostUsd: number; p50DurationMs: number; p95DurationMs: number; avgSteps: number;
};
export const COMPARISON_DIMENSIONS = { model: `argMaxIf(modelId, costUsd, modelId != '')`, release: `anyIf(release, release != '')` } as const;
export type ComparisonDimension = keyof typeof COMPARISON_DIMENSIONS;

/** Runs grouped by their main model or release: how many, how often they fail, what they cost and how long they take. */
export async function traceGroupComparison(projectId: string, filters: TraceListFilters, by: ComparisonDimension) {
  const { where, having } = traceListClauses(projectId, filters);
  const rows = await tinybirdRows<Record<keyof ComparisonGroup | "totalGroups", number | string>>(`
    SELECT key, count() AS runs, countIf(errorCount > 0) AS failedRuns, avg(totalCostUsd) AS avgCostUsd,
      quantileExact(0.5)(durationMs) AS p50DurationMs, quantileExact(0.95)(durationMs) AS p95DurationMs, avg(spanCount) AS avgSteps, count() OVER () AS totalGroups
    FROM (SELECT runId, ${COMPARISON_DIMENSIONS[by]} AS key, ${DURATION_EXPR} AS durationMs, ${ERROR_COUNT_EXPR} AS errorCount, sum(costUsd) AS totalCostUsd, count() AS spanCount
      FROM spans WHERE ${where} GROUP BY runId ${having})
    WHERE key != ''
    GROUP BY key ORDER BY runs DESC, key LIMIT 12`);
  return rows.map((row): ComparisonGroup => ({
    key: String(row.key), runs: Number(row.runs), failedRuns: Number(row.failedRuns), avgCostUsd: Number(row.avgCostUsd),
    p50DurationMs: Number(row.p50DurationMs), p95DurationMs: Number(row.p95DurationMs), avgSteps: Number(row.avgSteps),
  }));
}

export type StepListRow = {
  spanId: string; runId: string; name: string; type: string; traceName: string; modelId: string; createdAt: string;
  latencyMs: number; costUsd: number; inputTokens: number; outputTokens: number; errorType: string; errorMessage: string;
  calls: number; errors: number; p50LatencyMs: number; p95LatencyMs: number;
};
const STEP_SORT: Record<string, string> = { startedAt: "createdAt", name: "name", type: "type", trace: "traceName", model: "modelId", latency: "latencyMs", cost: "costUsd", tokens: "inputTokens + outputTokens", errors: "errors", calls: "calls", p95: "p95LatencyMs" };
export function validStepSort(value?: string | null) { return value && Object.hasOwn(STEP_SORT, value) ? value : "startedAt"; }
function stepsWhere(projectId: string, filters: TraceListFilters, excluding?: FacetKey) {
  // Step filters apply to actual steps, not all siblings of a matching trace.
  const { where } = traceListClauses(projectId, { ...filters, facets: {}, query: undefined, status: "all", minTokens: undefined, maxTokens: undefined, minLatencyMs: undefined, maxLatencyMs: undefined, minCostUsd: undefined, maxCostUsd: undefined });
  const clauses = [where];
  for (const key of FACET_KEYS) {const values=filters.facets?.[key];if(key!==excluding && values?.length)clauses.push(facetCondition(key,values));}
  if(filters.query) {const q=sqlString(filters.query);clauses.push(`(${["spanId","runId","traceName","toolName","modelId","input","output","errorMessage"].map(column=>`positionCaseInsensitive(${column}, '${q}') > 0`).join(" OR ")})`);}
  if(filters.status==="error")clauses.push(IS_ERROR);
  if(filters.status==="healthy")clauses.push(`NOT ${IS_ERROR}`);
  if(filters.minLatencyMs!==undefined)clauses.push(`latencyMs >= ${Number(filters.minLatencyMs)}`);
  if(filters.maxLatencyMs!==undefined)clauses.push(`latencyMs <= ${Number(filters.maxLatencyMs)}`);
  if(filters.minCostUsd!==undefined)clauses.push(`costUsd >= ${Number(filters.minCostUsd)}`);
  if(filters.maxCostUsd!==undefined)clauses.push(`costUsd <= ${Number(filters.maxCostUsd)}`);
  if(filters.minTokens!==undefined)clauses.push(`inputTokens + outputTokens >= ${Number(filters.minTokens)}`);
  if(filters.maxTokens!==undefined)clauses.push(`inputTokens + outputTokens <= ${Number(filters.maxTokens)}`);
  return clauses.join(" AND ");
}
export async function traceSteps(projectId: string, filters: TraceListFilters, grouped = false, withFacets = false) {
  const where=stepsWhere(projectId,filters), page=Math.max(0,Math.floor(filters.page??0)), pageSize=Math.min(200,Math.max(10,Math.floor(filters.pageSize??50)));
  const sort=validStepSort(filters.sort), dir=filters.direction==="asc"?"ASC":"DESC";
  const qualify = (sql: string) => sql.replace(/\b(spanType|errorType|toolName|modelId|traceName)\b/g, "source.$1");
  const query=grouped ? `SELECT ${qualify(STEP_TYPE)} AS type, ${qualify(STEP_NAME)} AS name, argMin(source.spanId, tuple(source.createdAt,source.spanId)) AS spanId, argMin(source.runId, tuple(source.createdAt,source.spanId)) AS runId,
    any(source.traceName) AS traceName, any(source.modelId) AS modelId, min(source.createdAt) AS createdAt, count() AS calls, countIf(${qualify(IS_ERROR)}) AS errors, quantileExact(0.5)(source.latencyMs) AS latencyMs,
    latencyMs AS p50LatencyMs, quantileExact(0.95)(source.latencyMs) AS p95LatencyMs, sum(source.costUsd) AS costUsd, sum(source.inputTokens) AS inputTokens, sum(source.outputTokens) AS outputTokens, '' AS errorType, '' AS errorMessage
    FROM (SELECT * FROM spans WHERE ${where}) AS source GROUP BY type,name` : `SELECT spanId,runId,${STEP_TYPE} AS type,${STEP_NAME} AS name,traceName,modelId,createdAt,latencyMs,costUsd,inputTokens,outputTokens,errorType,substring(errorMessage,1,280) AS errorMessage,1 AS calls,toUInt8(${IS_ERROR}) AS errors,latencyMs AS p50LatencyMs,latencyMs AS p95LatencyMs FROM spans WHERE ${where}`;
  const facetKeys: FacetKey[]=["traceName","spanType","toolName","modelId","environment","errorType"];
  const [rows,totals,stats,facets]=await Promise.all([
    tinybirdRows<StepListRow>(`SELECT * FROM (${query}) ORDER BY ${STEP_SORT[sort]} ${dir}, runId, spanId LIMIT ${pageSize} OFFSET ${page*pageSize}`),
    tinybirdRows<{total:number}>(`SELECT count() AS total FROM (${query})`),
    tinybirdRows<{steps:number; errors:number; totalCostUsd:number; p50LatencyMs:number; tokens:number}>(`SELECT count() AS steps,countIf(${IS_ERROR}) AS errors,sum(costUsd) AS totalCostUsd,quantileExact(0.5)(latencyMs) AS p50LatencyMs,sum(inputTokens+outputTokens) AS tokens FROM spans WHERE ${where}`),
    withFacets ? tinybirdRows<{field:FacetKey;value:string;steps:number}>(facetKeys.map(key=>`SELECT '${key}' AS field, ${key} AS value, count() AS steps FROM spans WHERE ${stepsWhere(projectId,filters,key)} AND ${key} != '' GROUP BY value ORDER BY steps DESC,value LIMIT 100`).join(" UNION ALL ")) : Promise.resolve(null),
  ]);
  return {rows:rows.map(row=>({...row,...Object.fromEntries(["latencyMs","costUsd","inputTokens","outputTokens","calls","errors","p50LatencyMs","p95LatencyMs"].map(key=>[key,Number(row[key as keyof StepListRow]??0)]))})),total:Number(totals[0]?.total??0),stats:Object.fromEntries(Object.entries(stats[0]??{}).map(([k,v])=>[k,Number(v)])),facets,page,pageSize,grouped};
}

/** One page of raw rows for a project data export, oldest first. */
export async function exportAnalyticsPage(table: "spans" | "evaluation_scores", projectId: string, offset: number, limit = 2000) {
  const order = table === "spans" ? "createdAt, spanId" : "createdAt, scoreId";
  const res = await analyticsSql(`SELECT * FROM ${table} WHERE projectId = '${sqlString(projectId)}' ORDER BY ${order} LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`);
  if (!res.ok) throw new Error(`Analytics export failed: ${res.status}`);
  return ((await res.json()).data ?? []) as Record<string, unknown>[];
}

/** Permanently removes every analytics row that belongs to a project. */
export async function deleteProjectAnalytics(projectId: string) {
  const condition = `projectId = '${sqlString(projectId)}'`;
  for (const table of ["spans", "evaluation_scores"] as const) {
    const res = CLICKHOUSE_URL
      ? await fetch(`${CLICKHOUSE_URL}/?${new URLSearchParams({ database: CLICKHOUSE_DATABASE })}`, {
          method: "POST", headers: clickhouseHeaders(), body: `ALTER TABLE ${table} DELETE WHERE ${condition}`, cache: "no-store",
        })
      : await fetch(`${TINYBIRD_HOST}/v0/datasources/${table}/delete`, {
          method: "POST",
          headers: { ...getHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ delete_condition: condition }),
          cache: "no-store",
        });
    if (!res.ok) throw new Error(`Could not delete ${table}: ${res.status}`);
  }
}

/** Removes analytics rows older than `days` days for the given projects (one delete per table, however many projects). */
export async function purgeExpiredAnalytics(projectIds: string[], days: number) {
  if (!projectIds.length) return;
  if (!Number.isInteger(days) || days < 1) throw new Error("Retention days must be a positive integer");
  const ids = projectIds.map((id) => `'${sqlString(id)}'`).join(",");
  for (const table of ["spans", "evaluation_scores"] as const) {
    const condition = `projectId IN (${ids}) AND createdAt < now() - INTERVAL ${days} DAY`;
    const res = CLICKHOUSE_URL
      ? await fetch(`${CLICKHOUSE_URL}/?${new URLSearchParams({ database: CLICKHOUSE_DATABASE })}`, {
          method: "POST", headers: clickhouseHeaders(), body: `ALTER TABLE ${table} DELETE WHERE ${condition}`, cache: "no-store",
        })
      : await fetch(`${TINYBIRD_HOST}/v0/datasources/${table}/delete`, {
          method: "POST",
          headers: { ...getHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ delete_condition: condition }),
          cache: "no-store",
        });
    if (!res.ok) throw new Error(`Could not purge ${table}: ${res.status}`);
  }
}

export const COST_DIMENSIONS = { model: "modelId", tool: "toolName", user: "endUserId", agent: "traceName", release: "release", environment: "environment" } as const;
export type CostDimension = keyof typeof COST_DIMENSIONS;
export type CostGroup = { key: string; calls: number; traces: number; costUsd: number; inputTokens: number; outputTokens: number; avgLatencyMs: number };

/**
 * Spend for every trace matching the filters: totals, the previous period of the same length, cost per bucket by model,
 * a ranked list per dimension and the most expensive traces. All of it comes from stored steps; nothing is estimated.
 */
export async function costBreakdown(projectId: string, filters: TraceListFilters) {
  const num = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
  const scopeFor = (range: TraceListFilters) => {
    const { where, having } = traceListClauses(projectId, range);
    return having ? `${where} AND runId IN (${matchingRunIds(where, having)})` : where;
  };
  const scope = scopeFor(filters);
  const length = filters.toMs - filters.fromMs;
  const before = scopeFor({ ...filters, fromMs: filters.fromMs - length, toMs: filters.fromMs - 1000 });
  const spanSeconds = Math.max(60, Math.floor(length / 1000));
  const bucketSeconds = [3600, 7200, 10800, 21600, 43200, 86400].find((size) => spanSeconds / size <= 120) ?? 86400;
  const dimensions = Object.entries(COST_DIMENSIONS) as Array<[CostDimension, string]>;

  const [totals, perTrace, previous, series, groups, top] = await Promise.all([
    tinybirdRows<Record<string, number>>(`SELECT sum(costUsd) AS totalCost, sum(inputTokens) AS totalInput, sum(outputTokens) AS totalOutput, uniqExact(runId) AS traces, count() AS steps,
      countIf(modelId != '') AS modelCalls, countIf(modelId != '' AND costUsd = 0 AND inputTokens + outputTokens > 0) AS unpricedCalls FROM spans WHERE ${scope}`),
    tinybirdRows<Record<string, number>>(`SELECT quantileExact(0.5)(cost) AS p50, quantileExact(0.95)(cost) AS p95, max(cost) AS maxCost FROM (SELECT runId, sum(costUsd) AS cost FROM spans WHERE ${scope} GROUP BY runId)`),
    tinybirdRows<Record<string, number>>(`SELECT sum(costUsd) AS totalCost, uniqExact(runId) AS traces FROM spans WHERE ${before}`),
    tinybirdRows<{ bucket: string; model: string; costUsd: number }>(`SELECT toStartOfInterval(createdAt, INTERVAL ${bucketSeconds} SECOND) AS bucket, modelId AS model, sum(costUsd) AS costUsd
      FROM spans WHERE ${scope} GROUP BY bucket, model HAVING costUsd > 0 ORDER BY bucket LIMIT 5000`),
    tinybirdRows<CostGroup & { field: CostDimension }>(dimensions.map(([field, column]) => `SELECT '${field}' AS field, key, calls, traces, costUsd, inputTokens, outputTokens, avgLatencyMs FROM (
      SELECT ${column} AS key, count() AS calls, uniqExact(runId) AS traces, sum(costUsd) AS costUsd, sum(inputTokens) AS inputTokens, sum(outputTokens) AS outputTokens, avg(latencyMs) AS avgLatencyMs
      FROM spans WHERE ${scope} AND ${column} != '' GROUP BY key ORDER BY costUsd DESC, calls DESC, key LIMIT 25)`).join(" UNION ALL ")),
    listTraces(projectId, { ...filters, sort: "cost", direction: "desc", page: 0, pageSize: 10 }),
  ]);

  const total = totals[0] ?? {};
  const ranked = Object.fromEntries(dimensions.map(([field]) => [field, [] as CostGroup[]])) as Record<CostDimension, CostGroup[]>;
  for (const row of groups) {
    ranked[row.field]?.push({ key: String(row.key), calls: num(row.calls), traces: num(row.traces), costUsd: num(row.costUsd), inputTokens: num(row.inputTokens), outputTokens: num(row.outputTokens), avgLatencyMs: num(row.avgLatencyMs) });
  }
  return {
    range: { from: filters.fromMs, to: filters.toMs },
    totals: {
      costUsd: num(total.totalCost), inputTokens: num(total.totalInput), outputTokens: num(total.totalOutput), traces: num(total.traces), steps: num(total.steps),
      modelCalls: num(total.modelCalls), unpricedCalls: num(total.unpricedCalls),
      p50TraceCostUsd: num(perTrace[0]?.p50), p95TraceCostUsd: num(perTrace[0]?.p95), maxTraceCostUsd: num(perTrace[0]?.maxCost),
    },
    previous: { costUsd: num(previous[0]?.totalCost), traces: num(previous[0]?.traces) },
    bucketSeconds,
    series: series.map((row) => ({ bucket: String(row.bucket), model: String(row.model), costUsd: num(row.costUsd) })),
    groups: ranked,
    topTraces: top.rows.map((row) => ({
      runId: row.runId, traceName: row.traceName, startedAt: row.startedAt, costUsd: num(row.totalCostUsd), inputTokens: num(row.inputTokens), outputTokens: num(row.outputTokens),
      durationMs: num(row.durationMs), modelId: row.modelId, errored: num(row.errorCount) > 0,
    })),
  };
}
export type CostBreakdown = Awaited<ReturnType<typeof costBreakdown>>;
