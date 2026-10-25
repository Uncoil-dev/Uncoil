"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { relativeTime } from "@/components/dashboard/tracing/format";

type Filter = "all" | "open" | "resolved" | "held";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Still open" },
  { id: "resolved", label: "Resolved" },
  { id: "held", label: "Held back" },
];

const HELD_LABEL = { snoozed: "Held back: snoozed", quiet_hours: "Held back: quiet hours" } as const;

function lasted(startIso: string, endMs: number) {
  const minutes = Math.max(1, Math.round((endMs - Date.parse(startIso)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ${minutes % 60} min` : `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

/** Everything that fired, newest first, including alerts that were recorded but not sent because of a snooze or quiet hours. */
export function AlertHistory({ projectId }: { projectId: string }) {
  const data = useQuery(api.alertRules.history, { projectId: projectId as Id<"projects"> });
  const [filter, setFilter] = useState<Filter>("all");
  const items = useMemo(() => (data?.items ?? []).filter((item) => filter === "all" || (filter === "open" && item.state === "active") || (filter === "resolved" && item.state === "resolved") || (filter === "held" && item.silencedBy)), [data, filter]);

  return (
    <div className="flex min-h-svh flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Alert history</h1>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter history">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`h-7 border px-2.5 text-[12px] ${filter === item.id ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1] hover:text-[#E6E9EE]"}`}>{item.label}</button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-[#6B7380]">Newest 200</span>
      </header>
      {data === undefined ? (
        <div className="space-y-px p-4" aria-label="Loading history">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse bg-[#0E1115]" />)}</div>
      ) : data === null ? (
        <p className="p-6 text-[#8B93A1]">You don’t have access to this project’s alerts.</p>
      ) : data.items.length === 0 ? (
        <div className="m-4 border border-[#1F242C] bg-[#0E1115] p-8 text-center">
          <p className="text-[15px] font-semibold">Nothing has fired yet</p>
          <p className="mx-auto mt-1 max-w-md text-[#8B93A1]">When a rule goes over its limit it shows up here, with when it started, how long it lasted and whether anyone was messaged.</p>
        </div>
      ) : items.length === 0 ? (
        <p className="p-6 text-[#8B93A1]">Nothing matches this filter.</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {items.map((item) => {
            const open = item.state === "active";
            const color = open ? "#FF6B6B" : "#5BE3A0";
            return (
              <li key={item._id} className="grid grid-cols-[8px_1fr] gap-3 border-b border-[#1F242C] px-4 py-3 sm:grid-cols-[8px_1fr_auto]">
                <i className="mt-1.5 block size-1.5" style={{ background: color }} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate">{item.ruleName}</b>
                    <span className="border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em]" style={{ color, borderColor: color }}>{open ? "OPEN" : "RESOLVED"}</span>
                    {item.silencedBy ? <span className="border border-[#4A5260] px-1.5 py-0.5 text-[10px] text-[#8B93A1]">{HELD_LABEL[item.silencedBy]}</span> : null}
                  </div>
                  <p className="mt-0.5 text-[#8B93A1]">{item.message}</p>
                </div>
                <div className="col-start-2 font-mono text-[11px] text-[#6B7380] sm:col-start-3 sm:text-right">
                  <div title={new Date(item.triggeredAt).toLocaleString()}>{relativeTime(item.triggeredAt, data.now)}</div>
                  <div>{item.resolvedAt ? `lasted ${lasted(item.triggeredAt, item.resolvedAt)}` : open ? `open for ${lasted(item.triggeredAt, data.now)}` : ""}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
