"use client";
import { SavedViews } from "./saved-views";
import { DEMO_BASE_PATH, DEMO_PROJECT_ID } from "@/lib/demo/demo-config";
import { columnsFromUrl } from "@/lib/saved-view-state";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stepLabel } from "./agent-map";
import { traceCsv } from "@/lib/trace-csv";
import { EXCLUDE_PREFIX, parseSearch } from "@/lib/trace-search";
import { SearchBox } from "./search-box";
import { FeedbackCell, useFeedback, type FeedbackState } from "./feedback";
import { RANGES, TimeRangePicker } from "./time-range-picker";
import { ColumnsMenu, DEFAULT_COLUMNS, columnLabel, extraCell, extraIdsFor, isKnownColumn, metaKeysFor, orderColumns, type TraceRowExtras } from "./trace-columns";
import { FirstTraceEmpty } from "../first-trace-empty";
import { TraceCharts, TracesOverTime, type ChartBucket } from "./trace-charts";
import { ErrorGroupsPanel, errorGroupLabel, type ErrorGroups } from "./error-groups";
import { FACETS, FacetGroup, decodeValues, encodeValues, type FacetCounts } from "./facet-filter";
import { TRACE_VIEWS, TracePanel, type TraceView } from "./trace-panel";
import { compactNumber, downloadFile, formatCost, formatDuration, formatTime, parseTime, previewText, relativeTime } from "./format";

type TraceRow = TraceRowExtras & {
  runId: string; traceName: string; startedAt: string; durationMs: number; spanCount: number; errorCount: number;
  totalCostUsd: number; inputTokens: number; outputTokens: number; modelId: string; endUserId: string;
  sessionId: string; environment: string; release: string; tags: string[]; inputPreview: string; outputPreview: string;
};
type Stats = { traces: number; errors: number; p50DurationMs: number; p95DurationMs: number; totalCostUsd: number; inputTokens: number; outputTokens: number; runningTraces: number };
type ListResponse = {
  rows: TraceRow[]; total: number; page: number; pageSize: number;
  histogram: { bucketSeconds: number; buckets: ChartBucket[] }; stats?: Stats; facets?: FacetCounts | null;
  errorGroups?: ErrorGroups | null; range: { from: number; to: number }; error?: string;
};

export type TraceQuery = Record<string, string>;

const COLUMN_STORAGE = "uncoil.tracing.columns";
const ERRORS_STORAGE = "uncoil.tracing.errorGroups";
/** URL keys that change the view, not the data, so they are not sent to the API. */
const VIEW_KEYS = ["range", "from", "to", "trace", "mode", "view", "columns", "savedView"];
const EDGE_SEPARATOR = "\u2192";

function currentUrlQuery(): TraceQuery {
  if (typeof window === "undefined") return {};
  const query: TraceQuery = {};
  for (const [key, value] of new URLSearchParams(window.location.search)) if (value) query[key] = value.slice(0, key === "q" || key === "sort" ? 200 : 4096);
  return query;
}

// A shared run link (/tracing/<runId>) has no query string; its run id arrives from the server as initialQuery.trace.
function withPathTrace(url: TraceQuery, initial: TraceQuery): TraceQuery {
  if (url.trace || !initial.trace || !/\/tracing\/[^/]+\/?$/.test(window.location.pathname)) return url;
  return { ...url, trace: initial.trace, ...(url.range ? {} : { range: initial.range ?? "90d" }) };
}

function readColumns(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(COLUMN_STORAGE) ?? "null");
    if (Array.isArray(stored)) return orderColumns(stored.filter((id): id is string => typeof id === "string" && isKnownColumn(id)));
  } catch {}
  return DEFAULT_COLUMNS;
}

