"use client";

import { FirstTraceEmpty } from "../first-trace-empty";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RANGES, TimeRangePicker } from "../tracing/time-range-picker";
import { decodeValues, encodeValues } from "../tracing/facet-filter";
import { compactNumber, downloadFile, formatDuration, relativeTime, toCsv } from "../tracing/format";
import { changePercent, costPerThousandTokens, cumulative, stackSeries, type StackedSeries } from "@/lib/cost-breakdown";
import type { CostBreakdown, CostDimension, CostGroup } from "@/lib/tinybird";

type Query = Record<string, string>;
type Data = CostBreakdown;

const LIVE_STORAGE = "uncoil.costs.live";
const DEFAULT_RANGE = "30d";
/** Each ledger tab filters by the URL parameter the Tracing page already understands. */
const TABS: Array<{ id: CostDimension; label: string; param: string; one: string }> = [
  { id: "model", label: "Model", param: "modelId", one: "model" },
  { id: "tool", label: "Tool", param: "toolName", one: "tool" },
  { id: "user", label: "User", param: "endUserId", one: "user" },
  { id: "agent", label: "Agent", param: "traceName", one: "agent" },
  { id: "release", label: "Release", param: "release", one: "release" },
  { id: "environment", label: "Environment", param: "environment", one: "environment" },
];
const FILTER_PARAMS = TABS.map((tab) => tab.param);
// Tonal ramp so the only accent is yellow; the legend names every slice.
const SLICE_COLORS = ["#F4D44D", "#E6E9EE", "#9AA3B2", "#6B7380", "#454C58", "#2C323B"];

