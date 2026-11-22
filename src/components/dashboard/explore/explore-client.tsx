"use client";

import { PageTitle } from "@/components/dashboard/page-title";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FilterBar, TraceMap } from "@/components/lit/react";
import type { FilterBarFilter, FilterFieldOption } from "@/components/lit/react";
import {
  applyFilters,
  type ExploreFilter,
  type ExploreSpan,
  type ExploreTrace,
} from "@/components/dashboard/explore/types";

type SortKey = "timestamp" | "name" | "status" | "latency" | "cost" | "tokens" | "user";
type SortDir = "asc" | "desc";

const STATUS_LABEL: Record<ExploreTrace["status"], string> = {
  success: "Success",
  error: "Error",
  running: "Running",
};

function statusVariant(status: ExploreTrace["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "error") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

function toSpanMapProp(spans: ExploreSpan[]) {
  // The Lit component's prop shape matches ExploreSpan closely; pass through.
  return spans;
}

export function ExploreClient({
  traces,
  isDemo = false,
}: {
  traces: ExploreTrace[];
  projectLabel: string;
  isDemo?: boolean;
}) {
  const [filters, setFilters] = useState<ExploreFilter[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const models = useMemo(() => Array.from(new Set(traces.map((t) => t.model))).sort(), [traces]);
  const tags = useMemo(() => Array.from(new Set(traces.flatMap((t) => t.tags))).sort(), [traces]);

  const fields: FilterFieldOption[] = useMemo(
    () => [
      { field: "search", label: "Search", kind: "text", placeholder: "trace, id, user…" },
      { field: "status", label: "Status", kind: "select", options: ["success", "error", "running"] },
      { field: "model", label: "Model", kind: "select", options: models },
      { field: "tag", label: "Tag", kind: "select", options: tags },
      { field: "cost", label: "Cost ($)", kind: "range" },
      { field: "latency", label: "Latency (s)", kind: "range" },
      { field: "dateRange", label: "Date range", kind: "dateRange" },
    ],
    [models, tags],
  );

  const filtered = useMemo(() => applyFilters(traces, filters), [traces, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "latency":
          return (a.durationMs - b.durationMs) * dir;
        case "cost":
          return (a.costUsd - b.costUsd) * dir;
        case "tokens":
          return (a.inputTokens + a.outputTokens - (b.inputTokens + b.outputTokens)) * dir;
        case "user":
          return a.user.localeCompare(b.user) * dir;
        case "timestamp":
        default:
          return (new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()) * dir;
      }
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const selectedTrace = traces.find((t) => t.id === selectedTraceId) ?? null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function handleFiltersChange(e: Event) {
    const detail = (e as CustomEvent<FilterBarFilter[]>).detail;
    setFilters(detail as ExploreFilter[]);
    setPage(0);
  }

  function openTrace(id: string) {
    setSelectedTraceId(id);
    setSelectedSpanId(null);
  }

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
    { key: "latency", label: "Latency" },
    { key: "cost", label: "Cost" },
    { key: "tokens", label: "Tokens" },
    { key: "timestamp", label: "Timestamp" },
    { key: "user", label: "User" },
  ];

  return (
    <div className="flex flex-col gap-4 bg-black text-white min-h-full p-4 font-mono">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <PageTitle>Explore</PageTitle>
          <p className="text-xs text-neutral-400">
            {isDemo
              ? "Seeded demo data — click any row to open its trace map. No backend involved."
              : "Trace explorer for this project. Live data from your project."}
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-wide border border-neutral-700 px-2 py-1 text-neutral-400">
          {sorted.length} traces
        </span>
      </div>

      <FilterBar
        fields={fields}
        filters={filters as unknown as FilterBarFilter[]}
        onFiltersChange={handleFiltersChange}
      />

      <div className="border border-neutral-800 overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-black">
            <TableRow className="border-neutral-800 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer select-none text-neutral-400 text-xs uppercase tracking-wide"
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </TableHead>
              ))}
              <TableHead className="text-neutral-400 text-xs uppercase tracking-wide">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-neutral-500 py-8">
                  No traces match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((trace) => (
                <TableRow
                  key={trace.id}
                  onClick={() => openTrace(trace.id)}
                  className="cursor-pointer border-neutral-900 hover:bg-neutral-950"
                >
                  <TableCell className="font-medium">{trace.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(trace.status)} className="rounded-none">
                      {STATUS_LABEL[trace.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{(trace.durationMs / 1000).toFixed(2)}s</TableCell>
                  <TableCell>${trace.costUsd.toFixed(4)}</TableCell>
                  <TableCell>{(trace.inputTokens + trace.outputTokens).toLocaleString()}</TableCell>
                  <TableCell>{new Date(trace.startedAt).toLocaleString()}</TableCell>
                  <TableCell>{trace.user}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-neutral-400">
                    {trace.tags.join(", ")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="border border-neutral-700 px-2 py-1 disabled:opacity-30"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="border border-neutral-700 px-2 py-1 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>

      <Sheet open={Boolean(selectedTrace)} onOpenChange={(open) => !open && setSelectedTraceId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl bg-black text-white border-neutral-800 overflow-y-auto">
          {selectedTrace ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-white font-mono">{selectedTrace.name}</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 flex flex-col gap-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-neutral-500 uppercase tracking-wide text-[10px]">Status</div>
                    <div>{STATUS_LABEL[selectedTrace.status]}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 uppercase tracking-wide text-[10px]">Model</div>
                    <div>{selectedTrace.model}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 uppercase tracking-wide text-[10px]">Latency</div>
                    <div>{(selectedTrace.durationMs / 1000).toFixed(2)}s</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 uppercase tracking-wide text-[10px]">Cost</div>
                    <div>${selectedTrace.costUsd.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 uppercase tracking-wide text-[10px]">Tokens</div>
                    <div>
                      {selectedTrace.inputTokens.toLocaleString()} in / {selectedTrace.outputTokens.toLocaleString()} out
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-500 uppercase tracking-wide text-[10px]">User</div>
                    <div>{selectedTrace.user}</div>
                  </div>
                </div>

                <div>
                  <div className="text-neutral-500 uppercase tracking-wide text-[10px] mb-2">Trace map</div>
                  <TraceMap
                    spans={toSpanMapProp(selectedTrace.spans)}
                    selectedId={selectedSpanId}
                    onSpanSelect={(e: Event) => setSelectedSpanId((e as CustomEvent<{ spanId: string }>).detail.spanId)}
                  />
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
