"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatScoreValue, parseScoreInput, SOURCE_TEXT, type ScoreRow } from "@/lib/score-utils";

export const control = "h-7 rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#C9CED6] hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]";
const field = "w-full rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#E6E9EE] placeholder:text-[#6B7380] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]";

export function ago(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** A right-hand sheet over the page, closed by Escape, the backdrop or its own button. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/60" />
      <div className="relative flex h-full w-full max-w-[440px] flex-col border-l border-[#262C35] bg-[#0B0D10] shadow-2xl">{children}</div>
    </div>
  );
}

export function ScorePanel({ projectId, row, onClose, onFilter, now }: { projectId: string; row: ScoreRow; onClose: () => void; onFilter: (name: string) => void; now: number }) {
  const sameTrace = useQuery(api.evaluationEngine.traceQuality, row.traceId ? { projectId: projectId as Id<"projects">, traceId: row.traceId } : "skip");
  const [copied, setCopied] = useState(false);
  const others = (sameTrace?.scores ?? []).filter((score) => score._id !== row._id);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start gap-2 border-b border-[#1F242C] px-4 py-3">
        <div className="min-w-0 flex-1"><h2 className="truncate font-mono text-sm font-semibold" title={row.name}>{row.name}</h2><p className="mt-0.5 font-mono text-[11px] text-[#6B7380]">{SOURCE_TEXT[row.source]} · {row.dataType} · {ago(row.createdAt, now)}</p></div>
        <button type="button" onClick={onClose} className="h-7 shrink-0 rounded border border-[#262C35] px-2 text-xs text-[#C9CED6] hover:text-white">Close</button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4">
        <div><div className="text-[10px] uppercase tracking-wider text-[#6B7380]">Value</div><div className={`mt-1 break-words font-mono text-2xl ${typeof row.value === "boolean" ? (row.value ? "text-[#5BE3A0]" : "text-[#FF8A8A]") : ""}`}>{typeof row.value === "string" ? row.value : formatScoreValue(row.value)}</div></div>
        {row.comment ? <div><div className="text-[10px] uppercase tracking-wider text-[#6B7380]">Reason or comment</div><p className="mt-1 whitespace-pre-wrap rounded border border-[#1F242C] bg-[#0E1115] p-3 text-xs leading-5 text-[#C9CED6]">{row.comment}</p></div> : null}
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-[#6B7380]">Recorded</dt><dd className="font-mono">{new Date(row.createdAt).toLocaleString()}</dd>
          <dt className="text-[#6B7380]">Given by</dt><dd className="break-all font-mono">{row.createdBy === "system" ? "Uncoil (automatic)" : row.createdBy}</dd>
          {row.traceId ? <><dt className="text-[#6B7380]">Trace</dt><dd><Link href={`/dashboard/${projectId}/tracing?trace=${encodeURIComponent(row.traceId)}`} className="break-all font-mono text-[#8AB4FF] underline">{row.traceId}</Link></dd></> : null}
          {row.spanId ? <><dt className="text-[#6B7380]">Span</dt><dd className="break-all font-mono">{row.spanId}</dd></> : null}
        </dl>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onFilter(row.name)} className={control}>Show all “{row.name.length > 24 ? `${row.name.slice(0, 23)}…` : row.name}”</button>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?id=${row._id}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={control}>{copied ? "Link copied" : "Copy link"}</button>
        </div>
        {row.traceId ? (
          <div>
            <h3 className="mb-1.5 text-[10px] uppercase tracking-wider text-[#6B7380]">Other scores on this trace</h3>
            {sameTrace === undefined ? <p className="text-xs text-[#8B93A1]" role="status">Loading…</p> : !others.length ? <p className="text-xs text-[#6B7380]">This is the only score on the trace.</p> : (
              <ul className="grid gap-1">{others.map((score) => <li key={score._id} className="flex items-center gap-2 rounded border border-[#1F242C] bg-[#0E1115] px-2.5 py-1.5"><span className="min-w-0 flex-1 truncate font-mono text-xs">{score.name}</span><span className="font-mono text-xs">{formatScoreValue(score.value)}</span><span className="text-[10px] text-[#6B7380]">{SOURCE_TEXT[score.source]}</span></li>)}</ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const RUN_DOT: Record<string, string> = { completed: "bg-[#5BE3A0]", failed: "bg-[#FF8A8A]", running: "bg-[#F4D44D]", cancelled: "bg-[#6B7380]" };

/** Tap a recent run instead of pasting its id. Pasting stays available for older runs. */
function RunPicker({ projectId, value, onChange }: { projectId: string; value: string; onChange: (traceId: string) => void }) {
  const runs = useQuery(api.agentRuns.getRecentRunsByProject, { projectId: projectId as Id<"projects"> });
  const [search, setSearch] = useState("");
  const [pasting, setPasting] = useState(false);
  const [now] = useState(() => Date.now());
  const needle = search.trim().toLowerCase();
  const shown = (runs ?? []).filter((run) => !needle || [run.runId, run.status, run.primaryModel, run.environment, run.release].some((part) => part?.toLowerCase().includes(needle)));
  const picked = runs?.find((run) => run.runId === value);
  if (pasting || (runs && !runs.length)) {
    return (
      <label className="grid gap-1 text-[11px] text-[#8B93A1]">Trace id
        <input value={value} onChange={(event) => onChange(event.target.value)} maxLength={200} placeholder={runs && !runs.length ? "No runs yet. Paste a trace id" : "Paste the trace id"} className={`${field} h-8 font-mono`} autoFocus />
        {runs?.length ? <button type="button" onClick={() => { setPasting(false); onChange(""); }} className="justify-self-start text-[11px] text-[#8AB4FF] underline">Pick from recent runs instead</button> : null}
      </label>
    );
  }
  return (
    <fieldset className="grid gap-1.5 text-[11px] text-[#8B93A1]">
      <legend className="mb-1">Which run is this score for?</legend>
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recent runs by id, model or status" aria-label="Search recent runs" className={`${field} h-8`} autoFocus />
      {runs === undefined ? <p role="status" className="py-3 text-xs">Loading recent runs…</p> : !shown.length ? <p className="py-3 text-xs">No recent run matches “{search}”.</p> : (
        <ul className="grid max-h-64 gap-1 overflow-auto" role="radiogroup" aria-label="Recent runs">
          {shown.map((run) => {
            const on = run.runId === value;
            return (
              <li key={run._id}>
                <button type="button" role="radio" aria-checked={on} onClick={() => onChange(run.runId)} className={`flex w-full items-center gap-2 rounded border px-2.5 py-1.5 text-left hover:border-[#3A424E] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D] ${on ? "border-[#F4D44D] bg-[#16140A]" : "border-[#1F242C] bg-[#0E1115]"}`}>
                  <span className={`size-2 shrink-0 rounded-full ${RUN_DOT[run.status] ?? "bg-[#6B7380]"}`} aria-hidden />
                  <span className="min-w-0 flex-1"><span className="block truncate font-mono text-xs text-[#E6E9EE]">{run.runId}</span><span className="block truncate text-[10px] text-[#6B7380]">{run.status} · {run.spanCount} step{run.spanCount === 1 ? "" : "s"}{run.primaryModel ? ` · ${run.primaryModel}` : ""}</span></span>
                  <span className="shrink-0 font-mono text-[10px] text-[#6B7380]">{ago(Date.parse(run.startedAt) || 0, now)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {picked ? <p className="text-[11px] text-[#C9CED6]">Selected: <span className="font-mono">{picked.runId}</span></p> : null}
      <button type="button" onClick={() => { setPasting(true); onChange(""); }} className="justify-self-start text-[11px] text-[#8AB4FF] underline">Run not listed? Paste its id</button>
    </fieldset>
  );
}

export function AddScore({ projectId, onClose, onSave, presetTraceId }: { projectId: string; onClose: () => void; presetTraceId?: string; onSave: (input: { traceId: string; name: string; value: number | boolean | string; dataType: ScoreRow["dataType"]; source: "human" | "user"; comment?: string }) => Promise<void> }) {
  const [traceId, setTraceId] = useState(presetTraceId ?? "");
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<ScoreRow["dataType"]>("numeric");
  const [value, setValue] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!traceId.trim()) return setError("Pick the run this score is for.");
    if (!name.trim()) return setError("Give the score a name, like “helpfulness”.");
    if (name.trim().length > 100) return setError("A score name can be at most 100 characters.");
    const parsed = parseScoreInput(dataType, value);
    if ("error" in parsed) return setError(parsed.error);
    setSaving(true); setError(null);
    try { await onSave({ traceId: traceId.trim(), name: name.trim(), value: parsed.value, dataType, source: "human", comment: comment.trim() || undefined }); } catch (reason) {
      const match = (reason instanceof Error ? reason.message : "").match(/Uncaught Error: ([^\n]+)/);
      setError(match?.[1] ?? "That did not save. Check your connection and try again.");
      setSaving(false);
    }
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4" aria-label="Add a score">
        <h2 className="text-sm font-semibold">Add a score</h2>
        <p className="text-[11px] leading-4 text-[#6B7380]">Grade a trace by hand. It is recorded as a human score and shows up everywhere scores do.</p>
        {presetTraceId ? <div className="grid gap-1 text-[11px] text-[#8B93A1]">Scoring this run<div className="break-all rounded border border-[#262C35] bg-[#0E1115] px-2.5 py-1.5 font-mono text-xs text-[#E6E9EE]" data-testid="score-run-id">{presetTraceId}</div></div>
          : <RunPicker projectId={projectId} value={traceId} onChange={setTraceId} />}
        <label className="grid gap-1 text-[11px] text-[#8B93A1]">Score name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="helpfulness" className={`${field} h-8 font-mono`} autoFocus={Boolean(presetTraceId)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[11px] text-[#8B93A1]">Type<select value={dataType} onChange={(event) => { setDataType(event.target.value as ScoreRow["dataType"]); setValue(""); }} className={`${field} h-8`}><option value="numeric">Number</option><option value="boolean">Yes / no</option><option value="categorical">Category</option><option value="text">Free text</option></select></label>
          <label className="grid gap-1 text-[11px] text-[#8B93A1]">Value
            {dataType === "boolean" ? <select value={value} onChange={(event) => setValue(event.target.value)} className={`${field} h-8`}><option value="">Choose…</option><option value="true">Yes (true)</option><option value="false">No (false)</option></select>
              : <input value={value} onChange={(event) => setValue(event.target.value)} inputMode={dataType === "numeric" ? "decimal" : undefined} placeholder={dataType === "numeric" ? "0.8" : dataType === "categorical" ? "friendly" : "What you noticed"} className={`${field} h-8`} />}
          </label>
        </div>
        <label className="grid gap-1 text-[11px] text-[#8B93A1]">Comment (optional)<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={4000} rows={3} className={`${field} resize-y p-2 leading-5`} /></label>
        {error ? <p role="alert" className="rounded border border-[#5B2B2B] bg-[#1A1010] px-3 py-2 text-xs text-[#FF8A8A]">{error}</p> : null}
        <div className="flex gap-2"><button type="submit" disabled={saving} className="h-8 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909] disabled:opacity-50">{saving ? "Saving…" : "Save score"}</button><button type="button" onClick={onClose} disabled={saving} className="h-8 rounded border border-[#262C35] px-3 text-xs text-[#C9CED6] hover:text-white">Cancel</button></div>
      </form>
    </div>
  );
}
