"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { currentFor, queueStats, traceDigest, type TraceDigest } from "@/lib/review-utils";
import { readJson } from "@/lib/safe-json";

const LABELS = [
  { id: "good", text: "Good", key: "1", tone: "border-[#1F4D38] text-[#5BE3A0]", on: "border-[#5BE3A0] bg-[#0E1A14] text-[#5BE3A0]" },
  { id: "needs work", text: "Needs work", key: "2", tone: "border-[#3A3420] text-[#F4D44D]", on: "border-[#F4D44D] bg-[#1A170C] text-[#F4D44D]" },
  { id: "bad", text: "Bad", key: "3", tone: "border-[#5B2B2B] text-[#FF8A8A]", on: "border-[#FF8A8A] bg-[#1A1010] text-[#FF8A8A]" },
  { id: "unsure", text: "Unsure", key: "4", tone: "border-[#262C35] text-[#C9CED6]", on: "border-[#C9CED6] bg-[#161B22] text-white" },
] as const;
const button = "h-7 rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#C9CED6] hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D] disabled:opacity-40";
const field = "w-full rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#E6E9EE] placeholder:text-[#6B7380] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]";
const friendly = (reason: unknown, fallback: string) => ((reason instanceof Error ? reason.message : "").match(/Uncaught Error: ([^\n]+)/)?.[1] ?? fallback);

type Load = { traceId: string; state: "loading" } | { traceId: string; state: "ready"; digest: TraceDigest } | { traceId: string; state: "error"; message: string };

