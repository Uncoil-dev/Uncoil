"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageTitle } from "@/components/dashboard/page-title";
import { RANGES, TimeRangePicker } from "@/components/dashboard/tracing/time-range-picker";
import { compactNumber } from "@/components/dashboard/tracing/format";
import { DEMO_BASE_PATH, DEMO_PROJECT_ID } from "@/lib/demo/demo-config";
import { squarify } from "@/lib/treemap";
import type { TraceTopic } from "@/lib/trace-topics";

type Topic = Pick<TraceTopic, "id" | "name" | "count" | "errorRate" | "outcome" | "issues" | "silentFailures">;
type TopicsResponse = { total: number; sampled: boolean; topics: Topic[]; error?: string };

const LIVE_STORAGE = "uncoil.tracing.live";
/** URL keys that change the view, not the data. `topic` is dropped because the map always lists every topic. */
const VIEW_KEYS = ["range", "from", "to", "topic", "trace", "mode", "view", "columns", "savedView", "page"];
const BASE_POLL_MS = 5_000, MAX_POLL_MS = 60_000;
const LAYOUT_W = 100, LAYOUT_H = 56;
const percent = (rate: number) => `${Math.round(rate * 100)}%`;

function readQuery() {
  const query: Record<string, string> = { range: "24h" };
  for (const [key, value] of new URLSearchParams(window.location.search)) if (value) query[key] = value.slice(0, 4096);
  return query;
}

