"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { relativeTime } from "@/components/dashboard/tracing/format";
import { AlertChart } from "./alert-chart";
import { AlertRuleForm } from "./alert-rule-form";
import { METRICS } from "./alert-metrics";
import { DeliveryLine, SendTest } from "./delivery-status";

type Status = "all" | "firing" | "ok" | "paused";
type View = "cards" | "list";
const VIEW_KEY = "tracify.alerts.view";

type SavedView = { name: string; status: Status; tag: string | null; query: string };
const SAVED_KEY = "tracify.alerts.savedViews";
let savedCache: { raw: string | null; value: SavedView[] } = { raw: null, value: [] };
function readSaved(): SavedView[] {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (raw === savedCache.raw) return savedCache.value;
    const parsed = raw ? (JSON.parse(raw) as SavedView[]) : [];
    savedCache = { raw, value: Array.isArray(parsed) ? parsed.filter((v) => v && typeof v.name === "string") : [] };
    return savedCache.value;
  } catch { return savedCache.value; }
}
const EMPTY_SAVED: SavedView[] = [];

const COLORS = { firing: "#FF6B6B", ok: "#5BE3A0", paused: "#6B7380" } as const;

const viewListeners = new Set<() => void>();
function readView(): View {
  try { return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards"; } catch { return "cards"; }
}
function subscribeView(listener: () => void) {
  viewListeners.add(listener);
  return () => { viewListeners.delete(listener); };
}

export function AlertsWorkspace({ projectId }: { projectId: string }) {
  const data = useQuery(api.alertRules.overview, { projectId: projectId as Id<"projects"> });
  const setEnabled = useMutation(api.alertRules.setEnabled);
  const setTags = useMutation(api.alertRules.setTags);
  const remove = useMutation(api.alertRules.remove);
  const { data: session } = authClient.useSession();
  const [status, setStatus] = useState<Status>("all");
  const stored = useSyncExternalStore(subscribeView, readView, () => "cards" as View);
  const [chosen, setChosen] = useState<View | null>(null);
  const view = chosen ?? stored;
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const saved = useSyncExternalStore(subscribeView, readSaved, () => EMPTY_SAVED);
  const [naming, setNaming] = useState(false);
  const [viewName, setViewName] = useState("");

  function writeSaved(next: SavedView[]) {
    try { window.localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    viewListeners.forEach((listener) => listener());
  }
  function saveView() {
    const name = viewName.trim().slice(0, 40);
    if (!name) return;
    writeSaved([...saved.filter((v) => v.name !== name), { name, status, tag, query }].slice(-12));
    setNaming(false);
    setViewName("");
  }
  function applyView(view: SavedView) { setStatus(view.status); setTag(view.tag); setQuery(view.query); }
  const isFiltered = status !== "all" || tag !== null || query.trim() !== "";
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  function chooseView(next: View) {
    setChosen(next);
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable */ }
    viewListeners.forEach((listener) => listener());
  }

  const rules = useMemo(() => (data?.rules ?? []).map((rule) => ({ ...rule, status: (!rule.enabled ? "paused" : rule.state === "firing" ? "firing" : "ok") as Exclude<Status, "all"> })), [data]);
  const allTags = [...new Set(rules.flatMap((rule) => rule.tags ?? []))].sort();
  const counts = { all: rules.length, firing: rules.filter((r) => r.status === "firing").length, ok: rules.filter((r) => r.status === "ok").length, paused: rules.filter((r) => r.status === "paused").length };
  const visible = rules.filter((rule) => (status === "all" || rule.status === status) && (!tag || (rule.tags ?? []).includes(tag)) && (!query.trim() || `${rule.name} ${rule.environment ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())));
  const firing = rules.filter((r) => r.status === "firing");

  const chip = (value: Status, label: string) => (
    <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`h-7 border px-2.5 text-[12px] ${status === value ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1] hover:text-[#E6E9EE]"}`}>{label} {counts[value]}</button>
  );

  return (
    <div className="flex min-h-svh flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Alerts</h1>
        <label className="flex h-7 min-w-[200px] flex-1 items-center gap-2 border border-[#262C35] bg-[#111418] px-2.5 focus-within:border-[#4A5260] sm:max-w-[300px]">
          <span aria-hidden="true" className="text-[#8B93A1]">⌕</span>
          <input aria-label="Search rules" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rules" className="w-full bg-transparent outline-none placeholder:text-[#6B7380]" />
        </label>
        <div className="flex flex-wrap gap-1.5">{chip("all", "All")}{chip("firing", "Firing")}{chip("ok", "OK")}{chip("paused", "Paused")}</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex" role="group" aria-label="View">
            {(["cards", "list"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={view === value} onClick={() => chooseView(value)} className={`h-7 border px-2.5 text-[12px] capitalize ${view === value ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1]"}`}>{value}</button>
            ))}
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-[#5BE3A0] sm:flex"><i className="block size-1.5 animate-pulse bg-[#5BE3A0]" />Live</span>
          <button type="button" onClick={() => setCreating(true)} className="h-7 bg-[#F4D44D] px-3 font-bold text-[#090909]">+ New rule</button>
        </div>
      </header>

      {data && rules.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1F242C] px-4 py-2 text-[12px]" aria-label="Tags and saved views">
          <span className="mr-1 text-[11px] tracking-[0.08em] text-[#6B7380]">TAGS</span>
          {allTags.length === 0 ? <span className="text-[#6B7380]">None yet. Add one on any rule.</span> : allTags.map((name) => (
            <button key={name} type="button" aria-pressed={tag === name} onClick={() => setTag(tag === name ? null : name)} className={`h-6 border px-2 font-mono text-[11px] ${tag === name ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1] hover:text-[#E6E9EE]"}`}>#{name}</button>
          ))}
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            {saved.map((view) => (
              <span key={view.name} className="flex">
                <button type="button" onClick={() => applyView(view)} className="h-6 border border-[#262C35] px-2 text-[#E6E9EE] hover:border-[#4A5260]">{view.name}</button>
                <button type="button" aria-label={`Forget view ${view.name}`} onClick={() => writeSaved(saved.filter((v) => v.name !== view.name))} className="h-6 border border-l-0 border-[#262C35] px-1.5 text-[#6B7380] hover:text-[#FF8A8A]">×</button>
              </span>
            ))}
            {naming ? (
              <form onSubmit={(event) => { event.preventDefault(); saveView(); }} className="flex gap-1">
                <input autoFocus aria-label="View name" value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder="Name this view" maxLength={40} className="h-6 w-36 border border-[#262C35] bg-[#111418] px-2 outline-none focus:border-[#4A5260]" />
                <button className="h-6 border border-[#F4D44D] px-2 text-[#F4D44D]">Save</button>
                <button type="button" onClick={() => setNaming(false)} className="h-6 border border-[#262C35] px-2 text-[#8B93A1]">Cancel</button>
              </form>
            ) : (
              <>
                {isFiltered ? <button type="button" onClick={() => { setStatus("all"); setTag(null); setQuery(""); }} className="h-6 px-2 text-[#8B93A1] hover:text-[#E6E9EE]">Clear filters</button> : null}
                <button type="button" disabled={!isFiltered} onClick={() => setNaming(true)} className="h-6 border border-[#262C35] px-2 text-[#8B93A1] enabled:hover:text-[#E6E9EE] disabled:opacity-40">Save this view</button>
              </>
            )}
          </span>
        </div>
      ) : null}

      {data === undefined ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading alerts">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 animate-pulse border border-[#1F242C] bg-[#0E1115]" />)}</div>
      ) : data === null ? (
        <p className="p-6 text-[#8B93A1]">You don’t have access to this project’s alerts.</p>
      ) : rules.length === 0 ? (
        <div className="m-4 border border-[#1F242C] bg-[#0E1115] p-8 text-center">
          <p className="text-[15px] font-semibold">No alert rules yet</p>
          <p className="mx-auto mt-1 max-w-md text-[#8B93A1]">Get told by email, Slack or webhook when failed runs, spend or speed go over a limit. Rules are checked every 5 minutes.</p>
          <button type="button" onClick={() => setCreating(true)} className="mt-4 h-8 bg-[#F4D44D] px-4 font-bold text-[#090909]">Create your first rule</button>
        </div>
      ) : (
        <>
          <div className={`flex items-center gap-3 border-b border-[#1F242C] px-4 py-3 ${firing.length ? "bg-gradient-to-r from-[#2a1214] to-[#0B0D10]" : ""}`} role="status">
            <span className={`font-mono text-3xl font-bold ${firing.length ? "text-[#FF6B6B]" : "text-[#5BE3A0]"}`}>{firing.length || "✓"}</span>
            <div>
              <b className="text-[15px]">{firing.length ? (firing.length === 1 ? "rule needs you" : "rules need you") : "All clear"}</b>
              <div className="text-[11px] text-[#8B93A1]">{firing.length ? `${firing.map((r) => r.name).join(" and ")} ${firing.length === 1 ? "is" : "are"} over the limit.` : "Every active rule is under its limit."} Checked every 5 minutes.</div>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              {visible.length === 0 ? <p className="p-6 text-[#8B93A1]">No rules match these filters.</p> : view === "cards" ? (
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((rule) => {
                    const config = METRICS[rule.metric];
                    const color = COLORS[rule.status];
                    return (
                      <article key={rule._id} className={`border border-[#1F242C] bg-[#0E1115] p-3 ${rule.status === "firing" ? "shadow-[inset_2px_0_0_#FF6B6B]" : ""} ${rule.status === "paused" ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><b className="block truncate">{rule.name}</b><span className="text-[11px] text-[#8B93A1]">{rule.environment ?? "all environments"}</span></div>
                          <span className="border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em]" style={{ color, borderColor: color }}>{rule.status.toUpperCase()}</span>
                        </div>
                        <div className="mb-1 mt-1.5 flex items-baseline gap-2.5"><span className="font-mono text-xl font-bold" style={{ color: rule.status === "paused" ? "#6B7380" : color }}>{config.format(rule.value)}</span><span className="font-mono text-[11px] text-[#6B7380]">limit {config.condition(rule.threshold, rule.windowMinutes).replace("> ", "")}</span></div>
                        <AlertChart series={rule.series} threshold={rule.threshold} color={rule.status === "paused" ? "#3A4250" : color} label={`${rule.name}, last 24 hours`} />
                        <TagEditor name={rule.name} tags={rule.tags ?? []} onChange={(next) => setTags({ ruleId: rule._id, tags: next })} />
                        {rule.hasSlack || rule.webhookHost ? (
                          <div className="mt-2 space-y-0.5 text-[11px]">
                            {rule.hasSlack ? <div><DeliveryLine label="Slack" delivery={rule.slackDelivery} now={data.now} /></div> : null}
                            {rule.webhookHost ? <div><DeliveryLine label={`Webhook (${rule.webhookHost})`} delivery={rule.webhookDelivery} now={data.now} /></div> : null}
                            <SendTest ruleId={rule._id} name={rule.name} />
                          </div>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#6B7380]">
                          <span className="font-mono">{destinations(rule)}</span>
                          <RuleActions rule={rule} confirming={confirmingDelete === rule._id} onToggle={() => void setEnabled({ ruleId: rule._id, enabled: !rule.enabled })} onAskDelete={() => setConfirmingDelete(rule._id)} onCancelDelete={() => setConfirmingDelete(null)} onDelete={() => { void remove({ ruleId: rule._id }); setConfirmingDelete(null); }} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left">
                  <thead><tr className="text-[11px] tracking-[0.06em] text-[#6B7380]">{["STATUS", "RULE", "CONDITION", "SCOPE", "LAST 24 H", "NOW", ""].map((h) => <th key={h} className="h-7 px-3 font-normal">{h}</th>)}</tr></thead>
                  <tbody>{visible.map((rule) => {
                    const config = METRICS[rule.metric];
                    const color = COLORS[rule.status];
                    return (
                      <tr key={rule._id} className="h-9 border-t border-[#1F242C] hover:bg-[#111418]">
                        <td className="px-3 font-mono text-[10px] font-semibold tracking-[0.1em]" style={{ color }}><i className="mr-1.5 inline-block size-1.5" style={{ background: color }} />{rule.status.toUpperCase()}</td>
                        <td className="px-3"><b>{rule.name}</b><TagEditor name={rule.name} tags={rule.tags ?? []} onChange={(next) => setTags({ ruleId: rule._id, tags: next })} /></td>
                        <td className="px-3 font-mono text-[12px] text-[#8B93A1]">{config.condition(rule.threshold, rule.windowMinutes)}</td>
                        <td className="px-3 text-[#8B93A1]">{rule.environment ?? "all"}</td>
                        <td className="w-[130px] px-3"><AlertChart series={rule.series} threshold={rule.threshold} color={color} height={22} label={`${rule.name}, last 24 hours`} /></td>
                        <td className="px-3 font-mono text-[12px]" style={{ color: rule.status === "firing" ? color : "#E6E9EE" }}>{config.format(rule.value)}</td>
                        <td className="px-3 text-right"><RuleActions rule={rule} confirming={confirmingDelete === rule._id} onToggle={() => void setEnabled({ ruleId: rule._id, enabled: !rule.enabled })} onAskDelete={() => setConfirmingDelete(rule._id)} onCancelDelete={() => setConfirmingDelete(null)} onDelete={() => { void remove({ ruleId: rule._id }); setConfirmingDelete(null); }} /></td>
                      </tr>
                    );
                  })}</tbody>
                </table></div>
              )}
            </div>
            <aside className="border-t border-[#1F242C] p-4 lg:border-l lg:border-t-0" aria-label="Alert history">
              <div className="mb-2 text-[11px] tracking-[0.08em] text-[#6B7380]">HISTORY</div>
              {data.history.length === 0 ? <p className="text-[12px] text-[#6B7380]">Nothing has fired yet.</p> : data.history.slice(0, 12).map((item) => (
                <div key={item._id} className="grid grid-cols-[8px_1fr_auto] items-start gap-2.5 border-t border-[#1F242C] py-2 text-[12px]">
                  <i className="mt-1.5 block size-1.5" style={{ background: item.state === "resolved" ? "#5BE3A0" : item.state === "muted" ? "#6B7380" : "#FF6B6B" }} />
                  <span>{item.message}</span>
                  <span className="font-mono text-[11px] text-[#6B7380]" title={new Date(item.triggeredAt).toLocaleString()}>{relativeTime(item.triggeredAt, data.now)}</span>
                </div>
              ))}
              <div className="mt-5 text-[11px] tracking-[0.08em] text-[#6B7380]">COMING SOON</div>
              <p className="mt-1 text-[12px] text-[#8B93A1]">Quality-score rules.</p>
            </aside>
          </div>
        </>
      )}
      {creating ? <AlertRuleForm projectId={projectId} defaultEmail={session?.user?.email ?? ""} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function TagEditor({ name, tags, onChange }: { name: string; tags: string[]; onChange: (next: string[]) => Promise<unknown> }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [failed, setFailed] = useState(false);
  async function commit(next: string[]) {
    setFailed(false);
    try { await onChange(next); } catch { setFailed(true); }
  }
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {tags.map((item) => (
        <span key={item} className="flex items-center border border-[#262C35] font-mono text-[10px] text-[#8B93A1]">
          <span className="px-1.5">#{item}</span>
          <button type="button" aria-label={`Remove tag ${item} from ${name}`} onClick={() => void commit(tags.filter((t) => t !== item))} className="px-1 hover:text-[#FF8A8A]">×</button>
        </span>
      ))}
      {adding ? (
        <form onSubmit={(event) => { event.preventDefault(); if (draft.trim()) void commit([...tags, draft]); setDraft(""); setAdding(false); }}>
          <input autoFocus aria-label={`New tag for ${name}`} value={draft} maxLength={24} onChange={(event) => setDraft(event.target.value)} onBlur={() => { setAdding(false); setDraft(""); }} placeholder="tag" className="h-5 w-20 border border-[#4A5260] bg-[#111418] px-1.5 font-mono text-[10px] outline-none" />
        </form>
      ) : tags.length < 8 ? <button type="button" onClick={() => setAdding(true)} aria-label={`Add a tag to ${name}`} className="h-5 border border-dashed border-[#262C35] px-1.5 font-mono text-[10px] text-[#6B7380] hover:text-[#E6E9EE]">+ tag</button> : null}
      {failed ? <span role="alert" className="text-[10px] text-[#FF8A8A]">Couldn’t save</span> : null}
    </div>
  );
}

function destinations(rule: { emailTo: string[]; hasSlack: boolean; webhookHost?: string }) {
  const parts: string[] = [];
  if (rule.emailTo.length) parts.push(`✉ ${rule.emailTo.length}`);
  if (rule.hasSlack) parts.push("Slack");
  if (rule.webhookHost) parts.push("Webhook");
  return parts.join(" · ") || "No destination";
}

function RuleActions({ rule, confirming, onToggle, onAskDelete, onCancelDelete, onDelete }: { rule: { name: string; enabled: boolean }; confirming: boolean; onToggle: () => void; onAskDelete: () => void; onCancelDelete: () => void; onDelete: () => void }) {
  const button = "h-6 border border-[#262C35] px-2 text-[11px] text-[#8B93A1] hover:border-[#4A5260] hover:text-[#E6E9EE]";
  if (confirming) {
    return <span className="flex gap-1.5"><button type="button" onClick={onDelete} className="h-6 border border-[#FF6B6B] px-2 text-[11px] text-[#FF8A8A]">Delete {rule.name}?</button><button type="button" onClick={onCancelDelete} className={button}>Keep</button></span>;
  }
  return <span className="flex gap-1.5"><button type="button" onClick={onToggle} aria-label={`${rule.enabled ? "Pause" : "Resume"} ${rule.name}`} className={button}>{rule.enabled ? "Pause" : "Resume"}</button><button type="button" onClick={onAskDelete} aria-label={`Delete ${rule.name}`} className={button}>Delete</button></span>;
}