function money(value: number) {
  if (!value) return "$0.00";
  if (value >= 100) return `$${value.toLocaleString("en", { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}
const percent = (value: number) => `${value >= 10 || value === 0 ? value.toFixed(0) : value.toFixed(1)}%`;

function niceMax(value: number) {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= value * 0.9999) ?? power * 10;
}

function bucketLabel(start: number, bucketMs: number) {
  const date = new Date(start);
  return bucketMs >= 86_400_000
    ? date.toLocaleDateString([], { month: "short", day: "numeric" })
    : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CostsExplorer({ projectId, initialQuery }: { projectId: string; initialQuery: Query }) {
  const [query, setQuery] = useState<Query>(initialQuery);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [clock, setClock] = useState(() => Date.now());
  const [live, setLive] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { try { if (window.localStorage.getItem(LIVE_STORAGE) === "paused") setLive(false); } catch {} }, []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const params = new URLSearchParams(query);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [query]);

  const update = useCallback((patch: Query) => {
    setQuery((current) => {
      const next = { ...current, ...patch };
      for (const key of Object.keys(next)) if (next[key] === "") delete next[key];
      return next;
    });
  }, []);

  const range = RANGES.find((item) => item.id === (query.range ?? DEFAULT_RANGE)) ?? RANGES.find((item) => item.id === DEFAULT_RANGE)!;
  const fixedWindow = Boolean(query.from || query.to);
  const apiParams = useMemo(() => {
    const params = new URLSearchParams();
    const to = query.to ? Number(query.to) : now;
    params.set("to", String(to));
    params.set("from", query.from ?? String(to - range.ms));
    for (const key of FILTER_PARAMS) if (query[key]) params.set(key, query[key]);
    return params;
  }, [query, now, range.ms]);
  const requestKey = apiParams.toString();
  const base = `/api/projects/${encodeURIComponent(projectId)}/costs`;

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    fetch(`${base}?${requestKey}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Could not load costs");
        if (id !== requestId.current) return;
        setData(body as Data);
        setError(null);
        setSettledKey(requestKey);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || id !== requestId.current) return;
        setError(reason instanceof Error ? reason.message : "Could not load costs");
        setSettledKey(requestKey);
      });
    return () => controller.abort();
  }, [base, requestKey]);

  // Live updates: for relative ranges, quietly refetch with the window moved forward. Skipped while paused, for fixed
  // windows, hidden tabs and pending loads; a good poll clears an earlier error, failures back off from 5s to 60s.
  useEffect(() => {
    if (!live || fixedWindow) return;
    let delay = 5000;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden && settledKey === requestKey) {
        const issued = requestId.current;
        const params = new URLSearchParams(apiParams);
        const to = Date.now();
        params.set("to", String(to));
        params.set("from", String(to - range.ms));
        try {
          const response = await fetch(`${base}?${params}`, { cache: "no-store" });
          if (!response.ok) throw new Error(`poll ${response.status}`);
          const body = (await response.json()) as Data;
          delay = 5000;
          if (issued === requestId.current) { setError(null); setData(body); }
        } catch {
          delay = Math.min(delay * 2, 60_000);
        }
      }
      if (!stopped) timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => { stopped = true; clearTimeout(timer); };
  }, [apiParams, base, fixedWindow, live, range.ms, requestKey, settledKey]);

  const loading = settledKey !== requestKey && !data;
  const tab = TABS.find((item) => item.id === query.by) ?? TABS[0];
  const isLive = live && !fixedWindow;
  const totals = data?.totals;
  const delta = data ? changePercent(data.totals.costUsd, data.previous.costUsd) : null;
  const series: StackedSeries | null = useMemo(
    () => (data ? stackSeries(data.series, data.bucketSeconds, data.range) : null),
    [data],
  );
  const running = useMemo(() => cumulative(series?.buckets.map((bucket) => bucket.total) ?? []), [series]);
  const activeFilters = TABS.flatMap((item) => (query[item.param] ? [{ param: item.param, label: `${item.label}: ${decodeValues(query[item.param]).join(", ")}` }] : []));
  const rows = data?.groups[tab.id] ?? [];
  const empty = Boolean(data) && data!.totals.steps === 0;

  function toggleLive() {
    const next = !live;
    setLive(next);
    if (next) setNow(Date.now());
    try { window.localStorage.setItem(LIVE_STORAGE, next ? "live" : "paused"); } catch {}
  }

  function exportCsv() {
    if (!data) return;
    const total = data.totals.costUsd;
    downloadFile(`costs-by-${tab.id}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(
      [tab.label, "Cost USD", "Share %", "Calls", "Traces", "Input tokens", "Output tokens", "Avg latency ms"],
      rows.map((row) => [row.key, row.costUsd, total > 0 ? (row.costUsd / total) * 100 : 0, row.calls, row.traces, row.inputTokens, row.outputTokens, Math.round(row.avgLatencyMs)]),
    ), "text/csv;charset=utf-8");
  }

  const traceHref = (runId: string) => `/dashboard/${encodeURIComponent(projectId)}/tracing?${new URLSearchParams({ trace: runId, from: String(data?.range.from ?? ""), to: String(data?.range.to ?? "") })}`;
  const filterHref = (param: string, key: string) => update({ [param]: encodeValues([key]) });

  return (
    <div className="flex min-h-svh flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Costs</h1>
        <p className="hidden text-xs text-[#6B7380] md:block">What your agents spent, from recorded model calls.</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <TimeRangePicker range={query.range ?? DEFAULT_RANGE} from={query.from ? Number(query.from) : undefined} to={query.to ? Number(query.to) : undefined} now={now}
            onPreset={(id) => { setNow(Date.now()); update({ range: id, from: "", to: "" }); }}
            onCustom={(from, to) => { const current = Date.now(); setNow(current); update({ from: String(from), to: String(Math.min(to, current)) }); }}
            onReset={() => update({ from: "", to: "" })} />
          <button type="button" aria-pressed={isLive} onClick={toggleLive} disabled={fixedWindow}
            title={fixedWindow ? "Live updates are off for a fixed window" : isLive ? "Spend updates automatically. Click to pause." : "Paused. Click to resume live updates."}
            className="flex h-8 items-center gap-2 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260] disabled:opacity-50">
            <span aria-hidden="true" className={`size-2 rounded-full ${isLive ? "animate-pulse bg-[#5BE3A0]" : "bg-[#6B7380]"}`} />{isLive ? "Live" : "Paused"}
          </button>
          <button type="button" onClick={() => setNow(Date.now())} className="h-8 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260]">Refresh</button>
        </div>
      </header>

      {activeFilters.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1F242C] px-4 py-1.5">
          <span className="text-[11px] text-[#6B7380]">Traces using</span>
          {activeFilters.map((filter) => (
            <button key={filter.param} type="button" onClick={() => update({ [filter.param]: "" })} aria-label={`Remove filter ${filter.label}`}
              className="flex h-6 items-center gap-1.5 rounded border border-[#262C35] bg-[#111418] px-2 font-mono text-[11px] text-[#C9CED6] hover:border-[#4A5260]">{filter.label}<span aria-hidden="true" className="text-[#6B7380]">×</span></button>
          ))}
          <button type="button" onClick={() => update(Object.fromEntries(FILTER_PARAMS.map((param) => [param, ""])))} className="text-xs text-[#8B93A1] hover:text-white">Clear all</button>
        </div>
      ) : null}

      {error ? <div role="alert" className="border-b border-[#4A2A2A] bg-[#1A1111] px-4 py-2 text-xs text-[#FF8A8A]">{error}</div> : null}

      {loading ? (
        <div className="grid gap-px p-4" aria-busy="true"><div className="h-40 animate-pulse bg-[#111418]" /><div className="mt-4 h-56 animate-pulse bg-[#111418]" /></div>
      ) : empty && !activeFilters.length ? (
        <FirstTraceEmpty projectId={projectId} showSnippet={false} title="See what your agent spends" description="Costs show up here as soon as your agent sends traces with model calls: spend per model, per day and per tool." />
      ) : empty ? (
        <div className="m-4 border border-dashed border-[#262C35] p-10 text-center">
          <p className="text-sm font-medium">No spend in this window</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#8B93A1]">{activeFilters.length ? "No recorded steps match these filters in this time range." : "Costs appear here as soon as your agent sends traces with model calls."}</p>
          {activeFilters.length ? <button type="button" className="mt-4 rounded-md bg-[#F4D44D] px-4 py-2 text-sm font-medium text-[#0B0D10]" onClick={() => update({ ...Object.fromEntries(FILTER_PARAMS.map((param) => [param, ""])), range: "90d", from: "", to: "" })}>Clear filters and show 90 days</button>
            : <a className="mt-4 inline-block rounded-md bg-[#F4D44D] px-4 py-2 text-sm font-medium text-[#0B0D10]" href={`/dashboard/${encodeURIComponent(projectId)}/quickstart`}>Open quickstart</a>}
        </div>
      ) : data && totals && series ? (
        <main className="grid grid-cols-[minmax(0,1fr)]">
          {/* Statement: the spend figure on the left, the running total on the right. */}
          <section aria-label="Spend summary" className="grid grid-cols-[minmax(0,1fr)] border-b border-[#1F242C] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="border-b border-[#1F242C] p-5 lg:border-b-0 lg:border-r">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6B7380]">Total spend · {range && !fixedWindow ? range.label.toLowerCase() : "selected window"}</div>
              <div className="mt-2 font-mono text-[44px] font-medium leading-none tracking-tight text-[#F4D44D] sm:text-[56px]" data-testid="total-spend">{money(totals.costUsd)}</div>
              <div className="mt-3 font-mono text-xs text-[#8B93A1]">
                {delta === null ? "No spend in the period before to compare with" : (
                  <><span className={delta > 0 ? "text-[#FF8A8A]" : "text-[#5BE3A0]"}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {percent(Math.abs(delta))}</span> vs {money(data.previous.costUsd)} in the period before</>
                )}
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-px border border-[#1F242C] bg-[#1F242C] font-mono text-xs">
                {[
                  ["Traces", compactNumber(totals.traces)],
                  ["Average per trace", totals.traces ? money(totals.costUsd / totals.traces) : "–"],
                  ["Median / 95th trace", `${money(totals.p50TraceCostUsd)} / ${money(totals.p95TraceCostUsd)}`],
                  ["Per 1K tokens", (() => { const rate = costPerThousandTokens(totals.costUsd, totals.inputTokens + totals.outputTokens); return rate === null ? "–" : money(rate); })()],
                  ["Input tokens", compactNumber(totals.inputTokens)],
                  ["Output tokens", compactNumber(totals.outputTokens)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#0E1115] px-3 py-2.5"><dt className="text-[10px] uppercase tracking-wider text-[#6B7380]">{label}</dt><dd className="mt-1 truncate text-[#E6E9EE]">{value}</dd></div>
                ))}
              </dl>
            </div>
            <RunningTotal series={series} running={running} hover={hover} onHover={setHover} />
          </section>

          {totals.unpricedCalls > 0 ? (
            <div role="note" className="border-b border-[#1F242C] bg-[#14110A] px-4 py-2 text-xs text-[#E8D88A]">
              {compactNumber(totals.unpricedCalls)} of {compactNumber(totals.modelCalls)} model calls recorded tokens but no price, so they count as $0 here. The real total is higher.
            </div>
          ) : null}

          <section aria-label="Spend over time" className="border-b border-[#1F242C] px-5 py-4">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-sm font-semibold">Spend by model</h2>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-[#8B93A1]">
                {series.models.map((model, index) => (<li key={model} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2" style={{ background: SLICE_COLORS[index] }} />{model}</li>))}
              </ul>
            </div>
            <StackedBars series={series} hover={hover} onHover={setHover} />
          </section>

          <section aria-label="Cost ledger" className="border-b border-[#1F242C]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
              <h2 className="mr-2 text-sm font-semibold">Ledger</h2>
              <div role="tablist" aria-label="Group spend by" className="flex flex-wrap gap-1">
                {TABS.map((item) => {
                  const count = data.groups[item.id].length;
                  return (
                    <button key={item.id} type="button" role="tab" aria-selected={tab.id === item.id} disabled={!count} onClick={() => update({ by: item.id === "model" ? "" : item.id })}
                      className={`h-7 border px-2.5 text-xs disabled:opacity-35 ${tab.id === item.id ? "border-[#F4D44D] bg-[#F4D44D] font-medium text-[#0B0D10]" : "border-[#262C35] text-[#C9CED6] hover:border-[#4A5260]"}`}>
                      {item.label}<span className={`ml-1.5 font-mono text-[10px] ${tab.id === item.id ? "text-[#0B0D10]/70" : "text-[#6B7380]"}`}>{count >= 25 ? "25+" : count}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={exportCsv} disabled={!rows.length} className="ml-auto h-7 border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:text-white disabled:opacity-40">Export CSV</button>
            </div>
            <Ledger rows={rows} total={totals.costUsd} label={tab.label} one={tab.one} onPick={(key) => filterHref(tab.param, key)} />
          </section>

          <section aria-label="Most expensive traces" className="px-4 py-4">
            <h2 className="mb-2 text-sm font-semibold">Most expensive traces</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#6B7380]">
                  <th className="w-8 py-1.5 font-normal">#</th><th className="py-1.5 font-normal">Trace</th><th className="py-1.5 font-normal">Main model</th>
                  <th className="py-1.5 text-right font-normal">Tokens</th><th className="py-1.5 text-right font-normal">Duration</th><th className="py-1.5 pl-3 font-normal">Started</th><th className="w-[26%] py-1.5 pl-3 text-right font-normal">Cost</th>
                </tr></thead>
                <tbody>
                  {data.topTraces.map((trace, index) => (
                    <tr key={trace.runId} className="border-t border-[#1A1F27] hover:bg-[#0E1115]">
                      <td className="py-1.5 text-[#6B7380]">{index + 1}</td>
                      <td className="max-w-[260px] truncate py-1.5"><a href={traceHref(trace.runId)} className="text-[#8AB4FF] hover:underline">{trace.traceName || trace.runId.slice(0, 12)}</a>{trace.errored ? <span className="ml-2 text-[#FF8A8A]">error</span> : null}</td>
                      <td className="max-w-[160px] truncate py-1.5 text-[#C9CED6]">{trace.modelId || "–"}</td>
                      <td className="py-1.5 text-right text-[#C9CED6]">{compactNumber(trace.inputTokens + trace.outputTokens)}</td>
                      <td className="py-1.5 text-right text-[#C9CED6]">{formatDuration(trace.durationMs)}</td>
                      <td className="py-1.5 pl-3 text-[#8B93A1]" title={trace.startedAt}>{relativeTime(trace.startedAt, clock)}</td>
                      <td className="py-1.5 pl-3"><div className="flex items-center justify-end gap-2"><span aria-hidden="true" className="h-1 flex-1 bg-[#1A1F27]"><span className="block h-full bg-[#F4D44D]" style={{ width: `${data.totals.maxTraceCostUsd > 0 ? (trace.costUsd / data.totals.maxTraceCostUsd) * 100 : 0}%` }} /></span><span className="w-20 text-right text-[#E6E9EE]">{money(trace.costUsd)}</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      ) : null}
    </div>
  );
}

/** Running total of spend across the window, drawn as a stepped line that shares the hover position with the bars. */
function RunningTotal({ series, running, hover, onHover }: { series: StackedSeries; running: number[]; hover: number | null; onHover: (index: number | null) => void }) {
  const count = series.buckets.length;
  const peak = running.at(-1) ?? 0;
  const x = (index: number) => (count > 1 ? (index / (count - 1)) * 100 : 50);
  const y = (value: number) => 38 - (peak > 0 ? (value / peak) * 36 : 0);
  const line = running.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(index === 0 ? value : running[index - 1]).toFixed(2)} L${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
  const shown = hover ?? count - 1;
  return (
    <div className="flex min-w-0 flex-col p-5">
      <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6B7380]">
        <span>Running total</span>
        <span className="normal-case tracking-normal text-[#C9CED6]">{series.buckets[shown] ? `${bucketLabel(series.buckets[shown].start, series.bucketMs)} · ${money(running[shown] ?? 0)}` : ""}</span>
      </div>
      <div className="relative mt-3 min-h-40 flex-1" onMouseLeave={() => onHover(null)}
        onMouseMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); onHover(Math.min(count - 1, Math.max(0, Math.round(((event.clientX - box.left) / box.width) * (count - 1))))); }}>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 size-full" role="img" aria-label={`Running total reaches ${money(peak)}`}>
          {[0.25, 0.5, 0.75].map((fraction) => (<line key={fraction} x1="0" x2="100" y1={38 - fraction * 36} y2={38 - fraction * 36} stroke="#1A1F27" strokeWidth="1" vectorEffect="non-scaling-stroke" />))}
          {line ? <path d={`${line} L100,38 L0,38 Z`} fill="#F4D44D" fillOpacity="0.07" /> : null}
          {line ? <path d={line} fill="none" stroke="#F4D44D" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
          {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1="0" y2="40" stroke="#E6E9EE" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        <span className="absolute left-0 top-0 font-mono text-[10px] text-[#6B7380]">{money(peak)}</span>
        <span className="absolute bottom-0 left-0 font-mono text-[10px] text-[#6B7380]">$0</span>
      </div>
    </div>
  );
}

/** One stacked column per bucket, each slice a model's share of that bucket's spend. */
function StackedBars({ series, hover, onHover }: { series: StackedSeries; hover: number | null; onHover: (index: number | null) => void }) {
  const peak = niceMax(Math.max(...series.buckets.map((bucket) => bucket.total), 0));
  const count = series.buckets.length;
  const picked = hover !== null ? series.buckets[hover] : null;
  return (
    <div>
      <div className="mb-2 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-[#C9CED6]" aria-live="polite">
        {picked ? (
          <>
            <span className="text-[#8B93A1]">{bucketLabel(picked.start, series.bucketMs)}</span>
            <span className="text-[#E6E9EE]">{money(picked.total)}</span>
            {series.models.map((model, index) => picked.parts[index] > 0 ? <span key={model} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2" style={{ background: SLICE_COLORS[index] }} />{model} {money(picked.parts[index])}</span> : null)}
          </>
        ) : <span className="text-[#6B7380]">Hover a column to see its models.</span>}
      </div>
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
        <div className="relative font-mono text-[10px] text-[#6B7380]" aria-hidden="true">
          {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (<span key={fraction} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - fraction) * 100}%` }}>{money(peak * fraction)}</span>))}
        </div>
        <div className="relative h-48" onMouseLeave={() => onHover(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (<div key={fraction} aria-hidden="true" className="absolute inset-x-0 border-t border-[#1A1F27]" style={{ top: `${fraction * 100}%` }} />))}
          <div className="absolute inset-0 flex items-end gap-px" role="img" aria-label={`Daily spend by model, peak ${money(Math.max(...series.buckets.map((bucket) => bucket.total), 0))}`}>
            {series.buckets.map((bucket, index) => (
              <div key={bucket.start} className={`flex h-full min-w-px flex-1 flex-col-reverse justify-start ${hover === index ? "bg-[#E6E9EE]/10" : ""}`} onMouseEnter={() => onHover(index)}>
                {bucket.parts.map((part, slice) => part > 0 ? <div key={slice} style={{ height: `${(part / peak) * 100}%`, background: SLICE_COLORS[slice] }} /> : null)}
              </div>
            ))}
          </div>
        </div>
        <span />
        <div className="flex justify-between font-mono text-[10px] text-[#6B7380]" aria-hidden="true">
          <span>{bucketLabel(series.buckets[0]?.start ?? 0, series.bucketMs)}</span>
          {count > 2 ? <span>{bucketLabel(series.buckets[Math.floor(count / 2)].start, series.bucketMs)}</span> : null}
          <span>{bucketLabel(series.buckets[count - 1]?.start ?? 0, series.bucketMs)}</span>
        </div>
      </div>
    </div>
  );
}

