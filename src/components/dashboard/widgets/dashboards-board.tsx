"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { compactCost, compactNumber, duration, errorShare, moveWidget, WIDGETS, widgetInfo } from "@/lib/widget-utils";
import type { Board, BoardStore } from "./board-store";
import { useWidgetData } from "./widget-data";
import { WidgetBody } from "./widget-views";
import { EmptyState } from "../empty/empty-state";
import { SampleBoard } from "../empty/samples";

const RANGES = [{ days: 7, label: "7 days" }, { days: 30, label: "30 days" }, { days: 90, label: "90 days" }];
const STARTER = ["trace_volume", "error_rate", "cost_daily", "cost_by_model"];
const PAGE_FONT = "font-[family-name:var(--font-geist-pixel-square)]";
const button = "h-8 border border-[#2C333D] bg-[#0B0D10] px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#C9CED6] hover:border-[#F4D44D] hover:text-[#F4D44D] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D] disabled:opacity-40 disabled:hover:border-[#2C333D] disabled:hover:text-[#C9CED6]";
const solid = "h-8 bg-[#F4D44D] px-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#090909] hover:bg-[#FFF4B5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4D44D] disabled:opacity-40";
const field = "border border-[#2C333D] bg-[#0B0D10] px-2.5 font-mono text-xs text-[#E6E9EE] placeholder:text-[#6B7380] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D]";
const friendly = (reason: unknown, fallback: string) => ((reason instanceof Error ? reason.message : "").match(/Uncaught Error: ([^\n]+)/)?.[1] ?? fallback);

/** A board drawn as a tiny floor plan: one block per widget, wide widgets across the whole row. */
function Plan({ board, active }: { board: Board; active: boolean }) {
  const blocks = [...board.widgets].sort((a, b) => a.position - b.position).slice(0, 8);
  return (
    <span aria-hidden className="grid min-h-[44px] grid-cols-2 content-start gap-[2px] border border-[#1F242C] bg-[#07090B] p-1.5">
      {blocks.length ? blocks.map((widget, index) => <span key={widget.id} className={`h-[7px] ${widgetInfo(widget.widgetType)?.wide ? "col-span-2" : ""} ${active ? (index % 3 === 0 ? "bg-[#F4D44D]" : "bg-[#8A7A2C]") : "bg-[#2C333D]"}`} />)
        : <span className="col-span-2 self-center text-center font-mono text-[9px] uppercase tracking-widest text-[#4A525E]">empty</span>}
    </span>
  );
}

/** Four small corner marks that frame a panel like a printed instrument plate. */
function Marks() {
  return <>{["-left-px -top-px border-l-2 border-t-2", "-right-px -top-px border-r-2 border-t-2", "-bottom-px -left-px border-b-2 border-l-2", "-bottom-px -right-px border-b-2 border-r-2"].map((place) => <span key={place} aria-hidden className={`pointer-events-none absolute size-2.5 border-[#F4D44D] ${place}`} />)}</>;
}

