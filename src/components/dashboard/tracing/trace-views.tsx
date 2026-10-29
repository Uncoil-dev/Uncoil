"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import type { SpanTreeNode } from "@/lib/uncoil-ports/treeBuilding";
import { compactNumber, formatCost, formatDuration, stepKind } from "./format";

export { stepKind };
import { layoutWithElk } from "./elk-layout";
import type { CanvasEdge, CanvasNode } from "./trace-canvas";
import { TraceCanvasNode } from "./trace-canvas-nodes";
import { flowGraph, flowNodeWidth, flowEdgePresentation, type FlowStep } from "@/lib/trace-flow";

/** The span fields the views need; the panel's Span type satisfies it. */
export type ViewSpan = {
  spanId: string; spanType: string; latencyMs: number; costUsd: number; inputTokens?: number; outputTokens?: number;
  errorType?: string;
};

/** Step colours, shared by the tree, timeline and graph. Failed steps are always red. */
export const TYPE_COLOR: Record<string, string> = {
  llm: "#F4D44D", generation: "#F4D44D", tool: "#8AB4FF", retrieval: "#7CF5C8", error: "#FF6B6B", agent: "#C9CED6",
};
const OTHER = "#8B93A1";
const FAILED = "#FF6B6B";
const TraceCanvas = dynamic(() => import("./trace-canvas").then((module) => module.TraceCanvas), { ssr: false });

export function stepColor(type: string, failed: boolean) {
  return failed ? FAILED : TYPE_COLOR[stepKind(type)] ?? OTHER;
}

const ICON_PATHS: Record<string, string> = {
  agent: "M8 3v2M5 7h6a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM6.5 10.5h0M9.5 10.5h0",
  llm: "M8 2l1.6 4.4L14 8l-4.4 1.6L8 14l-1.6-4.4L2 8l4.4-1.6z",
  tool: "M10.5 2.5a3 3 0 0 0-3.9 3.9L2.5 10.5l3 3 4.1-4.1a3 3 0 0 0 3.9-3.9l-2 2-1.5-1.5z",
  retrieval: "M7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM10 10l3.5 3.5",
  error: "M8 2.5l6 11H2zM8 7v3M8 12h0",
  other: "M3 8h10M8 3v10",
};

/** Small type glyph in the step colour, used in every view. */
export function TypeIcon({ type, failed = false, size = 14 }: { type: string; failed?: boolean; size?: number }) {
  const key = failed ? "error" : stepKind(type);
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} className="shrink-0" fill="none" stroke={stepColor(type, failed)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[key] ?? ICON_PATHS.other} />
    </svg>
  );
}

function describe(name: string, span: ViewSpan, failed: boolean) {
  const tokens = Number(span.inputTokens ?? 0) + Number(span.outputTokens ?? 0);
  return [
    name, formatDuration(span.latencyMs), Number(span.costUsd) ? formatCost(Number(span.costUsd)) : "",
    tokens ? `${compactNumber(tokens)} tokens` : "", failed ? `failed${span.errorType ? `: ${span.errorType}` : ""}` : "",
  ].filter(Boolean).join(" · ");
}

/** 1, 2 or 5 × 10ⁿ so the axis shows roughly six labelled ticks. */
function tickStep(totalMs: number, target = 6) {
  const raw = Math.max(totalMs / target, 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((factor) => factor * power).find((step) => step >= raw) ?? power * 10;
}

function ZoomControls({ zoom, setZoom, min, max, fit }: { zoom: number; setZoom: (value: number) => void; min: number; max: number; fit: () => void }) {
  const button = "flex h-6 w-6 items-center justify-center rounded text-[#8B93A1] hover:bg-[#1A1F27] hover:text-white disabled:opacity-30";
  return (
    <div role="group" aria-label="Zoom" className="flex items-center gap-0.5">
      <button type="button" aria-label="Zoom out" className={button} disabled={zoom <= min + 1e-6} onClick={() => setZoom(Math.max(min, zoom / 1.5))}>−</button>
      <button type="button" aria-label="Zoom in" className={button} disabled={zoom >= max - 1e-6} onClick={() => setZoom(Math.min(max, zoom * 1.5))}>+</button>
      <button type="button" aria-label="Fit to view" className={button} onClick={fit}>
        <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
      </button>
    </div>
  );
}

/**
 * Drag with the mouse to move a scrollable view. A drag of more than a few pixels swallows the click that
 * follows, so dragging across a bar or card does not select it.
 */
export function useDragToMove(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; left: number; top: number } | null = null;
    let moved = false;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      start = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
      moved = false;
    };
    const move = (event: PointerEvent) => {
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      if (!moved) { moved = true; el.setPointerCapture(event.pointerId); el.style.cursor = "grabbing"; }
      el.scrollLeft = start.left - dx;
      el.scrollTop = start.top - dy;
    };
    const up = () => {
      if (moved) {
        const swallow = (event: MouseEvent) => { event.stopPropagation(); event.preventDefault(); };
        el.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => el.removeEventListener("click", swallow, { capture: true }), 0);
      }
      start = null;
      el.style.cursor = "";
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [ref]);
}

