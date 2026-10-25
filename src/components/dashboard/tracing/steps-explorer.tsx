"use client";
import { SavedViews } from "./saved-views";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StepListRow } from "@/lib/tinybird";
import { FacetGroup, decodeValues, encodeValues } from "./facet-filter";
import {
  compactNumber,
  downloadFile,
  formatCost,
  formatDuration,
  formatTime,
  relativeTime,
  toCsv,
} from "./format";
import { RANGES, TimeRangePicker } from "./time-range-picker";
import { TracePanel, TRACE_VIEWS, type TraceView } from "./trace-panel";
import { TypeIcon } from "./trace-views";

type Query = Record<string, string>;
type Result = {
  rows: StepListRow[];
  total: number;
  page: number;
  pageSize: number;
  grouped: boolean;
  stats: Record<string, number>;
  facets: Array<{ field: string; value: string; steps: number }> | null;
};
const FIELDS = [
  { key: "traceName", label: "Trace name" },
  { key: "spanType", label: "Step type" },
  { key: "toolName", label: "Tool" },
  { key: "modelId", label: "Model" },
  { key: "environment", label: "Environment" },
  { key: "errorType", label: "Error type" },
];
const VIEW_KEYS = new Set([
  "range",
  "from",
  "to",
  "trace",
  "step",
  "view",
  "savedView",
  "columns",
]);
const control =
  "h-8 rounded border border-[#262C35] bg-[#111418] px-2 text-xs text-[#C9CED6] aria-pressed:bg-[#21262E] aria-pressed:text-[#E6E9EE]";
const BASE_COLUMNS = [
  { key: "startedAt", label: "Start time" },
  { key: "name", label: "Step" },
  { key: "type", label: "Type" },
  { key: "trace", label: "Trace" },
  { key: "model", label: "Model" },
  { key: "latency", label: "Latency" },
  { key: "cost", label: "Cost" },
  { key: "tokens", label: "Tokens" },
  { key: "errors", label: "Error" },
];
const GROUP_COLUMNS = [
  { key: "name", label: "Step" },
  { key: "type", label: "Type" },
  { key: "calls", label: "Calls" },
  { key: "errors", label: "Errors" },
  { key: "latency", label: "Latency p50" },
  { key: "p95", label: "Latency p95" },
  { key: "cost", label: "Total cost" },
  { key: "tokens", label: "Tokens" },
];

