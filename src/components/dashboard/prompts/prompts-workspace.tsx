"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PromptDetail, TABS, type PromptVersion, type Tab } from "./prompt-detail";
import { PromptEditor, type EditorValues } from "./prompt-editor";
import { EmptyState } from "../empty/empty-state";
import { SamplePrompts } from "../empty/samples";

type Query = Record<string, string>;
type Sort = "updated" | "name";
const control = "h-7 rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#C9CED6] hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]";

function ago(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function readUrl(initial: Query): Query {
  if (typeof window === "undefined") return initial;
  const query: Query = {};
  for (const [key, value] of new URLSearchParams(window.location.search)) if (value) query[key] = value.slice(0, 200);
  return query;
}

export function PromptsWorkspace({ projectId, initialQuery }: { projectId: string; initialQuery: Query }) {
  const typedProjectId = projectId as Id<"projects">;
  const prompts = useQuery(api.prompts.list, { projectId: typedProjectId });
  const createPrompt = useMutation(api.prompts.create);
  const createVersion = useMutation(api.prompts.createVersion);
  const updatePrompt = useMutation(api.prompts.update);
  const updateLabels = useMutation(api.prompts.updateLabels);
  const [query, setQuery] = useState<Query>(() => readUrl(initialQuery));
  const [sort, setSort] = useState<Sort>("updated");
  const [draft, setDraft] = useState(query.q ?? "");
  const [editor, setEditor] = useState<{ mode: "prompt" | "version"; initial: Partial<EditorValues> } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = prompts?.find((prompt) => prompt._id === query.prompt) ?? null;
  const tab: Tab = (TABS as readonly string[]).includes(query.tab) ? (query.tab as Tab) : "text";
  const usage = useQuery(api.prompts.versionUsage, selected && tab === "usage" ? { projectId: typedProjectId, promptId: selected._id } : "skip");
  const links = useQuery(api.prompts.listTraceLinks, selected && tab === "usage" ? { projectId: typedProjectId } : "skip");

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
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
      if (event.key === "/" && !typing) { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === "Escape" && !typing) { if (editor) setEditor(null); else if (query.prompt) update({ prompt: "", tab: "" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, query.prompt, update]);

  const rows = useMemo(() => {
    const needle = (query.q ?? "").toLowerCase();
    const filtered = (prompts ?? []).filter((prompt) => !needle || prompt.name.toLowerCase().includes(needle) || (prompt.description ?? "").toLowerCase().includes(needle) || prompt.versions.some((version) => version.labels.some((label) => label.toLowerCase() === needle)));
    return [...filtered].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt));
  }, [prompts, query.q, sort]);

  const stats = useMemo(() => {
    const all = prompts ?? [];
    return {
      prompts: all.length,
      versions: all.reduce((sum, prompt) => sum + (prompt.versions[0]?.version ?? 0), 0),
      production: all.filter((prompt) => prompt.versions.some((version) => version.labels.includes("production"))).length,
    };
  }, [prompts]);

  async function save(values: EditorValues) {
    if (editor?.mode === "prompt") {
      const id = await createPrompt({ projectId: typedProjectId, name: values.name, description: values.description || undefined, type: "text", content: values.content, model: values.model || undefined, labels: values.labels });
      update({ prompt: id, tab: "" });
    } else if (selected) {
      await createVersion({ projectId: typedProjectId, promptId: selected._id, content: values.content, model: values.model || undefined, labels: values.labels, commitMessage: values.commitMessage || undefined });
    }
    setEditor(null);
  }

  const takenNames = (prompts ?? []).map((prompt) => prompt.name);

  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Prompts</h1>
        <form className="min-w-[180px] flex-1" onSubmit={(event) => { event.preventDefault(); update({ q: draft.trim() }); }}>
          <label htmlFor="prompt-search" className="sr-only">Search prompts</label>
          <input id="prompt-search" ref={searchRef} value={draft} onChange={(event) => { setDraft(event.target.value); if (!event.target.value) update({ q: "" }); }} placeholder="Search by name, description or label ( / )" className="h-8 w-full rounded border border-[#262C35] bg-[#0E1115] px-3 font-mono text-xs placeholder:text-[#6B7380] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]" />
        </form>
        <label className="sr-only" htmlFor="prompt-sort">Sort</label>
        <select id="prompt-sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={control}><option value="updated">Recently changed</option><option value="name">Name A to Z</option></select>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#8B93A1]"><span className="size-1.5 animate-pulse rounded-full bg-[#5BE3A0]" />Live</span>
        <Link href={`/dashboard/${projectId}/playground`} className={`${control} inline-flex items-center`}>Playground</Link>
        <button type="button" onClick={() => setEditor({ mode: "prompt", initial: {} })} className="h-7 rounded bg-[#F4D44D] px-3 text-xs font-medium text-[#090909] hover:bg-[#f7de70]">New prompt</button>
      </header>
      {query.q ? (
        <div className="flex items-center gap-1.5 border-b border-[#1F242C] px-4 py-1.5" aria-label="Active filters">
          <button type="button" onClick={() => { setDraft(""); update({ q: "" }); }} aria-label={`Remove filter ${query.q}`} className="flex items-center gap-1 rounded border border-[#3A3420] bg-[#1A170C] px-2 py-0.5 font-mono text-[11px] text-[#F4D44D]">“{query.q}” ×</button>
        </div>
      ) : null}
      <div className="relative grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Prompts" className={`min-h-0 overflow-auto border-r border-[#1F242C] bg-[#0D1014] ${selected ? "hidden lg:block" : ""}`}>
          {prompts === undefined ? (
            <div className="grid gap-1 p-2" role="status" aria-label="Loading prompts">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded bg-[#11151A]" />)}</div>
          ) : !prompts.length ? <p className="p-4 text-xs text-[#6B7380]">No prompts yet.</p>
          : !rows.length ? <p className="p-4 text-xs text-[#8B93A1]">No prompts match “{query.q}”. <button type="button" onClick={() => { setDraft(""); update({ q: "" }); }} className="text-[#8AB4FF] underline">Clear search</button></p>
          : (
            <ul className="grid gap-px p-2">
              {rows.map((prompt) => {
                const newest = prompt.versions[0];
                const live = prompt.versions.find((version) => version.labels.includes("production"));
                const active = prompt._id === query.prompt;
                return (
                  <li key={prompt._id}>
                    <button type="button" aria-current={active} onClick={() => update({ prompt: prompt._id, tab: "" })} className={`w-full rounded px-2.5 py-2 text-left ${active ? "bg-[#161B21] shadow-[inset_2px_0_0_#F4D44D]" : "hover:bg-[#11151A]"}`}>
                      <span className="flex items-center gap-2"><span className={`size-1.5 shrink-0 rounded-full ${live ? "bg-[#5BE3A0]" : "bg-[#3A424E]"}`} title={live ? `Production runs v${live.version}` : "Not in production"} /><span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">{prompt.name}</span><span className="font-mono text-[10px] text-[#6B7380]">v{newest?.version ?? 0}</span></span>
                      <span className="mt-0.5 block truncate pl-3.5 text-[11px] text-[#6B7380]">{prompt.description || ago(prompt.updatedAt, now)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
        <main className={`min-h-0 min-w-0 ${selected || (prompts !== undefined && !prompts.length) ? "" : "hidden lg:block"}`}>
          {prompts !== undefined && !prompts.length ? (
            <div className="p-4"><EmptyState eyebrow="Prompts" title="Keep your prompts out of your code" why="Change the text without a deploy, roll back in one click, and see which traces used which version." sample={<SamplePrompts />} action={{ label: "Create your first prompt", onClick: () => setEditor({ mode: "prompt", initial: {} }) }} /></div>
          ) : selected ? (
            <PromptDetail
              key={selected._id}
              projectId={projectId}
              prompt={selected}
              tab={tab}
              onTab={(next) => update({ tab: next === "text" ? "" : next })}
              usage={usage}
              links={links}
              onNewVersion={(from: PromptVersion) => setEditor({ mode: "version", initial: { content: from.content, model: from.model ?? "" } })}
              onClose={() => update({ prompt: "", tab: "" })}
              onSetLabels={async (version, labels) => { await updateLabels({ projectId: typedProjectId, versionId: version._id, labels }); }}
              onSaveDetails={async (name, description) => { await updatePrompt({ projectId: typedProjectId, promptId: selected._id, name, description }); }}
            />
          ) : prompts !== undefined ? (
            <div className="mx-auto max-w-sm p-10 text-center text-xs leading-5 text-[#8B93A1]"><p className="text-sm font-semibold text-[#E6E9EE]">Pick a prompt</p><p className="mt-1">{stats.prompts} prompts, {stats.versions} versions saved, {stats.production} running in production.</p></div>
          ) : null}
        </main>
        {editor ? (
          <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[520px] min-h-0 flex-col border-l border-[#1F242C] bg-[#0B0D10] shadow-[-24px_0_48px_rgba(0,0,0,0.5)]">
            <PromptEditor key={`${editor.mode}-${editor.initial.content?.length ?? 0}-${selected?._id ?? ""}`} mode={editor.mode} initial={editor.initial} takenNames={takenNames} onCancel={() => setEditor(null)} onSave={save} />
          </aside>
        ) : null}
      </div>
      {query.prompt && prompts && !selected && !editor ? (
        <p role="alert" className="border-t border-[#5B2B2B] bg-[#1A1010] px-4 py-2 text-xs text-[#FF8A8A]">That prompt was not found. It may have been removed. <button type="button" onClick={() => update({ prompt: "", tab: "" })} className="underline">Back to all prompts</button></p>
      ) : null}
    </div>
  );
}