/** Wheel zoom around the cursor. `shouldZoom` decides which wheel events zoom; the others scroll normally. */
export function useWheelZoom(ref: RefObject<HTMLElement | null>, zoom: number, setZoom: (value: number) => void, limits: { min: number; max: number },
  shouldZoom: (event: WheelEvent) => boolean, anchorFor: (event: WheelEvent, el: HTMLElement, from: number, to: number) => { left: number; top: number }) {
  const state = useRef({ zoom, pending: null as null | { left: number; top: number } });
  useLayoutEffect(() => {
    state.current.zoom = zoom;
    const el = ref.current;
    const pending = state.current.pending;
    if (el && pending) { el.scrollLeft = pending.left; el.scrollTop = pending.top; state.current.pending = null; }
  }, [zoom, ref]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (!shouldZoom(event)) return;
      event.preventDefault();
      const from = state.current.zoom;
      const to = Math.min(limits.max, Math.max(limits.min, from * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015))));
      if (Math.abs(to - from) < 1e-4) return;
      state.current.pending = anchorFor(event, el, from, to);
      setZoom(to);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [ref, setZoom, limits.min, limits.max, shouldZoom, anchorFor]);
}

const timelineZooms = (event: WheelEvent) => event.ctrlKey || event.metaKey;
const NAME_COL = 190;

/**
 * Every step as a bar on one time axis, in tree order: overlapping bars show parallel work, gaps show waiting.
 * Each bar is labelled with its duration and cost; hover or focus adds tokens. Zoom widens the time axis.
 */
