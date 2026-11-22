"use client";

import { PageTitle } from "@/components/dashboard/page-title";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { alignSteps, bundleErrors, isFailed, MIN_SAMPLE, pickWinners, stepName, stepType, totals, type AlignedRow, type DiffSpan, type GroupRow, type RunTotals } from "@/lib/trace-diff";
import { RANGES } from "../tracing/time-range-picker";
import { compactNumber, formatCost, formatDuration, relativeTime } from "../tracing/format";

type RunOption = { runId: string; traceName: string; startedAt: string; durationMs: number; errorCount: number; totalCostUsd: number; modelId: string };
type Tab = "runs" | "groups";

const field = "h-8 rounded border border-[#262C35] bg-[#0E1115] px-2 text-[13px] text-[#E6E9EE] outline-none focus:border-[#F4D44D]";

export function ComparePage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "groups" ? "groups" : "runs";
  const range = RANGES.some((item) => item.id === params.get("range")) ? params.get("range")! : "7d";
  const set = useCallback((next: Record<string, string | null>) => {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) { if (value) search.set(key, value); else search.delete(key); }
    router.replace(`${pathname}?${search}`, { scroll: false });
  }, [params, pathname, router]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0D10] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#1F242C] px-4 py-3">
        <PageTitle>Compare</PageTitle>
        <div role="tablist" aria-label="Comparison type" className="flex rounded border border-[#262C35] bg-[#0E1115] p-0.5 text-xs">
          {([["runs", "Two runs"], ["groups", "Models and releases"]] as const).map(([id, label]) => (
            <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => set({ tab: id === "runs" ? null : id })}
              className={`h-6 rounded px-2.5 ${tab === id ? "bg-[#232A34] text-white" : "text-[#8B93A1] hover:text-white"}`}>{label}</button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-[#8B93A1]">Time range
          <select value={range} onChange={(event) => set({ range: event.target.value })} className={field}>
            {RANGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </header>
      {tab === "runs" ? <RunsCompare projectId={projectId} range={range} left={params.get("left") ?? ""} right={params.get("right") ?? ""} set={set} />
        : <GroupsCompare projectId={projectId} range={range} by={params.get("by") === "release" ? "release" : "model"} set={set} />}
    </div>
  );
}

function useRangeQuery(range: string) {
  const [to] = useState(() => Date.now());
  const ms = RANGES.find((item) => item.id === range)?.ms ?? 604_800_000;
  return { window: `from=${to - ms}&to=${to}`, now: to };
}

/* ---------- Two runs ---------- */

function RunsCompare({ projectId, range, left, right, set }: { projectId: string; range: string; left: string; right: string; set: (next: Record<string, string | null>) => void }) {
  const { window, now: clock } = useRangeQuery(range);
  const [runs, setRuns] = useState<RunOption[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/traces?${window}&pageSize=100`).then((res) => res.ok ? res.json() : Promise.reject(new Error(String(res.status))))
      .then((data: { rows: RunOption[] }) => { if (!cancelled) { setRuns(data.rows.map((row) => ({ ...row, errorCount: Number(row.errorCount) || 0, durationMs: Number(row.durationMs) || 0, totalCostUsd: Number(row.totalCostUsd) || 0 }))); setError(""); } })
      .catch(() => { if (!cancelled) setError("Runs could not be loaded. Try again in a moment."); });
    return () => { cancelled = true; };
  }, [projectId, window]);

  // One effect decides everything, so two router updates never overwrite each other.
  // Fewer than two runs in the window: step out to the next longer one (up to 90 days).
  // Otherwise default to the newest failed run against the newest healthy one.
  const [startRange] = useState(range);
  useEffect(() => {
    if (!runs || (left && right)) return;
    if (runs.length < 2) {
      const next = RANGES[RANGES.findIndex((item) => item.id === range) + 1];
      if (next) set({ range: next.id });
      return;
    }
    const bad = runs.find((run) => run.errorCount > 0) ?? runs[0]!;
    const good = runs.find((run) => run.errorCount === 0 && run.runId !== bad.runId) ?? runs.find((run) => run.runId !== bad.runId)!;
    set({ left: left || bad.runId, right: right || (left && left !== bad.runId ? bad.runId : good.runId) });
  }, [left, range, right, runs, set]);
  const widened = range !== startRange;

  const a = useSpans(projectId, left), b = useSpans(projectId, right);
  const rows = useMemo(() => a.spans && b.spans ? alignSteps(a.spans, b.spans) : null, [a.spans, b.spans]);
  const bundles = useMemo(() => a.spans && b.spans ? bundleErrors(a.spans, b.spans) : [], [a.spans, b.spans]);
  const ta = useMemo(() => a.spans ? totals(a.spans) : null, [a.spans]);
  const tb = useMemo(() => b.spans ? totals(b.spans) : null, [b.spans]);
  const [onlyDiff, setOnlyDiff] = useState(false);

  return (
    <main className="flex flex-1 flex-col gap-3 p-4">
      <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
        <RunPicker label="Run A" hint="the one to look into" value={left} runs={runs} onChange={(value) => set({ left: value })} clock={clock} />
        <button type="button" aria-label="Swap runs" title="Swap runs" onClick={() => set({ left: right || null, right: left || null })} className="h-8 rounded border border-[#262C35] px-3 text-[#8B93A1] hover:text-white">⇄</button>
        <RunPicker label="Run B" hint="the one to measure against" value={right} runs={runs} onChange={(value) => set({ right: value })} clock={clock} />
      </div>
      {error ? <p role="alert" className="rounded border border-[#5A2A2E] bg-[#1A0F11] p-3 text-[#FF8A8A]">{error}</p> : null}
      {widened && runs && runs.length >= 2 ? <p className="m-0 text-xs text-[#8B93A1]">Few runs lately, so the range was widened to {RANGES.find((item) => item.id === range)?.label.toLowerCase()}.</p> : null}
      {runs && runs.length < 2 && range === "90d" ? <p className="rounded border border-[#1F242C] bg-[#0E1115] p-6 text-[#8B93A1]">This project has {runs.length === 1 ? "only one run" : "no runs"} in the last 90 days. Send one more run and you can compare them here. You can also paste any run ID above.</p> : null}
      {runs && runs.length < 2 && range !== "90d" && !(left && right) ? <p className="m-0 text-xs text-[#8B93A1]">Looking further back for runs…</p> : null}
      {a.error || b.error ? <p role="alert" className="rounded border border-[#5A2A2E] bg-[#1A0F11] p-3 text-[#FF8A8A]">{a.error || b.error}</p> : null}
      {ta && tb ? <>
        <Totals a={ta} b={tb} />
        <Bundles bundles={bundles} />
        <section aria-label="Steps side by side" className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#1F242C] bg-[#0E1115]">
          <div className="flex items-center gap-3 border-b border-[#1F242C] px-3 py-2">
            <h2 className="m-0 text-xs font-medium">Steps side by side</h2>
            <span className="font-mono text-[11px] text-[#8B93A1]">{rows?.filter((row) => row.kind !== "same").length ?? 0} of {rows?.length ?? 0} differ</span>
            <label className="ml-auto flex items-center gap-2 text-xs text-[#8B93A1]"><input type="checkbox" checked={onlyDiff} onChange={(event) => setOnlyDiff(event.target.checked)} /> Only differences</label>
          </div>
          <div className="grid grid-cols-2 border-b border-[#1F242C] px-3 py-1.5 font-mono text-[11px] text-[#6B7380]"><span className="truncate">A · {left}</span><span className="truncate">B · {right}</span></div>
          <ul className="max-h-[56vh] overflow-auto">
            {(rows ?? []).filter((row) => !onlyDiff || row.kind !== "same").map((row, index) => <StepRow key={index} row={row} />)}
          </ul>
        </section>
      </> : left && right && !error ? <p className="p-6 text-[#8B93A1]">Loading steps…</p> : null}
    </main>
  );
}

function useSpans(projectId: string, runId: string) {
  const [state, setState] = useState<{ runId: string; spans: DiffSpan[] | null; error: string }>({ runId: "", spans: null, error: "" });
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    fetch(`/api/projects/${projectId}/runs/${encodeURIComponent(runId)}/spans`).then((res) => res.ok ? res.json() : Promise.reject(new Error(String(res.status))))
      .then((data: { spans?: DiffSpan[]; unavailable?: boolean }) => {
        if (!cancelled) setState({ runId, spans: data.spans ?? [], error: data.unavailable ? `Steps for ${runId} are temporarily unavailable.` : "" });
      })
      .catch(() => { if (!cancelled) setState({ runId, spans: null, error: `Steps for ${runId} could not be loaded.` }); });
    return () => { cancelled = true; };
  }, [projectId, runId]);
  return state.runId === runId && runId ? state : { spans: null, error: "" };
}

function RunPicker({ label, hint, value, runs, onChange, clock }: { label: string; hint: string; value: string; runs: RunOption[] | null; onChange: (value: string) => void; clock: number }) {
  const known = runs?.some((run) => run.runId === value);
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-[#8B93A1]"><span className={`mr-1 inline-block rounded px-1.5 font-mono font-medium text-[#0B0D10] ${label === "Run A" ? "bg-[#F4D44D]" : "bg-[#ECEAE3]"}`}>{label}</span> {hint}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${field} w-full`}>
        {runs && !runs.length ? <option value="">No runs in this range</option> : null}
        {runs && runs.length > 0 && !value ? <option value="">Pick a run</option> : null}
        {!runs ? <option value="">Loading runs…</option> : null}
        {value && !known ? <option value={value}>{value}</option> : null}
        {runs?.map((run) => <option key={run.runId} value={run.runId}>{run.errorCount > 0 ? "Failed" : "OK"} · {run.traceName || run.runId.slice(0, 8)} · {formatDuration(run.durationMs)} · {formatCost(run.totalCostUsd)} · {relativeTime(run.startedAt, clock)}</option>)}
      </select>
      <input type="text" aria-label={`Paste a run ID for ${label}`} placeholder="or paste a run ID and press Enter" maxLength={200}
        onKeyDown={(event) => { if (event.key === "Enter") { const id = event.currentTarget.value.trim(); if (id) { onChange(id); event.currentTarget.value = ""; } } }}
        className={`${field} mt-1 w-full font-mono text-[11px] placeholder:text-[#4A5260]`} />
    </label>
  );
}

function Totals({ a, b }: { a: RunTotals; b: RunTotals }) {
  const items: Array<{ label: string; a: number; b: number; show: (value: number) => string }> = [
    { label: "Latency", a: a.durationMs, b: b.durationMs, show: formatDuration },
    { label: "Cost", a: a.costUsd, b: b.costUsd, show: formatCost },
    { label: "Tokens", a: a.tokens, b: b.tokens, show: compactNumber },
    { label: "Steps", a: a.steps, b: b.steps, show: String },
    { label: "Model calls", a: a.llm, b: b.llm, show: String },
    { label: "Tool calls", a: a.tools, b: b.tools, show: String },
    { label: "Errors", a: a.errors, b: b.errors, show: String },
  ];
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#1F242C] bg-[#1F242C] sm:grid-cols-4 lg:grid-cols-7">
      {items.map((item) => {
        const delta = item.b === 0 ? (item.a === 0 ? 0 : 1) : (item.a - item.b) / item.b;
        const worse = item.a > item.b;
        return (
          <div key={item.label} className="bg-[#0E1115] px-3 py-2">
            <div className="text-[11px] text-[#8B93A1]">{item.label}</div>
            <div className="font-mono text-[13px]"><span>{item.show(item.a)}</span><span className="text-[#6B7380]"> vs </span><span>{item.show(item.b)}</span></div>
            <div className={`font-mono text-[11px] ${delta === 0 ? "text-[#6B7380]" : worse ? "text-[#FF8A8A]" : "text-[#5BE3A0]"}`}>
              {delta === 0 ? "same" : `${worse ? "+" : "−"}${Math.abs(Math.round(delta * 100)).toLocaleString()}%`}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Bundles({ bundles }: { bundles: ReturnType<typeof bundleErrors> }) {
  if (!bundles.length) return <p className="rounded-lg border border-[#1F242C] bg-[#0E1115] px-3 py-2 text-xs text-[#8B93A1]">No failed steps in either run.</p>;
  return (
    <section aria-label="Similar failures" className="rounded-lg border border-[#1F242C] bg-[#0E1115]">
      <h2 className="m-0 border-b border-[#1F242C] px-3 py-2 text-xs font-medium">Similar failures <span className="font-normal text-[#8B93A1]">· same tool, error and message across both runs</span></h2>
      <ul>
        {bundles.map((bundle) => (
          <li key={bundle.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#171B21] px-3 py-1.5 last:border-b-0">
            <span className={`rounded px-2 py-0.5 font-mono text-[11px] ${bundle.where === "both" ? "bg-[#3A1C1F] text-[#FF8A8A]" : "bg-[#232A34] text-[#C9CED6]"}`}>{bundle.where === "both" ? "both runs" : bundle.where === "onlyA" ? "only A" : "only B"}</span>
            <span className="min-w-0"><span className="block truncate"><span className="text-[#8AB4FF]">{bundle.tool || "—"}</span>{bundle.type ? <span className="text-[#8B93A1]"> · {bundle.type}</span> : null}</span><span className="block truncate font-mono text-[11px] text-[#C9CED6]">{bundle.message || "No message recorded"}</span></span>
            <span className="font-mono text-[11px] text-[#8B93A1]">A {bundle.countA} · B {bundle.countB}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const TONE: Record<AlignedRow["kind"], string> = { same: "", changed: "bg-[#1C1A0F]", onlyA: "bg-[#161B22]", onlyB: "bg-[#161B22]" };

function StepRow({ row }: { row: AlignedRow }) {
  return (
    <li className={`grid grid-cols-2 border-b border-[#171B21] last:border-b-0 ${TONE[row.kind]} ${row.kind === "changed" ? "shadow-[inset_3px_0_0_#F4D44D]" : ""}`}>
      <Cell span={row.a} missing={row.kind === "onlyB"} other={row.b} />
      <Cell span={row.b} missing={row.kind === "onlyA"} other={row.a} />
    </li>
  );
}

function Cell({ span, missing, other }: { span?: DiffSpan; missing: boolean; other?: DiffSpan }) {
  if (!span) return <div className="px-3 py-1.5 text-[11px] text-[#4A5260]">{missing ? "— not in this run" : ""}</div>;
  const failed = isFailed(span);
  const slower = other && span.latencyMs > Math.max(200, other.latencyMs * 1.5);
  return (
    <div className="min-w-0 border-r border-[#171B21] px-3 py-1.5 last:border-r-0">
      <div className="flex items-center gap-2">
        <span className="rounded bg-[#1A1F27] px-1.5 font-mono text-[10px] uppercase text-[#8B93A1]">{stepType(span)}</span>
        <span className="truncate">{stepName(span)}</span>
        <span className={`ml-auto shrink-0 font-mono text-[11px] ${slower ? "text-[#F4D44D]" : "text-[#8B93A1]"}`}>{formatDuration(span.latencyMs)}</span>
        {span.costUsd ? <span className="shrink-0 font-mono text-[11px] text-[#6B7380]">{formatCost(span.costUsd)}</span> : null}
      </div>
      {failed ? <div className="truncate font-mono text-[11px] text-[#FF8A8A]" title={span.errorMessage}>{span.errorType || "error"}{span.errorMessage ? ` · ${span.errorMessage}` : ""}</div> : null}
    </div>
  );
}

/* ---------- Models and releases ---------- */

type Groups = { by: "model" | "release"; groups: GroupRow[] };

function GroupsCompare({ projectId, range, by, set }: { projectId: string; range: string; by: "model" | "release"; set: (next: Record<string, string | null>) => void }) {
  const { window } = useRangeQuery(range);
  const [data, setData] = useState<Groups | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/traces/compare?${window}&by=${by}`).then((res) => res.ok ? res.json() : Promise.reject(new Error(String(res.status))))
      .then((next: Groups) => { if (!cancelled) { setData(next); setError(""); } })
      .catch(() => { if (!cancelled) setError("Comparison data could not be loaded. Try again in a moment."); });
    return () => { cancelled = true; };
  }, [by, projectId, window]);

  const rows = data?.by === by ? data.groups : null;
  // One group (or none) is nothing to compare, so look further back first.
  useEffect(() => {
    if (!rows || rows.length >= 2) return;
    const next = RANGES[RANGES.findIndex((item) => item.id === range) + 1];
    if (next) set({ range: next.id });
  }, [range, rows, set]);
  const winners = rows ? pickWinners(rows) : null;
  const max = (pick: (row: GroupRow) => number) => Math.max(...(rows ?? []).map(pick), 0.0000001);
  const tracingHref = (row: GroupRow) => `/dashboard/${projectId}/tracing?range=${range}&${by === "model" ? "modelId" : "release"}=${encodeURIComponent(row.key)}`;

  return (
    <main className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Group runs by" className="flex rounded border border-[#262C35] bg-[#0E1115] p-0.5 text-xs">
          {([["model", "By model"], ["release", "By release or prompt version"]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={by === id} onClick={() => set({ by: id === "model" ? null : id })} className={`h-6 rounded px-2.5 ${by === id ? "bg-[#232A34] text-white" : "text-[#8B93A1] hover:text-white"}`}>{label}</button>
          ))}
        </div>
        <p className="m-0 text-xs text-[#8B93A1]">Each run counts once, under its main model or release. Groups with fewer than {MIN_SAMPLE} runs are shown but never picked as best.</p>
      </div>
      {error ? <p role="alert" className="rounded border border-[#5A2A2E] bg-[#1A0F11] p-3 text-[#FF8A8A]">{error}</p> : null}
      {!rows && !error ? <p className="p-6 text-[#8B93A1]">Loading…</p> : null}
      {rows && rows.length === 0 ? <p className="rounded border border-[#1F242C] bg-[#0E1115] p-6 text-[#8B93A1]">No runs with a {by} in this time range. {by === "release" ? "Set a release (or prompt version) in the SDK to compare changes." : "Try a longer range."}</p> : null}
      {rows && rows.length === 1 ? <p className="rounded border border-[#1F242C] bg-[#0E1115] p-3 text-xs text-[#8B93A1]">Only one {by} in this range, so there is nothing to compare yet.</p> : null}
      {rows && winners && rows.length > 1 ? (
        <div className="flex flex-wrap gap-2 text-xs" aria-label="Best in range">
          {([["Cheapest", winners.cheapest], ["Fails least", winners.mostReliable], ["Fastest", winners.fastest]] as const).map(([label, key]) => key ? <span key={label} className="rounded border border-[#262C35] bg-[#0E1115] px-2.5 py-1"><span className="text-[#8B93A1]">{label}: </span><span className="font-mono text-[#F4D44D]">{key}</span></span> : null)}
          {!winners.cheapest ? <span className="text-[#8B93A1]">Not enough runs yet to pick a best ({MIN_SAMPLE}+ per group).</span> : null}
        </div>
      ) : null}
      {rows && rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-[#1F242C] bg-[#0E1115]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="border-b border-[#1F242C] text-[11px] text-[#8B93A1]">
              <tr><th className="px-3 py-2 font-medium">{by === "model" ? "Model" : "Release"}</th><th className="px-3 py-2 font-medium">Runs</th><th className="px-3 py-2 font-medium">Failure rate</th><th className="px-3 py-2 font-medium">Avg cost per run</th><th className="px-3 py-2 font-medium">Median latency</th><th className="px-3 py-2 font-medium">Slowest 5%</th><th className="px-3 py-2 font-medium">Avg steps</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rate = row.failedRuns / row.runs;
                return (
                  <tr key={row.key} className="border-b border-[#171B21] last:border-b-0 hover:bg-[#12161C]">
                    <td className="px-3 py-1.5"><Link href={tracingHref(row)} className="font-mono text-[#8AB4FF] hover:underline" title="Open these runs in Tracing">{row.key}</Link>{row.runs < MIN_SAMPLE ? <span className="ml-2 text-[11px] text-[#6B7380]">small sample</span> : null}</td>
                    <td className="px-3 py-1.5 font-mono">{compactNumber(row.runs)}</td>
                    <Bar value={rate} max={max((r) => r.failedRuns / r.runs)} label={`${(rate * 100).toFixed(rate && rate < 0.1 ? 1 : 0)}%`} sub={`${row.failedRuns} failed`} color="#FF6B6B" />
                    <Bar value={row.avgCostUsd} max={max((r) => r.avgCostUsd)} label={formatCost(row.avgCostUsd)} color="#F4D44D" />
                    <Bar value={row.p50DurationMs} max={max((r) => r.p50DurationMs)} label={formatDuration(row.p50DurationMs)} color="#8AB4FF" />
                    <td className="px-3 py-1.5 font-mono text-[#8B93A1]">{formatDuration(row.p95DurationMs)}</td>
                    <td className="px-3 py-1.5 font-mono text-[#8B93A1]">{row.avgSteps.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}

function Bar({ value, max, label, sub, color }: { value: number; max: number; label: string; sub?: string; color: string }) {
  return (
    <td className="px-3 py-1.5">
      <div className="font-mono">{label}{sub ? <span className="ml-2 text-[11px] text-[#6B7380]">{sub}</span> : null}</div>
      <div className="mt-1 h-1 w-28 bg-[#1A1F27]"><div className="h-full" style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%`, background: color }} /></div>
    </td>
  );
}
