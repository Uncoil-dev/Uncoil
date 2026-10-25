"use client";

import { compactNumber, formatTime, parseTime, relativeTime } from "./format";

export type ErrorGroup = {
  id: string; tool: string; errorType: string; message: string; sample: string;
  count: number; traces: number; firstSeen: string; lastSeen: string;
};
export type ErrorGroups = { total: number; groups: ErrorGroup[] };

export function errorGroupLabel(group: Pick<ErrorGroup, "tool" | "errorType">) {
  return [group.tool, group.errorType].filter(Boolean).join(" · ") || "Error";
}

/** Similar errors (ids, emails, links, quoted values and numbers ignored) across every trace matching the filters, busiest first. Clicking one filters the list. */
export function ErrorGroupsPanel({ data, open, loading, active, clock, onToggle, onSelect }: {
  data: ErrorGroups | null | undefined; open: boolean; loading: boolean; active?: string; clock: number;
  onToggle: () => void; onSelect: (group: ErrorGroup) => void;
}) {
  const groups = data?.groups ?? [];
  return (
    <section aria-label="Error groups" aria-busy={loading} className="mx-4 mt-3 rounded-lg border border-[#1F242C] bg-[#0E1115]">
      <h2 className="m-0">
        <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#8B93A1] hover:text-white">
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
          <span className="font-medium text-[#E6E9EE]">Error groups</span>
          {data ? <span className="font-mono">{data.total > groups.length ? `top ${groups.length} of ${compactNumber(data.total)}` : compactNumber(data.total)}</span> : null}
          <span className="ml-auto hidden sm:inline">similar errors grouped (ids, emails, links and values ignored) · click to filter</span>
        </button>
      </h2>
      {!open ? null : data === undefined || (data === null && loading) ? (
        <p className="border-t border-[#1F242C] px-4 py-3 text-xs text-[#8B93A1]">Loading error groups…</p>
      ) : data === null ? (
        <p className="border-t border-[#1F242C] px-4 py-3 text-xs text-[#8B93A1]">Error groups are unavailable right now.</p>
      ) : groups.length === 0 ? (
        <p className="border-t border-[#1F242C] px-4 py-3 text-xs text-[#8B93A1]">No errors in the traces that match this range and these filters.</p>
      ) : (
        <ul className="max-h-56 overflow-y-auto border-t border-[#1F242C]">
          {groups.map((group) => {
            const selected = active === group.id;
            return (
              <li key={group.id} className="border-b border-[#171B21] last:border-b-0">
                <button type="button" aria-pressed={selected} onClick={() => onSelect(group)} title={group.sample}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 px-3 py-1.5 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto] ${selected ? "bg-[#161B22] shadow-[inset_3px_0_0_#F4D44D]" : "hover:bg-[#12161C]"}`}>
                  <span className="rounded bg-[#3A1C1F] px-2 py-0.5 font-mono text-xs text-[#FF8A8A]" aria-label={`${group.count} errors`}>{compactNumber(group.count)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]"><span className="text-[#8AB4FF]">{group.tool || "—"}</span>{group.errorType ? <span className="text-[#8B93A1]"> · {group.errorType}</span> : null}</span>
                    <span className="block truncate font-mono text-[11px] text-[#C9CED6]">{group.message || "No message recorded"}</span>
                  </span>
                  <span className="col-start-2 flex flex-wrap gap-x-3 font-mono text-[11px] text-[#8B93A1] sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end">
                    <span>{compactNumber(group.traces)} trace{group.traces === 1 ? "" : "s"}</span>
                    <span>
                      <time dateTime={new Date(parseTime(group.firstSeen)).toISOString()} title={`First seen ${formatTime(group.firstSeen)}`}>{relativeTime(group.firstSeen, clock)}</time>
                      {" → "}
                      <time dateTime={new Date(parseTime(group.lastSeen)).toISOString()} title={`Last seen ${formatTime(group.lastSeen)}`}>{relativeTime(group.lastSeen, clock)}</time>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