export function StepsExplorer({
  projectId,
  initialQuery,
}: {
  projectId: string;
  initialQuery: Query;
}) {
  const [query, setQuery] = useState<Query>(() => ({
    range: "90d",
    ...(typeof window === "undefined"
      ? initialQuery
      : Object.fromEntries(new URLSearchParams(window.location.search))),
  }));
  const [draft, setDraft] = useState(query.q ?? "");
  const [now, setNow] = useState(() => Date.now());
  const [clock, setClock] = useState(() => Date.now());
  const [data, setData] = useState<Result | null>(null);
  const [facets, setFacets] = useState<NonNullable<Result["facets"]>>([]);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [live, setLive] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fresh, setFresh] = useState(new Set<string>());
  const latestData = useRef<Result | null>(null);
  const requestId = useRef(0),
    pending = useRef(false),
    search = useRef<HTMLInputElement>(null);
  const grouped = query.groupBy === "step",
    columns = grouped ? GROUP_COLUMNS : BASE_COLUMNS;
  const update = (patch: Query, reset = true) =>
    setQuery((current) => {
      const next = { ...current, ...patch };
      if (reset) delete next.page;
      for (const k of Object.keys(next)) if (next[k] === "") delete next[k];
      return next;
    });
  const key = useMemo(() => {
    const p = new URLSearchParams({
      to: query.to ?? String(now),
      from:
        query.from ??
        String(
          (Number(query.to) || now) -
            (RANGES.find((r) => r.id === query.range)?.ms ?? 86400000),
        ),
    });
    for (const [k, v] of Object.entries(query))
      if (!VIEW_KEYS.has(k)) p.set(k, v);
    return p.toString();
  }, [query, now]);
  const url = `/api/projects/${encodeURIComponent(projectId)}/steps`;
  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${new URLSearchParams(query)}`,
    );
  }, [query]);
  // Browser-only preferences are read after hydration, without restarting the initial data request.
  useEffect(() => {
    // Browser preference hydration is intentionally deferred until mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive(localStorage.getItem("tracify.tracing.live") !== "paused");
    setFiltersOpen(window.innerWidth >= 768);
    const timer = setInterval(() => setClock(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const id = ++requestId.current,
      controller = new AbortController();
    pending.current = true;
    fetch(`${url}?${key}&facets=1`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error("Actions are temporarily unavailable.");
        return r.json() as Promise<Result>;
      })
      .then((body) => {
        if (id === requestId.current) {
          latestData.current = body;
          setData(body);
          setFacets(body.facets ?? []);
          setError(null);
          setSettled(key);
          setFresh(new Set());
        }
      })
      .catch((reason) => {
        if (id === requestId.current && !controller.signal.aborted) {
          setError(reason.message);
          setSettled(key);
        }
      })
      .finally(() => {
        if (id === requestId.current) pending.current = false;
      });
    return () => controller.abort();
  }, [url, key, attempt]);
  useEffect(() => {
    if (!live || query.from || query.to) return;
    const controller = new AbortController();
    let stopped = false,
      delay = 5000;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden && !pending.current) {
        const id = requestId.current;
        const params = new URLSearchParams(key),
          to = Date.now();
        params.set("to", String(to));
        params.set(
          "from",
          String(
            to - (RANGES.find((r) => r.id === query.range)?.ms ?? 86400000),
          ),
        );
        pending.current = true;
        try {
          const response = await fetch(`${url}?${params}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw Error("poll");
          const body = (await response.json()) as Result;
          if (!stopped && id === requestId.current) {
            setError(null);
            const current = latestData.current;
            const changed =
              JSON.stringify(current?.rows) !== JSON.stringify(body.rows) ||
              JSON.stringify(current?.stats) !== JSON.stringify(body.stats);
            delay = changed ? 5000 : Math.min(delay * 2, 60000);
            if (changed) {
              const old = new Set(current?.rows.map((r) => r.spanId));
              setFresh(
                new Set(
                  body.rows
                    .filter((r) => !old.has(r.spanId))
                    .map((r) => r.spanId),
                ),
              );
              latestData.current = body;
              setData(body);
            }
          }
        } catch {
          delay = Math.min(delay * 2, 60000);
          if (!stopped && id === requestId.current)
            setError(
              "Live step updates are temporarily unavailable. Retrying…",
            );
        } finally {
          if (id === requestId.current) pending.current = false;
        }
      }
      if (!stopped) timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [live, query.from, query.to, query.range, key, url]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === "Escape")
        setQuery((current) => {
          const next = { ...current };
          delete next.trace;
          delete next.step;
          return next;
        });
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const applyView = useCallback((next: Query) => {
    setNow(Date.now());
    setQuery(next);
    setDraft(next.q ?? "");
  }, []);
  const loading = settled !== key,
    rows = data?.grouped === grouped ? data.rows : [],
    active = Object.entries(query).filter(
      ([k]) =>
        FIELDS.some((f) => f.key === k) ||
        [
          "q",
          "status",
          "minLatencyMs",
          "maxLatencyMs",
          "minCostUsd",
          "maxCostUsd",
          "minTokens",
          "maxTokens",
        ].includes(k),
    );
  const view: TraceView = TRACE_VIEWS.some((v) => v.id === query.view)
    ? (query.view as TraceView)
    : "tree";
  function value(row: StepListRow, id: string): string | number {
    switch (id) {
      case "startedAt":
        return row.createdAt;
      case "name":
        return row.name;
      case "type":
        return row.type;
      case "trace":
        return row.traceName;
      case "model":
        return row.modelId;
      case "latency":
        return row.latencyMs;
      case "p95":
        return row.p95LatencyMs;
      case "cost":
        return row.costUsd;
      case "tokens":
        return Number(row.inputTokens) + Number(row.outputTokens);
      case "errors":
        return grouped ? row.errors : row.errorType;
      case "calls":
        return row.calls;
      default:
        return "";
    }
  }
  const sort = (id: string) =>
    update({
      sort: id,
      dir:
        (query.sort ?? "startedAt") === id && (query.dir ?? "desc") === "desc"
          ? "asc"
          : "desc",
    });
  const tracingHref = `/dashboard/${encodeURIComponent(projectId)}/tracing?${new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([k]) => !["trace", "step", "view", "sort", "dir", "page", "groupBy"].includes(k))))}`;
  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="text-base font-semibold">Steps</h1>
        <a href={tracingHref} className={`${control} py-1.5`}>
          Open Tracing
        </a>
        <form
          className="min-w-[180px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: draft.trim() });
          }}
        >
          <label htmlFor="steps-search" className="sr-only">
            Search steps
          </label>
          <input
            id="steps-search"
            ref={search}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search step, tool, model or trace"
            className={`${control} w-full`}
          />
        </form>
        <SavedViews
          projectId={projectId}
          target="steps"
          query={query}
          columns={columns.map((c) => c.key)}
          onApply={applyView}
        />
        <TimeRangePicker
          range={query.range ?? "90d"}
          from={query.from ? Number(query.from) : undefined}
          to={query.to ? Number(query.to) : undefined}
          now={now}
          onPreset={(id) => {
            setNow(Date.now());
            update({ range: id, from: "", to: "" });
          }}
          onCustom={(from, to) =>
            update({ from: String(from), to: String(to) })
          }
          onReset={() => update({ from: "", to: "" })}
        />
        <button
          type="button"
          className={control}
          onClick={() => {
            setNow(Date.now());
            setAttempt((n) => n + 1);
          }}
        >
          Refresh
        </button>
      </header>
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        {filtersOpen ? (
          <aside
            aria-label="Step filters"
            className="w-full shrink-0 border-b border-[#1F242C] p-2.5 md:w-56 md:border-r"
          >
            <div className="mb-2 flex justify-between">
              <span>Filters · step counts</span>
              <button type="button" onClick={() => setFiltersOpen(false)}>
                Hide
              </button>
            </div>
            <div
              role="group"
              aria-label="Step status"
              className="mb-3 flex gap-1"
            >
              {["all", "error", "healthy"].map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={(query.status ?? "all") === s}
                  className={control}
                  onClick={() => update({ status: s === "all" ? "" : s })}
                >
                  {s === "error"
                    ? "Errors"
                    : s === "healthy"
                      ? "Healthy"
                      : "All"}
                </button>
              ))}
            </div>
            {FIELDS.map((field) => (
              <FacetGroup
                key={field.key}
                label={field.label}
                defaultOpen={["spanType", "toolName"].includes(field.key)}
                values={decodeValues(query[field.key])}
                counts={facets
                  .filter((f) => f.field === field.key)
                  .map((f) => ({ value: f.value, traces: Number(f.steps) }))}
                onChange={(values) =>
                  update({ [field.key]: encodeValues(values) })
                }
              />
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["minLatencyMs", "Min latency (ms)"],
                ["maxLatencyMs", "Max latency (ms)"],
                ["minCostUsd", "Min cost ($)"],
                ["maxCostUsd", "Max cost ($)"],
                ["minTokens", "Min tokens"],
                ["maxTokens", "Max tokens"],
              ].map(([id, label]) => (
                <label key={id} className="min-w-0 text-[10px] text-[#8B93A1]">
                  {label}
                  <input
                    aria-label={label}
                    type="number"
                    min="0"
                    step={id.includes("Cost") ? "0.001" : "1"}
                    value={query[id] ?? ""}
                    onChange={(e) => update({ [id]: e.target.value })}
                    className={`${control} mt-1 w-full`}
                  />
                </label>
              ))}
            </div>
          </aside>
        ) : null}
        <main className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            {!filtersOpen ? (
              <button
                type="button"
                className={control}
                onClick={() => setFiltersOpen(true)}
              >
                Show filters
              </button>
            ) : null}
            <div
              role="group"
              aria-label="Step aggregation"
              className="flex gap-1"
            >
              {[
                [false, "All actions"],
                [true, "Group by step"],
              ].map(([g, label]) => (
                <button
                  key={String(label)}
                  type="button"
                  className={control}
                  aria-pressed={grouped === g}
                  onClick={() =>
                    update({
                      groupBy: g ? "step" : "",
                      sort: g ? "cost" : "startedAt",
                      dir: "desc",
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {active.map(([k, v]) => (
              <button
                key={k}
                type="button"
                aria-label={`Remove filter ${k}`}
                className="max-w-full truncate border border-[#262C35] px-2 py-1 text-xs"
                onClick={() => {
                  if (k === "q") setDraft("");
                  update({ [k]: "" });
                }}
              >
                {FIELDS.find((f) => f.key === k)?.label ?? k}:{" "}
                {decodeValues(v).join(", ")} ×
              </button>
            ))}
            {active.length ? (
              <button
                type="button"
                className="text-xs text-[#8B93A1]"
                onClick={() => {
                  setDraft("");
                  update(Object.fromEntries(active.map(([k]) => [k, ""])));
                }}
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              disabled={!rows.length || loading}
              className={`${control} ml-auto`}
              onClick={() =>
                downloadFile(
                  "actions.csv",
                  toCsv(
                    columns.map(
                      (c) =>
                        c.label +
                        (c.key === "latency" || c.key === "p95"
                          ? " (ms)"
                          : c.key === "cost"
                            ? " (USD)"
                            : ""),
                    ),
                    rows.map((r) => columns.map((c) => value(r, c.key))),
                  ),
                  "text/csv;charset=utf-8",
                )
              }
            >
              Export CSV
            </button>
          </div>
          <section
            aria-label="Step summary"
            className="mx-4 grid grid-cols-2 gap-px overflow-hidden rounded border border-[#1F242C] bg-[#1F242C] sm:grid-cols-5"
          >
            {[
              ["Actions", compactNumber(data?.stats.steps ?? 0)],
              ["Errors", compactNumber(data?.stats.errors ?? 0)],
              ["Latency p50", formatDuration(data?.stats.p50LatencyMs)],
              ["Total cost", formatCost(data?.stats.totalCostUsd)],
              ["Tokens", compactNumber(data?.stats.tokens ?? 0)],
            ].map(([label, v]) => (
              <div
                key={label}
                className={`bg-[#0E1115] px-3 py-2 ${label === "Tokens" ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <p className="text-xs text-[#8B93A1]">{label}</p>
                <p className="font-mono">{data ? v : "—"}</p>
              </div>
            ))}
          </section>
          {error ? (
            <div
              role="alert"
              className="m-4 border border-[#5A2A2A] p-4 text-[#FF8A8A]"
            >
              {error}{" "}
              <button
                type="button"
                className={control}
                onClick={() => setAttempt((n) => n + 1)}
              >
                Try again
              </button>
            </div>
          ) : null}
          <div className="min-w-0 overflow-x-auto px-4" aria-busy={loading}>
            {(!data || (loading && data.grouped !== grouped)) && !error ? (
              <p role="status" className="py-8 text-[#8B93A1]">
                Loading steps…
              </p>
            ) : !rows.length && !error ? (
              <div className="py-12 text-center">
                <p>No actions match these filters</p>
                <p className="mt-2 text-xs text-[#8B93A1]">
                  Try a wider time range or clear a filter.
                </p>
              </div>
            ) : (
              <table
                key={grouped ? "grouped" : "individual"}
                className="mt-3 w-full min-w-[850px] border-separate border-spacing-0"
              >
                <caption className="sr-only">
                  {grouped
                    ? "Actions grouped across traces"
                    : "Every matching step across traces"}
                </caption>
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        className="border-b border-[#262C35] p-2 text-left text-xs font-normal text-[#8B93A1]"
                        aria-sort={
                          (query.sort ?? "startedAt") === c.key
                            ? query.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button type="button" onClick={() => sort(c.key)}>
                          {c.label}{" "}
                          {(query.sort ?? "startedAt") === c.key
                            ? query.dir === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={loading ? "opacity-60" : ""}>
                  {rows.map((r) => (
                    <tr
                      key={grouped ? `${r.type}:${r.name}` : r.spanId}
                      className={`${fresh.has(r.spanId) ? "bg-[#1F2A1F]" : "hover:bg-[#12161C]"} cursor-pointer`}
                      onClick={() =>
                        update({ trace: r.runId, step: r.spanId }, false)
                      }
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className="max-w-[260px] truncate border-b border-[#171B21] px-2 py-1.5"
                        >
                          {c.key === "name" ? (
                            <button
                              type="button"
                              className="flex max-w-full items-center gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                update(
                                  { trace: r.runId, step: r.spanId },
                                  false,
                                );
                              }}
                              title={`${r.name}; open ${grouped ? "an example step" : "step"}`}
                            >
                              <TypeIcon type={r.type} failed={r.errors > 0} />
                              <span className="truncate">{r.name}</span>
                            </button>
                          ) : c.key === "startedAt" ? (
                            <time
                              title={formatTime(r.createdAt)}
                              className="font-mono text-xs"
                            >
                              {relativeTime(r.createdAt, clock)}
                            </time>
                          ) : c.key === "latency" || c.key === "p95" ? (
                            <span className="font-mono text-xs">
                              {formatDuration(Number(value(r, c.key)))}
                            </span>
                          ) : c.key === "cost" ? (
                            <span className="font-mono text-xs">
                              {formatCost(r.costUsd)}
                            </span>
                          ) : c.key === "errors" ? (
                            <span
                              className={`font-mono text-xs ${r.errors ? "text-[#FF8A8A]" : "text-[#6B7380]"}`}
                              title={r.errorMessage}
                            >
                              {grouped ? r.errors : r.errorType || "—"}
                            </span>
                          ) : (
                            <span
                              className="font-mono text-xs"
                              title={String(value(r, c.key))}
                            >
                              {value(r, c.key) === "" ? "—" : value(r, c.key)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1F242C] px-4 py-3 text-xs text-[#8B93A1]">
            <span>
              {data?.total ?? 0} {grouped ? "action groups" : "actions"}
            </span>
            <label>
              Rows{" "}
              <select
                aria-label="Rows per page"
                className={control}
                value={query.pageSize ?? "50"}
                onChange={(e) => update({ pageSize: e.target.value })}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={!data?.page || loading}
                onClick={() =>
                  update({ page: String((data?.page ?? 0) - 1) }, false)
                }
              >
                ‹
              </button>
              <span>
                Page {(data?.page ?? 0) + 1} of{" "}
                {Math.max(
                  1,
                  Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50)),
                )}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={
                  loading ||
                  !data ||
                  (data.page + 1) * data.pageSize >= data.total
                }
                onClick={() =>
                  update({ page: String((data?.page ?? 0) + 1) }, false)
                }
              >
                ›
              </button>
            </div>
          </footer>
        </main>
      </div>
      {query.trace ? (
        <TracePanel
          key={`${query.trace}:${query.step ?? ""}`}
          projectId={projectId}
          runId={query.trace}
          initialStepId={query.step}
          summary={undefined}
          view={view}
          onView={(v) => update({ view: v === "tree" ? "" : v }, false)}
          onClose={() => update({ trace: "", step: "" }, false)}
          onFilter={(k, v) =>
            update({ [k]: encodeValues([v]), trace: "", step: "" })
          }
          onStep={(delta) => {
            const i = rows.findIndex((r) => r.spanId === query.step);
            const next = rows[i + delta];
            if (next) update({ trace: next.runId, step: next.spanId }, false);
          }}
        />
      ) : null}
    </div>
  );
}
