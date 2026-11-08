"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { compareRows, summarise, verdictCounts, type CompareRow, type Summary, type Verdict } from "@/lib/experiment-compare";
import { readJson } from "@/lib/safe-json";
import { EmptyState } from "../empty/empty-state";
import { SampleExperiment } from "../empty/samples";

type Experiment = FunctionReturnType<typeof api.experiments.list>[number];
type Query = Record<string, string>;
const button = "h-7 rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#C9CED6] hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D] disabled:opacity-40";
const field = "w-full rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#E6E9EE] placeholder:text-[#6B7380] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]";
const friendly = (reason: unknown, fallback: string) => ((reason instanceof Error ? reason.message : "").match(/Uncaught Error: ([^\n]+)/)?.[1] ?? fallback);
const percent = (value: number) => `${Math.round(value * 100)}%`;
const clip = (value: string, length: number) => (value.length > length ? `${value.slice(0, length)}…` : value);
const VERDICTS: Array<{ id: Verdict; label: string; tone: string }> = [
  { id: "worse", label: "Worse", tone: "text-[#FF8A8A]" }, { id: "better", label: "Better", tone: "text-[#5BE3A0]" }, { id: "changed", label: "Changed", tone: "text-[#F4D44D]" }, { id: "same", label: "Same", tone: "text-[#8B93A1]" }, { id: "missing", label: "Not run", tone: "text-[#6B7380]" },
];

function readUrl(initial: Query): Query {
  if (typeof window === "undefined") return initial;
  const query: Query = {};
  for (const [key, value] of new URLSearchParams(window.location.search)) if (value) query[key] = value.slice(0, 200);
  return query;
}