export function ReviewDeck({ projectId }: { projectId: string }) {
  const typedProjectId = projectId as Id<"projects">;
  const identity = useQuery(api.auth.getCurrentIdentity);
  const items = useQuery(api.annotations.list, { projectId: typedProjectId });
  const agreement = useQuery(api.annotations.agreement, { projectId: typedProjectId });
  const assignNext = useMutation(api.annotations.assignNext);
  const submitReview = useMutation(api.annotations.submitReview);
  const release = useMutation(api.annotations.release);
  const create = useMutation(api.annotations.create);
  const me = identity?.subject;
  const [tab, setTab] = useState<"review" | "done">("review");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [traceInput, setTraceInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [load, setLoad] = useState<Load | null>(null);
  const [now] = useState(() => Date.now());
  const claiming = useRef(false);

  const list = useMemo(() => items ?? [], [items]);
  const current = useMemo(() => currentFor(list, me), [list, me]);
  const stats = useMemo(() => queueStats(list, me, now), [list, me, now]);
  const upNext = useMemo(() => [...list].filter((item) => item.status === "queued").sort((a, b) => a.createdAt - b.createdAt).slice(0, 6), [list]);
  const reviewed = useMemo(() => list.filter((item) => item.status === "completed").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)), [list]);

  const claimNext = useCallback(async () => {
    if (!me || claiming.current) return false;
    claiming.current = true;
    try { const result = await assignNext({ projectId: typedProjectId, reviewerIds: [me], strategy: "least_loaded" }); return Boolean(result); } finally { claiming.current = false; }
  }, [assignNext, me, typedProjectId]);

  // Pull the trace behind the current item. A new item resets the answer so the last label never carries over.
  const traceId = current?.traceId;
  useEffect(() => {
    if (!traceId) return;
    let cancelled = false;
    // Reset the form for the new item and start loading its trace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(""); setNotes(""); setLoad({ traceId, state: "loading" });
    fetch(`/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(traceId)}/spans`, { cache: "no-store" })
      .then(async (response) => {
        const body = await readJson<{ spans?: Parameters<typeof traceDigest>[0] }>(response);
        if (!response.ok) throw new Error(body.error ?? `The trace could not be loaded (error ${response.status}).`);
        if (!cancelled) setLoad({ traceId, state: "ready", digest: traceDigest(body.spans ?? []) });
      })
      .catch((reason: unknown) => { if (!cancelled) setLoad({ traceId, state: "error", message: reason instanceof Error ? reason.message : "The trace could not be loaded." }); });
    return () => { cancelled = true; };
  }, [traceId, projectId]);

  async function guarded(action: () => Promise<void>, fallback: string) {
    setBusy(true); setNotice(null);
    try { await action(); } catch (reason) { setNotice({ tone: "error", text: friendly(reason, fallback) }); } finally { setBusy(false); }
  }
  const start = () => guarded(async () => { if (!(await claimNext())) setNotice({ tone: "ok", text: "Nothing is waiting right now." }); }, "Could not take the next item. Try again.");
  const submit = useCallback(() => {
    if (!current || !label || busy) return;
    void guarded(async () => {
      await submitReview({ projectId: typedProjectId, annotationId: current._id, label, notes: notes || undefined });
      const more = await claimNext();
      setNotice({ tone: "ok", text: more ? "Saved. Here is the next one." : "Saved. That was the last one waiting." });
    }, "That did not save. Check your connection and try again.");
  }, [current, label, notes, busy, submitReview, claimNext, typedProjectId]);
  const giveBack = () => current && guarded(async () => { await release({ projectId: typedProjectId, annotationId: current._id }); setNotice({ tone: "ok", text: "Put back in line. Press Start to take the next item." }); }, "Could not put it back.");
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const id = traceInput.trim();
    if (!id) return setNotice({ tone: "error", text: "Paste the id of a trace to add." });
    void guarded(async () => { await create({ projectId: typedProjectId, traceId: id }); setTraceInput(""); setNotice({ tone: "ok", text: "Added to the line." }); }, "Could not add that trace.");
  };

  useEffect(() => {
    if (tab !== "review" || !current) return;
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); return; }
      if (typing) return;
      const found = LABELS.find((item) => item.key === event.key);
      if (found) setLabel(found.id);
      if (event.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, current, submit]);

  const digest = load && load.traceId === traceId && load.state === "ready" ? load.digest : null;
  const failure = load && load.traceId === traceId && load.state === "error" ? load : null;
  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Human review</h1>
        <div role="tablist" aria-label="Views" className="flex gap-1">
          {([["review", "Review"], ["done", `Reviewed ${stats.done}`]] as const).map(([id, text]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-7 rounded px-3 text-xs ${tab === id ? "bg-[#161B22] text-white" : "text-[#8B93A1] hover:text-white"}`}>{text}</button>)}
        </div>
        <Link href={`/dashboard/${projectId}/scores`} className={`${button} ml-auto inline-flex items-center`}>Scores</Link>
      </header>
      {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mx-4 mt-3 rounded border px-3 py-2 text-xs ${notice.tone === "error" ? "border-[#5B2B2B] bg-[#1A1010] text-[#FF8A8A]" : "border-[#1F4D38] bg-[#0E1A14] text-[#5BE3A0]"}`}>{notice.text}</p> : null}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside aria-label="Queue" className="grid content-start gap-4 border-b border-[#1F242C] bg-[#0D1014] p-4 lg:border-b-0 lg:border-r">
          <div>
            <div className="flex items-baseline justify-between"><span className="font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">Reviewed</span><span className="font-mono text-xs">{items === undefined ? "–" : `${stats.done} of ${stats.total}`}</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1F242C]" role="img" aria-label={`${Math.round(stats.share * 100)}% reviewed`}><div className="h-full bg-[#F4D44D]" style={{ width: `${Math.round(stats.share * 100)}%` }} /></div>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-[#1F242C] bg-[#1F242C] text-center">
            {([["Waiting", stats.waiting], ["Yours", stats.mine], ["With others", stats.others], ["Done today", stats.doneToday]] as const).map(([name, value]) => <div key={name} className="bg-[#0E1115] px-2 py-2"><dd className="font-mono text-base">{items === undefined ? "–" : value}</dd><dt className="text-[10px] uppercase tracking-wider text-[#6B7380]">{name}</dt></div>)}
          </dl>
          <p className="text-[11px] leading-4 text-[#8B93A1]">{agreement?.agreement == null ? "Agreement shows once two reviewers have labelled the same trace." : `Reviewers agree on ${Math.round(agreement.agreement * 100)}% of ${agreement.pairs} compared pair${agreement.pairs === 1 ? "" : "s"}.`}</p>
          <div>
            <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">Up next</h2>
            {upNext.length ? <ol className="grid gap-1">{upNext.map((item, index) => <li key={item._id} className="flex items-center gap-2 rounded border border-[#1F242C] px-2 py-1 font-mono text-[11px] text-[#8B93A1]"><span className="text-[#4A5260]">{index + 1}</span><span className="truncate" title={item.traceId}>{item.traceId}</span></li>)}</ol> : <p className="text-[11px] text-[#6B7380]">Nothing is waiting.</p>}
          </div>
          <form onSubmit={add} className="grid gap-1.5"><label htmlFor="add-trace" className="font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">Add a trace to review</label>
            <div className="flex gap-1.5"><input id="add-trace" value={traceInput} onChange={(event) => setTraceInput(event.target.value)} placeholder="Trace id" maxLength={200} className={`${field} h-7 font-mono`} /><button type="submit" disabled={busy} className={button}>Add</button></div>
            <p className="text-[10px] leading-4 text-[#6B7380]">You can also send traces here from Tracing, or from an evaluator that flags them.</p></form>
        </aside>
        <main className="min-w-0">
          {tab === "done" ? (
            <div className="p-4">
              {!reviewed.length ? <p className="rounded border border-dashed border-[#262C35] p-8 text-center text-xs text-[#8B93A1]">Nothing reviewed yet. Labelled traces appear here.</p> : (
                <ul className="grid gap-1.5">{reviewed.map((item) => <li key={item._id} className="flex flex-wrap items-center gap-3 rounded border border-[#1F242C] bg-[#0E1115] px-3 py-2"><span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${LABELS.find((entry) => entry.id === item.label)?.tone ?? "border-[#262C35] text-[#8B93A1]"}`}>{item.label ?? "no label"}</span><Link href={`/dashboard/${projectId}/tracing?trace=${encodeURIComponent(item.traceId)}`} className="min-w-0 flex-1 truncate font-mono text-xs text-[#8AB4FF] underline">{item.traceId}</Link>{item.notes ? <span className="max-w-xs truncate text-[11px] text-[#8B93A1]" title={item.notes}>{item.notes}</span> : null}<span className="font-mono text-[10px] text-[#6B7380]">{item.completedAt ? new Date(item.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""}</span></li>)}</ul>
              )}
            </div>
          ) : items === undefined || identity === undefined ? <div className="p-6 text-xs text-[#8B93A1]" role="status">Loading the line…</div>
            : !current ? (
              <div className="m-auto grid max-w-md place-items-center p-10 text-center">
                <h2 className="text-sm font-semibold">{stats.waiting ? "Ready when you are" : stats.total ? "You are all caught up" : "Teach Uncoil what good looks like"}</h2>
                <p className="mt-2 text-xs leading-5 text-[#8B93A1]">{stats.waiting ? `${stats.waiting} trace${stats.waiting === 1 ? " is" : "s are"} waiting. You will see the question and the answer one at a time, and pick a label with the keys 1 to 4.` : stats.total ? "Nothing is waiting. New traces show up here when someone adds them." : "Add the id of a trace on the left. Each one you label becomes proof of how your agent really does, and can become a dataset row."}</p>
                <button type="button" onClick={start} disabled={busy || !stats.waiting || !me} className="mt-4 h-8 rounded bg-[#F4D44D] px-4 text-xs font-medium text-[#090909] disabled:opacity-40">Start reviewing</button>
              </div>
            ) : (
              <section aria-label="Trace to review" className="flex h-full min-h-0 flex-col">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#1F242C] px-4 py-2.5 font-mono text-[11px] text-[#8B93A1]">
                  <Link href={`/dashboard/${projectId}/tracing?trace=${encodeURIComponent(current.traceId)}`} className="max-w-[40ch] truncate text-sm text-[#8AB4FF] underline" title={current.traceId}>{current.traceId}</Link>
                  {digest ? <><span>{digest.model || "no model"}</span><span>{digest.steps} steps</span><span>{(digest.latencyMs / 1000).toFixed(1)}s</span><span>${digest.costUsd.toFixed(4)}</span></> : null}
                  <button type="button" onClick={giveBack} disabled={busy} className={`${button} ml-auto`}>Give back</button>
                </div>
                <div className="grid min-h-[320px] flex-1 gap-px bg-[#1F242C] md:grid-cols-2">
                  {failure ? <div role="alert" className="bg-[#0B0D10] p-6 md:col-span-2"><p className="text-sm text-[#FF8A8A]">{failure.message}</p><p className="mt-1 text-xs text-[#8B93A1]">You can still label it, or open it in Tracing to look closer.</p></div>
                    : !digest ? <div className="bg-[#0B0D10] p-6 text-xs text-[#8B93A1] md:col-span-2" role="status">Loading the trace…</div>
                    : <>
                      <div className="min-h-0 overflow-auto bg-[#0B0D10] p-4"><h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">What came in</h2><pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-[#C9CED6]">{digest.input || "No input was recorded."}</pre></div>
                      <div className="min-h-0 overflow-auto bg-[#0B0D10] p-4"><h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">What the agent answered</h2>{digest.error ? <p className="mb-2 rounded border border-[#5B2B2B] bg-[#1A1010] px-3 py-2 text-xs text-[#FF8A8A]">It failed: {digest.error}</p> : null}<pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-[#E6E9EE]">{digest.output || "No answer was recorded."}</pre></div>
                    </>}
                </div>
                <div className="grid gap-3 border-t border-[#1F242C] bg-[#0D1014] px-4 py-3">
                  <div role="radiogroup" aria-label="Your label" className="flex flex-wrap gap-2">
                    {LABELS.map((item) => <button key={item.id} type="button" role="radio" aria-checked={label === item.id} onClick={() => setLabel(item.id)} className={`h-9 rounded border px-4 text-xs font-medium ${label === item.id ? item.on : item.tone}`}><kbd className="mr-2 rounded border border-current px-1 font-mono text-[10px] opacity-70">{item.key}</kbd>{item.text}</button>)}
                  </div>
                  <label className="grid gap-1 text-[11px] text-[#8B93A1]">Notes (optional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={2000} placeholder="Why this label? What should it have said?" className={`${field} resize-y p-2 leading-5`} /></label>
                  <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={submit} disabled={!label || busy} className="h-9 rounded bg-[#F4D44D] px-5 text-xs font-medium text-[#090909] disabled:opacity-40">{busy ? "Saving…" : "Save and next"}</button><span className="text-[11px] text-[#6B7380]">{label ? "Press Enter to save." : "Pick a label with 1 to 4."}</span></div>
                </div>
              </section>
            )}
        </main>
      </div>
    </div>
  );
}
