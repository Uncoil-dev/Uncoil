"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { compactNumber, formatDuration, parseTime, relativeTime } from "./format";
import { encodeValues } from "./facet-filter";

import { COLUMN_DEFS, MAX_META_COLUMNS, META_PREFIX, GROUPS, metaColumn, isMetaColumn, metaKeysFor, type RowLike } from "@/lib/trace-columns";
export { COLUMN_DEFS, DEFAULT_COLUMNS, MAX_META_COLUMNS, columnLabel, extraIdsFor, isKnownColumn, metaKeysFor, orderColumns } from "@/lib/trace-columns";
export type { TraceRowExtras } from "@/lib/trace-columns";

const dash = <span className="text-[#4A5260]">—</span>;
const mono = (value: ReactNode) => <span className="font-mono text-xs text-[#C9CED6]">{value}</span>;
const count = (value: number | undefined) => (value === undefined ? dash : mono(compactNumber(value)));
const time = (value: number | undefined) => (value === undefined || value <= 0 ? dash : mono(formatDuration(value)));
const text = (value: string | undefined) => (value ? <span className="text-[#C9CED6]" title={value}>{value}</span> : dash);

/** Cells for the columns beyond the original twelve. Returns null for an id it does not own. */
export function extraCell(id: string, row: RowLike, update: (patch: Record<string, string>) => void, clock: number): ReactNode {
  const link = (key: string, value: string) => value
    ? <button type="button" className="truncate text-[#8AB4FF] hover:underline" onClick={(event) => { event.stopPropagation(); update({ [key]: encodeValues([value]) }); }}>{value}</button>
    : dash;
  if (isMetaColumn(id)) return text(row.meta?.[id.slice(META_PREFIX.length)]);
  switch (id) {
    case "traceId": return <span className="font-mono text-xs text-[#C9CED6]" title={row.runId}>{row.runId.slice(0, 12)}</span>;
    case "lastSeen": return row.lastSeenAt ? <time dateTime={new Date(parseTime(row.lastSeenAt)).toISOString()} className="font-mono text-xs text-[#C9CED6]">{relativeTime(row.lastSeenAt, clock)}</time> : dash;
    case "steps": return mono(Number(row.spanCount));
    case "errors": return Number(row.errorCount) > 0 ? <span className="font-mono text-xs text-[#FF8A8A]">{Number(row.errorCount)}</span> : mono(0);
    case "inputTokens": return mono(compactNumber(Number(row.inputTokens)));
    case "outputTokens": return mono(compactNumber(Number(row.outputTokens)));
    case "environment": return link("environment", row.environment);
    case "release": return link("release", row.release);
    case "llmCalls": return count(row.llmCalls);
    case "toolCalls": return count(row.toolCalls);
    case "retries": return count(row.retries);
    case "timeouts": return count(row.timeouts);
    case "slowestStepMs": return time(row.slowestStepMs);
    case "avgStepMs": return time(row.avgStepMs);
    case "ttftMs": return time(row.ttftMs);
    case "firstErrorType": return row.firstErrorType ? <span className="text-[#FF8A8A]">{row.firstErrorType}</span> : dash;
    case "firstErrorMessage": return text(row.firstErrorMessage);
    case "tools": return text(row.tools);
    case "models": return text(row.models);
    case "rootType": return text(row.rootType);
    default: return null;
  }
}

type MetaKey = { key: string; traces: number };

/**
 * The Columns button and its panel: a search box, every column grouped by what it describes, and the metadata
 * keys found in the current range. Built-in columns are cheap; metadata and per-step columns are read only for
 * the traces on the page and only while switched on.
 */