export function ExperimentsWorkspace({ projectId, initialQuery }: { projectId: string; initialQuery: Query }) {
  const typedProjectId = projectId as Id<"projects">;
  const experiments = useQuery(api.experiments.list, { projectId: typedProjectId });
  const datasets = useQuery(api.datasets.overview, { projectId: typedProjectId });
  const [query, setQuery] = useState<Query>(() => readUrl(initialQuery));
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [running, setRunning] = useState(false);
  const setStatus = useMutation(api.experiments.setStatus);

  const update = (patch: Query) => setQuery((current) => {
    const next = { ...current, ...patch };
    for (const key of Object.keys(next)) if (next[key] === "") delete next[key];
    return next;
  });
  useEffect(() => {
    const params = new URLSearchParams(query);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [query]);

  const datasetIds = useMemo(() => [...new Set((experiments ?? []).map((experiment) => experiment.datasetId as string))], [experiments]);
  const datasetId = (query.dataset && datasetIds.includes(query.dataset) ? query.dataset : datasetIds[0]) as Id<"datasets"> | undefined;
  const runs = useMemo(() => (experiments ?? []).filter((experiment) => experiment.datasetId === datasetId), [experiments, datasetId]);
  // Newest first: the candidate defaults to the newest run and the baseline to the one before it.
  const b = runs.find((run) => run._id === query.b) ?? runs[0] ?? null;
  const a = runs.find((run) => run._id === query.a && run._id !== b?._id) ?? runs.find((run) => run._id !== b?._id) ?? null;
  const items = useQuery(api.datasets.items, datasetId ? { projectId: typedProjectId, datasetId } : "skip");
  const rows = useMemo(() => (items && a && b ? compareRows(items.rows, a.results, b.results) : []), [items, a, b]);
  const sumA = useMemo(() => (items && a ? summarise(items.rows, a.results) : null), [items, a]);
  const sumB = useMemo(() => (items && b ? summarise(items.rows, b.results) : null), [items, b]);
  const counts = useMemo(() => verdictCounts(rows), [rows]);
  const filter = VERDICTS.some((verdict) => verdict.id === query.show) ? (query.show as Verdict) : "";
  const shown = filter ? rows.filter((row) => row.verdict === filter) : rows;
  const datasetName = (id: string) => datasets?.find((row) => row.dataset._id === id)?.dataset.name ?? "dataset";

  async function runProvider(experiment: Experiment) {
    setRunning(true); setNotice(null);
    try {
      const response = await fetch("/api/experiments/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, experimentId: experiment._id }) });
      const data = await readJson<{ results?: Array<{ ok: boolean }> }>(response);
      if (!response.ok) throw new Error(data.error || `The run could not start (error ${response.status}). Try again in a moment.`);
      const good = data.results?.filter((result) => result.ok).length ?? 0;
      setNotice({ tone: good === (data.results?.length ?? 0) ? "ok" : "error", text: `${experiment.name} finished: ${good} of ${data.results?.length ?? 0} rows answered.` });
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "The run failed." }); }
    finally { setRunning(false); }
  }
  async function finish(experiment: Experiment) {
    try { await setStatus({ projectId: typedProjectId, experimentId: experiment._id, status: "completed" }); setNotice({ tone: "ok", text: `${experiment.name} marked complete.` }); } catch (reason) { setNotice({ tone: "error", text: friendly(reason, "That did not save.") }); }
  }

  const empty = experiments !== undefined && !experiments.length;
  return (
    <div className="relative flex min-h-svh min-w-0 flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Experiments</h1>
        {datasetIds.length > 1 ? <><label className="sr-only" htmlFor="exp-dataset">Dataset</label><select id="exp-dataset" className={button} value={datasetId ?? ""} onChange={(event) => update({ dataset: event.target.value, a: "", b: "", show: "" })}>{datasetIds.map((id) => <option key={id} value={id}>{datasetName(id)}</option>)}</select></> : datasetId ? <span className="font-mono text-xs text-[#8B93A1]">{datasetName(datasetId)}</span> : null}
        <Link href={`/dashboard/${projectId}/datasets`} className={`${button} ml-auto inline-flex items-center`}>Datasets</Link>
        <button type="button" onClick={() => setCreating(true)} className="h-7 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909] hover:bg-[#f7de70]">New experiment</button>
      </header>
      {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mx-4 mt-3 rounded border px-3 py-2 text-xs ${notice.tone === "error" ? "border-[#5B2B2B] bg-[#1A1010] text-[#FF8A8A]" : "border-[#1F4D38] bg-[#0E1A14] text-[#5BE3A0]"}`}>{notice.text}</p> : null}
      {experiments === undefined ? <div className="grid gap-2 p-4" role="status" aria-label="Loading experiments">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded bg-[#11151A]" />)}</div>
        : empty ? (
          <div className="m-auto w-full p-4"><EmptyState eyebrow="Experiments" title="Find out if a change made things better" why="Run a prompt on every row of a dataset. Run two, and see side by side what got better and what broke." sample={<SampleExperiment />} action={{ label: "Create your first experiment", onClick: () => setCreating(true) }} /></div>
        ) : (
          <>
            <section aria-label="Choose runs to compare" className="grid items-end gap-3 border-b border-[#1F242C] px-4 py-3 md:grid-cols-[1fr_auto_1fr]">
              <RunPicker label="Baseline" hint="what you had" runs={runs.filter((run) => run._id !== b?._id)} value={a?._id ?? ""} onChange={(id) => update({ a: id })} />
              <button type="button" onClick={() => update({ a: b?._id ?? "", b: a?._id ?? "" })} disabled={!a || !b} aria-label="Swap baseline and candidate" className={`${button} h-9`}>⇄</button>
              <RunPicker label="Candidate" hint="what you changed" runs={runs.filter((run) => run._id !== a?._id)} value={b?._id ?? ""} onChange={(id) => update({ b: id })} />
            </section>
            {!a ? <div className="m-auto max-w-md p-10 text-center text-xs leading-5 text-[#8B93A1]"><p className="text-sm font-semibold text-[#E6E9EE]">Two runs make a comparison</p><p className="mt-1">This dataset has one experiment so far. Create a second one with a changed prompt or model and it appears here next to the first.</p><button type="button" onClick={() => setCreating(true)} className="mt-3 h-8 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909]">New experiment</button></div> : (
              <>
                <section aria-label="Totals" className="grid grid-cols-2 gap-px border-b border-[#1F242C] bg-[#1F242C] lg:grid-cols-5">
                  {sumA && sumB ? metrics(sumA, sumB).map((metric) => (
                    <div key={metric.label} className="bg-[#0B0D10] px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">{metric.label}</div>
                      <div className="mt-1 flex items-baseline gap-2 font-mono"><span className="text-xs text-[#8B93A1]">{metric.a}</span><span aria-hidden className="text-[#3A424E]">→</span><span className="text-lg">{metric.b}</span></div>
                      <div className={`mt-0.5 font-mono text-[11px] ${metric.tone}`}>{metric.delta}</div>
                    </div>
                  )) : null}
                </section>
                {b && !b.results.length && b.promptVersionId ? (
                  <div className="flex flex-wrap items-center gap-3 border-b border-[#3A3420] bg-[#1A170C] px-4 py-2.5 text-xs text-[#F4D44D]"><span>{b.name} has not run yet.</span><button type="button" onClick={() => void runProvider(b)} disabled={running} className="h-7 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909] disabled:opacity-50">{running ? "Running…" : "Run it now"}</button></div>
                ) : b && b.status === "running" && b.results.length ? <div className="flex flex-wrap items-center gap-3 border-b border-[#1F242C] px-4 py-2 text-xs text-[#8B93A1]"><span>{b.name} is still marked running with {b.results.length} answers.</span><button type="button" onClick={() => void finish(b)} className={button}>Mark complete</button></div> : null}
                <nav aria-label="Filter rows" className="flex flex-wrap items-center gap-1.5 border-b border-[#1F242C] px-4 py-2">
                  <button type="button" aria-pressed={!filter} onClick={() => update({ show: "" })} className={`${button} ${!filter ? "border-[#F4D44D] text-white" : ""}`}>All {rows.length}</button>
                  {VERDICTS.map((verdict) => <button key={verdict.id} type="button" aria-pressed={filter === verdict.id} disabled={!counts[verdict.id]} onClick={() => update({ show: filter === verdict.id ? "" : verdict.id })} className={`${button} ${filter === verdict.id ? "border-[#F4D44D] text-white" : ""}`}><span className={verdict.tone}>{verdict.label}</span> {counts[verdict.id]}</button>)}
                </nav>
                <div className="min-h-0 flex-1 overflow-auto">
                  {items === undefined ? <p className="p-6 text-xs text-[#8B93A1]" role="status">Loading rows…</p> : !shown.length ? <p className="p-8 text-center text-xs text-[#8B93A1]">{rows.length ? "No rows in this group." : "The dataset has no rows."} {filter ? <button type="button" onClick={() => update({ show: "" })} className="text-[#8AB4FF] underline">Show all</button> : null}</p> : (
                    <table className="w-full min-w-[860px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-[#0E1115] text-[10px] uppercase tracking-wider text-[#6B7380]"><tr><th scope="col" className="w-10 border-b border-r border-[#1F242C] px-2 py-2 text-right font-medium">#</th><th scope="col" className="w-[26%] border-b border-r border-[#1F242C] px-3 py-2 font-medium">Input and expected</th><th scope="col" className="border-b border-r border-[#1F242C] px-3 py-2 font-medium">Baseline · {a.name}</th><th scope="col" className="border-b border-[#1F242C] px-3 py-2 font-medium">Candidate · {b?.name}</th></tr></thead>
                      <tbody>{shown.map((row) => <Line key={row.item._id} row={row} index={rows.indexOf(row) + 1} />)}</tbody>
                    </table>
                  )}
                  {items?.more ? <p className="p-3 text-center text-[11px] text-[#8B93A1]">Comparing the first 500 rows of this dataset.</p> : null}
                </div>
              </>
            )}
          </>
        )}
      {creating ? <NewExperiment projectId={projectId} defaultDataset={datasetId} onClose={() => setCreating(false)} onCreated={(id, datasetFor) => { setCreating(false); update({ dataset: datasetFor, b: id, a: "", show: "" }); setNotice({ tone: "ok", text: "Experiment created. Run it from here when you are ready." }); }} /> : null}
    </div>
  );
}

function metrics(a: Summary, b: Summary) {
  const pct = (value: number | null) => (value === null ? "–" : percent(value));
  const num = (value: number | null, digits = 2) => (value === null ? "–" : value.toFixed(digits));
  const deltaText = (x: number | null, y: number | null, format: (n: number) => string, higherBetter: boolean | null) => {
    if (x === null || y === null) return { text: "no comparison", tone: "text-[#6B7380]" };
    const diff = y - x;
    if (Math.abs(diff) < 1e-9) return { text: "no change", tone: "text-[#8B93A1]" };
    const good = higherBetter === null ? null : diff > 0 === higherBetter;
    return { text: `${diff > 0 ? "+" : "−"}${format(Math.abs(diff))}`, tone: good === null ? "text-[#C9CED6]" : good ? "text-[#5BE3A0]" : "text-[#FF8A8A]" };
  };
  const match = deltaText(a.matchRate, b.matchRate, (n) => `${(n * 100).toFixed(0)} pts`, true);
  const score = deltaText(a.avgScore, b.avgScore, (n) => n.toFixed(2), true);
  const latency = deltaText(a.avgLatencyMs, b.avgLatencyMs, (n) => `${Math.round(n)}ms`, false);
  const cost = deltaText(a.costUsd, b.costUsd, (n) => `$${n.toFixed(4)}`, false);
  const failed = deltaText(a.failed, b.failed, (n) => String(n), false);
  return [
    { label: "Matches expected", a: pct(a.matchRate), b: pct(b.matchRate), delta: match.text, tone: match.tone },
    { label: "Average score", a: num(a.avgScore), b: num(b.avgScore), delta: score.text, tone: score.tone },
    { label: "Average speed", a: a.avgLatencyMs === null ? "–" : `${Math.round(a.avgLatencyMs)}ms`, b: b.avgLatencyMs === null ? "–" : `${Math.round(b.avgLatencyMs)}ms`, delta: latency.text, tone: latency.tone },
    { label: "Cost", a: `$${a.costUsd.toFixed(4)}`, b: `$${b.costUsd.toFixed(4)}`, delta: cost.text, tone: cost.tone },
    { label: "Failed rows", a: String(a.failed), b: String(b.failed), delta: failed.text, tone: failed.tone },
  ];
}

function RunPicker({ label, hint, runs, value, onChange }: { label: string; hint: string; runs: Experiment[]; value: string; onChange: (id: string) => void }) {
  const selected = runs.find((run) => run._id === value);
  return (
    <label className="grid gap-1 text-[11px] text-[#8B93A1]"><span><span className="font-medium text-[#E6E9EE]">{label}</span> · {hint}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${field} h-9 font-mono`}>{runs.map((run) => <option key={run._id} value={run._id}>{run.name} · {run.status} · {new Date(run.createdAt).toLocaleDateString()}</option>)}</select>
      {selected ? <span className="font-mono text-[10px] text-[#6B7380]">{selected.model ?? "default model"} · {selected.resultCount} answers</span> : null}
    </label>
  );
}

