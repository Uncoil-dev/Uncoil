"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { pricingCheckoutHref } from "@/lib/billing-links";

/** Relative ranges, shortest first. The server keeps at most 90 days. */
export const RANGES = [
  { id: "5m", label: "Last 5 minutes", ms: 300_000 },
  { id: "15m", label: "Last 15 minutes", ms: 900_000 },
  { id: "30m", label: "Last 30 minutes", ms: 1_800_000 },
  { id: "1h", label: "Last hour", ms: 3_600_000 },
  { id: "3h", label: "Last 3 hours", ms: 10_800_000 },
  { id: "6h", label: "Last 6 hours", ms: 21_600_000 },
  { id: "12h", label: "Last 12 hours", ms: 43_200_000 },
  { id: "24h", label: "Last 24 hours", ms: 86_400_000 },
  { id: "2d", label: "Last 2 days", ms: 172_800_000 },
  { id: "3d", label: "Last 3 days", ms: 259_200_000 },
  { id: "7d", label: "Last 7 days", ms: 604_800_000 },
  { id: "14d", label: "Last 14 days", ms: 1_209_600_000 },
  { id: "30d", label: "Last 30 days", ms: 2_592_000_000 },
  { id: "90d", label: "Last 90 days", ms: 7_776_000_000 },
];
export const MAX_RANGE_DAYS = 90;
/** Free projects keep 7 days of data, so longer ranges are a Pro feature. */
export const FREE_RANGE_DAYS = 7;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const sameDay = (a: Date | null, b: Date | null) => Boolean(a && b && a.getTime() === b.getTime());
const pad = (value: number) => String(value).padStart(2, "0");
const timeText = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const withTime = (day: Date, time: string) => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
};

const short = (date: Date, withYear: boolean) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
const clock = (date: Date) => date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** "Last 24 hours", or "Oct 14, 00:19 – 00:20" for a fixed window. */
export function rangeLabel(range: string | undefined, from: number | undefined, to: number | undefined) {
  if (from === undefined) return RANGES.find((item) => item.id === range)?.label ?? "Last 24 hours";
  const start = new Date(from), end = new Date(to ?? Date.now());
  const withYear = start.getFullYear() !== new Date().getFullYear();
  if (sameDay(startOfDay(start), startOfDay(end))) return `${short(start, withYear)}, ${clock(start)} – ${clock(end)}`;
  return `${short(start, withYear)}, ${clock(start)} – ${short(end, withYear)}, ${clock(end)}`;
}

