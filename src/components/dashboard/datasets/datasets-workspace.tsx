"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { MAX_IMPORT_ROWS, parseDatasetImport } from "@/lib/dataset-import";
import { EmptyState } from "../empty/empty-state";
import { SampleDataset } from "../empty/samples";

type Overview = FunctionReturnType<typeof api.datasets.overview>[number];
type ItemRow = NonNullable<FunctionReturnType<typeof api.datasets.items>>["rows"][number];
const button = "h-7 rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#C9CED6] hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D] disabled:opacity-40";
const field = "w-full rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#E6E9EE] placeholder:text-[#6B7380] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]";
const friendly = (reason: unknown, fallback: string) => ((reason instanceof Error ? reason.message : "").match(/Uncaught Error: ([^\n]+)/)?.[1] ?? fallback);
const clip = (value: string, length: number) => (value.length > length ? `${value.slice(0, length)}…` : value);

export function DatasetsWorkspace({ projectId, initialDataset }: { projectId: string; initialDataset?: string }) {
  const typedProjectId = projectId as Id<"projects">;
  const overview = useQuery(api.datasets.overview, { projectId: typedProjectId });
  const createDataset = useMutation(api.evaluation.createDataset);
  const [pick, setPick] = useState<string | null>(initialDataset ?? null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const current: Overview | null = overview?.find((row) => row.dataset._id === pick) ?? overview?.[0] ?? null;

  useEffect(() => {
    if (current) window.history.replaceState(null, "", `${window.location.pathname}?dataset=${current.dataset._id}`);
  }, [current]);

  async function submitNew(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNotice({ tone: "error", text: "Give the dataset a name." });
    try {
      const id = await createDataset({ projectId: typedProjectId, name: trimmed });
      setPick(id); setAdding(false); setName(""); setNotice({ tone: "ok", text: `${trimmed} created. Add rows below.` });
    } catch (reason) { setNotice({ tone: "error", text: friendly(reason, "That did not save. Check your connection and try again.") }); }
  }

  return (
    <div className="flex h-svh min-w-0 flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Datasets</h1>
        <span className="text-xs text-[#8B93A1]">Rows of inputs with the answer you expect. Experiments run them against a prompt.</span>
        <Link href={`/dashboard/${projectId}/experiments`} className={`${button} ml-auto inline-flex items-center`}>Experiments</Link>
      </header>
      {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mx-4 mt-3 rounded border px-3 py-2 text-xs ${notice.tone === "error" ? "border-[#5B2B2B] bg-[#1A1010] text-[#FF8A8A]" : "border-[#1F4D38] bg-[#0E1A14] text-[#5BE3A0]"}`}>{notice.text}</p> : null}
      {overview === undefined ? (
        <div className="grid flex-1 content-start gap-2 p-4" role="status" aria-label="Loading datasets">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-9 animate-pulse rounded bg-[#11151A]" />)}</div>
      ) : !overview.length ? (
        <div className="m-auto w-full p-4"><EmptyState eyebrow="Datasets" title="Build a set of questions to test against" why="One column for what goes in, one for the answer you expect. Paste from a spreadsheet or save real traces, then run an experiment." sample={<SampleDataset />}>
          <form onSubmit={submitNew} className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="first-dataset">Dataset name</label><input id="first-dataset" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="support-questions" className={`${field} h-8 font-mono`} /><button type="submit" className="h-8 shrink-0 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909]">Create dataset</button></form>
        </EmptyState></div>
      ) : current ? <Sheet key={current.dataset._id} projectId={projectId} row={current} onNotice={setNotice} /> : null}
      {overview?.length ? (
        <nav aria-label="Datasets" className="flex items-center gap-1 overflow-x-auto border-t border-[#1F242C] bg-[#0D1014] px-2 py-1.5">
          {overview.map((row) => {
            const active = row.dataset._id === current?.dataset._id;
            return <button key={row.dataset._id} type="button" aria-current={active} onClick={() => setPick(row.dataset._id)} className={`flex h-8 shrink-0 items-center gap-2 rounded-t border-b-2 px-3 font-mono text-xs ${active ? "border-[#F4D44D] bg-[#161B22] text-white" : "border-transparent text-[#8B93A1] hover:text-white"}`}>{row.dataset.access === "restricted" ? <span aria-label="Restricted" title="Only chosen people can open this">🔒</span> : null}{row.dataset.name}<span className="text-[10px] text-[#6B7380]">{row.itemCount}{row.countCapped ? "+" : ""}</span></button>;
          })}
          {adding ? (
            <form onSubmit={submitNew} className="flex items-center gap-1"><label className="sr-only" htmlFor="new-dataset">New dataset name</label><input id="new-dataset" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus placeholder="name" className={`${field} h-7 w-40 font-mono`} /><button type="submit" className={button}>Add</button><button type="button" onClick={() => { setAdding(false); setName(""); }} className={button}>Cancel</button></form>
          ) : <button type="button" onClick={() => setAdding(true)} className={`${button} ml-1`} aria-label="New dataset">+ New dataset</button>}
        </nav>
      ) : null}
    </div>
  );
}

function Sheet({ projectId, row, onNotice }: { projectId: string; row: Overview; onNotice: (notice: { tone: "ok" | "error"; text: string } | null) => void }) {
  const typedProjectId = projectId as Id<"projects">;
  const { dataset } = row;
  const data = useQuery(api.datasets.items, { projectId: typedProjectId, datasetId: dataset._id });
  const addItem = useMutation(api.evaluation.addDatasetItem);
  const importItems = useMutation(api.evaluation.importItems);
  const updateItem = useMutation(api.datasets.updateItem);
  const deleteItem = useMutation(api.datasets.deleteItem);
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [paste, setPaste] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<{ id: string; column: "input" | "expectedOutput" } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (data?.rows ?? []).filter((item) => !needle || item.input.toLowerCase().includes(needle) || (item.expectedOutput ?? "").toLowerCase().includes(needle));
  }, [data, filter]);
  const parsed = useMemo(() => (paste === null ? null : parseDatasetImport(paste)), [paste]);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try { await action(); onNotice({ tone: "ok", text: done }); } catch (reason) { onNotice({ tone: "error", text: friendly(reason, "That did not save. Check your connection and try again.") }); }
    finally { setBusy(false); }
  }
  async function submitRow(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim()) return onNotice({ tone: "error", text: "A row needs an input." });
    await run(async () => { await addItem({ projectId: typedProjectId, datasetId: dataset._id, input, expectedOutput: expected || undefined }); setInput(""); setExpected(""); inputRef.current?.focus(); }, "Row added.");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] bg-[#0D1014] px-4 py-2 text-xs text-[#8B93A1]">
        <span className="font-mono text-sm font-semibold text-[#E6E9EE]">{dataset.name}</span>
        <span className="font-mono">v{dataset.version ?? 1}</span>
        <span>{row.itemCount}{row.countCapped ? "+" : ""} rows · {row.withExpected} with an expected answer{row.fromTraces ? ` · ${row.fromTraces} from traces` : ""} · {row.experimentCount} experiment{row.experimentCount === 1 ? "" : "s"}</span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="row-filter">Filter rows</label>
          <input id="row-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter rows" className={`${field} h-7 w-44`} />
          <button type="button" onClick={() => setPaste(paste === null ? "" : null)} aria-expanded={paste !== null} className={button}>Paste rows</button>
          <Link href={`/dashboard/${projectId}/experiments?dataset=${dataset._id}`} className={`${button} inline-flex items-center`}>Run an experiment</Link>
        </span>
      </div>
      {paste !== null ? (
        <section aria-label="Paste rows" className="grid gap-2 border-b border-[#1F242C] bg-[#0E1115] px-4 py-3">
          <label className="grid gap-1 text-[11px] text-[#8B93A1]">Paste from a spreadsheet (input, tab, expected answer), one line each, or JSON lines like {`{"input":"…","expected":"…"}`}. Up to {MAX_IMPORT_ROWS} rows at a time.
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} spellCheck={false} className={`${field} resize-y p-2 font-mono leading-5`} />
          </label>
          {parsed ? (
            <div className="text-[11px]" aria-live="polite">
              <p className={parsed.items.length ? "text-[#5BE3A0]" : "text-[#6B7380]"}>{parsed.items.length} row{parsed.items.length === 1 ? "" : "s"} ready{parsed.truncated ? `, extra rows beyond ${MAX_IMPORT_ROWS} left out` : ""}.</p>
              {parsed.problems.slice(0, 3).map((problem) => <p key={problem.line} className="text-[#F4D44D]">Line {problem.line}: {problem.message}. It will be skipped.</p>)}
              {parsed.problems.length > 3 ? <p className="text-[#F4D44D]">…and {parsed.problems.length - 3} more skipped.</p> : null}
            </div>
          ) : null}
          <div className="flex gap-2"><button type="button" disabled={busy || !parsed?.items.length} onClick={() => run(async () => { const result = await importItems({ projectId: typedProjectId, datasetId: dataset._id, items: parsed!.items }); setPaste(null); onNotice({ tone: "ok", text: `${result.imported} rows added.` }); }, "Rows added.")} className="h-8 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909] disabled:opacity-40">Add {parsed?.items.length ?? 0} rows</button><button type="button" onClick={() => setPaste(null)} className={button}>Cancel</button></div>
        </section>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#0E1115] text-[10px] uppercase tracking-wider text-[#6B7380]"><tr><th scope="col" className="w-12 border-b border-r border-[#1F242C] px-2 py-2 text-right font-medium">#</th><th scope="col" className="border-b border-r border-[#1F242C] px-3 py-2 font-medium">Input</th><th scope="col" className="border-b border-r border-[#1F242C] px-3 py-2 font-medium">Expected answer</th><th scope="col" className="w-28 border-b border-[#1F242C] px-3 py-2 font-medium">Source</th><th scope="col" className="w-16 border-b border-[#1F242C] px-2 py-2"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            <tr className="bg-[#0D1014]">
              <td className="border-b border-r border-[#1F242C] px-2 py-2 text-right font-mono text-[11px] text-[#F4D44D]">+</td>
              <td className="border-b border-r border-[#1F242C] p-1.5"><label className="sr-only" htmlFor="new-input">New input</label><textarea id="new-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Type a new input" className={`${field} resize-y border-transparent bg-transparent p-1.5 leading-5`} /></td>
              <td className="border-b border-r border-[#1F242C] p-1.5"><label className="sr-only" htmlFor="new-expected">New expected answer</label><textarea id="new-expected" value={expected} onChange={(e) => setExpected(e.target.value)} rows={1} placeholder="Expected answer (optional)" className={`${field} resize-y border-transparent bg-transparent p-1.5 leading-5`} /></td>
              <td className="border-b border-[#1F242C] px-3 py-2 text-[11px] text-[#6B7380]">By hand</td>
              <td className="border-b border-[#1F242C] px-2"><button type="button" onClick={submitRow} disabled={busy || !input.trim()} className="h-7 rounded bg-[#F4D44D] px-2 text-xs font-medium text-[#090909] disabled:opacity-40">Add</button></td>
            </tr>
            {data === undefined ? <tr><td colSpan={5} className="p-6 text-center text-xs text-[#8B93A1]" role="status">Loading rows…</td></tr>
              : data === null ? <tr><td colSpan={5} className="p-6 text-center text-xs text-[#FF8A8A]" role="alert">This dataset could not be opened. You may not have access.</td></tr>
              : !data.rows.length ? <tr><td colSpan={5} className="p-8 text-center text-xs leading-5 text-[#8B93A1]">No rows yet. Type one in the first line, paste from a spreadsheet, or save a trace into this dataset from Tracing.</td></tr>
              : !rows.length ? <tr><td colSpan={5} className="p-8 text-center text-xs text-[#8B93A1]">No rows match “{filter}”. <button type="button" onClick={() => setFilter("")} className="text-[#8AB4FF] underline">Clear filter</button></td></tr>
              : rows.map((item, index) => <Row key={item._id} item={item} index={index + 1} projectId={projectId} editing={editing?.id === item._id ? editing.column : null} onEdit={(column) => setEditing(column ? { id: item._id, column } : null)}
                  onSave={(nextInput, nextExpected) => run(async () => { await updateItem({ projectId: typedProjectId, itemId: item._id, input: nextInput, expectedOutput: nextExpected || undefined }); setEditing(null); }, "Saved.")}
                  onDelete={() => { if (window.confirm("Delete this row? Experiments that already used it keep their results.")) void run(async () => { await deleteItem({ projectId: typedProjectId, itemId: item._id }); }, "Row deleted."); }} />)}
          </tbody>
        </table>
        {data?.more ? <p className="p-3 text-center text-[11px] text-[#8B93A1]">Showing the first 500 rows. Use the filter to find others in this set, or split a large dataset into several.</p> : null}
      </div>
    </div>
  );
}

function Row({ item, index, projectId, editing, onEdit, onSave, onDelete }: { item: ItemRow; index: number; projectId: string; editing: "input" | "expectedOutput" | null; onEdit: (column: "input" | "expectedOutput" | null) => void; onSave: (input: string, expected: string) => Promise<void>; onDelete: () => void }) {
  const [draftInput, setDraftInput] = useState(item.input);
  const [draftExpected, setDraftExpected] = useState(item.expectedOutput ?? "");
  const open = (column: "input" | "expectedOutput") => { setDraftInput(item.input); setDraftExpected(item.expectedOutput ?? ""); onEdit(column); };
  const save = () => { if (!draftInput.trim()) return; void onSave(draftInput, draftExpected); };
  const key = (event: React.KeyboardEvent) => { if (event.key === "Escape") onEdit(null); if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); save(); } };
  const cell = (column: "input" | "expectedOutput", value: string | undefined, draft: string, setDraft: (value: string) => void) => editing === column ? (
    <div className="grid gap-1"><textarea autoFocus aria-label={column === "input" ? `Input of row ${index}` : `Expected answer of row ${index}`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={key} rows={3} className={`${field} resize-y p-2 font-mono leading-5`} />
      <span className="flex items-center gap-1.5"><button type="button" onClick={save} disabled={!draftInput.trim()} className="h-6 rounded bg-[#F4D44D] px-2 text-[11px] font-medium text-[#090909] disabled:opacity-40">Save</button><button type="button" onClick={() => onEdit(null)} className="h-6 rounded border border-[#262C35] px-2 text-[11px] text-[#C9CED6]">Cancel</button><span className="text-[10px] text-[#6B7380]">Ctrl+Enter saves, Esc cancels</span></span></div>
  ) : (
    <button type="button" onClick={() => open(column)} aria-label={`Edit ${column === "input" ? "input" : "expected answer"} of row ${index}`} className="block w-full whitespace-pre-wrap break-words rounded px-1.5 py-1 text-left font-mono text-xs leading-5 hover:bg-[#12161C]">{value ? clip(value, 400) : <span className="font-sans text-[#4A5260]">{column === "input" ? "(empty)" : "Add expected answer"}</span>}</button>
  );
  return (
    <tr className="align-top hover:bg-[#0F1318]">
      <td className="border-b border-r border-[#161B21] px-2 py-2 text-right font-mono text-[11px] text-[#4A5260]">{index}</td>
      <td className="border-b border-r border-[#161B21] p-1.5">{cell("input", item.input, draftInput, setDraftInput)}</td>
      <td className="border-b border-r border-[#161B21] p-1.5">{cell("expectedOutput", item.expectedOutput, draftExpected, setDraftExpected)}</td>
      <td className="border-b border-[#161B21] px-3 py-2 text-[11px] text-[#8B93A1]">{item.traceId ? <Link href={`/dashboard/${projectId}/tracing?trace=${encodeURIComponent(item.traceId)}`} className="font-mono text-[#8AB4FF] underline" title={item.traceId}>Trace {clip(item.traceId, 8)}</Link> : "By hand"}</td>
      <td className="border-b border-[#161B21] px-2 py-2 text-right"><button type="button" onClick={onDelete} aria-label={`Delete row ${index}`} className="h-6 rounded border border-[#262C35] px-2 text-[11px] text-[#FF8A8A] hover:border-[#5B2B2B]">Delete</button></td>
    </tr>
  );
}