function Answer({ result, match }: { result: CompareRow["a"]; match: boolean | null }) {
  if (!result) return <span className="text-[11px] text-[#4A5260]">Not run</span>;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] text-[#6B7380]">{match === null ? null : <span className={match ? "text-[#5BE3A0]" : "text-[#FF8A8A]"}>{match ? "✓ matches" : "✗ differs"}</span>}{typeof result.score === "number" ? <span>score {result.score}</span> : null}{typeof result.latencyMs === "number" ? <span>{Math.round(result.latencyMs)}ms</span> : null}</div>
      {result.error ? <p className="text-xs text-[#FF8A8A]">{result.error}</p> : <p className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[#C9CED6]">{result.output ? clip(result.output, 600) : <span className="font-sans text-[#6B7380]">Empty answer</span>}</p>}
    </div>
  );
}

function Line({ row, index }: { row: CompareRow; index: number }) {
  const tone = row.verdict === "worse" ? "shadow-[inset_3px_0_0_#FF6B6B]" : row.verdict === "better" ? "shadow-[inset_3px_0_0_#5BE3A0]" : row.verdict === "changed" ? "shadow-[inset_3px_0_0_#F4D44D]" : "";
  return (
    <tr className={`align-top ${tone}`}>
      <td className="border-b border-r border-[#161B21] px-2 py-3 text-right font-mono text-[11px] text-[#4A5260]">{index}</td>
      <td className="border-b border-r border-[#161B21] px-3 py-3"><p className="whitespace-pre-wrap break-words text-xs leading-5">{clip(row.item.input, 300)}</p>{row.item.expectedOutput ? <p className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[11px] leading-4 text-[#8B93A1]"><span className="text-[#6B7380]">Expected </span>{clip(row.item.expectedOutput, 200)}</p> : null}</td>
      <td className="border-b border-r border-[#161B21] px-3 py-3"><Answer result={row.a} match={row.aMatch} /></td>
      <td className="border-b border-[#161B21] px-3 py-3"><Answer result={row.b} match={row.bMatch} /></td>
    </tr>
  );
}

function NewExperiment({ projectId, defaultDataset, onClose, onCreated }: { projectId: string; defaultDataset?: string; onClose: () => void; onCreated: (id: string, datasetId: string) => void }) {
  const typedProjectId = projectId as Id<"projects">;
  const datasets = useQuery(api.datasets.overview, { projectId: typedProjectId });
  const prompts = useQuery(api.prompts.list, { projectId: typedProjectId });
  const create = useMutation(api.experiments.create);
  const [name, setName] = useState("");
  const [datasetId, setDatasetId] = useState(defaultDataset ?? "");
  const [promptId, setPromptId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompt = prompts?.find((item) => item._id === promptId);
  const chosen = datasetId || datasets?.[0]?.dataset._id || "";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Give the experiment a name.");
    if (!chosen) return setError("Create a dataset first, then come back.");
    if (!versionId) return setError("Pick the prompt version to run.");
    setSaving(true); setError(null);
    try {
      const id = await create({ projectId: typedProjectId, datasetId: chosen as Id<"datasets">, promptId: promptId as Id<"prompts">, promptVersionId: versionId as Id<"promptVersions">, name: name.trim(), model: model.trim() || undefined });
      onCreated(id, chosen);
    } catch (reason) { setError(friendly(reason, "That did not save. Check your connection and try again.")); setSaving(false); }
  }
  return (
    <aside aria-label="New experiment" className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[440px] flex-col border-l border-[#1F242C] bg-[#0B0D10] shadow-[-24px_0_48px_rgba(0,0,0,0.5)]">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        <h2 className="text-sm font-semibold">New experiment</h2>
        <label className="grid gap-1 text-[11px] text-[#8B93A1]">Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus placeholder="support-prompt-v3" className={`${field} h-8 font-mono`} /></label>
        <label className="grid gap-1 text-[11px] text-[#8B93A1]">Dataset to run on
          <select value={chosen} onChange={(e) => setDatasetId(e.target.value)} className={`${field} h-8`} disabled={!datasets?.length}>{datasets?.length ? datasets.map((row) => <option key={row.dataset._id} value={row.dataset._id}>{row.dataset.name} ({row.itemCount} rows)</option>) : <option value="">No datasets yet</option>}</select>
        </label>
        <label className="grid gap-1 text-[11px] text-[#8B93A1]">Prompt
          <select value={promptId} onChange={(e) => { setPromptId(e.target.value); setVersionId(""); }} className={`${field} h-8`}><option value="">{prompts === undefined ? "Loading…" : prompts.length ? "Pick a prompt" : "No prompts yet"}</option>{prompts?.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        </label>
        <label className="grid gap-1 text-[11px] text-[#8B93A1]">Version
          <select value={versionId} onChange={(e) => setVersionId(e.target.value)} className={`${field} h-8`} disabled={!prompt}><option value="">Pick a version</option>{prompt?.versions.map((version) => <option key={version._id} value={version._id}>v{version.version}{version.labels.length ? ` (${version.labels.join(", ")})` : ""}</option>)}</select>
        </label>
        <label className="grid gap-1 text-[11px] text-[#8B93A1]">Model (optional, otherwise the version&apos;s own)<input value={model} onChange={(e) => setModel(e.target.value)} maxLength={80} placeholder="gpt-4o-mini" className={`${field} h-8 font-mono`} /></label>
        <p className="text-[11px] leading-4 text-[#6B7380]">Creating does not call any model. You start the run from the comparison, and every row of the dataset is answered once.</p>
        {error ? <p role="alert" className="rounded border border-[#5B2B2B] bg-[#1A1010] px-3 py-2 text-xs text-[#FF8A8A]">{error}</p> : null}
        <div className="flex gap-2"><button type="submit" disabled={saving} className="h-8 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909] disabled:opacity-50">{saving ? "Creating…" : "Create experiment"}</button><button type="button" onClick={onClose} className={`${button} h-8`}>Cancel</button></div>
      </form>
    </aside>
  );
}