function Calendar({ month, onMonth, start, end, min, max, onPick }: {
  month: Date; onMonth: (month: Date) => void; start: Date | null; end: Date | null; min: Date; max: Date; onPick: (day: Date) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = first.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const today = startOfDay(new Date());
  const canPrev = new Date(month.getFullYear(), month.getMonth(), 0) >= min;
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= max;
  const arrow = "flex size-7 items-center justify-center rounded text-[#C9CED6] hover:bg-[#1A1F27] disabled:opacity-30 disabled:hover:bg-transparent";
  const rangeEnd = end ?? start;
  return (
    <div className="w-[236px]">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Previous month" disabled={!canPrev} className={arrow} onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <span className="text-xs font-medium text-[#E6E9EE]" aria-live="polite">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button type="button" aria-label="Next month" disabled={!canNext} className={arrow} onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((name, index) => <span key={index} aria-hidden="true" className="py-1 font-mono text-[10px] text-[#6B7380]">{name}</span>)}
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const disabled = day < min || day > max;
          const isStart = sameDay(day, start), isEnd = sameDay(day, rangeEnd);
          const inside = start && rangeEnd && day > start && day < rangeEnd;
          return (
            <button key={day.getTime()} type="button" disabled={disabled} aria-pressed={isStart || isEnd}
              aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              onClick={() => onPick(day)}
              className={`h-8 text-xs ${isStart || isEnd ? "rounded bg-[#F4D44D] font-semibold text-[#0B0D10]" : inside ? "bg-[#2A2616] text-[#E6E9EE]" : "rounded text-[#C9CED6] hover:bg-[#1A1F27]"} ${sameDay(day, today) && !isStart && !isEnd ? "ring-1 ring-inset ring-[#4A5260]" : ""} disabled:cursor-not-allowed disabled:text-[#3A414C] disabled:hover:bg-transparent`}>
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One control for the time range: a dropdown of relative presets (5 minutes to 90 days) next to a calendar for a
 * custom start and end. A custom range travels as `from` and `to` in the URL, the same as a chart zoom.
 */
export function TimeRangePicker({ range, from, to, now, onPreset, onCustom, onReset }: {
  range: string; from?: number; to?: number; now: number;
  onPreset: (id: string) => void; onCustom: (from: number, to: number) => void; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Free projects keep 7 days; longer ranges are part of Pro.
  const projectId = /\/dashboard\/([^/]+)/.exec(usePathname() ?? "")?.[1];
  const project = useQuery(api.projects.getProjectById, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const freeProject = project ? (project.planTier ?? "free") === "free" : false;
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const today = startOfDay(new Date(now));
  const min = addDays(today, -((freeProject ? FREE_RANGE_DAYS : MAX_RANGE_DAYS) - 1));
  const [month, setMonth] = useState(today);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [error, setError] = useState("");
  const custom = from !== undefined;

  const openPicker = () => {
    if (from !== undefined) {
      const a = new Date(from), b = new Date(to ?? now);
      setStart(startOfDay(a)); setEnd(startOfDay(b)); setStartTime(timeText(a)); setEndTime(timeText(b)); setMonth(startOfDay(b));
    } else {
      setStart(null); setEnd(null); setStartTime("00:00"); setEndTime("23:59"); setMonth(today);
    }
    setError("");
    setOpen(true);
  };
  const close = (refocus = false) => { setOpen(false); if (refocus) trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  const pick = (day: Date) => {
    setError("");
    if (!start || end) { setStart(day); setEnd(null); return; }
    if (day < start) { setEnd(start); setStart(day); } else setEnd(day);
  };
  const choose = (a: Date, b: Date) => { onCustom(a.getTime(), b.getTime()); close(true); };
  const apply = () => {
    if (!start) { setError("Pick a start date."); return; }
    const a = withTime(start, startTime);
    const b = new Date(Math.min(withTime(end ?? start, endTime).getTime(), now));
    if (b.getTime() - a.getTime() < 60_000) { setError("The end must be at least a minute after the start."); return; }
    choose(a, b);
  };

  const button = "h-8 rounded-md border border-[#262C35] bg-[#111418] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260]";
  const input = "h-7 rounded border border-[#262C35] bg-[#0E1115] px-1.5 font-mono text-xs text-[#E6E9EE] [color-scheme:dark]";
  return (
    <div ref={wrapper} role="group" aria-label="Time range" className="relative flex items-center gap-1">
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? close() : openPicker())}
        className={`${button} flex items-center gap-2 font-mono ${custom ? "border-[#F4D44D] text-[#F4D44D]" : ""}`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" /></svg>
        <span className="max-w-[min(46vw,260px)] truncate">{rangeLabel(range, from, to)}</span>
        <span aria-hidden="true" className="text-[10px] text-[#6B7380]">▾</span>
      </button>
      {custom ? <button type="button" aria-label="Reset to the last 24 hours" title="Back to a relative range" onClick={() => { onReset(); close(); }} className={`${button} px-2`}>×</button> : null}
      {open ? (
        <div role="dialog" aria-label="Choose time range" className="fixed inset-x-2 top-[4.5rem] z-40 flex max-h-[calc(100vh-5.5rem)] flex-col overflow-auto rounded-lg border border-[#262C35] bg-[#111418] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(540px,80vh)] sm:w-[560px] sm:flex-row">
          <ul aria-label="Relative ranges" className="flex shrink-0 flex-row flex-wrap gap-0.5 border-b border-[#1F242C] p-2 sm:max-h-[420px] sm:w-44 sm:flex-col sm:flex-nowrap sm:overflow-auto sm:border-b-0 sm:border-r">
            {[{ id: "today", label: "Today" }, { id: "yesterday", label: "Yesterday" }].map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => item.id === "today" ? choose(today, new Date(now)) : choose(addDays(today, -1), new Date(today.getTime() - 1))}
                  className="w-full rounded px-2.5 py-1.5 text-left text-xs text-[#C9CED6] hover:bg-[#1A1F27]">{item.label}</button>
              </li>
            ))}
            <li aria-hidden="true" className="my-1 hidden border-t border-[#1F242C] sm:block" />
            {RANGES.map((item) => {
              const active = !custom && range === item.id;
              if (freeProject && item.ms > FREE_RANGE_DAYS * 86_400_000) {
                return (
                  <li key={item.id}>
                    <a href={pricingCheckoutHref("pro", "monthly")} title="Longer history is part of Pro" className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs text-[#6B7380] hover:bg-[#1A1F27]">{item.label}<span className="bg-[#F4D44D] px-1 font-mono text-[9px] font-bold uppercase text-[#0B0D10]">Pro</span></a>
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <button type="button" aria-pressed={active} onClick={() => { onPreset(item.id); close(true); }}
                    className={`w-full rounded px-2.5 py-1.5 text-left text-xs ${active ? "bg-[#F4D44D] font-medium text-[#0B0D10]" : "text-[#C9CED6] hover:bg-[#1A1F27]"}`}>{item.label}</button>
                </li>
              );
            })}
          </ul>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7380]">Custom range</p>
            <Calendar month={month} onMonth={setMonth} start={start} end={end} min={min} max={today} onPick={pick} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#8B93A1]">
              <label className="flex items-center gap-1.5">From<input type="time" aria-label="Start time" value={startTime} onChange={(event) => setStartTime(event.target.value || "00:00")} className={input} /></label>
              <label className="flex items-center gap-1.5">To<input type="time" aria-label="End time" value={endTime} onChange={(event) => setEndTime(event.target.value || "23:59")} className={input} /></label>
            </div>
            <p className="min-h-4 text-[11px] text-[#8B93A1]" aria-live="polite">
              {error ? <span role="alert" className="text-[#FF8A8A]">{error}</span> : start ? `${short(start, true)}${end && !sameDay(start, end) ? ` – ${short(end, true)}` : ""} · your local time · up to ${freeProject ? FREE_RANGE_DAYS : MAX_RANGE_DAYS} days back` : `Pick a start and end date · your local time · up to ${freeProject ? FREE_RANGE_DAYS : MAX_RANGE_DAYS} days back`}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => close(true)} className={button}>Cancel</button>
              <button type="button" onClick={apply} disabled={!start} className="h-8 rounded-md bg-[#F4D44D] px-3 text-xs font-medium text-[#0B0D10] hover:bg-[#FFE680] disabled:opacity-40">Apply range</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
