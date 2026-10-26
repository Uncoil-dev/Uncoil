"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

const TRIGGERS = [
  { id: "alert.created", label: "An alert fires", hint: "Any rule you set up in Alerts" },
  { id: "run.failed", label: "A run fails", hint: "Any run that ends in an error" },
  { id: "cost.threshold", label: "Spend passes a limit", hint: "When a budget is crossed" },
];
const ACTIONS = [
  { id: "webhook", label: "Call a webhook", placeholder: "https://example.com/hook", where: "Web address" },
  { id: "slack", label: "Post to Slack", placeholder: "https://hooks.slack.com/services/…", where: "Slack webhook address" },
  { id: "github_dispatch", label: "Start a GitHub workflow", placeholder: "owner/repository", where: "Repository" },
];
const triggerOf = (id: string) => TRIGGERS.find((t) => t.id === id);
const actionOf = (id: string) => ACTIONS.find((a) => a.id === id);

function shorten(destination: string) {
  try {
    const url = new URL(destination);
    return `${url.host}${url.pathname.length > 1 ? "/…" : ""}`;
  } catch {
    return destination;
  }
}

const select = "h-9 border border-[#262C35] bg-[#0B0D10] px-2 font-mono text-xs text-[#F4D44D] outline-none focus:border-[#F4D44D]";
const input = "h-9 min-w-0 flex-1 border border-[#262C35] bg-[#0B0D10] px-3 font-mono text-xs text-[#E8EAED] outline-none placeholder:text-[#59616B] focus:border-[#F4D44D]";

type Row = { _id: string; name: string; eventSource: string; actionType: string; destination: string; active: boolean; lastFiredAt?: number; lastStatus?: "ok" | "failed"; lastError?: string; fireCount?: number };