export function ColumnsMenu({ projectId, rangeParams, columns, onToggle, onReset }: {
  projectId: string; rangeParams: URLSearchParams; columns: string[]; onToggle: (id: string) => void; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [keys, setKeys] = useState<MetaKey[] | null>(null);
  const [keysError, setKeysError] = useState(false);
  const rangeKey = rangeParams.toString();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/traces/columns?${rangeKey}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("unavailable"))))
      .then((body: { metadata: MetaKey[] }) => { if (active) { setKeys(body.metadata); setKeysError(false); } })
      .catch(() => { if (active) setKeysError(true); });
    return () => { active = false; };
  }, [open, projectId, rangeKey]);

  const needle = search.trim().toLowerCase();
  const matches = (label: string, hint = "") => !needle || label.toLowerCase().includes(needle) || hint.toLowerCase().includes(needle);
  const selectedMeta = metaKeysFor(columns);
  const shownKeys = useMemo(() => {
    const list = [...(keys ?? [])];
    for (const key of selectedMeta) if (!list.some((item) => item.key === key)) list.push({ key, traces: 0 });
    return list.filter((item) => matches(item.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, columns, needle]);
  const total = COLUMN_DEFS.length + (keys?.length ?? 0);
  const metaFull = selectedMeta.length >= MAX_META_COLUMNS;

  return (
    <div ref={wrapper} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}
        className="h-7 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260]">Columns {columns.length}/{total}</button>
      {open ? (
        <div role="dialog" aria-label="Choose columns" className="absolute right-0 z-20 mt-2 flex max-h-[min(70vh,560px)] w-[min(320px,calc(100vw-2rem))] flex-col rounded-lg border border-[#262C35] bg-[#111418] shadow-2xl">
          <div className="border-b border-[#1F242C] p-2">
            <label htmlFor="column-search" className="sr-only">Search columns</label>
            <input id="column-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search columns" autoFocus
              className="h-7 w-full rounded border border-[#262C35] bg-[#0E1115] px-2 text-xs outline-none placeholder:text-[#6B7380] focus:border-[#4A5260]" />
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-1.5">
            {GROUPS.map((group) => {
              const defs = COLUMN_DEFS.filter((column) => column.group === group && matches(column.label, column.hint));
              if (!defs.length) return null;
              return (
                <section key={group} aria-label={group} className="mb-1.5">
                  <h4 className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[#6B7380]">{group}</h4>
                  {defs.map((column) => (
                    <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-[#1A1F27]">
                      <input type="checkbox" checked={columns.includes(column.id)} onChange={() => onToggle(column.id)} className="size-3.5 shrink-0 accent-[#F4D44D]" />
                      <span className="min-w-0 flex-1 truncate text-[#E6E9EE]">{column.label}</span>
                      <span className="hidden max-w-[120px] truncate text-[10px] text-[#6B7380] sm:block" title={column.hint}>{column.hint}</span>
                    </label>
                  ))}
                </section>
              );
            })}
            <section aria-label="Metadata" className="mb-1">
              <h4 className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[#6B7380]">Metadata{keys ? ` · ${keys.length}` : ""}</h4>
              {keys === null && !keysError ? <p className="px-1.5 py-1 text-[11px] text-[#6B7380]">Looking for metadata keys…</p> : null}
              {keysError ? <p role="alert" className="px-1.5 py-1 text-[11px] text-[#FF8A8A]">Metadata keys are unavailable right now.</p> : null}
              {keys && !shownKeys.length ? <p className="px-1.5 py-1 text-[11px] text-[#6B7380]">{needle ? "No metadata key matches." : "No metadata in this range. Add metadata to your steps to get extra columns."}</p> : null}
              {shownKeys.map((item) => {
                const id = metaColumn(item.key);
                const checked = columns.includes(id);
                return (
                  <label key={item.key} className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-[#1A1F27] ${!checked && metaFull ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                    <input type="checkbox" checked={checked} disabled={!checked && metaFull} onChange={() => onToggle(id)} className="size-3.5 shrink-0 accent-[#F4D44D]" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[#E6E9EE]" title={item.key}>{item.key}</span>
                    {item.traces ? <span className="shrink-0 font-mono text-[10px] text-[#6B7380]">{compactNumber(item.traces)}</span> : null}
                  </label>
                );
              })}
              {metaFull ? <p className="px-1.5 py-1 text-[11px] text-[#8B93A1]">Up to {MAX_META_COLUMNS} metadata columns at a time.</p> : null}
            </section>
          </div>
          <div className="flex items-center justify-between border-t border-[#1F242C] px-2.5 py-1.5 text-[11px]">
            <button type="button" onClick={onReset} className="text-[#8B93A1] hover:text-white">Reset to default</button>
            <button type="button" onClick={() => setOpen(false)} className="text-[#8AB4FF] hover:underline">Done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