function Ledger({ rows, total, label, one, onPick }: { rows: CostGroup[]; total: number; label: string; one: string; onPick: (key: string) => void }) {
  if (!rows.length) return <p className="px-4 py-6 text-xs text-[#6B7380]">No {one} recorded on these traces.</p>;
  const top = Math.max(...rows.map((row) => row.costUsd), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse font-mono text-xs">
        <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#6B7380]">
          <th className="w-10 py-2 pl-4 font-normal">#</th><th className="py-2 font-normal">{label}</th>
          <th className="w-[26%] py-2 pl-3 font-normal">Share of spend</th>
          <th className="py-2 text-right font-normal">Calls</th><th className="py-2 text-right font-normal">Traces</th>
          <th className="py-2 text-right font-normal">In</th><th className="py-2 text-right font-normal">Out</th>
          <th className="py-2 text-right font-normal">Avg latency</th><th className="py-2 text-right font-normal">$ / 1K tokens</th><th className="py-2 pr-4 text-right font-normal">Cost</th>
        </tr></thead>
        <tbody>
          {rows.map((row, index) => {
            const share = total > 0 ? (row.costUsd / total) * 100 : 0;
            const rate = costPerThousandTokens(row.costUsd, row.inputTokens + row.outputTokens);
            return (
              <tr key={row.key} className="border-t border-[#1A1F27] hover:bg-[#0E1115]">
                <td className="py-1.5 pl-4 text-[#6B7380]">{String(index + 1).padStart(2, "0")}</td>
                <td className="max-w-[220px] truncate py-1.5"><button type="button" onClick={() => onPick(row.key)} title={`Only traces with ${row.key}`} className="max-w-full truncate text-left text-[#8AB4FF] hover:underline">{row.key}</button></td>
                <td className="py-1.5 pl-3"><div className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 flex-1 bg-[#1A1F27]"><span className="block h-full bg-[#F4D44D]" style={{ width: `${top > 0 ? (row.costUsd / top) * 100 : 0}%` }} /></span><span className="w-10 text-right text-[#8B93A1]">{percent(share)}</span></div></td>
                <td className="py-1.5 text-right text-[#C9CED6]">{compactNumber(row.calls)}</td>
                <td className="py-1.5 text-right text-[#C9CED6]">{compactNumber(row.traces)}</td>
                <td className="py-1.5 text-right text-[#C9CED6]">{compactNumber(row.inputTokens)}</td>
                <td className="py-1.5 text-right text-[#C9CED6]">{compactNumber(row.outputTokens)}</td>
                <td className="py-1.5 text-right text-[#C9CED6]">{formatDuration(row.avgLatencyMs)}</td>
                <td className="py-1.5 text-right text-[#C9CED6]">{rate === null ? "–" : money(rate)}</td>
                <td className="py-1.5 pr-4 text-right text-[#E6E9EE]">{money(row.costUsd)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