/** "When ... then ..." as one sentence, used for both creating and editing. */
function Sentence({ initial, submitLabel, onSubmit, onCancel }: { initial: Omit<Row, "_id" | "active">; submitLabel: string; onSubmit: (value: Omit<Row, "_id" | "active">) => Promise<void>; onCancel?: () => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const action = actionOf(value.actionType) ?? ACTIONS[0];
  async function go(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(value);
      if (!onCancel) setValue({ ...initial });
    } catch (e) {
      setError((e instanceof Error ? e.message : "Could not save").replace(/^.*Uncaught Error:\s*/, "").split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={go} className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#9AA3AE]">
        <span>When</span>
        <select aria-label="Trigger" value={value.eventSource} onChange={(e) => setValue({ ...value, eventSource: e.target.value })} className={select}>
          {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <span>then</span>
        <select aria-label="Action" value={value.actionType} onChange={(e) => setValue({ ...value, actionType: e.target.value, destination: "" })} className={select}>
          {ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <span>at</span>
        <input aria-label={action.where} required value={value.destination} onChange={(e) => setValue({ ...value, destination: e.target.value })} placeholder={action.placeholder} className={input} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Name" required maxLength={100} value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} placeholder="Name it, e.g. Page on-call" className={`${input} max-w-xs`} />
        <button disabled={busy} className="h-9 border border-[#F4D44D] bg-[#F4D44D] px-4 font-mono text-[11px] uppercase tracking-[0.1em] text-[#090909] disabled:opacity-50">{busy ? "Saving…" : submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel} className="h-9 border border-[#262C35] px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#9AA3AE]">Cancel</button> : null}
        {error ? <span role="alert" className="text-xs text-[#FF8A8A]">{error}</span> : null}
      </div>
    </form>
  );
}

function Node({ tone, title, sub }: { tone: "in" | "out"; title: string; sub: string }) {
  return (
    <div className={`min-w-0 flex-1 border px-3 py-2 ${tone === "in" ? "border-[#262C35] bg-[#0E1115]" : "border-[#F4D44D]/40 bg-[#F4D44D]/[0.06]"}`}>
      <p className="truncate text-sm text-[#E8EAED]">{title}</p>
      <p className="truncate font-mono text-[11px] text-[#7C8591]">{sub}</p>
    </div>
  );
}

export function AutomationsWorkspace({ projectId }: { projectId: string }) {
  const rows = useQuery(api.automations.list, projectId ? { projectId: projectId as never } : "skip") as Row[] | undefined;
  const create = useMutation(api.automations.create);
  const update = useMutation(api.automations.update);
  const setActive = useMutation(api.automations.setActive);
  const remove = useMutation(api.automations.remove);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const pid = projectId as never;
  const live = rows?.filter((r) => r.active).length ?? 0;

  async function act(fn: () => Promise<unknown>) {
    setProblem("");
    try { await fn(); } catch (e) { setProblem((e instanceof Error ? e.message : "Something went wrong").replace(/^.*Uncaught Error:\s*/, "").split("\n")[0]); }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 text-[#E8EAED]">
      <section className="border border-[#262C35] bg-[#0E1115] p-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7C8591]">New rule</p>
        <Sentence initial={{ name: "", eventSource: "run.failed", actionType: "webhook", destination: "" }} submitLabel="Turn on" onSubmit={async (v) => { await create({ projectId: pid, ...v }); }} />
      </section>

      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#9AA3AE]">Your rules</h2>
        <span className="font-mono text-[11px] text-[#7C8591]">{rows ? `${live} on, ${rows.length - live} paused` : ""}</span>
      </div>
      {problem ? <p role="alert" className="border border-[#FF6B6B]/40 bg-[#FF6B6B]/10 px-3 py-2 text-xs text-[#FF8A8A]">{problem}</p> : null}

      {rows === undefined ? (
        <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse border border-[#1F242C] bg-[#0E1115]" />)}</div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-[#262C35] px-6 py-12 text-center">
          <p className="text-sm text-[#E8EAED]">Nothing is wired up yet.</p>
          <p className="mt-1 text-xs text-[#7C8591]">Pick something that happens above, say where it should go, and turn it on.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => {
            const t = triggerOf(row.eventSource);
            const a = actionOf(row.actionType);
            return (
              <li key={row._id} className={`border bg-[#0B0D10] p-4 ${row.active ? "border-[#262C35]" : "border-[#1F242C] opacity-70"}`}>
                {editing === row._id ? (
                  <Sentence initial={row} submitLabel="Save" onCancel={() => setEditing(null)} onSubmit={async (v) => { await update({ projectId: pid, automationId: row._id as never, ...v }); setEditing(null); }} />
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em]">
                        <button role="switch" aria-checked={row.active} aria-label={row.active ? "Pause" : "Turn on"} onClick={() => act(() => setActive({ projectId: pid, automationId: row._id as never, active: !row.active }))} className={`flex h-6 w-11 items-center border px-0.5 ${row.active ? "justify-end border-[#F4D44D] bg-[#F4D44D]/20" : "justify-start border-[#262C35]"}`}>
                          <span className={`size-4 ${row.active ? "bg-[#F4D44D]" : "bg-[#59616B]"}`} />
                        </button>
                        <button onClick={() => setEditing(row._id)} className="px-2 py-1 text-[#9AA3AE] hover:text-[#E8EAED]">Edit</button>
                        {confirming === row._id ? (
                          <>
                            <button onClick={() => act(() => remove({ projectId: pid, automationId: row._id as never }))} className="px-2 py-1 text-[#FF8A8A]">Delete it</button>
                            <button onClick={() => setConfirming(null)} className="px-2 py-1 text-[#9AA3AE]">Keep</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirming(row._id)} className="px-2 py-1 text-[#9AA3AE] hover:text-[#FF8A8A]">Delete</button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0">
                      <Node tone="in" title={t?.label ?? row.eventSource} sub={t?.hint ?? "Custom trigger"} />
                      <div aria-hidden className="relative h-px w-10 shrink-0 bg-[#F4D44D]/60 sm:w-20"><span className="absolute -right-px -top-[3px] size-[7px] rotate-45 border-r border-t border-[#F4D44D]/80" /></div>
                      <Node tone="out" title={a?.label ?? row.actionType} sub={shorten(row.destination)} />
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 font-mono text-[11px]" aria-label="Last delivery">
                      {row.lastFiredAt ? (
                        <>
                          <span className={row.lastStatus === "ok" ? "text-[#5BE3A0]" : "text-[#FF8A8A]"}>{row.lastStatus === "ok" ? "Delivered" : "Failed"}</span>
                          <span className="text-[#7C8591]">{new Date(row.lastFiredAt).toLocaleString()}</span>
                          <span className="text-[#7C8591]">{row.fireCount ?? 1} {(row.fireCount ?? 1) === 1 ? "time" : "times"} in total</span>
                          {row.lastStatus === "failed" && row.lastError ? <span className="text-[#FF8A8A]">{row.lastError}</span> : null}
                        </>
                      ) : <span className="text-[#59616B]">Hasn’t fired yet</span>}
                    </p>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Stand-alone "New automation" page: same sentence form, then back to the list. */
export function NewAutomationForm({ projectId }: { projectId: string }) {
  const create = useMutation(api.automations.create);
  const router = useRouter();
  return (
    <div className="mx-auto grid max-w-5xl gap-6 text-[#E8EAED]">
      <section className="border border-[#262C35] bg-[#0E1115] p-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7C8591]">New rule</p>
        <Sentence
          initial={{ name: "", eventSource: "run.failed", actionType: "webhook", destination: "" }}
          submitLabel="Turn on"
          onCancel={() => router.push(`/dashboard/${projectId}/automations`)}
          onSubmit={async (v) => {
            await create({ projectId: projectId as never, ...v });
            router.push(`/dashboard/${projectId}/automations`);
          }}
        />
      </section>
    </div>
  );
}