/** Dashboards: a control room. Boards on the left as floor plans, the open board on a dotted canvas with a readout strip and framed instrument panels. */
export function DashboardsBoard({ projectId, store, initialDashboard, demo = false, basePath }: { projectId: string; store: BoardStore; initialDashboard?: string; demo?: boolean; basePath: string }) {
  const { boards, scores } = store;
  const [pick, setPick] = useState<string | null>(initialDashboard ?? null);
  const [days, setDays] = useState(30);
  const [edit, setEdit] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [name, setName] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const current: Board | null = boards?.find((board) => board.id === pick) ?? boards?.find((board) => board.isDefault) ?? boards?.[0] ?? null;
  const widgets = useMemo(() => [...(current?.widgets ?? [])].sort((a, b) => a.position - b.position), [current]);
  const needs = useMemo(() => ({ traces: true, stats: widgets.some((w) => widgetInfo(w.widgetType)?.source === "stats") }), [widgets]);
  const data = useWidgetData(projectId, days, needs, refresh);

  useEffect(() => {
    if (current && !demo) window.history.replaceState(null, "", `${window.location.pathname}?d=${current.id}`);
  }, [current, demo]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && gallery) setGallery(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery]);

  async function guarded(action: () => Promise<void>, fallback: string) {
    setBusy(true); setNotice(null);
    try { await action(); } catch (reason) { setNotice({ tone: "error", text: friendly(reason, fallback) }); } finally { setBusy(false); }
  }
  const submitName = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNotice({ tone: "error", text: "Give the board a name." });
    void guarded(async () => {
      if (naming === "rename" && current) { await store.rename(current.id, trimmed); setNotice({ tone: "ok", text: "Renamed." }); }
      else {
        const first = !boards?.length;
        const id = await store.create(trimmed, first);
        if (first) for (const type of STARTER) await store.addWidget(id, type);
        setPick(id); setNotice({ tone: "ok", text: first ? `${trimmed} created with four starter widgets.` : `${trimmed} created. Add widgets to it.` });
      }
      setNaming(null); setName("");
    }, "That did not save. Check your connection and try again.");
  };
  const move = (widgetId: string, direction: -1 | 1) => current && guarded(async () => { await store.reorder(current.id, moveWidget(widgets.map((w) => w.id), widgetId, direction)); }, "Could not move that widget.");
  const add = (type: string) => current && guarded(async () => { await store.addWidget(current.id, type); }, "Could not add that widget.");
  const remove = (widgetId: string) => current && guarded(async () => { await store.removeWidget(current.id, widgetId); }, "Could not remove that widget.");

  const stats = data.traces.state === "ready" ? data.traces.data.stats : null;
  const share = stats ? errorShare(stats.traces, stats.errors) : null;
  const readout: Array<[string, string, string]> = [
    ["Runs", stats ? compactNumber(stats.traces) : "–", ""],
    ["Failure rate", share === null ? "–" : `${(share * 100).toFixed(share < 0.1 && share > 0 ? 1 : 0)}%`, share && share > 0.1 ? "text-[#FF6B6B]" : ""],
    ["Typical run", stats ? duration(stats.p50DurationMs) : "–", ""],
    ["Slowest 5%", stats ? duration(stats.p95DurationMs) : "–", ""],
    ["Spend", stats ? compactCost(stats.totalCostUsd) : "–", ""],
  ];

  return (
    <div className="relative min-h-svh min-w-0 bg-[#07090B] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE] [background-image:radial-gradient(#1A1F26_1px,transparent_1px)] [background-size:22px_22px]">
      <div className="grid min-h-svh grid-cols-[minmax(0,1fr)] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside aria-label="Your dashboards" className="border-b border-[#1F242C] bg-[#0B0D10] pb-3 pl-12 pr-4 pt-5 lg:border-b-0 lg:pt-14 lg:border-r lg:pl-4 lg:pr-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F4D44D] lg:mt-0">Your boards</p>
          <nav aria-label="Dashboards" className="mt-3 flex gap-3 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0">
            {(boards ?? []).map((board) => {
              const on = board.id === current?.id;
              return (
                <button key={board.id} type="button" aria-current={on} onClick={() => { setPick(board.id); setEdit(false); setNaming(null); }} className={`block w-[188px] shrink-0 border p-2.5 text-left lg:w-auto ${on ? "border-[#F4D44D] bg-[#12141A]" : "border-[#1F242C] hover:border-[#3A424E]"}`}>
                  <Plan board={board} active={on} />
                  <span className="mt-2 flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{board.name}</span>{board.isDefault ? <span className="border border-[#3A3420] px-1 font-mono text-[9px] uppercase tracking-wider text-[#F4D44D]">Default</span> : null}</span>
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-[#6B7380]">{board.widgets.length} {board.widgets.length === 1 ? "widget" : "widgets"}</span>
                </button>
              );
            })}
            {naming === "new" ? (
              <form onSubmit={submitName} className="w-[188px] shrink-0 border border-dashed border-[#F4D44D] p-2.5 lg:w-auto">
                <label className="sr-only" htmlFor="dash-name">Board name</label>
                <input id="dash-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="Name this board" className={`${field} h-8 w-full`} />
                <span className="mt-2 flex gap-2"><button type="submit" disabled={busy} className={solid}>Create</button><button type="button" onClick={() => { setNaming(null); setName(""); }} className={button}>Cancel</button></span>
              </form>
            ) : (
              <button type="button" onClick={() => { setNaming("new"); setName(""); }} className="grid h-[104px] w-[188px] shrink-0 place-items-center border border-dashed border-[#2C333D] font-mono text-[11px] uppercase tracking-[0.1em] text-[#8B93A1] hover:border-[#F4D44D] hover:text-[#F4D44D] lg:h-14 lg:w-auto">+ New board</button>
            )}
          </nav>
          {demo ? null : <Link href={`${basePath}/widgets`} className="mt-4 hidden font-mono text-[11px] uppercase tracking-[0.1em] text-[#8B93A1] underline underline-offset-4 hover:text-[#F4D44D] lg:inline-block">Widget library →</Link>}
        </aside>

        <div className="min-w-0">
          <header className="border-b border-[#1F242C] bg-[#07090B]/80 px-4 pb-4 pt-5 sm:px-6 lg:pl-6">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F4D44D]">Dashboards{current ? ` · ${widgets.length} ${widgets.length === 1 ? "widget" : "widgets"} · last ${days} days` : ""}</p>
                <h1 className={`${PAGE_FONT} !ml-0 mt-1 break-words text-4xl leading-none`}>{current ? current.name : "Dashboards"}</h1>
              </div>
              {current ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div role="radiogroup" aria-label="Time range" className="flex border border-[#2C333D]">
                    {RANGES.map((range) => <button key={range.days} type="button" role="radio" aria-checked={days === range.days} onClick={() => setDays(range.days)} className={`h-8 px-3 font-mono text-[11px] uppercase tracking-[0.08em] ${days === range.days ? "bg-[#F4D44D] font-medium text-[#090909]" : "bg-[#0B0D10] text-[#C9CED6] hover:text-[#F4D44D]"}`}>{range.label}</button>)}
                  </div>
                  <button type="button" onClick={() => setRefresh((n) => n + 1)} className={button}>Refresh</button>
                  <button type="button" aria-pressed={edit} onClick={() => setEdit(!edit)} className={edit ? solid : button}>{edit ? "Done editing" : "Edit board"}</button>
                </div>
              ) : null}
            </div>
            {current ? (
              <dl aria-label="Readout" className="mt-5 grid grid-cols-2 border border-[#1F242C] bg-[#0B0D10] sm:grid-cols-3 lg:grid-cols-5">
                {readout.map(([label, value, tone], index) => (
                  <div key={label} className={`px-4 py-3 ${index ? "sm:border-l sm:border-[#1F242C]" : ""} ${index % 2 ? "border-l border-[#1F242C] sm:border-l" : ""} ${index > 1 ? "border-t border-[#1F242C] sm:border-t-0" : ""} ${index > 2 ? "sm:border-t sm:border-[#1F242C] lg:border-t-0" : ""}`}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6B7380]">{label}</dt>
                    <dd className={`${PAGE_FONT} mt-1 text-2xl leading-none ${tone}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </header>

          {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mx-4 mt-4 border px-3 py-2 text-xs sm:mx-6 ${notice.tone === "error" ? "border-[#5B2B2B] bg-[#1A1010] text-[#FF8A8A]" : "border-[#1F4D38] bg-[#0E1A14] text-[#5BE3A0]"}`}>{notice.text}</p> : null}
          {boards === undefined ? <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2" role="status" aria-label="Loading dashboards">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-56 animate-pulse bg-[#11151A]" />)}</div>
            : !current ? (
              <div className="mx-auto max-w-md p-10 text-center">
                <h2 className={`${PAGE_FONT} text-2xl`}>Your own control room</h2>
                <p className="mt-3 text-xs leading-5 text-[#8B93A1]">A board is a page of charts you choose: runs, failures, speed, cost, quality. Start with a ready-made set and change it any time.</p>
                <form onSubmit={submitName} className="mt-5 flex gap-2"><label className="sr-only" htmlFor="first-dash">Board name</label><input id="first-dash" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Overview" className={`${field} h-8 flex-1`} /><button type="submit" disabled={busy} className={solid}>Create</button></form>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                {edit ? (
                  <div className="mb-4 flex flex-wrap items-center gap-2 border border-dashed border-[#F4D44D] bg-[#14120A] px-3 py-2 text-xs text-[#F4D44D]">
                    <span className="mr-auto">Editing {current.name}. Move panels with the arrows, or remove them.</span>
                    <button type="button" onClick={() => setGallery(true)} className={solid}>Add widget</button>
                    {!current.isDefault ? <>
                      <button type="button" onClick={() => { setNaming("rename"); setName(current.name); }} className={button}>Rename</button>
                      <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete “${current.name}” and its widgets? This cannot be undone.`)) void guarded(async () => { await store.removeBoard(current.id); setPick(null); setEdit(false); }, "Could not delete the board."); }} className={button}>Delete board</button>
                    </> : null}
                    {widgets.length ? <button type="button" disabled={busy} onClick={() => { if (window.confirm("Remove every widget from this board?")) void guarded(async () => { await store.reset(current.id); }, "Could not clear the board."); }} className={button}>Clear all</button> : null}
                    {naming === "rename" ? <form onSubmit={submitName} className="flex w-full items-center gap-2"><label className="sr-only" htmlFor="rename-board">Board name</label><input id="rename-board" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus className={`${field} h-8 w-56`} /><button type="submit" disabled={busy} className={solid}>Rename</button><button type="button" onClick={() => { setNaming(null); setName(""); }} className={button}>Cancel</button></form> : null}
                  </div>
                ) : null}
                {!widgets.length ? (
                  <EmptyState eyebrow="Board" title="Build the view you check every morning" why="Pick the charts that matter to you: runs, errors, cost by model. This board keeps them in one place." sample={<SampleBoard />} action={{ label: "Add a widget", onClick: () => setGallery(true) }} />
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {widgets.map((widget, index) => {
                      const info = widgetInfo(widget.widgetType);
                      return (
                        <section key={widget.id} aria-label={info?.title ?? widget.widgetType} className={`relative min-w-0 border bg-[#0B0D10] ${edit ? "border-dashed border-[#F4D44D]/60" : "border-[#1F242C]"} ${info?.wide ? "md:col-span-2" : ""}`}>
                          <Marks />
                          <header className="flex items-center gap-3 border-b border-[#1F242C] px-4 py-2.5">
                            <span className="font-mono text-[11px] text-[#F4D44D]">{String(index + 1).padStart(2, "0")}</span>
                            <div className="min-w-0 flex-1"><h2 className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">{info?.title ?? "Unknown widget"}</h2>{info ? <p className="truncate text-[11px] text-[#6B7380]">{info.description}</p> : null}</div>
                            {edit ? <div className="flex gap-1"><button type="button" aria-label={`Move ${info?.title ?? "widget"} earlier`} disabled={busy || index === 0} onClick={() => void move(widget.id, -1)} className={`${button} px-2`}>←</button><button type="button" aria-label={`Move ${info?.title ?? "widget"} later`} disabled={busy || index === widgets.length - 1} onClick={() => void move(widget.id, 1)} className={`${button} px-2`}>→</button><button type="button" aria-label={`Remove ${info?.title ?? "widget"}`} disabled={busy} onClick={() => void remove(widget.id)} className={`${button} px-2`}>×</button></div> : null}
                          </header>
                          <div className="p-4"><WidgetBody id={widget.widgetType} traces={data.traces} stats={data.stats} scores={scores} /></div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {gallery && current ? (
        <aside aria-label="Add a widget" className="fixed inset-y-0 right-0 z-30 flex w-full max-w-[420px] flex-col border-l border-[#F4D44D] bg-[#0B0D10] shadow-[-24px_0_48px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 border-b border-[#1F242C] px-4 py-3"><h2 className={`${PAGE_FONT} flex-1 text-lg`}>Add a widget</h2><button type="button" onClick={() => setGallery(false)} className={button}>Done</button></div>
          <ul className="grid min-h-0 flex-1 content-start gap-2 overflow-auto p-4">
            {WIDGETS.map((widget) => {
              const added = widgets.some((w) => w.widgetType === widget.id);
              return <li key={widget.id} className="border border-[#1F242C] bg-[#0E1115] p-3"><div className="flex items-center gap-2"><h3 className="flex-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">{widget.title}</h3><button type="button" disabled={added || busy} onClick={() => void add(widget.id)} className={added ? button : solid}>{added ? "Added" : "Add"}</button></div><p className="mt-1.5 text-[11px] leading-4 text-[#8B93A1]">{widget.description}</p></li>;
            })}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}
