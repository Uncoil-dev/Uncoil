import { validTraceSort } from "./trace-sort";
import { isTopicId } from "@/lib/trace-topics";
import { EXCLUDE_PREFIX } from "@/lib/trace-search";
import { FACET_KEYS, type TraceListFilters } from "@/lib/tinybird";

const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

function optionalNumber(value: string | null) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function text(value: string | null) {
  return value ? value.slice(0, 200) : undefined;
}

/** Agent-map step key: "tool:<name>" or "model:<id>". */
function stepKey(value: string | undefined) {
  return value && (value === "__start__" || value === "__end__" || /^[a-z][a-z0-9_]*:./.test(value)) ? value : undefined;
}

/** Agent-map arrow "from→to"; both ends are step keys. */
export const EDGE_SEPARATOR = "\u2192";
function edge(value: string | null) {
  const [from, to, extra] = (value ?? "").slice(0, 401).split(EDGE_SEPARATOR);
  const source = stepKey(from?.slice(0, 200));
  const target = stepKey(to?.slice(0, 200));
  return source && target && extra === undefined ? { from: source, to: target } : undefined;
}

/** Checkbox filters travel as comma-separated, individually URI-encoded values: `modelId=a,b%2Cc`. */
export function facetValues(raw: string | null) {
  if (!raw) return undefined;
  const values = raw.split(",").map((part) => { try { return decodeURIComponent(part).slice(0, 200); } catch { return ""; } }).filter(Boolean);
  return values.length ? [...new Set(values)].slice(0, 50) : undefined;
}

export function parseTraceFilters(searchParams: URLSearchParams, now = Date.now()): TraceListFilters {
  const toMs = Math.min(optionalNumber(searchParams.get("to")) ?? now, now);
  const fromMs = Math.max(optionalNumber(searchParams.get("from")) ?? toMs - 24 * 60 * 60 * 1000, toMs - MAX_RANGE_MS);
  const status = searchParams.get("status");
  const sort = searchParams.get("sort");
  return {
    fromMs: Math.min(fromMs, toMs - 60_000),
    toMs,
    query: text(searchParams.get("q")),
    status: status === "error" || status === "healthy" ? status : "all",
    facets: Object.fromEntries(FACET_KEYS.map((key) => [key, facetValues(searchParams.get(key))]).filter(([, values]) => values)),
    excludeFacets: Object.fromEntries(FACET_KEYS.map((key) => [key, facetValues(searchParams.get(`${EXCLUDE_PREFIX}${key}`))]).filter(([, values]) => values)),
    minLatencyMs: optionalNumber(searchParams.get("minLatencyMs")),
    maxLatencyMs: optionalNumber(searchParams.get("maxLatencyMs")),
    minCostUsd: optionalNumber(searchParams.get("minCostUsd")),
    maxCostUsd: optionalNumber(searchParams.get("maxCostUsd")),
    minTokens: optionalNumber(searchParams.get("minTokens")),
    maxTokens: optionalNumber(searchParams.get("maxTokens")),
    errorGroup: /^[0-9a-f]{16}$/.test(searchParams.get("errorGroup") ?? "") ? searchParams.get("errorGroup")! : undefined,
    topic: isTopicId(searchParams.get("topic") ?? "") ? searchParams.get("topic")! : undefined,
    node: stepKey(text(searchParams.get("node"))),
    edge: edge(searchParams.get("edge")),
    sort: validTraceSort(sort),
    direction: searchParams.get("dir") === "asc" ? "asc" : "desc",
    page: optionalNumber(searchParams.get("page")),
    pageSize: optionalNumber(searchParams.get("pageSize")),
  };
}