export function TracingExplorer({ projectId, initialQuery }: { projectId: string; initialQuery: TraceQuery }) {
  // Next.js syncs our history.replaceState calls into its router and can remount this page with the search
  // params it was first rendered with. The live URL is authoritative in the browser: merging stale server
  // params back in would resurrect removed filters or map mode after Show traces.
  const [query, setQuery] = useState<TraceQuery>(() => ({ range: "90d", ...(typeof window === "undefined" ? initialQuery : withPathTrace(currentUrlQuery(), initialQuery)) }));
  const [data, setData] = useState<ListResponse | null>(null);
  const [facets, setFacets] = useState<FacetCounts>({});
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(query.q ?? "");
  const [searchError, setSearchError] = useState("");
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [live] = useState(true);
  const [clock, setClock] = useState(() => Date.now());
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [errorsOpen, setErrorsOpen] = useState(true);
  // Label of the last clicked error group, for its chip when the group is not in the current list.
  const [pickedGroup, setPickedGroup] = useState<{ id: string; label: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = query.trace ?? null;
  const requestId = useRef(0);

  // Column choice lives in this browser's storage, which only exists after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setColumns(columnsFromUrl(currentUrlQuery().columns) ?? readColumns()); }, []);
  // Phones start with the filter sidebar collapsed so the traces are visible first.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (window.matchMedia("(max-width: 767px)").matches) setFiltersOpen(false); }, []);
  // The error-groups panel's open/closed choice is remembered per browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { try { if (window.localStorage.getItem(ERRORS_STORAGE) === "closed") setErrorsOpen(false); } catch {} }, []);
  // Relative start times ("2m ago") stay correct between data refreshes.
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10_000); return () => clearInterval(timer); }, []);

  const update = useCallback((patch: TraceQuery, resetPage = true) => {
    setQuery((current) => {
      const next: TraceQuery = { ...current, ...patch };
      if (resetPage && !("page" in patch)) delete next.page;
      for (const key of Object.keys(next)) if (next[key] === "") delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(query);
    window.history.replaceState(null, "", `${window.location.pathname.replace(/\/tracing\/[^/]+\/?$/, "/tracing")}${params.size ? `?${params}` : ""}`);
  }, [query]);

  const apiParams = useMemo(() => {
    const params = new URLSearchParams();
    const range = RANGES.find((item) => item.id === query.range);
    const to = query.to ? Number(query.to) : now;
    params.set("to", String(to));
    params.set("from", query.from ?? String(to - (range?.ms ?? 86_400_000)));
    for (const [key, value] of Object.entries(query)) {
      if (!VIEW_KEYS.includes(key)) params.set(key, value);
    }
    return params;
  }, [query, now]);
  // The activity grid follows the filters but ignores the time range.
  const activityParams = useMemo(() => {
    const params = new URLSearchParams(apiParams);
    params.delete("from");
    params.delete("to");
    return params;
  }, [apiParams]);
  // The metadata keys offered as columns depend on the time range only.
  const rangeParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("from", apiParams.get("from") ?? "");
    params.set("to", apiParams.get("to") ?? "");
    return params;
  }, [apiParams]);
  const listParams = useMemo(() => {
    const params = new URLSearchParams(apiParams);
    if (errorsOpen && query.mode !== "map") params.set("errors", "1");
    // Optional columns are read only for the traces on the page, and only while their column is on.
    const extras = extraIdsFor(columns), meta = metaKeysFor(columns);
    if (extras.length) params.set("extras", encodeValues(extras));
    if (meta.length) params.set("meta", encodeValues(meta));
    return params;
  }, [apiParams, errorsOpen, query.mode, columns]);
  const requestKey = listParams.toString();
  const loading = settledKey !== requestKey;

  useEffect(() => {
    const id = ++requestId.current;
    const params = new URLSearchParams(listParams);
    // Filter counts change with every filter, but not between polls, so only full loads ask for them.
    params.set("facets", "1");
    fetch(`/api/projects/${encodeURIComponent(projectId)}/traces?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as ListResponse;
        if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
        return body;
      })
      .then((body) => {
        if (id !== requestId.current) return;
        setData(body);
        setError(null);
        setSettledKey(requestKey);
        if (body.facets) setFacets(body.facets);
      })
      .catch((reason: unknown) => {
        if (id !== requestId.current) return;
        setError(reason instanceof Error ? reason.message : "Could not load traces");
        setSettledKey(requestKey);
      });
  }, [listParams, projectId, requestKey]);

  // Live updates: for relative ranges, quietly refetch the list with the window moved forward so new traces
  // appear without pressing Refresh. Skipped while paused, for fixed from/to windows, hidden tabs, and while a
  // load is pending. A successful poll clears an earlier error; failures back off from 5s up to 60s.
  useEffect(() => {
    if (!live || query.from || query.to) return;
    const rangeMs = RANGES.find((item) => item.id === query.range)?.ms ?? 86_400_000;
    let delay = 5000;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden && settledKey === requestKey) {
        const issued = requestId.current;
        const params = new URLSearchParams(listParams);
        const to = Date.now();
        params.set("to", String(to));
        params.set("from", String(to - rangeMs));
        try {
          const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/traces?${params}`, { cache: "no-store" });
          const body = response.ok ? ((await response.json()) as ListResponse) : null;
          if (!body) throw new Error(`poll ${response.status}`);
          delay = 5000;
          if (issued === requestId.current) {
            setError(null);
            setData((current) => {
              // Only rows that arrive through a live poll are highlighted, never a whole new filter result.
              const known = new Set((current?.rows ?? []).map((row) => row.runId));
              const added = current ? body.rows.map((row) => row.runId).filter((id) => !known.has(id)) : [];
              if (added.length) setFresh(new Set(added));
              return body;
            });
          }
        } catch {
          delay = Math.min(delay * 2, 60_000);
        }
      }
      if (!stopped) timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => { stopped = true; clearTimeout(timer); };
  }, [listParams, live, projectId, query.from, query.range, query.to, requestKey, settledKey]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const feedback = useFeedback(projectId, useMemo(() => rows.map((row) => row.runId), [rows]), projectId !== DEMO_PROJECT_ID && columns.includes("feedback"));
  const stats = data?.stats;
  const activeGroup = data?.errorGroups?.groups.find((group) => group.id === query.errorGroup);
  const activeGroupLabel = activeGroup ? errorGroupLabel(activeGroup) : pickedGroup?.id === query.errorGroup ? pickedGroup?.label : query.errorGroup?.slice(0, 8);
  const chartMode = query.mode === "chart";
  const traceView: TraceView = TRACE_VIEWS.some((item) => item.id === query.view) ? (query.view as TraceView) : "tree";

  useEffect(() => {
    if (!fresh.size) return;
    const timer = setTimeout(() => setFresh(new Set()), 2500);
    return () => clearTimeout(timer);
  }, [fresh]);

  const total = data?.total ?? 0;
  const page = Number(query.page ?? 0);
  const pageSize = Number(query.pageSize ?? 50);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const selectIndex = useCallback((delta: number) => {
    if (!rows.length) return;
    const index = rows.findIndex((row) => row.runId === selected);
    const next = rows[Math.min(Math.max(index + delta, 0), rows.length - 1)] ?? rows[0];
    update({ trace: next.runId }, false);
  }, [rows, selected, update]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "/") { event.preventDefault(); searchRef.current?.focus(); return; }
      if (event.key === "Escape" && selected) update({ trace: "" }, false);
      if (event.key === "ArrowDown" || event.key === "j") { event.preventDefault(); selectIndex(1); }
      if (event.key === "ArrowUp" || event.key === "k") { event.preventDefault(); selectIndex(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectIndex, selected, update]);

  function toggleColumn(id: string) {
    const next = columns.includes(id) ? columns.filter((column) => column !== id) : orderColumns([...columns, id]);
    setColumns(next);
    update({ columns: JSON.stringify(next) }, false);
    try { window.localStorage.setItem(COLUMN_STORAGE, JSON.stringify(next)); } catch {}
  }

  const applyView = useCallback((next: TraceQuery, chosen: string[]) => { setNow(Date.now()); setQuery(next); setColumns(chosen); setSearchDraft(next.q ?? ""); try { localStorage.setItem(COLUMN_STORAGE, JSON.stringify(chosen)); } catch {} }, []);

  /** Enter in the search box: `field:value` tokens become filters, the remaining words are the text search. */
  function submitSearch(text: string) {
    const parsed = parseSearch(text);
    if (parsed.errors.length) { setSearchError(parsed.errors[0]!); return; }
    setSearchError("");
    const patch: TraceQuery = { q: parsed.text };
    for (const filter of parsed.filters) {
      if (filter.kind === "facet") {
        // A value is either included or excluded: adding it on one side removes it from the other.
        const [add, drop] = filter.negate ? [`${EXCLUDE_PREFIX}${filter.field.key}`, filter.field.key] : [filter.field.key, `${EXCLUDE_PREFIX}${filter.field.key}`];
        const current = decodeValues(patch[add] ?? query[add]);
        if (!current.includes(filter.value)) patch[add] = encodeValues([...current, filter.value]);
        const other = decodeValues(patch[drop] ?? query[drop]).filter((value) => value !== filter.value);
        patch[drop] = encodeValues(other);
      } else if (filter.kind === "status") patch.status = filter.value === "all" ? "" : filter.value;
      else {
        if (filter.bound !== "max") patch[filter.field.key] = String(filter.value);
        if (filter.bound !== "min") patch[filter.field.maxKey!] = String(filter.value);
      }
    }
    setSearchDraft(parsed.text);
    update(patch);
  }


  function toggleErrors() {
    const next = !errorsOpen;
    setErrorsOpen(next);
    try { window.localStorage.setItem(ERRORS_STORAGE, next ? "open" : "closed"); } catch {}
  }

  function exportCsv() {
    downloadFile(`traces-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`, traceCsv(columns, rows), "text/csv;charset=utf-8");
  }

  function sortBy(sort: string) {
    const current = query.sort ?? "startedAt";
    update({ sort, dir: current === sort && (query.dir ?? "desc") === "desc" ? "asc" : "desc" });
  }

  const activeFilters = [
    ...FACETS.filter((field) => query[field.key]).map((field) => {
      const values = decodeValues(query[field.key]);
      return { key: field.key, label: `${field.label}: ${values.length > 2 ? `${values.slice(0, 2).join(", ")} +${values.length - 2}` : values.join(", ")}` };
    }),
    ...FACETS.filter((field) => query[`${EXCLUDE_PREFIX}${field.key}`]).map((field) => {
      const values = decodeValues(query[`${EXCLUDE_PREFIX}${field.key}`]);
      return { key: `${EXCLUDE_PREFIX}${field.key}`, label: `${field.label} not: ${values.length > 2 ? `${values.slice(0, 2).join(", ")} +${values.length - 2}` : values.join(", ")}` };
    }),
    ...(query.status && query.status !== "all" ? [{ key: "status", label: query.status === "error" ? "Errors only" : "Healthy only" }] : []),
    ...(query.minLatencyMs ? [{ key: "minLatencyMs", label: `Latency ≥ ${formatDuration(Number(query.minLatencyMs))}` }] : []),
    ...(query.maxLatencyMs ? [{ key: "maxLatencyMs", label: `Latency ≤ ${formatDuration(Number(query.maxLatencyMs))}` }] : []),
    ...(query.minCostUsd ? [{ key: "minCostUsd", label: `Cost ≥ ${formatCost(Number(query.minCostUsd))}` }] : []),
    ...(query.maxCostUsd ? [{ key: "maxCostUsd", label: `Cost ≤ ${formatCost(Number(query.maxCostUsd))}` }] : []),
    ...(query.minTokens ? [{ key: "minTokens", label: `Tokens ≥ ${compactNumber(Number(query.minTokens))}` }] : []),
    ...(query.maxTokens ? [{ key: "maxTokens", label: `Tokens ≤ ${compactNumber(Number(query.maxTokens))}` }] : []),
    ...(query.errorGroup ? [{ key: "errorGroup", label: `Error: ${activeGroupLabel}` }] : []),
    ...(query.node ? [{ key: "node", label: `Step: ${stepLabel(query.node)}` }] : []),
    ...(query.edge ? [{ key: "edge", label: `Path: ${query.edge.split(EDGE_SEPARATOR).map(stepLabel).join(" → ")}` }] : []),
  ];

  return (
    <div className="flex min-h-svh flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Tracing</h1>
        <form
          className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-[#262C35] bg-[#111418] px-2.5 focus-within:border-[#4A5260]"
          onSubmit={(event) => { event.preventDefault(); submitSearch(searchDraft.trim()); }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 text-[#8B93A1]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <label htmlFor="trace-search" className="sr-only">Search traces</label>
          <SearchBox id="trace-search" inputRef={searchRef} value={searchDraft} onChange={(value) => { setSearchDraft(value); setSearchError(""); }}
            onApply={(patch) => update(patch)} facets={facets} query={query} error={searchError}
            placeholder="Search text, or filter: model:gpt-5  status:error  latency:>2s" />
          {query.q ? <button type="button" className="text-xs text-[#8B93A1] hover:text-white" onClick={() => { setSearchDraft(""); update({ q: "" }); }}>Clear</button> : <kbd className="hidden rounded border border-[#262C35] px-1.5 font-mono text-[10px] text-[#6B7380] sm:block" aria-hidden="true">/</kbd>}
        </form>
        <TimeRangePicker range={query.range ?? "90d"} from={query.from ? Number(query.from) : undefined} to={query.to ? Number(query.to) : undefined} now={now}
          onPreset={(id) => { setNow(Date.now()); update({ range: id, from: "", to: "" }); }}
          onCustom={(from, to) => { const current = Date.now(); setNow(current); update({ from: String(from), to: String(Math.min(to, current)) }); }}
          onReset={() => update({ from: "", to: "" })} />
        <button type="button" onClick={() => setNow(Date.now())} className="h-8 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260]">Refresh</button>
      </header>

      <div className="flex min-h-0 flex-1 flex-wrap">
        {filtersOpen ? (
          <aside aria-label="Filters" className="w-full shrink-0 border-b border-[#1F242C] p-2.5 md:w-56 md:border-b-0 md:border-r">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              <button type="button" className="text-xs text-[#8B93A1] hover:text-white" onClick={() => setFiltersOpen(false)}>Hide</button>
            </div>
            <div role="group" aria-label="Status" className="mb-2 flex rounded-md border border-[#262C35] p-0.5 text-xs">
              {([["all", "All"], ["error", "Errors"], ["healthy", "Healthy"]] as const).map(([value, label]) => {
                const active = (query.status ?? "all") === value;
                return <button key={value} type="button" aria-pressed={active} onClick={() => update({ status: value === "all" ? "" : value })}
                  className={`h-6 flex-1 rounded px-1.5 ${active ? "bg-[#232A34] text-white" : "text-[#8B93A1] hover:text-white"}`}>{label}</button>;
              })}
            </div>
            <div className="mb-2 border-t border-[#1A1F27]">
              {FACETS.map((field) => (
                <FacetGroup key={field.key} label={field.label} defaultOpen={field.open} values={decodeValues(query[field.key])} counts={facets[field.key]}
                  onChange={(values) => update({ [field.key]: encodeValues(values) })} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FilterNumber key={`lat-${query.minLatencyMs ?? ""}`} label="Min latency (ms)" value={query.minLatencyMs ?? ""} onChange={(value) => update({ minLatencyMs: value })} />
              <FilterNumber key={`cost-${query.minCostUsd ?? ""}`} label="Min cost (USD)" value={query.minCostUsd ?? ""} step="0.001" onChange={(value) => update({ minCostUsd: value })} />
            </div>
          </aside>
        ) : null}

        <section className="flex min-w-0 flex-[999_1_560px] flex-col">
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
            {projectId === DEMO_PROJECT_ID ? null : <a href={`/dashboard/${encodeURIComponent(projectId)}/steps?${new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([key]) => !["trace", "view", "mode", "page"].includes(key))))}`} className="h-7 border border-[#262C35] px-2.5 py-1 text-xs text-[#C9CED6] hover:text-white">Actions</a>}
            <div role="group" aria-label="Show traces as" className="flex max-w-full flex-wrap rounded-md border border-[#262C35] p-0.5 text-xs">
              {([["", "List"], ["chart", "Chart"]] as const).map(([mode, label]) => {
                const active = chartMode === (mode === "chart");
                return <button key={label} type="button" aria-pressed={active} onClick={() => update({ mode }, false)} className={`h-6 rounded px-2.5 ${active ? "bg-[#232A34] text-white" : "text-[#8B93A1] hover:text-white"}`}>{label}</button>;
              })}
            </div>
            {!filtersOpen ? <button type="button" onClick={() => setFiltersOpen(true)} className="h-7 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260]">Show filters</button> : null}
            {activeFilters.map((filter) => (
              <button key={filter.key} type="button" onClick={() => update({ [filter.key]: "" })} className="flex h-7 items-center gap-2 rounded-md bg-[#1A1F27] px-2.5 text-xs text-[#E6E9EE] hover:bg-[#232A34]" aria-label={`Remove filter ${filter.label}`}>
                {filter.label}<span aria-hidden="true" className="text-[#8B93A1]">×</span>
              </button>
            ))}
            {activeFilters.length ? <button type="button" className="text-xs text-[#8B93A1] hover:text-white" onClick={() => update(Object.fromEntries(activeFilters.map((f) => [f.key, ""])))}>Clear all</button> : null}
            {/* The right-hand controls belong to the list. In Chart they stay in place, hidden and unfocusable, so the row does not reflow. */}
            <div className={chartMode ? "invisible contents" : "contents"}>
            <button type="button" onClick={exportCsv} disabled={!rows.length || loading} className="ml-auto h-7 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260] disabled:opacity-40" title="Download the traces on this page as CSV">Export CSV</button>
            <SavedViews projectId={projectId} target="traces" query={query} columns={columns} onApply={applyView} />
            <ColumnsMenu projectId={projectId} rangeParams={rangeParams} columns={columns} onToggle={toggleColumn}
              onReset={() => { setColumns(DEFAULT_COLUMNS); update({ columns: JSON.stringify(DEFAULT_COLUMNS) }, false); try { window.localStorage.removeItem(COLUMN_STORAGE); } catch {} }} />
            </div>
          </div>

          <StatsStrip stats={stats} loading={!data} onErrors={() => update({ status: "error" })} />

          {chartMode ? null : <TracesOverTime histogram={data?.histogram} range={data?.range} onZoom={(from, to) => update({ from: String(from), to: String(to) })} />}

          {chartMode ? null : (
            <ErrorGroupsPanel data={data ? data.errorGroups : undefined} open={errorsOpen} loading={loading} active={query.errorGroup} clock={clock}
              onToggle={toggleErrors} onSelect={(group) => { setPickedGroup({ id: group.id, label: errorGroupLabel(group) }); update({ errorGroup: query.errorGroup === group.id ? "" : group.id }); }} />
          )}

          <div className="min-h-0 flex-1 overflow-auto px-4">
            {chartMode ? (
              error ? <p role="alert" className="my-6 text-sm text-[#FF8A8A]">{error}</p>
                : <TraceCharts projectId={projectId} filterParams={activityParams} histogram={data?.histogram} range={data?.range} onZoom={(from, to) => update({ from: String(from), to: String(to) })} />
            ) : error ? (
              <div role="alert" className="my-6 rounded-lg border border-[#5A2A2A] bg-[#1E1314] p-4 text-sm">
                <p className="font-medium text-[#FF8A8A]">{error}</p>
                <button type="button" className="mt-3 rounded-md border border-[#5A2A2A] px-3 py-1.5 text-xs hover:bg-[#2A1A1C]" onClick={() => setNow(Date.now())}>Try again</button>
              </div>
            ) : !loading && rows.length === 0 && !activeFilters.length && !query.q && projectId !== DEMO_PROJECT_ID ? (
              <FirstTraceEmpty projectId={projectId} title="Every run of your agent will land here" description="Each trace shows the steps, the model calls, what it cost and where it failed. Send one and this page fills in within seconds." />
            ) : !loading && rows.length === 0 ? (
              <div className="my-10 rounded-lg border border-dashed border-[#262C35] p-8 text-center">
                <p className="font-medium">No traces in this range</p>
                <p className="mt-2 text-sm text-[#8B93A1]">{activeFilters.length || query.q ? "Try removing a filter or widening the time range." : "Send traces with the Uncoil SDK and they appear here within seconds."}</p>
                {activeFilters.length || query.q ? <button type="button" className="mt-4 rounded-md bg-[#F4D44D] px-4 py-2 text-sm font-medium text-[#0B0D10]" onClick={() => { setSearchDraft(""); update({ ...Object.fromEntries(activeFilters.map((f) => [f.key, ""])), q: "", range: "30d" }); }}>Clear filters and show 30 days</button> : <a className="mt-4 inline-block rounded-md bg-[#F4D44D] px-4 py-2 text-sm font-medium text-[#0B0D10]" href={projectId === DEMO_PROJECT_ID ? `${DEMO_BASE_PATH}` : `/dashboard/${projectId}/quickstart`}>{projectId === DEMO_PROJECT_ID ? "Back to the overview" : "Open quickstart"}</a>}
              </div>
            ) : (
              <>
              {feedback.failed ? <p role="alert" className="mt-3 text-xs text-[#FF8A8A]">{feedback.failed}</p> : null}
              <table className="mt-3 w-full min-w-[900px] border-separate border-spacing-0 text-[13px]">
                <thead className="sticky top-0 z-10 bg-[#0B0D10]">
                  <tr className="text-left text-xs text-[#8B93A1]">
                    {columns.map((id) => {
                      const label = columnLabel(id);
                      const sortKey = id === "feedback" ? "" : id;
                      const active = sortKey && (query.sort ?? "startedAt") === sortKey;
                      return (
                        <th key={id} scope="col" className="border-b border-[#1F242C] px-2.5 py-1.5 font-medium" aria-sort={active ? ((query.dir ?? "desc") === "asc" ? "ascending" : "descending") : undefined}>
                          {sortKey ? <button type="button" onClick={() => sortBy(sortKey)} className={`flex items-center gap-1 hover:text-white ${active ? "text-white" : ""}`}>{label}<span aria-hidden="true">{active ? ((query.dir ?? "desc") === "asc" ? "↑" : "↓") : "↕"}</span></button> : label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className={loading ? "opacity-60" : ""}>
                  {rows.map((row) => (
                    <tr key={row.runId} aria-selected={selected === row.runId}
                      className={`cursor-pointer transition-colors duration-700 ${selected === row.runId ? "bg-[#161B22] shadow-[inset_3px_0_0_#F4D44D]" : fresh.has(row.runId) ? "bg-[#1F2A1F]" : "hover:bg-[#12161C]"}`}
                      onClick={() => update({ trace: row.runId }, false)}>
                      {columns.map((id) => <td key={id} className="max-w-[320px] truncate border-b border-[#171B21] px-2.5 py-1.5 align-middle">{cell(id, row, update, clock, feedback, projectId)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>

          {chartMode ? null : <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1F242C] px-4 py-2 text-xs text-[#8B93A1]">
            <span>{loading ? "Loading…" : `${compactNumber(total)} traces`}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">Rows
                <select value={pageSize} onChange={(event) => update({ pageSize: event.target.value })} className="h-7 rounded-md border border-[#262C35] bg-[#111418] px-2 text-[#E6E9EE]">
                  {[25, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <span>Page {page + 1} of {pageCount}</span>
              <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => update({ page: String(page - 1) }, false)} className="h-7 w-7 rounded-md border border-[#262C35] disabled:opacity-40">‹</button>
              <button type="button" aria-label="Next page" disabled={page + 1 >= pageCount} onClick={() => update({ page: String(page + 1) }, false)} className="h-7 w-7 rounded-md border border-[#262C35] disabled:opacity-40">›</button>
            </div>
          </footer>}
        </section>

        {selected ? (
          <TracePanel
            key={selected} projectId={projectId} runId={selected}
            summary={rows.find((row) => row.runId === selected)}
            view={traceView} onView={(view) => update({ view: view === "tree" ? "" : view }, false)}
            onClose={() => update({ trace: "" }, false)}
            onFilter={(key, value) => update({ [key]: encodeValues([value]), trace: "" })}
            onStep={selectIndex}
          />
        ) : null}
      </div>
    </div>
  );
}

function cell(id: string, row: TraceRow, update: (patch: TraceQuery, resetPage?: boolean) => void, clock: number, feedback: FeedbackState, projectId: string) {
  const link = (key: string, value: string) => value
    ? <button type="button" className="truncate text-[#8AB4FF] hover:underline" onClick={(event) => { event.stopPropagation(); update({ [key]: encodeValues([value]) }); }}>{value}</button>
    : <span className="text-[#4A5260]">—</span>;
  switch (id) {
    case "startedAt": return <time dateTime={new Date(parseTime(row.startedAt)).toISOString()} title={formatTime(row.startedAt)} className="font-mono text-xs text-[#C9CED6]">{relativeTime(row.startedAt, clock)}</time>;
    case "status": return Number(row.errorCount) > 0
      ? <span className="rounded bg-[#3A1C1F] px-2 py-0.5 font-mono text-xs text-[#FF8A8A]">{Number(row.errorCount)} error{Number(row.errorCount) === 1 ? "" : "s"}</span>
      : <span className="rounded bg-[#15301F] px-2 py-0.5 font-mono text-xs text-[#5BE3A0]">ok</span>;
    case "name": return <span className="font-medium">{row.traceName || <span className="font-mono text-xs text-[#8B93A1]">{row.runId.slice(0, 12)}</span>}</span>;
    case "input": return <span className="text-[#C9CED6]">{previewText(row.inputPreview) || <span className="text-[#4A5260]">—</span>}</span>;
    case "output": return <span className="text-[#C9CED6]">{previewText(row.outputPreview) || <span className="text-[#4A5260]">—</span>}</span>;
    case "feedback": return projectId === DEMO_PROJECT_ID ? <span className="text-[#4A5260]">—</span> : <FeedbackCell runId={row.runId} feedback={feedback} />;
    case "latency": return <span className="font-mono text-xs">{formatDuration(row.durationMs)}</span>;
    case "cost": return <span className="font-mono text-xs">{formatCost(row.totalCostUsd)}</span>;
    case "tokens": return <span className="font-mono text-xs text-[#C9CED6]">{compactNumber(Number(row.inputTokens) + Number(row.outputTokens))}</span>;
    case "model": return link("modelId", row.modelId);
    case "user": return link("endUserId", row.endUserId);
    case "session": return link("sessionId", row.sessionId);
    case "tags": return row.tags?.length ? <span className="flex gap-1">{row.tags.slice(0, 3).map((tag) => <button key={tag} type="button" onClick={(event) => { event.stopPropagation(); update({ tag: encodeValues([tag]) }); }} className="rounded bg-[#1A1F27] px-1.5 py-0.5 text-xs hover:bg-[#232A34]">{tag}</button>)}</span> : <span className="text-[#4A5260]">—</span>;
    default: return extraCell(id, row, update, clock);
  }
}

function FilterNumber({ label, value, step = "1", onChange }: { label: string; value: string; step?: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const id = `filter-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-0.5 block truncate text-[11px] text-[#8B93A1]" title={label}>{label}</label>
      <input id={id} type="number" min="0" step={step} value={draft} onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== value && onChange(draft)} onKeyDown={(event) => { if (event.key === "Enter") onChange(draft); }}
        className="h-7 w-full rounded border border-[#262C35] bg-[#111418] px-2 text-xs text-[#E6E9EE] outline-none focus:border-[#4A5260]" placeholder="Any" />
    </div>
  );
}

function StatsStrip({ stats, loading, onErrors }: { stats?: Stats; loading: boolean; onErrors: () => void }) {
  const errorRate = stats?.traces ? stats.errors / stats.traces : 0;
  const tiles: Array<{ label: string; value: string; hint?: string; tone?: string; onClick?: () => void }> = [
    { label: "Traces", value: stats ? compactNumber(stats.traces) : "—" },
    { label: "Error rate", value: stats ? `${(errorRate * 100).toFixed(errorRate && errorRate < 0.1 ? 1 : 0)}%` : "—", hint: stats ? `${compactNumber(stats.errors)} with errors` : undefined, tone: errorRate > 0 ? "text-[#FF8A8A]" : undefined, onClick: stats?.errors ? onErrors : undefined },
    { label: "Latency p50", value: stats && stats.traces > stats.runningTraces ? formatDuration(stats.p50DurationMs) : "—", hint: stats?.runningTraces ? `${compactNumber(stats.runningTraces)} running` : undefined },
    { label: "Latency p95", value: stats && stats.traces > stats.runningTraces ? formatDuration(stats.p95DurationMs) : "—", hint: stats?.runningTraces ? `${compactNumber(stats.runningTraces)} running` : undefined },
    { label: "Total cost", value: stats ? formatCost(stats.totalCostUsd) : "—", hint: stats?.traces ? `${formatCost(stats.totalCostUsd / stats.traces)} per trace` : undefined },
    { label: "Tokens", value: stats ? compactNumber(stats.inputTokens + stats.outputTokens) : "—", hint: stats ? `${compactNumber(stats.inputTokens)} in · ${compactNumber(stats.outputTokens)} out` : undefined },
  ];
  return (
    <section aria-label="Summary for this range" aria-busy={loading} className="mx-4 mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#1F242C] bg-[#1F242C] sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => {
        const body = (
          <>
            <span className="block text-xs text-[#8B93A1]">{tile.label}</span>
            <span className={`mt-0.5 block font-mono text-[15px] leading-5 ${tile.tone ?? "text-[#E6E9EE]"}`}>{tile.value}</span>
            {tile.hint ? <span className="mt-0.5 block truncate font-mono text-[11px] text-[#6B7380]">{tile.hint}</span> : null}
          </>
        );
        return tile.onClick ? (
          <button key={tile.label} type="button" onClick={tile.onClick} title="Show only traces with errors" className="min-w-0 bg-[#0E1115] px-3 py-2 text-left hover:bg-[#12161C]">{body}</button>
        ) : (
          <div key={tile.label} className="min-w-0 bg-[#0E1115] px-3 py-2">{body}</div>
        );
      })}
    </section>
  );
}