export function TopicsExplorer({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState<Record<string, string>>(() => (typeof window === "undefined" ? { range: "24h" } : readQuery()));
  const [now, setNow] = useState(() => Date.now());
  const [data, setData] = useState<TopicsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const inFlight = useRef(false);
  // Pixel size of the map, so a tile only gets the big layout when it is tall enough to hold it.
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const mapRef = useCallback((node: HTMLUListElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    observer.current = new ResizeObserver(([entry]) => setMapSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.current.observe(node);
  }, []);
  const lastBody = useRef("");

  const update = useCallback((patch: Record<string, string>) => {
    setQuery((current) => {
      const next = { ...current, ...patch };
      for (const key of Object.keys(next)) if (next[key] === "") delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}?${new URLSearchParams(query)}`);
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(() => setPaused(window.localStorage.getItem(LIVE_STORAGE) === "paused"), 0);
    return () => clearTimeout(timer);
  }, []);

  const fixedWindow = Boolean(query.from);
  const apiParams = useMemo(() => {
    const params = new URLSearchParams();
    const to = query.to ? Number(query.to) : now;
    params.set("to", String(to));
    params.set("from", query.from ?? String(to - (RANGES.find((item) => item.id === query.range)?.ms ?? 86_400_000)));
    for (const [key, value] of Object.entries(query)) if (!VIEW_KEYS.includes(key)) params.set(key, value);
    return params;
  }, [query, now]);
  // Relative ranges move forward with the clock, so the request key ignores the moving `from`/`to`.
  const requestKey = useMemo(() => JSON.stringify(Object.entries(query).filter(([key]) => !["page", "topic", "trace", "view", "mode"].includes(key)).sort()), [query]);
  const apiRef = useRef(apiParams);
  useEffect(() => { apiRef.current = apiParams; }, [apiParams]);

  const load = useCallback(async (quiet: boolean, signal?: AbortSignal) => {
    // Only polls skip while a request is running; a filter change must always load, and aborts the older request.
    if (quiet && inFlight.current) return false;
    inFlight.current = true;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/topics?${apiRef.current}`, { cache: "no-store", signal });
      const body = (await response.json()) as TopicsResponse;
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      const text = JSON.stringify(body);
      const changed = text !== lastBody.current;
      if (changed) { lastBody.current = text; setData(body); }
      setError(null);
      return changed;
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Topics are temporarily unavailable.");
      return false;
    } finally {
      if (!signal?.aborted) inFlight.current = false;
      if (!signal?.aborted && !quiet) setSettled(requestKey);
    }
  }, [projectId, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    void load(false, controller.signal);
    return () => controller.abort();
  }, [load, reload]);

  // Live: poll while the tab is visible; back off while nothing changes or a request fails.
  useEffect(() => {
    if (paused || fixedWindow) return;
    let delay = BASE_POLL_MS, timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 0));
        const changed = await load(true);
        delay = changed ? BASE_POLL_MS : Math.min(delay * 2, MAX_POLL_MS);
      }
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [paused, fixedWindow, load]);

  const loading = settled !== requestKey;
  const topics = useMemo(() => data?.topics ?? [], [data]);
  const tiles = useMemo(() => squarify(topics, (topic) => topic.count, LAYOUT_W, LAYOUT_H), [topics]);
  const failed = topics.reduce((sum, topic) => sum + Math.round(topic.count * topic.errorRate), 0);
  const focus = topics.find((topic) => topic.id === active) ?? topics[0];
  const filters = Object.entries(query).filter(([key]) => !VIEW_KEYS.includes(key));
  const tracingHref = (topicId: string) => {
    const params = new URLSearchParams(query);
    for (const key of ["trace", "view", "mode", "page"]) params.delete(key);
    params.set("topic", topicId);
    return `${projectId === DEMO_PROJECT_ID ? DEMO_BASE_PATH : `/dashboard/${encodeURIComponent(projectId)}`}/tracing?${params}`;
  };

  return (
    <div className="flex min-h-svh flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <PageTitle>Topics</PageTitle>
        <form className="flex min-w-[200px] flex-1 items-center gap-2 border border-[#262C35] bg-[#111418] px-2.5 focus-within:border-[#4A5260]"
          onSubmit={(event) => { event.preventDefault(); update({ q: String(new FormData(event.currentTarget).get("q") ?? "").trim().slice(0, 200) }); }}>
          <label htmlFor="topics-search" className="sr-only">Search traces</label>
          <input id="topics-search" name="q" key={query.q ?? ""} defaultValue={query.q ?? ""} placeholder="Search text in traces" autoComplete="off"
            className="h-7 w-full bg-transparent outline-none placeholder:text-[#6B7380]" />
        </form>
        <TimeRangePicker range={query.range ?? "24h"} from={query.from ? Number(query.from) : undefined} to={query.to ? Number(query.to) : undefined} now={now}
          onPreset={(id) => { setNow(Date.now()); update({ range: id, from: "", to: "" }); }}
          onCustom={(from, to) => { const current = Date.now(); setNow(current); update({ from: String(from), to: String(Math.min(to, current)) }); }}
          onReset={() => update({ from: "", to: "" })} />
        <button type="button" disabled={fixedWindow} aria-pressed={!paused && !fixedWindow}
          title={fixedWindow ? "A fixed time window does not update live" : paused ? "Resume live updates" : "Pause live updates"}
          onClick={() => { const next = !paused; setPaused(next); try { window.localStorage.setItem(LIVE_STORAGE, next ? "paused" : "live"); } catch {} }}
          className="flex h-7 items-center gap-1.5 border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:text-white disabled:opacity-50">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${paused || fixedWindow ? "bg-[#6B7380]" : "animate-pulse bg-[#5BE3A0]"}`} />{paused || fixedWindow ? "Paused" : "Live"}
        </button>
        <button type="button" onClick={() => { setNow(Date.now()); setReload((n) => n + 1); }} className="h-7 border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:text-white">Refresh</button>
      </header>

      {filters.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1F242C] px-4 py-2" aria-label="Active filters">
          {filters.map(([key, value]) => (
            <button key={key} type="button" onClick={() => update({ [key]: "" })} aria-label={`Remove filter ${key} ${value}`}
              className="flex h-6 items-center gap-1.5 border border-[#262C35] bg-[#111418] px-2 text-xs text-[#C9CED6] hover:text-white">
              <span className="text-[#8B93A1]">{key}</span><span className="max-w-[240px] truncate">{value}</span><span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" onClick={() => setQuery((current) => Object.fromEntries(Object.entries(current).filter(([key]) => VIEW_KEYS.includes(key))))} className="px-1 text-xs text-[#8B93A1] hover:text-white">Clear all</button>
        </div>
      ) : null}

      <main className="flex flex-1 flex-col gap-3 p-3 md:p-4">
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-3 border border-[#FF6B6B]/40 bg-[#FF6B6B]/10 px-3 py-2 text-[#FF8A8A]">
            <span>{error}</span>
            <button type="button" onClick={() => setReload((n) => n + 1)} className="border border-[#FF6B6B]/50 px-2 py-0.5 text-xs hover:text-white">Try again</button>
          </div>
        ) : null}

        {data ? (
          <dl className="flex flex-wrap gap-x-8 gap-y-1 border-b border-[#1F242C] pb-3 font-mono text-xs">
            <div><dt className="text-[#6B7380]">Traces</dt><dd className="text-sm text-[#E6E9EE]">{compactNumber(data.total)}</dd></div>
            <div><dt className="text-[#6B7380]">Topics</dt><dd className="text-sm text-[#E6E9EE]">{topics.filter((topic) => topic.id !== "other").length}</dd></div>
            <div><dt className="text-[#6B7380]">Failing</dt><dd className="text-sm text-[#FF8A8A]">{data.total ? percent(failed / data.total) : "0%"}</dd></div>
            {data.sampled ? <div className="self-end text-[#F4D44D]">Newest traces only</div> : null}
          </dl>
        ) : null}

        {!data && !error ? (
          <div role="status" aria-label="Loading topics" className="grid gap-1 sm:aspect-[100/56] sm:grid-cols-3 sm:grid-rows-2">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`min-h-20 animate-pulse bg-[#111418] ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`} />)}
          </div>
        ) : null}

        {data && topics.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 border border-dashed border-[#262C35] py-16 text-center">
            <p className="text-sm text-[#E6E9EE]">{loading ? "Loading topics" : "No topics in this window"}</p>
            <p className="max-w-sm text-[#8B93A1]">Topics appear once traces with an input arrive in the selected time range. Try a longer range or clear the filters.</p>
          </div>
        ) : null}

        {topics.length ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <ul ref={mapRef} aria-label="Topics by trace count" className="flex flex-col sm:relative sm:block sm:aspect-[100/56]">
              {tiles.map(({ item, x, y, w, h }, i) => {
                const other = item.id === "other";
                const issues = item.issues.slice(0, 3).map((issue) => issue.message).filter(Boolean).join("; ");
                const stacked = mapSize.w < 640;
                const big = !stacked && (w / LAYOUT_W) * mapSize.w >= 150 && (h / LAYOUT_H) * mapSize.h >= 170;
                const selected = focus?.id === item.id;
                return (
                  <li key={item.id} className="sm:absolute sm:[height:var(--h)] sm:[left:var(--x)] sm:[top:var(--y)] sm:[width:var(--w)]"
                    style={{ "--i": i, "--x": `${(x / LAYOUT_W) * 100}%`, "--y": `${(y / LAYOUT_H) * 100}%`, "--w": `${(w / LAYOUT_W) * 100}%`, "--h": `${(h / LAYOUT_H) * 100}%` } as React.CSSProperties}>
                    <a href={tracingHref(item.id)} onMouseEnter={() => setActive(item.id)} onFocus={() => setActive(item.id)}
                      aria-label={`${item.name}: ${item.count} traces, ${percent(item.errorRate)} failing${issues ? `. Top issues: ${issues}` : ""}. Open in Tracing`}
                      className={`topic-tile relative block h-full min-h-[84px] overflow-hidden border outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#F4D44D] sm:min-h-0 ${selected ? "z-10 border-[#F4D44D] shadow-[inset_0_0_0_1px_#F4D44D]" : "border-[#eceae3]/15"} ${other ? "bg-[#0E1115] text-[#6B7380]" : "bg-[#14181D] text-[#E6E9EE]"}`}>
                      {item.errorRate > 0 ? (
                        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-[#FF6B6B]/25" style={{ height: `max(${item.errorRate * 100}%, 8px)` }}>
                          <span className="absolute inset-x-0 top-0 h-1 bg-[#FF6B6B] [background-image:conic-gradient(#FF6B6B_25%,transparent_0_50%,#FF6B6B_0_75%,transparent_0)] [background-size:4px_4px]" />
                          <span className="absolute inset-x-0 top-1 h-0.5 bg-[#FF6B6B]/70 [mask-image:linear-gradient(90deg,#000_50%,transparent_50%)] [mask-size:8px_2px]" />
                        </span>
                      ) : null}
                      <span className="relative flex h-full flex-col justify-start gap-1 overflow-hidden p-2.5 pb-3">
                        <span className={`${big ? "font-[family-name:var(--font-geist-pixel)] text-xl uppercase tracking-tight" : "text-xs font-medium"} line-clamp-3 min-h-0 overflow-hidden leading-tight ${selected ? "text-[#F4D44D]" : ""}`}>{item.name}</span>
                        {big ? <span className="font-mono text-4xl leading-none tracking-tight">{compactNumber(item.count)}</span> : null}
                        <span className="flex shrink-0 flex-wrap gap-x-2 font-mono text-[11px] leading-tight [text-shadow:0_1px_2px_#0B0D10]">
                          <span>{big ? "traces" : `${compactNumber(item.count)} traces`}</span>
                          <span className={item.errorRate > 0 ? "text-[#FFB0B0]" : "text-[#8B93A1]"}>{percent(item.errorRate)} failing</span>
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>

            {focus ? (
              <aside aria-live="polite" className="min-h-0 border border-[#1F242C] bg-[#0E1115] p-3 lg:max-h-[60vh] lg:overflow-auto">
                <h2 className="text-sm font-medium">{focus.name}</h2>
                <p className="mt-1 font-mono text-[11px] text-[#8B93A1]">{focus.outcome.succeeded} ok · <span className="text-[#FF8A8A]">{focus.outcome.failed} failed</span> · {focus.outcome.timedOut} timed out</p>
                <h3 className="mt-3 text-[11px] uppercase tracking-wide text-[#6B7380]">Top issues</h3>
                {focus.issues.length ? (
                  <ol className="mt-1.5 space-y-1.5">
                    {focus.issues.slice(0, 5).map((issue) => (
                      <li key={issue.id} className="flex items-start justify-between gap-2">
                        <span className="min-w-0 break-words text-[#C9CED6]">{issue.message || "No error message (silent failure)"}</span>
                        <span className="font-mono text-[11px] text-[#FF8A8A]">{issue.count}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-1.5 text-[#8B93A1]">No issues in this topic.</p>}
                {focus.silentFailures ? <p className="mt-3 text-[11px] text-[#8B93A1]">{focus.silentFailures} ended with no output and no error.</p> : null}
                <a href={tracingHref(focus.id)} className="mt-3 inline-block text-xs text-[#F4D44D] hover:underline">Open these traces in Tracing →</a>
              </aside>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
