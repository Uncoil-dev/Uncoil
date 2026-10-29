"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type { SpanRow } from "@/lib/tinybird";
import {
  buildSpanTree,
  flattenTree,
  type SpanTreeNode,
} from "@/lib/uncoil-ports";

interface SpanTreeProps {
  spans: SpanRow[];
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

/**
 * Hierarchical, collapsible span tree with bottom-up cost/duration
 * aggregation — replaces a flat span list with parent/child nesting so a
 * span's own cost is visible alongside what its subtree spent in total.
 */
export function SpanTree({ spans, selectedSpanId, onSelectSpan }: SpanTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { roots, rootTotalCost, rootDurationMs } = useMemo(() => {
    const { roots } = buildSpanTree(spans);
    const rootTotalCost = roots.reduce<number | undefined>(
      (acc, r) => (r.totalCost == null ? acc : (acc ?? 0) + r.totalCost),
      undefined,
    );
    const rootDurationMs = roots.length
      ? Math.max(...roots.map((r) => (r.endTime ? r.endTime.getTime() - r.startTime.getTime() : 0)))
      : undefined;
    return { roots, rootTotalCost, rootDurationMs };
  }, [spans]);

  const flat = useMemo(() => flattenTree(roots, collapsed), [roots, collapsed]);

  function toggleCollapsed(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (roots.length === 0) {
    return (
      <div className="border border-dashed border-border p-4 text-center font-mono text-[10px] uppercase tracking-widest text-black/55">
        No spans captured
      </div>
    );
  }

  return (
    <div className="border border-border bg-muted/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-black/55">Span tree</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-black/55">
          {rootTotalCost != null ? formatCurrency(rootTotalCost) : "—"} total
        </div>
      </div>
      <div className="space-y-0.5">
        {flat.map(({ node, depth, treeLines }) => (
          <SpanTreeRow
            key={node.id}
            node={node}
            depth={depth}
            treeLines={treeLines}
            isCollapsed={collapsed.has(node.id)}
            isSelected={node.id === selectedSpanId}
            rootTotalCost={rootTotalCost}
            rootDurationMs={rootDurationMs}
            onToggleCollapse={() => toggleCollapsed(node.id)}
            onSelect={() => onSelectSpan(node.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SpanTreeRow({
  node,
  depth,
  treeLines,
  isCollapsed,
  isSelected,
  rootTotalCost,
  rootDurationMs,
  onToggleCollapse,
  onSelect,
}: {
  node: SpanTreeNode;
  depth: number;
  treeLines: boolean[];
  isCollapsed: boolean;
  isSelected: boolean;
  rootTotalCost: number | undefined;
  rootDurationMs: number | undefined;
  onToggleCollapse: () => void;
  onSelect: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const costShare =
    rootTotalCost && node.totalCost != null && rootTotalCost > 0
      ? Math.min(1, node.totalCost / rootTotalCost)
      : 0;
  const durationShare =
    rootDurationMs && rootDurationMs > 0
      ? Math.min(1, node.subtreeWallClockDurationMs / rootDurationMs)
      : 0;

  return (
    <button
      type="button"
      id={`span-tree-row-${node.id}`}
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-2 border border-transparent px-1.5 py-1 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black",
        isSelected && "border-black/30 bg-black/5",
      )}
    >
      {/* Ancestor tree lines, mirroring the flattenTree treeLines bookkeeping */}
      <span className="flex shrink-0 items-stretch self-stretch" style={{ width: depth * 14 }}>
        {treeLines.map((hasLine, i) => (
          <span
            key={i}
            className={cn("h-full w-3.5 border-l", hasLine ? "border-black/15" : "border-transparent")}
          />
        ))}
      </span>

      {hasChildren ? (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="flex size-4 shrink-0 items-center justify-center text-black/40 hover:text-black"
        >
          {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
        </span>
      ) : (
        <span className="size-4 shrink-0" />
      )}

      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-black/80">
        {node.name || node.type}
      </span>

      <span className="relative hidden h-3 w-16 shrink-0 bg-black/5 sm:block" title="Share of total wall-clock duration">
        <span className="absolute inset-y-0 left-0 bg-black/20" style={{ width: `${durationShare * 100}%` }} />
      </span>

      <span className="w-14 shrink-0 text-right font-mono text-[10px] text-black/55">
        {formatDuration(node.subtreeWallClockDurationMs)}
      </span>

      <span className="relative hidden h-3 w-16 shrink-0 bg-black/5 sm:block" title="Share of total cost">
        <span className="absolute inset-y-0 left-0 bg-emerald-500/30" style={{ width: `${costShare * 100}%` }} />
      </span>

      <span className="w-16 shrink-0 text-right font-mono text-[10px] text-black/55">
        {node.totalCost != null ? formatCurrency(node.totalCost) : "—"}
      </span>
    </button>
  );
}
