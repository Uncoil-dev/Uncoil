"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { dailySeries, filterScores, formatScoreValue, histogram, needsAttention, periodChange, SOURCE_TEXT, summariseByName, type ScoreRow } from "@/lib/score-utils";
import { scoreSnippet, type ScoreSnippetLanguage } from "@/lib/score-snippets";
import { downloadFile, toCsv } from "../tracing/format";
import { BarList, Histogram, SplitBar, TrendChart, VolumeStrip } from "./score-charts";
import { AddScore, ago, control, ScorePanel, Sheet } from "./score-drawer";
import { EmptyState } from "../empty/empty-state";
import { SampleScores } from "../empty/samples";

type Query = Record<string, string>;
const LOADED = 1000;
const DAYS = [{ id: "7", label: "7 days" }, { id: "14", label: "14 days" }, { id: "30", label: "30 days" }] as const;
const percent = (value: number) => `${Math.round(value * 100)}%`;

function readUrl(initial: Query): Query {
  if (typeof window === "undefined") return initial;
  const query: Query = {};
  for (const [key, value] of new URLSearchParams(window.location.search)) if (value) query[key] = value.slice(0, 200);
  return query;
}

function GradeFromCode({ projectId }: { projectId: string }) {
  const [language, setLanguage] = useState<ScoreSnippetLanguage>("python");
  const [copied, setCopied] = useState(false);
  const code = scoreSnippet(language, projectId);
  return (
    <div className="mt-8 text-left">
      <div className="flex items-center gap-2">
        <h3 className="mr-auto text-xs font-semibold">Or let your agent grade itself</h3>
        {(["python", "typescript"] as const).map((item) => <button key={item} type="button" aria-pressed={language === item} onClick={() => setLanguage(item)} className={`h-7 rounded border px-3 text-xs ${language === item ? "border-[#F4D44D] bg-[#F4D44D] font-medium text-[#090909]" : "border-[#262C35] text-[#C9CED6] hover:text-white"}`}>{item === "python" ? "Python" : "TypeScript"}</button>)}
        <button type="button" onClick={() => { void navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className="h-7 rounded border border-[#262C35] px-3 text-xs text-[#C9CED6] hover:text-white">{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded border border-[#262C35] bg-[#0E1115] p-4 font-mono text-[11px] leading-5 text-[#F4D44D]">{code}</pre>
      <p className="mt-2 text-[11px] text-[#6B7380]">Run your agent once and the scores appear here within seconds.</p>
    </div>
  );
}

function Delta({ change, kind }: { change: number | null; kind: string }) {
  if (change === null) return <span className="text-xs text-[#6B7380]">No earlier period to compare with</span>;
  if (Math.abs(change) < (kind === "boolean" ? 0.005 : 0.0005) && kind !== "categorical") return <span className="text-xs text-[#8B93A1]">Unchanged from the period before</span>;
  const up = change > 0;
  const text = kind === "boolean" ? `${Math.abs(Math.round(change * 100))} points` : kind === "categorical" ? `${Math.abs(Math.round(change))} scores` : formatScoreValue(Math.abs(change));
  const good = kind === "categorical" ? null : up;
  return <span className={`text-xs ${good === null ? "text-[#8B93A1]" : good ? "text-[#5BE3A0]" : "text-[#FF8A8A]"}`}>{up ? "▲" : "▼"} {text} {up ? "up" : "down"} on the period before</span>;
}

export function ScoresWorkspace({ projectId, initialQuery }: { projectId: string; initialQuery: Query }) {
  const typedProjectId = projectId as Id<"projects">;
  const scores = useQuery(api.evaluation.listScores, { projectId: typedProjectId, limit: LOADED }) as ScoreRow[] | undefined;
  const createScore = useMutation(api.evaluation.createScore);
  const [query, setQuery] = useState<Query>(() => ({ days: "14", ...readUrl(initialQuery) }));
  const [now, setNow] = useState(() => Date.now());
  const [logSearch, setLogSearch] = useState("");

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const update = useCallback((patch: Query) => setQuery((current) => {
    const next = { ...current, ...patch };
    for (const key of Object.keys(next)) if (next[key] === "") delete next[key];
    return next;
  }), []);
  useEffect(() => {
    const params = new URLSearchParams(query);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [query]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") update({ id: "", add: "" }); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [update]);

  const days = Number(DAYS.find((item) => item.id === query.days)?.id ?? 14);
  const windowStart = now - days * 86_400_000;
  const scoped = useMemo(() => (scores ?? []).filter((row) => !query.source || row.source === query.source), [scores, query.source]);
  const inWindow = useMemo(() => scoped.filter((row) => row.createdAt >= windowStart), [scoped, windowStart]);
  const names = useMemo(() => summariseByName(inWindow, now), [inWindow, now]);
  const selectedName = names.find((item) => item.name === query.name)?.name ?? names[0]?.name ?? null;
  const series = useMemo(() => (selectedName ? dailySeries(scoped, selectedName, now, days) : null), [scoped, selectedName, now, days]);
  const change = useMemo(() => (selectedName ? periodChange(scoped, selectedName, now, days) : null), [scoped, selectedName, now, days]);
  const mine = useMemo(() => inWindow.filter((row) => row.name === selectedName), [inWindow, selectedName]);
  const attention = useMemo(() => needsAttention(inWindow, 6), [inWindow]);
  const selectedRow = query.id ? (scores ?? []).find((row) => row._id === query.id) ?? null : null;
  const logRows = useMemo(() => filterScores(inWindow, { q: logSearch }).slice(0, 100), [inWindow, logSearch]);

  const domain: [number, number] = useMemo(() => {
    if (!series) return [0, 1];
    if (series.kind === "boolean") return [0, 1];
    const values = series.days.flatMap((day) => (day.value === null ? [] : [day.value]));
    if (!values.length) return [0, 1];
    const lo = Math.min(...values); const hi = Math.max(...values);
    if (series.kind === "categorical") return [0, Math.max(1, hi)];
    if (lo >= 0 && hi <= 1) return [0, 1];
    const pad = (hi - lo || 1) * 0.15;
    return [lo - pad, hi + pad];
  }, [series]);
  const format = useCallback((value: number) => (series?.kind === "boolean" ? percent(value) : series?.kind === "categorical" ? String(Math.round(value)) : formatScoreValue(Math.round(value * 1000) / 1000)), [series?.kind]);

  function exportCsv() {
    downloadFile(`scores-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(["time", "name", "value", "type", "source", "trace", "span", "comment"], inWindow.map((row) => [new Date(row.createdAt).toISOString(), row.name, String(row.value), row.dataType, row.source, row.traceId ?? "", row.spanId ?? "", row.comment ?? ""])), "text/csv");
  }

  const booleanParts = useMemo(() => {
    const yes = mine.filter((row) => row.value === true).length; const no = mine.filter((row) => row.value === false).length;
    return [{ label: "True", value: yes, color: "#5BE3A0" }, { label: "False", value: no, color: "#FF8A8A" }];
  }, [mine]);
  const categoryItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of mine) counts.set(String(row.value), (counts.get(String(row.value)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  }, [mine]);
  const sourceItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of mine) counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: SOURCE_TEXT[label] ?? label, value }));
  }, [mine]);

  const empty = scores !== undefined && !scores.length;
  const bigValue = !series || series.overall === null ? "–" : series.kind === "boolean" ? percent(series.overall) : series.kind === "categorical" ? String(series.overall) : formatScoreValue(Math.round(series.overall * 1000) / 1000);

  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#1F242C] px-6 py-3">
        <div className="mr-auto"><h1 className="text-base font-semibold tracking-tight">Scores</h1><p className="text-[11px] text-[#6B7380]">How your agent is graded, over time</p></div>
        <div role="group" aria-label="Time range" className="flex overflow-hidden rounded border border-[#262C35]">
          {DAYS.map((item) => <button key={item.id} type="button" aria-pressed={String(days) === item.id} onClick={() => update({ days: item.id })} className={`h-7 px-3 text-xs ${String(days) === item.id ? "bg-[#F4D44D] font-medium text-[#090909]" : "bg-[#0E1115] text-[#C9CED6] hover:text-white"}`}>{item.label}</button>)}
        </div>
        <label className="sr-only" htmlFor="score-source">Source</label>
        <select id="score-source" className={control} value={query.source ?? ""} onChange={(event) => update({ source: event.target.value, name: "" })}><option value="">All sources</option>{Object.entries(SOURCE_TEXT).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#8B93A1]"><span className="size-1.5 animate-pulse rounded-full bg-[#5BE3A0]" />Live</span>
        <button type="button" onClick={exportCsv} disabled={!inWindow.length} className={`${control} disabled:opacity-40`}>Export CSV</button>
        <button type="button" onClick={() => update({ add: "1", id: "" })} className="h-7 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909] hover:bg-[#f7de70]">Add score</button>
      </header>

      {scores === undefined ? (
        <div className="grid gap-4 p-6" role="status" aria-label="Loading scores"><div className="h-9 w-72 animate-pulse rounded bg-[#11151A]" /><div className="h-72 animate-pulse rounded bg-[#11151A]" /><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded bg-[#11151A]" />)}</div></div>
      ) : empty ? (
        <div className="p-4 sm:p-6">
          <EmptyState eyebrow="Scores" title="Put a number on how good your agent is" why="A score grades a trace. Watch quality over time instead of guessing. Add one by hand to see this page fill in." sample={<SampleScores />} action={{ label: "Add the first score", onClick: () => update({ add: "1" }) }} />
          <div className="mx-auto max-w-2xl text-center"><GradeFromCode projectId={projectId} /></div>
        </div>
      ) : !names.length ? (
        <div className="p-16 text-center text-xs text-[#8B93A1]">No scores in the last {days} days{query.source ? ` from ${SOURCE_TEXT[query.source]}` : ""}. <button type="button" onClick={() => update({ days: "30", source: "" })} className="text-[#8AB4FF] underline">Look at 30 days, all sources</button></div>
      ) : (
        <div className="mx-auto grid w-full max-w-[1320px] gap-8 p-6">
          <section aria-label="Score trend">
            <div role="tablist" aria-label="Score name" className="mb-4 flex flex-wrap gap-1.5">
              {names.slice(0, 10).map((item) => <button key={item.name} role="tab" aria-selected={item.name === selectedName} onClick={() => update({ name: item.name })} className={`h-7 max-w-[14rem] truncate rounded-full border px-3 font-mono text-xs ${item.name === selectedName ? "border-[#F4D44D] bg-[#1A170C] text-[#F4D44D]" : "border-[#262C35] text-[#C9CED6] hover:text-white"}`}>{item.name}</button>)}
              {names.length > 10 ? <span className="self-center px-1 text-[11px] text-[#6B7380]">+{names.length - 10} more below</span> : null}
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 rounded-lg border border-[#1F242C] bg-[#0E1115] p-5">
                <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-1">
                  <div><div className="font-mono text-5xl leading-none tracking-tight">{bigValue}</div><div className="mt-1.5 text-[11px] uppercase tracking-wider text-[#6B7380]">{series?.kind === "numeric" ? "average" : series?.kind === "boolean" ? "true" : "scores"} · last {days} days · {series?.total.toLocaleString()} score{series?.total === 1 ? "" : "s"}</div></div>
                  <div className="pb-1"><Delta change={change?.change ?? null} kind={series?.kind ?? "numeric"} /></div>
                </div>
                {series ? <><TrendChart days={series.days} domain={domain} format={format} unit={series.kind === "numeric" ? "average" : series.kind === "boolean" ? "true" : "scores"} /><VolumeStrip days={series.days} /></> : null}
              </div>
              <div className="grid content-start gap-4">
                <div className="rounded-lg border border-[#1F242C] bg-[#0E1115] p-4"><h2 className="mb-3 text-[10px] uppercase tracking-wider text-[#6B7380]">{series?.kind === "numeric" ? "How scores are spread" : series?.kind === "boolean" ? "True or false" : "Most common"}</h2>
                  {series?.kind === "numeric" ? <Histogram buckets={histogram(mine.flatMap((row) => (typeof row.value === "number" ? [row.value] : [])))} format={(value) => formatScoreValue(Math.round(value * 100) / 100)} /> : series?.kind === "boolean" ? <SplitBar parts={booleanParts} /> : <BarList items={categoryItems} />}
                </div>
                <div className="rounded-lg border border-[#1F242C] bg-[#0E1115] p-4"><h2 className="mb-3 text-[10px] uppercase tracking-wider text-[#6B7380]">Who gave them</h2><BarList items={sourceItems} /></div>
              </div>
            </div>
          </section>

          <section aria-label="Needs attention">
            <h2 className="mb-3 text-sm font-semibold">Worth a look</h2>
            {!attention.length ? <p className="rounded-lg border border-dashed border-[#262C35] p-6 text-center text-xs text-[#8B93A1]">Nothing stands out. No failed yes/no scores and no unusually low numbers in this period.</p> : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {attention.map((row) => (
                  <li key={row._id}><button type="button" onClick={() => update({ id: row._id, add: "" })} className="block h-full w-full rounded-lg border border-[#2A1E1E] bg-[#120E0E] p-3.5 text-left hover:border-[#5B2B2B]">
                    <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-mono text-xs">{row.name}</span><span className="font-mono text-base text-[#FF8A8A]">{formatScoreValue(row.value)}</span></div>
                    <p className="mt-1.5 line-clamp-2 min-h-8 text-xs leading-4 text-[#B3B9C4]">{row.comment ?? "No reason was recorded."}</p>
                    <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-[#6B7380]"><span className="min-w-0 flex-1 truncate">{row.traceId ?? row.spanId ?? "no trace"}</span><span>{SOURCE_TEXT[row.source]} · {ago(row.createdAt, now)}</span></div>
                  </button></li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="All score names">
            <h2 className="mb-3 text-sm font-semibold">Every score at a glance <span className="ml-1 font-normal text-[#6B7380]">click one to open it above</span></h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {names.map((item) => {
                const spark = dailySeries(scoped, item.name, now, days);
                const values = spark.days.flatMap((day) => (day.value === null ? [] : [day.value]));
                const lo = Math.min(...values); const hi = Math.max(...values); const span = hi - lo || 1;
                const points = spark.days.map((day, i) => (day.value === null ? null : `${(i / Math.max(1, spark.days.length - 1)) * 120},${30 - ((day.value - lo) / span) * 26}`)).filter(Boolean).join(" ");
                return (
                  <li key={item.name}><button type="button" onClick={() => { update({ name: item.name }); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-pressed={item.name === selectedName} className={`block w-full rounded-lg border bg-[#0E1115] p-3 text-left hover:border-[#3A3420] ${item.name === selectedName ? "border-[#F4D44D]" : "border-[#1F242C]"}`}>
                    <div className="truncate font-mono text-xs" title={item.name}>{item.name}</div>
                    <div className="mt-1 flex items-end justify-between gap-2"><span className="font-mono text-xl">{spark.overall === null ? "–" : spark.kind === "boolean" ? percent(spark.overall) : spark.kind === "categorical" ? String(spark.overall) : formatScoreValue(Math.round(spark.overall * 1000) / 1000)}</span>
                      {values.length > 1 ? <svg width="120" height="32" viewBox="0 0 120 32" role="img" aria-label={`${item.name} over ${days} days`}><polyline points={points} fill="none" stroke="#F4D44D" strokeWidth="1.5" /></svg> : <span className="text-[10px] text-[#6B7380]">one day only</span>}</div>
                    <div className="mt-1 font-mono text-[10px] text-[#6B7380]">{item.count.toLocaleString()} · {item.sources.map((source) => SOURCE_TEXT[source]).join(", ")}{item.mixed ? " · mixed types" : ""}</div>
                  </button></li>
                );
              })}
            </ul>
          </section>

          <details className="rounded-lg border border-[#1F242C] bg-[#0E1115]" open={query.log === "1"} onToggle={(event) => update({ log: event.currentTarget.open ? "1" : "" })}>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Every score, newest first <span className="font-normal text-[#6B7380]">({inWindow.length.toLocaleString()} in this period)</span></summary>
            <div className="border-t border-[#1F242C] p-4">
              <label className="sr-only" htmlFor="score-log-search">Search the log</label>
              <input id="score-log-search" value={logSearch} onChange={(event) => setLogSearch(event.target.value)} placeholder="Search name, trace, comment or value" className="mb-3 h-8 w-full max-w-md rounded border border-[#262C35] bg-[#0B0D10] px-3 font-mono text-xs placeholder:text-[#6B7380] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]" />
              {!logRows.length ? <p className="py-6 text-center text-xs text-[#8B93A1]">Nothing matches.</p> : (
                <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead className="text-[10px] uppercase tracking-wider text-[#6B7380]"><tr><th className="px-2 py-1.5 font-medium">Time</th><th className="px-2 py-1.5 font-medium">Name</th><th className="px-2 py-1.5 font-medium">Value</th><th className="px-2 py-1.5 font-medium">Source</th><th className="px-2 py-1.5 font-medium">Trace</th></tr></thead>
                  <tbody>{logRows.map((row) => <tr key={row._id} onClick={() => update({ id: row._id, add: "" })} className="cursor-pointer border-t border-[#161B21] hover:bg-[#11151A]"><td className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px] text-[#8B93A1]">{ago(row.createdAt, now)}</td><td className="max-w-[14rem] truncate px-2 py-1.5 font-mono text-xs">{row.name}</td><td className="px-2 py-1.5 font-mono text-xs">{formatScoreValue(row.value)}</td><td className="px-2 py-1.5 text-[11px] text-[#8B93A1]">{SOURCE_TEXT[row.source]}</td><td className="max-w-[10rem] truncate px-2 py-1.5 font-mono text-[11px] text-[#6B7380]">{row.traceId ?? row.spanId ?? "–"}</td></tr>)}</tbody></table></div>
              )}
              <p className="mt-2 font-mono text-[11px] text-[#6B7380]">Based on the newest {LOADED.toLocaleString()} scores in this project{(scores?.length ?? 0) < LOADED ? " (that is all of them)" : ""}. Export for the full period.</p>
            </div>
          </details>
        </div>
      )}

      {query.add ? (
        <Sheet label="Add a score" onClose={() => update({ add: "" })}><AddScore projectId={projectId} onClose={() => update({ add: "" })} onSave={async (input) => { const id = await createScore({ projectId: typedProjectId, ...input }); update({ add: "", id }); }} /></Sheet>
      ) : selectedRow ? (
        <Sheet label={`Score ${selectedRow.name}`} onClose={() => update({ id: "" })}><ScorePanel projectId={projectId} row={selectedRow} onClose={() => update({ id: "" })} onFilter={(name) => update({ name, id: "" })} now={now} /></Sheet>
      ) : null}
      {query.id && scores && !selectedRow && !query.add ? <p role="alert" className="border-t border-[#5B2B2B] bg-[#1A1010] px-4 py-2 text-xs text-[#FF8A8A]">That score is not in the newest {LOADED.toLocaleString()} scores. <button type="button" onClick={() => update({ id: "" })} className="underline">Dismiss</button></p> : null}
    </div>
  );
}
