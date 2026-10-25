"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cleanError } from "./delivery-status";

type Quiet = { enabled: boolean; startMinute: number; endMinute: number; timezone: string; activeNow: boolean } | null;

const toTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const toMinute = (time: string) => { const [h, m] = time.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const browserZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } };

/** One line under the header: when alert messages are held back each day, with a small editor. */
export function QuietHoursBar({ projectId, quiet }: { projectId: string; quiet: Quiet }) {
  const save = useMutation(api.alertRules.setQuietHours);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(toTime(quiet?.startMinute ?? 22 * 60));
  const [end, setEnd] = useState(toTime(quiet?.endMinute ?? 7 * 60));
  const [zone, setZone] = useState(quiet?.timezone ?? browserZone());
  const [error, setError] = useState<string | null>(null);

  async function commit(enabled: boolean) {
    setError(null);
    try {
      await save({ projectId: projectId as Id<"projects">, enabled, startMinute: toMinute(start), endMinute: toMinute(end), timezone: zone.trim() });
      setEditing(false);
    } catch (caught) { setError(cleanError(caught, "Couldn’t save quiet hours")); }
  }

  const field = "h-7 border border-[#262C35] bg-[#111418] px-2 outline-none focus:border-[#4A5260]";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[#1F242C] px-4 py-2 text-[12px]" aria-label="Quiet hours">
      <span className="text-[11px] tracking-[0.08em] text-[#6B7380]">QUIET HOURS</span>
      {editing ? (
        <form onSubmit={(event) => { event.preventDefault(); void commit(true); }} className="flex flex-wrap items-center gap-1.5">
          <input aria-label="Quiet hours start" type="time" required value={start} onChange={(event) => setStart(event.target.value)} className={field} />
          <span className="text-[#6B7380]">to</span>
          <input aria-label="Quiet hours end" type="time" required value={end} onChange={(event) => setEnd(event.target.value)} className={field} />
          <input aria-label="Time zone" value={zone} onChange={(event) => setZone(event.target.value)} placeholder="Europe/Berlin" className={`${field} w-40`} />
          <button className="h-7 bg-[#F4D44D] px-3 font-bold text-[#090909]">Turn on</button>
          {quiet?.enabled ? <button type="button" onClick={() => void commit(false)} className="h-7 border border-[#262C35] px-2.5 text-[#8B93A1] hover:text-[#E6E9EE]">Turn off</button> : null}
          <button type="button" onClick={() => { setEditing(false); setError(null); }} className="h-7 px-2 text-[#8B93A1] hover:text-[#E6E9EE]">Cancel</button>
        </form>
      ) : quiet?.enabled ? (
        <>
          <span className={quiet.activeNow ? "text-[#F4D44D]" : "text-[#E6E9EE]"}>{toTime(quiet.startMinute)} to {toTime(quiet.endMinute)} <span className="text-[#6B7380]">{quiet.timezone}</span>{quiet.activeNow ? " · quiet right now" : ""}</span>
          <span className="text-[#6B7380]">Alerts are still recorded in History, but no email, Slack or webhook goes out.</span>
          <button type="button" onClick={() => setEditing(true)} className="h-6 border border-[#262C35] px-2 text-[#8B93A1] hover:text-[#E6E9EE]">Edit</button>
        </>
      ) : (
        <>
          <span className="text-[#6B7380]">Off. Alerts go out any time of day.</span>
          <button type="button" onClick={() => setEditing(true)} className="h-6 border border-[#262C35] px-2 text-[#8B93A1] hover:text-[#E6E9EE]">Set quiet hours</button>
        </>
      )}
      {error ? <span role="alert" className="text-[#FF8A8A]">{error}</span> : null}
    </div>
  );
}
