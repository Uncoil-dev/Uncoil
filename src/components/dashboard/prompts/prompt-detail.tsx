"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import { diffSummary, lineDiff } from "@/lib/prompt-utils";

export type PromptRow = FunctionReturnType<typeof api.prompts.list>[number];
export type PromptVersion = PromptRow["versions"][number];
export type VersionUsage = FunctionReturnType<typeof api.prompts.versionUsage>[number];
type TraceLink = FunctionReturnType<typeof api.prompts.listTraceLinks>[number];

export const TABS = ["text", "compare", "usage", "test"] as const;
export type Tab = (typeof TABS)[number];
const TAB_TEXT: Record<Tab, string> = { text: "Text", compare: "Compare", usage: "Usage", test: "Test" };
const chip = "rounded border px-1.5 py-0.5 font-mono text-[10px]";
const labelTone = (label: string) => label === "production" ? `${chip} border-[#1F4D38] bg-[#0E1A14] text-[#5BE3A0]` : label === "latest" ? `${chip} border-[#3A3420] bg-[#1A170C] text-[#F4D44D]` : `${chip} border-[#262C35] text-[#C9CED6]`;

function when(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function PromptDetail({ projectId, prompt, tab, onTab, usage, links, onNewVersion, onClose, onSetLabels, onSaveDetails }: {
  projectId: string; prompt: PromptRow; tab: Tab; onTab: (tab: Tab) => void;
  usage: VersionUsage[] | undefined; links: TraceLink[] | undefined;
  onNewVersion: (from: PromptVersion) => void; onClose: () => void;
  onSetLabels: (version: PromptVersion, labels: string[]) => Promise<void>;
  onSaveDetails: (name: string, description: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(prompt.name);
  const [description, setDescription] = useState(prompt.description ?? "");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const newest = prompt.versions[0];

  async function run(action: () => Promise<void>, done: string) {
    try { await action(); setNotice({ tone: "ok", text: done }); } catch (reason) {
      const match = (reason instanceof Error ? reason.message : "").match(/Uncaught Error: ([^\n]+)/);
      setNotice({ tone: "error", text: match?.[1] ?? "That did not save. Check your connection and try again." });
    }
  }

  const [pick, setPick] = useState<string | null>(null);
  const current = prompt.versions.find((version) => version._id === pick) ?? newest;
  const holder = (label: string) => prompt.versions.find((version) => version.labels.includes(label));
  const point = (label: string, version: PromptVersion) => run(() => onSetLabels(version, [...version.labels.filter((item) => item !== label), label]), `“${label}” now points at version ${version.version}.`);
  const drop = (label: string, version: PromptVersion) => run(() => onSetLabels(version, version.labels.filter((item) => item !== label)), `Removed “${label}” from version ${version.version}.`);

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-label={`Prompt ${prompt.name}`}>
      <div className="flex items-start gap-2 border-b border-[#1F242C] px-4 py-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form className="grid gap-1.5" onSubmit={(event) => { event.preventDefault(); void run(async () => { await onSaveDetails(name, description); setEditing(false); }, "Details saved."); }}>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} aria-label="Prompt name" className="h-8 rounded border border-[#262C35] bg-[#0E1115] px-2 font-mono text-sm" />
              <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} aria-label="Description" placeholder="Description" className="h-8 rounded border border-[#262C35] bg-[#0E1115] px-2 text-xs" />
              <div className="flex gap-1.5"><button type="submit" className="h-7 rounded bg-[#F4D44D] px-2.5 text-xs font-medium text-[#090909]">Save</button><button type="button" onClick={() => { setEditing(false); setName(prompt.name); setDescription(prompt.description ?? ""); }} className="h-7 rounded border border-[#262C35] px-2.5 text-xs text-[#C9CED6]">Cancel</button></div>
            </form>
          ) : (
            <>
              <h2 className="truncate font-mono text-sm font-semibold" title={prompt.name}>{prompt.name}</h2>
              <p className="mt-0.5 text-xs text-[#8B93A1]">{prompt.description || "No description yet."} <button type="button" onClick={() => setEditing(true)} className="text-[#8AB4FF] underline">Edit details</button></p>
            </>
          )}
        </div>
        <button type="button" onClick={() => onNewVersion(current)} className="h-7 shrink-0 rounded bg-[#F4D44D] px-2.5 text-xs font-medium text-[#090909] hover:bg-[#f7de70]">New version</button>
        <button type="button" onClick={onClose} aria-label="Close prompt" className="h-7 shrink-0 rounded border border-[#262C35] px-2 text-xs text-[#C9CED6] hover:text-white">Close</button>
      </div>
      <div aria-label="Release pipeline" className="grid gap-px border-b border-[#1F242C] bg-[#1F242C] md:grid-cols-3">
        {(["development", "staging", "production"] as const).map((label, index) => {
          const version = holder(label);
          const production = label === "production";
          return (
            <div key={label} className="bg-[#0B0D10] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#6B7380]"><span className={`size-1.5 rounded-full ${production ? "bg-[#5BE3A0]" : label === "staging" ? "bg-[#F4D44D]" : "bg-[#6B7380]"}`} />{label}{index < 2 ? <span aria-hidden className="ml-auto text-[#3A424E]">→</span> : null}</div>
              <div className="mt-1.5 font-mono text-lg">{version ? `v${version.version}` : "–"}</div>
              <div className="mt-1 text-[11px] text-[#6B7380]">{version ? (version.commitMessage ?? when(version.createdAt)) : `No version in ${label} yet.${production ? "" : " Point a version here to use it."}`}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {production ? (
                  version ? <button type="button" onClick={() => drop("production", version)} className="h-6 rounded border border-[#5B2B2B] px-2 text-[11px] text-[#FF8A8A]" title="Take production off this version, for example to roll back">Roll back</button>
                    : <span className="text-[11px] text-[#6B7380]">Needs a passed release gate</span>
                ) : current && !current.labels.includes(label) ? <button type="button" onClick={() => point(label, current)} className="h-6 rounded border border-[#262C35] px-2 text-[11px] text-[#C9CED6] hover:text-white">Point at v{current.version}</button> : <span className="text-[11px] text-[#6B7380]">Viewing this version</span>}
              </div>
            </div>
          );
        })}
      </div>
      {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mx-4 mt-3 rounded border px-3 py-2 text-xs ${notice.tone === "error" ? "border-[#5B2B2B] bg-[#1A1010] text-[#FF8A8A]" : "border-[#1F4D38] bg-[#0E1A14] text-[#5BE3A0]"}`}>{notice.text}</p> : null}
      <div className="grid min-h-0 flex-1 md:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Version history" className="min-h-0 overflow-auto border-b border-[#1F242C] p-2 md:border-b-0 md:border-r">
          <ol className="grid gap-1">
            {prompt.versions.map((version) => (
              <li key={version._id}>
                <button type="button" aria-current={current?._id === version._id} onClick={() => setPick(version._id)} className={`w-full rounded px-2.5 py-2 text-left ${current?._id === version._id ? "bg-[#161B21] shadow-[inset_2px_0_0_#F4D44D]" : "hover:bg-[#11151A]"}`}>
                  <span className="flex flex-wrap items-center gap-1"><span className="font-mono text-xs font-semibold">v{version.version}</span>{version.labels.filter((label) => label !== "latest").map((label) => <span key={label} className={labelTone(label)}>{label}</span>)}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#8B93A1]">{version.commitMessage ?? "No message"}</span>
                  <span className="block font-mono text-[10px] text-[#6B7380]">{when(version.createdAt)}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div role="tablist" aria-label="Prompt sections" className="flex gap-1 border-b border-[#1F242C] px-3">
            {TABS.map((id) => (
              <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => onTab(id)} className={`h-9 border-b-2 px-2.5 text-xs ${tab === id ? "border-[#F4D44D] text-white" : "border-transparent text-[#8B93A1] hover:text-white"}`}>{TAB_TEXT[id]}</button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-auto p-4">
            {tab === "text" && current ? <TextView version={current} onNewVersion={onNewVersion} /> : null}
            {tab === "compare" ? <Compare versions={prompt.versions} /> : null}
            {tab === "usage" ? <Usage projectId={projectId} versions={prompt.versions} usage={usage} links={links} /> : null}
            {tab === "test" ? <Test projectId={projectId} prompt={prompt} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function TextView({ version, onNewVersion }: { version: PromptVersion; onNewVersion: (version: PromptVersion) => void }) {
  const lines = version.content.split("\n");
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8B93A1]">
        <span className="font-mono text-xs font-semibold text-[#E6E9EE]">v{version.version}</span>
        {version.model ? <span className="font-mono">{version.model}</span> : null}
        {version.variables.map((name) => <span key={name} className="rounded border border-[#3A3420] bg-[#1A170C] px-1.5 py-0.5 font-mono text-[10px] text-[#F4D44D]">{`{{${name}}}`}</span>)}
        {!version.variables.length ? <span>no variables</span> : null}
        <span className="ml-auto flex gap-1.5">
          <button type="button" onClick={() => void navigator.clipboard?.writeText(version.content)} className="h-7 rounded border border-[#262C35] px-2 text-[#C9CED6] hover:text-white">Copy text</button>
          <button type="button" onClick={() => onNewVersion(version)} className="h-7 rounded border border-[#262C35] px-2 text-[#C9CED6] hover:text-white">Edit as new version</button>
        </span>
      </div>
      <div className="overflow-auto rounded border border-[#1F242C] bg-[#0E1115] font-mono text-xs leading-5" role="table" aria-label="Prompt text">
        {lines.map((line, index) => (
          <div key={index} role="row" className="grid grid-cols-[2.5rem_1fr]"><span className="select-none pr-2 text-right text-[#4A5260]">{index + 1}</span><span className="whitespace-pre-wrap break-words pr-3 text-[#C9CED6]">{line.split(/(\{\{[^}]+\}\})/).map((part, i) => /^\{\{[^}]+\}\}$/.test(part) ? <mark key={i} className="bg-transparent text-[#F4D44D]">{part}</mark> : part)}{line === "" ? " " : null}</span></div>
        ))}
      </div>
    </div>
  );
}

function Compare({ versions }: { versions: PromptVersion[] }) {
  const [from, setFrom] = useState(versions[1]?._id ?? versions[0]._id);
  const [to, setTo] = useState(versions[0]._id);
  const a = versions.find((version) => version._id === from);
  const b = versions.find((version) => version._id === to);
  const diff = useMemo(() => (a && b ? lineDiff(a.content, b.content) : null), [a, b]);
  if (versions.length < 2) return <p className="rounded border border-dashed border-[#262C35] p-6 text-center text-xs text-[#8B93A1]">There is only one version so far. Save a second version to see what changed.</p>;
  const summary = diff ? diffSummary(diff) : null;
  const select = "h-8 rounded border border-[#262C35] bg-[#0E1115] px-2 font-mono text-xs";
  const dropped = a && b ? a.variables.filter((name) => !b.variables.includes(name)) : [];
  const gained = a && b ? b.variables.filter((name) => !a.variables.includes(name)) : [];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8B93A1]">
        <label className="flex items-center gap-1.5">From <select value={from} onChange={(event) => setFrom(event.target.value as typeof from)} className={select}>{versions.map((version) => <option key={version._id} value={version._id}>v{version.version}</option>)}</select></label>
        <label className="flex items-center gap-1.5">to <select value={to} onChange={(event) => setTo(event.target.value as typeof to)} className={select}>{versions.map((version) => <option key={version._id} value={version._id}>v{version.version}</option>)}</select></label>
        {summary ? <span className="ml-auto font-mono"><span className="text-[#5BE3A0]">+{summary.added}</span> <span className="text-[#FF8A8A]">−{summary.removed}</span></span> : null}
      </div>
      {gained.length || dropped.length ? <p className="text-xs text-[#C9CED6]">{gained.length ? <>Adds <span className="font-mono text-[#F4D44D]">{gained.map((name) => `{{${name}}}`).join(" ")}</span>. </> : null}{dropped.length ? <>Removes <span className="font-mono text-[#FF8A8A]">{dropped.map((name) => `{{${name}}}`).join(" ")}</span>: code that still sends it may be ignored.</> : null}</p> : null}
      {a && b && a.model !== b.model ? <p className="text-xs text-[#C9CED6]">Model changes from <span className="font-mono">{a.model ?? "none"}</span> to <span className="font-mono">{b.model ?? "none"}</span>.</p> : null}
      {a?._id === b?._id ? <p className="rounded border border-dashed border-[#262C35] p-6 text-center text-xs text-[#8B93A1]">Pick two different versions to compare.</p>
        : !diff ? <p className="rounded border border-[#5B2B2B] bg-[#1A1010] p-3 text-xs text-[#FF8A8A]">These versions are too long to compare line by line here (over 2,000 lines).</p>
        : summary && !summary.added && !summary.removed ? <p className="rounded border border-dashed border-[#262C35] p-6 text-center text-xs text-[#8B93A1]">The text is identical.</p>
        : (
          <div className="overflow-auto rounded border border-[#1F242C] bg-[#0E1115] font-mono text-[11px] leading-5" role="table" aria-label="Line differences">
            {diff.map((line, index) => (
              <div key={index} role="row" className={`grid grid-cols-[2.5rem_2.5rem_1rem_1fr] ${line.kind === "add" ? "bg-[#0E1A14] text-[#B7F0D3]" : line.kind === "remove" ? "bg-[#1A1010] text-[#FFB3B3]" : "text-[#8B93A1]"}`}>
                <span className="select-none pr-2 text-right text-[#6B7380]">{line.oldLine ?? ""}</span>
                <span className="select-none pr-2 text-right text-[#6B7380]">{line.newLine ?? ""}</span>
                <span className="select-none text-center">{line.kind === "add" ? "+" : line.kind === "remove" ? "−" : ""}</span>
                <span className="whitespace-pre-wrap break-words pr-2">{line.text || " "}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function Usage({ projectId, versions, usage, links }: { projectId: string; versions: PromptVersion[]; usage: VersionUsage[] | undefined; links: TraceLink[] | undefined }) {
  if (usage === undefined || links === undefined) return <p className="text-xs text-[#8B93A1]" role="status">Loading usage…</p>;
  const byVersion = new Map(usage.map((item) => [item.versionId, item]));
  const total = usage.reduce((sum, item) => sum + item.links, 0);
  if (!total) return (
    <div className="rounded border border-dashed border-[#262C35] p-6 text-center">
      <p className="text-sm text-[#E6E9EE]">No traces use this prompt yet.</p>
      <p className="mt-1 text-xs text-[#8B93A1]">When your app fetches this prompt and links the version to a trace, the traces show up here, per version.</p>
    </div>
  );
  return (
    <div className="grid gap-3">
      {versions.map((version) => {
        const item = byVersion.get(version._id);
        const recent = links.filter((link) => link.promptVersionId === version._id).slice(0, 5);
        return (
          <article key={version._id} className="rounded border border-[#1F242C] bg-[#0E1115] px-3 py-2">
            <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold">v{version.version}</span>{version.labels.map((label) => <span key={label} className={labelTone(label)}>{label}</span>)}
              <span className="ml-auto font-mono text-xs">{item?.links ?? 0}{item?.more ? "+" : ""} trace{item?.links === 1 ? "" : "s"}</span></div>
            <p className="mt-1 text-[11px] text-[#6B7380]">{item?.lastLinkedAt ? `Last used ${when(item.lastLinkedAt)}` : "Never used yet"}</p>
            {recent.length ? <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">{recent.map((link) => <li key={link._id}><Link href={`/dashboard/${projectId}/tracing?trace=${encodeURIComponent(link.traceId)}`} className="font-mono text-[11px] text-[#8AB4FF] underline">{link.traceId.slice(0, 12)}…</Link></li>)}</ul> : null}
          </article>
        );
      })}
    </div>
  );
}

function Test({ projectId, prompt }: { projectId: string; prompt: PromptRow }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs text-[#C9CED6]">Run any version against a model, with your own values for the variables, and compare up to three models side by side.</p>
      {prompt.versions.slice(0, 6).map((version) => (
        <Link key={version._id} href={`/dashboard/${projectId}/playground?prompt=${encodeURIComponent(prompt.name)}&version=${version.version}`} className="flex items-center gap-2 rounded border border-[#1F242C] bg-[#0E1115] px-3 py-2 hover:border-[#F4D44D]">
          <span className="font-mono text-xs font-semibold">v{version.version}</span>
          {version.labels.map((label) => <span key={label} className={labelTone(label)}>{label}</span>)}
          <span className="ml-auto text-[11px] text-[#8AB4FF]">Open in Playground →</span>
        </Link>
      ))}
    </div>
  );
}
