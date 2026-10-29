"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Clipboard, Loader2, Plus, Share2 } from "lucide-react";

type Run = {
  runId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  totalCostUsd: number;
  spanCount: number;
  primaryModel?: string;
  environment?: string;
  release?: string;
};

type Span = { spanId: string; spanType: string; latencyMs?: number; modelId?: string; toolName?: string; errorType?: string; errorMessage?: string };
type BoardItem = { id: string; kind: "confirmed" | "inference"; text: string };

export function InvestigationMode({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const runs = useQuery(api.agentRuns.listByProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip") as Run[] | undefined;
  const [runId, setRunId] = useState(searchParams.get("run") ?? "");
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<BoardItem["kind"]>("confirmed");
  const [board, setBoard] = useState<BoardItem[]>([]);
  const [copied, setCopied] = useState(false);
  const run = runs?.find((candidate) => candidate.runId === runId);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!runs?.length || runId) return;
    setRunId(runs.find((candidate) => candidate.status === "failed")?.runId ?? runs[0].runId);
  }, [runId, runs]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (runId) params.set("run", runId); else params.delete("run");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, runId, searchParams]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${projectId}/runs/${encodeURIComponent(runId)}/spans`)
      .then((response) => response.json() as Promise<{ spans?: Span[] }>)
      .then((body) => { if (!cancelled) setSpans(body.spans ?? []); })
      .catch(() => { if (!cancelled) setSpans([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, runId]);

  const storageKey = `uncoil.investigation.${projectId}.${runId}`;
  useEffect(() => {
    if (!runId) return;
    try { setBoard(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as BoardItem[]); } catch { setBoard([]); }
  }, [runId, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const signals = useMemo(() => {
    const errors = spans.filter((span) => span.errorType || span.errorMessage);
    const slowest = [...spans].sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0))[0];
    const modelCalls = spans.filter((span) => span.modelId).length;
    const toolCalls = spans.filter((span) => span.toolName).length;
    return [
      { label: "Run status", value: run?.status ?? "Not selected", detail: "Saved run summary", kind: "confirmed" as const },
      { label: "Errors", value: String(errors.length), detail: errors[0]?.errorType || errors[0]?.errorMessage || "No error span recorded", kind: "confirmed" as const },
      { label: "Slowest span", value: slowest ? `${slowest.latencyMs ?? 0} ms` : "Not available", detail: slowest?.spanType ?? "Span data unavailable", kind: "confirmed" as const },
      { label: "Model / tool calls", value: `${modelCalls} / ${toolCalls}`, detail: "Observed in the selected timeline", kind: "confirmed" as const },
    ];
  }, [run, spans]);

  function addEvidence() {
    if (!note.trim()) return;
    const next = [...board, { id: crypto.randomUUID(), kind, text: note.trim() }];
    setBoard(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setNote("");
  }

  function removeEvidence(id: string) {
    const next = board.filter((item) => item.id !== id);
    setBoard(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function copyInvestigationSummary() {
    const confirmed = board.filter((item) => item.kind === "confirmed");
    const inferences = board.filter((item) => item.kind === "inference");
    const summary = [
      `Uncoil investigation: ${window.location.href}`,
      `Run: ${run?.runId ?? "Not selected"}`,
      "",
      "Confirmed evidence:",
      ...(confirmed.length ? confirmed.map((item) => `- ${item.text}`) : ["- None recorded"]),
      "",
      "Inference / hypothesis:",
      ...(inferences.length ? inferences.map((item) => `- ${item.text}`) : ["- None recorded"]),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!runs) return <div className="flex items-center gap-2 border border-black/15 bg-white p-6 font-mono text-sm text-black/55"><Loader2 className="size-4 animate-spin" /> Loading runs</div>;

  return <div className="space-y-6">
    <section className="border border-black/15 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/15 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">Operate / guided evidence</p><h1 className="mt-3 font-pixel text-5xl leading-[0.84] tracking-[-0.07em]">Investigation Mode</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">Build a small, reviewable incident record from one trace. Confirm what telemetry shows, label your hypotheses, and share the same evidence with the next operator.</p></div><button type="button" onClick={copyInvestigationSummary} className="inline-flex min-h-10 items-center gap-2 border border-black px-4 font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-[#f4d44d]"><Share2 className="size-3" /> {copied ? "Summary copied" : "Copy evidence summary"}</button></div><div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-black/55">Trace to investigate</span><select value={runId} onChange={(event) => setRunId(event.target.value)} className="min-h-11 w-full border border-black/20 bg-white px-3 font-mono text-xs text-black outline-none focus:border-black">{runs.map((candidate) => <option key={candidate.runId} value={candidate.runId}>{candidate.status.toUpperCase()} · {candidate.runId} · {candidate.primaryModel || "model unknown"}</option>)}</select></label>{run ? <Link href={`/dashboard/${projectId}/runs/${run.runId}`} className="inline-flex min-h-11 items-center justify-center gap-2 border border-black/15 px-4 font-mono text-[10px] uppercase tracking-[0.12em] hover:border-black">Open full trace <ArrowUpRight className="size-3" /></Link> : null}</div></section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{signals.map((signal) => <div key={signal.label} className="border border-black/15 bg-white p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-black/55"><Check className="size-3 text-[#166534]" /> {signal.label}</div><p className="mt-5 font-pixel text-3xl tracking-[-0.05em]">{signal.value}</p><p className="mt-2 text-sm leading-5 text-black/55">{signal.detail}</p></div>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><div className="border border-black/15 bg-white p-5"><div className="flex items-center justify-between border-b border-black/15 pb-4"><div><h2 className="font-mono text-sm uppercase tracking-[0.12em]">Evidence board</h2><p className="mt-1 text-sm text-black/55">Confirmed telemetry and operator inference stay separate.</p></div><Clipboard className="size-4 text-black/45" /></div><div className="mt-5 space-y-3">{board.length ? board.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 border border-black/15 p-4"><div><span className={`font-mono text-[9px] uppercase tracking-[0.12em] ${item.kind === "confirmed" ? "text-[#166534]" : "text-[#92400E]"}`}>{item.kind}</span><p className="mt-2 text-sm leading-6 text-black/70">{item.text}</p></div><button type="button" onClick={() => removeEvidence(item.id)} className="font-mono text-[10px] uppercase text-black/45 hover:text-black">Remove</button></div>) : <p className="border border-dashed border-black/20 p-5 text-sm leading-6 text-black/50">Add the first observation after checking the full trace. Do not write a cause as confirmed until the timeline supports it.</p>}</div><div className="mt-5 border-t border-black/15 pt-5"><div className="flex gap-2"><select value={kind} onChange={(event) => setKind(event.target.value as BoardItem["kind"])} className="border border-black/20 bg-white px-3 font-mono text-[10px] uppercase"><option value="confirmed">Confirmed</option><option value="inference">Inference</option></select><input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addEvidence(); }} placeholder="What does the evidence show?" className="min-w-0 flex-1 border border-black/20 px-3 text-sm outline-none focus:border-black" /><button type="button" onClick={addEvidence} className="inline-flex size-11 shrink-0 items-center justify-center bg-black text-white hover:bg-[#f4d44d] hover:text-black" aria-label="Add evidence"><Plus className="size-4" /></button></div></div></div><div className="border border-black/15 bg-[#f3f2ed] p-5"><h2 className="font-mono text-sm uppercase tracking-[0.12em]">Investigation sequence</h2><ol className="mt-5 space-y-4">{["Stabilize the user impact", "Reconstruct the selected run", "Compare against a healthy baseline", "Record confirmed evidence", "Label the remaining hypothesis", "Verify the next fix"].map((step, index) => <li key={step} className="flex gap-4 border-t border-black/15 pt-4"><span className="font-mono text-[10px] text-black/45">0{index + 1}</span><span className="text-sm leading-5 text-black/70">{step}</span></li>)}</ol>{loading ? <p className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase text-black/45"><Loader2 className="size-3 animate-spin" /> Loading timeline evidence</p> : null}</div></section>
  </div>;
}