const TIMELINE_LIMITS = { min: 1, max: 64 };
export function TraceTimeline({ rows, spans, totalMs, selectedId, isFailed, onSelect }: {
  rows: SpanTreeNode[]; spans: Map<string, ViewSpan>; totalMs: number; selectedId: string | null;
  isFailed: (span: ViewSpan) => boolean; onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ text: string; top: number; left: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useDragToMove(scroller);
  // Ctrl/⌘ + wheel (or a trackpad pinch) zooms the time axis around the cursor; a plain wheel scrolls the rows.
  const anchor = useMemo(() => (event: WheelEvent, el: HTMLElement, from: number, to: number) => {
    const x = Math.max(0, event.clientX - el.getBoundingClientRect().left - NAME_COL);
    const at = (el.scrollLeft + x) / from;
    return { left: Math.max(0, at * to - x), top: el.scrollTop };
  }, []);
  useWheelZoom(scroller, zoom, setZoom, TIMELINE_LIMITS, timelineZooms, anchor);
  const step = tickStep(totalMs / zoom);
  const ticks: number[] = [];
  for (let at = 0; at < totalMs * 0.98; at += step) ticks.push(at);
  const width = zoom === 1 ? "100%" : `calc(${NAME_COL}px + ${zoom} * (100% - ${NAME_COL}px))`;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[#1F242C] px-2 py-1">
        <ZoomControls zoom={zoom} setZoom={setZoom} min={TIMELINE_LIMITS.min} max={TIMELINE_LIMITS.max} fit={() => setZoom(1)} />
        <span className="hidden text-[11px] text-[#6B7380] sm:inline">Ctrl + scroll to zoom · drag to move</span>
        <span className="font-mono text-[10px] text-[#6B7380]">{formatDuration(totalMs)} total</span>
      </div>
      <div ref={scroller} className="relative min-h-0 flex-1 cursor-grab select-none overflow-auto" onMouseLeave={() => setHover(null)}>
        <div className="relative min-w-full" style={{ width }}>
          <div className="sticky top-0 z-20 flex h-6 border-b border-[#1F242C] bg-[#0E1115] font-mono text-[10px] text-[#6B7380]" aria-hidden="true">
            <span className="sticky left-0 z-10 shrink-0 border-r border-[#1F242C] bg-[#0E1115]" style={{ width: NAME_COL }} />
            <span className="relative flex-1 overflow-hidden">
              {ticks.map((at) => <span key={at} className="absolute top-1.5 whitespace-nowrap pl-1" style={{ left: `${(at / totalMs) * 100}%` }}>{at === 0 ? "0" : formatDuration(at)}</span>)}
            </span>
          </div>
          <div className="pointer-events-none absolute bottom-0 top-6" style={{ left: NAME_COL, right: 0 }} aria-hidden="true">
            {ticks.map((at) => <span key={at} className="absolute inset-y-0 border-l border-[#171B21]" style={{ left: `${(at / totalMs) * 100}%` }} />)}
          </div>
          <ol aria-label="Timeline" className="relative">
            {rows.length === 0 ? <li className="px-4 py-3 text-sm text-[#8B93A1]">No steps match.</li> : null}
            {rows.map((node) => {
              const span = spans.get(node.id);
              if (!span) return null;
              const failed = isFailed(span);
              const left = Math.min(99.6, (node.startTimeSinceRootMs / totalMs) * 100);
              const barWidth = Math.max(0.4, Math.min(100 - left, (Number(span.latencyMs) / totalMs) * 100));
              const text = describe(node.name, span, failed);
              const selected = selectedId === node.id;
              const label = `${formatDuration(span.latencyMs)}${Number(span.costUsd) ? `  ${formatCost(Number(span.costUsd))}` : ""}`;
              const inside = barWidth * zoom > 24;
              const labelBefore = left + barWidth > 72;
              return (
                <li key={node.id} id={`timeline-${node.id}`}>
                  <button type="button" aria-label={text} aria-current={selected ? "true" : undefined} onClick={() => onSelect(node.id)}
                    onMouseMove={(event) => {
                      const area = event.currentTarget.closest("ol")!.getBoundingClientRect();
                      setHover({ text, top: event.clientY - area.top + 40, left: Math.max(8, event.clientX - area.left - 40) });
                    }}
                    className={`group flex h-7 w-full items-center text-left ${selected ? "bg-[#161B22]" : "hover:bg-[#12161C]"}`}>
                    <span className={`sticky left-0 z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-[#1F242C] pr-2 text-xs ${selected ? "bg-[#161B22] shadow-[inset_3px_0_0_#F4D44D]" : "bg-[#0E1115] group-hover:bg-[#12161C]"} ${failed ? "text-[#FF8A8A]" : "text-[#C9CED6]"}`}
                      style={{ width: NAME_COL, paddingLeft: 8 + Math.min(node.depth, 8) * 12 }}>
                      <TypeIcon type={span.spanType} failed={failed} size={12} /><span className="truncate">{node.name}</span>
                    </span>
                    <span className="relative h-full min-w-0 flex-1">
                      <span className={`absolute top-1 flex h-5 items-center overflow-hidden rounded-[3px] font-mono text-[10px] font-medium text-[#0B0D10] ${inside ? "px-1.5" : ""} ${selected ? "outline outline-2 outline-offset-1 outline-[#F4D44D]" : ""}`}
                        style={{ left: `${left}%`, width: `max(3px, ${barWidth}%)`, background: stepColor(span.spanType, failed) }}>
                        {inside ? <span className="truncate">{label}</span> : null}
                      </span>
                      {!inside ? (
                        <span className="absolute top-1 flex h-5 items-center whitespace-nowrap px-1.5 font-mono text-[10px] text-[#8B93A1]"
                          style={labelBefore ? { right: `calc(${100 - left}% + 2px)` } : { left: `calc(${left + barWidth}% + 5px)` }}>{label}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {hover ? (
            <div role="tooltip" className="pointer-events-none absolute z-30 max-w-[260px] rounded-md border border-[#262C35] bg-[#111418] px-2.5 py-1.5 font-mono text-[11px] text-[#E6E9EE] shadow-2xl" style={{ top: hover.top, left: hover.left }}>
              {hover.text}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type GraphNode = {
  key: string; name: string; type: string; spanIds: string[]; failed: number; latencyMs: number; costUsd: number;
  children: GraphNode[]; depth: number;
};

/** Expanded: one node per step. */
function expandedTree(roots: SpanTreeNode[], spans: Map<string, ViewSpan>, isFailed: (span: ViewSpan) => boolean) {
  const build = (node: SpanTreeNode, depth: number): GraphNode => {
    const span = spans.get(node.id);
    return {
      key: node.id, name: node.name, type: span?.spanType ?? "", spanIds: [node.id], failed: span && isFailed(span) ? 1 : 0,
      latencyMs: Number(span?.latencyMs ?? 0), costUsd: Number(span?.costUsd ?? 0), depth,
      children: node.children.map((child) => build(child, depth + 1)),
    };
  };
  return roots.map((root) => build(root, 0));
}

/** Aggregated: siblings with the same name and type merge into one node (×N), and so do their children. */
function aggregatedTree(roots: SpanTreeNode[], spans: Map<string, ViewSpan>, isFailed: (span: ViewSpan) => boolean) {
  const merge = (nodes: SpanTreeNode[], depth: number, path: string): GraphNode[] => {
    const groups = new Map<string, SpanTreeNode[]>();
    for (const node of nodes) {
      const id = `${spans.get(node.id)?.spanType ?? ""}:${node.name}`;
      groups.set(id, [...(groups.get(id) ?? []), node]);
    }
    return [...groups.entries()].map(([id, members]) => {
      const list = members.map((member) => spans.get(member.id)).filter((span): span is ViewSpan => Boolean(span));
      const key = `${path}/${id}`;
      return {
        key, name: members[0]!.name, type: list[0]?.spanType ?? "", spanIds: members.map((member) => member.id),
        failed: list.filter(isFailed).length, latencyMs: list.reduce((sum, span) => sum + Number(span.latencyMs || 0), 0),
        costUsd: list.reduce((sum, span) => sum + Number(span.costUsd || 0), 0), depth,
        children: merge(members.flatMap((member) => member.children), depth + 1, key),
      };
    });
  };
  return merge(roots, 0, "");
}

/**
 * Steps as ELK layered cards in the shared pan/zoom canvas. The viewport and user transform survive polls;
 * the last position of every existing node is kept when live data adds or updates steps.
 */
export function TraceGraph({ roots, spans, selectedId, isFailed, onSelect }: {
  roots: SpanTreeNode[]; spans: Map<string, ViewSpan>; selectedId: string | null;
  isFailed: (span: ViewSpan) => boolean; onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<"flow" | "aggregated" | "expanded">("flow");
  const [positionedNodes, setPositionedNodes] = useState<CanvasNode[]>([]);
  const previous = useRef(new Map<string, { x: number; y: number }>());
  const flattened = useMemo(() => {
    if (mode === "flow") {
      const steps: FlowStep[] = [];
      const stack = [...roots];
      while (stack.length) {
        const node = stack.pop()!, span = spans.get(node.id);
        steps.push({ id: node.id, parentSpanId: node.parentSpanId, name: node.name, type: span?.spanType ?? node.type,
          startedAt: node.startTime.getTime(), latencyMs: Number(span?.latencyMs ?? 0), costUsd: Number(span?.costUsd ?? 0), failed: span ? isFailed(span) : false });
        stack.push(...node.children);
      }
      return flowGraph(steps);
    }
    const tree = (mode === "aggregated" ? aggregatedTree : expandedTree)(roots, spans, isFailed);
    const items: GraphNode[] = [];
    const edges: Array<{ id: string; source: string; target: string; count: number; errors: number; back?: number }> = [];
    const stack = [...tree].reverse();
    while (stack.length) {
      const node = stack.pop()!;
      items.push(node);
      for (const child of node.children) {
        edges.push({ id: `${node.key}>${child.key}`, source: node.key, target: child.key, count: 1, errors: child.failed });
        stack.push(child);
      }
    }
    return { items, edges };
  }, [mode, roots, spans, isFailed]);
  // Positions belong to one mode; switching modes lays the graph out afresh.
  useEffect(() => { previous.current = new Map(); }, [mode]);

  useEffect(() => {
    let active = true;
    layoutWithElk("trace-steps", flattened.items.map((node) => ({ id: node.key, width: flowNodeWidth(node.type), height: 62 })), flattened.edges, previous.current, mode === "flow" ? "DOWN" : "RIGHT")
      .then((positions) => {
        if (!active) return;
        previous.current = positions;
        setPositionedNodes(flattened.items.map((node) => ({
          id: node.key,
          type: "traceCard",
          width: flowNodeWidth(node.type),
          height: 62,
          position: positions.get(node.key) ?? { x: 0, y: 0 },
          // Start and end only frame the flow; they are not steps, so they cannot be focused or selected.
          focusable: node.spanIds.length > 0,
          selectable: node.spanIds.length > 0,
          ariaLabel: node.spanIds.length === 0 ? undefined : [node.name, node.spanIds.length > 1 ? `${node.spanIds.length} steps` : "", formatDuration(node.latencyMs), node.costUsd ? formatCost(node.costUsd) : "", node.failed ? `${node.failed} failed` : ""].filter(Boolean).join(" · "),
          data: { kind: node.type, name: node.name, runs: node.spanIds.length, vertical: mode === "flow", spanIds: node.spanIds, failed: node.failed, latencyMs: node.latencyMs, costUsd: node.costUsd },
        } as CanvasNode)));
      });
    return () => { active = false; };
  }, [flattened, mode]);

  const nodes: CanvasNode[] = useMemo(() => positionedNodes.map((node) => ({
    ...node,
    selected: selectedId !== null && (node.data.spanIds as string[] | undefined)?.includes(selectedId),
  })), [positionedNodes, selectedId]);

  const nodeById = useMemo(() => new Map(flattened.items.map((node) => [node.key, node])), [flattened]);
  const focusNodeId = selectedId ? flattened.items.find((node) => node.spanIds.includes(selectedId))?.key : null;
  const edges: CanvasEdge[] = useMemo(() => {
    const at = new Map(positionedNodes.map((node) => [node.id, node.position]));
    return flattened.edges.map((edge) => {
      // In Flow, an arrow that points back up is a loop: it leaves and enters on the right so it does not cross the cards.
      const loop = mode === "flow" && (at.get(edge.target)?.y ?? 0) <= (at.get(edge.source)?.y ?? 0);
      return {
        ...edge,
        ...flowEdgePresentation(edge, loop),
        ...(mode !== "flow" ? { sourceHandle: undefined, targetHandle: undefined } : {}),
        focusable: true,
        ariaLabel: `${nodeById.get(edge.source)?.name ?? "Step"} leads to ${nodeById.get(edge.target)?.name ?? "step"}${edge.count > 1 ? `, ${edge.count} times` : ""}${edge.back ? `, and back ${edge.back} ${edge.back === 1 ? "time" : "times"}` : ""}`,

      };
    });
  }, [flattened, nodeById, positionedNodes, mode]);
  // A grouped card holds several steps: each click opens the next one, so every run can be reached from the graph.
  const selectNode = (node: CanvasNode) => {
    const ids = (node.data.spanIds as string[] | undefined) ?? [];
    if (!ids.length) return;
    const current = selectedId ? ids.indexOf(selectedId) : -1;
    onSelect(ids[(current + 1) % ids.length]!);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#1F242C] px-2 py-1">
        <div role="group" aria-label="Graph mode" className="flex rounded-sm border border-[#262C35] p-0.5 text-xs">
          {([["flow", "Flow", "What the agent did, in order: each distinct step once with its run count; loops show as arrows back"], ["expanded", "All steps", "Every step as its own card"], ["aggregated", "Grouped", "Repeated steps with the same name under the same parent are merged into one card (×N)"]] as const).map(([item, label, hint]) => (
            <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} title={hint}
              className={`rounded-sm px-2 py-0.5 ${mode === item ? "bg-[#232A34] text-white" : "text-[#8B93A1] hover:text-white"}`}>{label}</button>
          ))}
        </div>
        <span className="hidden text-[11px] text-[#6B7380] sm:inline">Drag to pan · scroll or pinch to zoom · 0 to fit</span>
      </div>
      {nodes.length ? <TraceCanvas nodes={nodes} edges={edges} nodeTypes={{ traceCard: TraceCanvasNode }} focusId={focusNodeId} label="Step graph" onNodeClick={selectNode} /> : <p className="flex min-h-0 flex-1 items-center justify-center text-sm text-[#8B93A1]">Laying out steps…</p>}
    </div>
  );
}
