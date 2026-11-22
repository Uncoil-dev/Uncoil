"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { XYPosition } from "@xyflow/react";
import { compactNumber, formatDuration } from "./format";
import { layoutWithElk } from "./elk-layout";
import type { CanvasEdge, CanvasNode } from "./trace-canvas";
import { TraceCanvasNode } from "./trace-canvas-nodes";
import { flowNodeWidth, flowEdgePresentation } from "@/lib/trace-flow";
import { EmptyNotice } from "../empty/empty-notice";

type MapNode = { id: string; kind: string; name: string; count: number; traces: number; errors: number; p50LatencyMs: number };
type MapEdge = { source: string; target: string; count: number; back?: number; errors: number; traces: number; errorRate: number; p50LatencyMs: number };
type MapResponse = { nodes: MapNode[]; edges: MapEdge[]; totalNodes: number; totalEdges: number; limits: { nodes: number; edges: number }; error?: string };
const NODE_TYPES = { traceCard: TraceCanvasNode };
const EDGE_LIMITS = [10, 25, 50, 75, 100];
const TraceCanvas = dynamic(() => import("./trace-canvas").then((module) => module.TraceCanvas), { ssr: false });

export function stepLabel(key: string) {
  return key === "__start__" ? "start" : key === "__end__" ? "end" : key.replace(/^[^:]+:/, "");
}

/** Real ClickHouse-backed aggregate map with a shared React Flow canvas and ELK layered layout. */
export function AgentMap({ projectId, params, live, rangeMs, onNode, onEdge, mapSelected, edgeLimit, onViewStateChange }: {
  projectId: string; params: URLSearchParams; live: boolean; rangeMs: number | null;
  onNode: (id: string) => void; onEdge: (source: string, target: string) => void;
  mapSelected: string | null; edgeLimit: number; onViewStateChange: (selected: string | null, limit: number) => void;
}) {
  const key = params.toString();
  const [state, setState] = useState<{ key: string; data: MapResponse | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const selectedEdgeId = mapSelected?.startsWith("edge:") ? mapSelected.slice(5) : null;
  const [search, setSearch] = useState("");
  const [positionedNodes, setPositionedNodes] = useState<CanvasNode[]>([]);
  const previousPositions = useRef(new Map<string, XYPosition>());

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 5000;
    let last = "";
    const url = (moving: boolean) => {
      const next = new URLSearchParams(key);
      if (moving && rangeMs) { const to = Date.now(); next.set("to", String(to)); next.set("from", String(to - rangeMs)); }
      return `/api/projects/${encodeURIComponent(projectId)}/traces/map?${next}`;
    };
    const load = async (moving: boolean) => {
      const response = await fetch(url(moving), { cache: "no-store" });
      const body = (await response.json()) as MapResponse;
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      return body;
    };
    load(false)
      .then((body) => { if (!stopped) { last = JSON.stringify(body.nodes) + JSON.stringify(body.edges); setState({ key, data: body, error: null }); } })
      .catch((reason: unknown) => { if (!stopped) setState({ key, data: null, error: reason instanceof Error ? reason.message : "Could not load the map" }); })
      .finally(() => { if (!stopped && live && rangeMs) timer = setTimeout(tick, delay); });
    async function tick() {
      if (!document.hidden) {
        try {
          const body = await load(true);
          const signature = JSON.stringify(body.nodes) + JSON.stringify(body.edges);
          const changed = signature !== last;
          last = signature;
          if (!stopped && changed) setState({ key, data: body, error: null });
          else if (!stopped) setState((current) => (current?.error ? { key, data: body, error: null } : current));
          delay = changed ? 5000 : Math.min(delay * 2, 60_000);
        } catch {
          delay = Math.min(delay * 2, 60_000);
        }
      }
      if (!stopped) timer = setTimeout(tick, delay);
    }
    return () => { stopped = true; clearTimeout(timer); };
  }, [projectId, key, live, rangeMs, attempt]);

  const current = state?.key === key ? state : null;
  const data = current?.data ?? state?.data ?? null;
  const selectedNode = mapSelected?.startsWith("node:") ? mapSelected.slice(5) : null;
  const visibleEdges = useMemo(() => (data?.edges ?? []).slice(0, Math.max(1, Math.min(100, edgeLimit))), [data?.edges, edgeLimit]);
  const laidOutEdges = useMemo(() => visibleEdges.map((edge, index) => ({ ...edge, id: `${edge.source}→${edge.target}`, index })), [visibleEdges]);
  const displayedEdges = laidOutEdges;
  const selectedEdge = (data?.edges ?? []).find((edge) => `${edge.source}→${edge.target}` === selectedEdgeId) ?? null;

  const selectNode = useCallback((node: CanvasNode) => {
    const id = selectedNode === node.id ? null : node.id;
    onViewStateChange(id ? `node:${id}` : null, edgeLimit);
  }, [selectedNode, edgeLimit, onViewStateChange]);
  const chooseEdge = useCallback((edge: CanvasEdge) => {
    const picked = laidOutEdges.find((candidate) => candidate.id === edge.id);
    if (picked) onViewStateChange(`edge:${picked.id}`, edgeLimit);
  }, [laidOutEdges, edgeLimit, onViewStateChange]);

  useEffect(() => {
    if (!data) return;
    let active = true;
    layoutWithElk("agent-map", data.nodes.map((node) => ({ id: node.id, width: flowNodeWidth(node.kind), height: 62 })), laidOutEdges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })), previousPositions.current, "DOWN")
      .then((positions) => {
        if (!active) return;
        previousPositions.current = positions;
        setPositionedNodes(data.nodes.map((node) => ({
          id: node.id,
          type: "traceCard",
          width: flowNodeWidth(node.kind),
          height: 62,
          position: positions.get(node.id) ?? { x: 0, y: 0 },
          focusable: true,
          ariaLabel: `${node.kind} ${node.name}: ${node.count} runs in ${node.traces} traces, ${node.errors} errors, median latency ${formatDuration(node.p50LatencyMs)}`,
          data: { aggregate: true, kind: node.kind, vertical: true, name: node.name, count: node.count, traces: node.traces, errors: node.errors, p50LatencyMs: node.p50LatencyMs },
        } as CanvasNode)));
      });
    return () => { active = false; };
  }, [data, laidOutEdges]);

  const nodes: CanvasNode[] = useMemo(() => positionedNodes.map((node) => {
    const related = displayedEdges.some((edge) => (edge.source === hover && edge.target === node.id) || (edge.target === hover && edge.source === node.id));
    const activeNode = hover === node.id || related || selectedNode === node.id;
    return { ...node, selected: selectedNode === node.id, style: { ...node.style, opacity: (hover || selectedNode) && !activeNode ? 0.28 : 1 }, data: { ...node.data, onActivate: () => selectNode(node) } };
  }), [positionedNodes, displayedEdges, hover, selectedNode, selectNode]);
  const positionsById = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node.position])), [positionedNodes]);

  const edges: CanvasEdge[] = useMemo(() => displayedEdges.map((edge) => {
    const id = edge.id;
    const active = hover === edge.source || hover === edge.target || hover === id || selectedEdge?.source === edge.source && selectedEdge.target === edge.target;
    const dim = Boolean(hover || selectedNode || selectedEdge) && !active && selectedNode !== edge.source && selectedNode !== edge.target;
    const loop = (positionsById.get(edge.target)?.y ?? 0) <= (positionsById.get(edge.source)?.y ?? 0);
    return {
      id, source: edge.source, target: edge.target,
      ...flowEdgePresentation(edge, loop),
      focusable: true,
      ariaLabel: `${stepLabel(edge.source)} to ${stepLabel(edge.target)}: ${edge.count + (edge.back ?? 0)} calls in ${edge.traces} traces, ${(edge.errorRate * 100).toFixed(0)} percent failed, median latency ${formatDuration(edge.p50LatencyMs)}`,
      style: { ...flowEdgePresentation(edge, loop).style, opacity: dim ? 0.12 : 1 },

    };
  }), [displayedEdges, hover, selectedNode, selectedEdge, positionsById]);

  const nodeById = useMemo(() => new Map((data?.nodes ?? []).map((node) => [node.id, node])), [data?.nodes]);
  const searchTarget = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const candidates = data?.nodes ?? [];
    return candidates.find((node) => node.name.toLowerCase() === q)
      ?? candidates.find((node) => `${node.name} ${node.kind}`.toLowerCase().includes(q)) ?? null;
  }, [search, data?.nodes]);
  const searchFocus = () => { if (searchTarget) onViewStateChange(`node:${searchTarget.id}`, edgeLimit); };

  if (current?.error) {
    return <div role="alert" className="my-6 border border-[#5A2A2A] bg-[#1E1314] p-4 text-sm"><p className="font-medium text-[#FF8A8A]">{current.error}</p><button type="button" className="mt-3 border border-[#5A2A2A] px-3 py-1.5 text-xs hover:bg-[#2A1A1C]" onClick={() => { setState(null); setAttempt((value) => value + 1); }}>Try again</button></div>;
  }
  if (!data) return <p className="my-6 text-sm text-[#8B93A1]">Loading the agent map…</p>;
  if (!data.nodes.length) return <div className="my-10"><EmptyNotice art="filtered" title="No steps in this range" description="The map shows steps of the selected trace name that match your filters. Try a wider range or fewer filters." /></div>;

  const selected = selectedNode ? nodeById.get(selectedNode) : null;
  return (
    <div className={`flex flex-col gap-3 py-3 ${current ? "" : "opacity-60"}`} aria-busy={!current}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8B93A1]">
        <p><span className="font-mono">{data.nodes.length}</span>{data.totalNodes > data.nodes.length ? ` of ${compactNumber(data.totalNodes)}` : ""} steps · <span className="font-mono">{displayedEdges.length}</span> arrows visible, {visibleEdges.length} max (busiest first)</p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="map-edge-limit">Busiest arrows</label>
          <select id="map-edge-limit" aria-label="Number of busiest arrows" value={edgeLimit} onChange={(event) => onViewStateChange(mapSelected, Number(event.target.value))} className="h-7 border border-[#262C35] bg-[#111418] px-2 font-mono text-xs text-[#C9CED6]">
            {EDGE_LIMITS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <label htmlFor="agent-map-search" className="sr-only">Search steps</label>
          <input id="agent-map-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchFocus(); }} list="agent-map-names" placeholder="Find step" className="h-7 w-36 border border-[#262C35] bg-[#111418] px-2 text-xs text-[#E6E9EE] outline-none placeholder:text-[#6B7380] focus:border-[#4A5260]" />
          <datalist id="agent-map-names">{data.nodes.map((node) => <option key={node.id} value={node.name} />)}</datalist>
          <button type="button" onClick={searchFocus} disabled={!searchTarget} className="h-7 border border-[#262C35] px-2 text-xs text-[#C9CED6] hover:bg-[#1A1F27] disabled:opacity-40">Find</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-[#8B93A1]"><span className="flex items-center gap-1"><span className="size-2 bg-[#F4D44D]" />model</span><span className="flex items-center gap-1"><span className="size-2 bg-[#8AB4FF]" />tool</span><span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-[#FF6B6B]" />arrow with failures</span></div>
      <div className="h-[min(62vh,620px)] min-h-[330px] w-full">
        <TraceCanvas nodes={nodes} edges={edges} nodeTypes={NODE_TYPES} focusId={searchTarget?.id ?? selectedNode} label="Agent map"
          onNodeClick={selectNode} onNodeMouseEnter={(node) => setHover(node.id)} onNodeMouseLeave={() => setHover(null)}
          onEdgeClick={chooseEdge} onEdgeMouseEnter={() => setHover(null)} onEdgeMouseLeave={() => setHover(null)}
          onEscape={() => { onViewStateChange(null, edgeLimit);  }}>
          <div className="pointer-events-none absolute right-3 top-3 z-10 max-w-[min(310px,calc(100%-1.5rem))]">
            {selected ? <div className="pointer-events-auto border border-[#262C35] bg-[#111418]/95 p-3 shadow-xl">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-[#E6E9EE]">{selected.name}</p><p className="mt-1 font-mono text-[10px] text-[#8B93A1]">{compactNumber(selected.count)} runs · {compactNumber(selected.traces)} traces</p></div><button type="button" aria-label="Clear selected step" className="text-[#8B93A1] hover:text-white" onClick={() => onViewStateChange(null, edgeLimit)}>×</button></div>
              <p className="mt-2 font-mono text-[10px] text-[#8B93A1]">{selected.errors} errors · {selected.count ? ((selected.errors / selected.count) * 100).toFixed(1) : "0.0"}% error rate · median {formatDuration(selected.p50LatencyMs)}</p>
              <button type="button" className="mt-3 w-full bg-[#F4D44D] px-3 py-1.5 text-xs font-medium text-[#0B0D10]" onClick={() => onNode(selected.id)}>Show traces</button>
            </div> : null}
            {selectedEdge ? <div className="pointer-events-auto mt-2 border border-[#262C35] bg-[#111418]/95 p-3 shadow-xl">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs text-[#E6E9EE]">{stepLabel(selectedEdge.source)} → {stepLabel(selectedEdge.target)}</p><p className="mt-1 font-mono text-[10px] text-[#8B93A1]">{compactNumber(selectedEdge.count + (selectedEdge.back ?? 0))} calls · {compactNumber(selectedEdge.traces)} traces</p></div><button type="button" aria-label="Close selected arrow details" className="text-[#8B93A1] hover:text-white" onClick={() => onViewStateChange(null, edgeLimit)}>×</button></div>
              <p className="mt-2 font-mono text-[10px] text-[#8B93A1]">{selectedEdge.errors} errors · {(selectedEdge.errorRate * 100).toFixed(1)}% failed · median {formatDuration(selectedEdge.p50LatencyMs)}</p>
              <button type="button" className="mt-3 w-full border border-[#262C35] px-3 py-1.5 text-xs text-[#E6E9EE] hover:bg-[#1A1F27]" onClick={() => onEdge(selectedEdge.source, selectedEdge.target)}>Show traces</button>
            </div> : null}
          </div>
        </TraceCanvas>
      </div>
      {data.totalEdges > visibleEdges.length || displayedEdges.length < visibleEdges.length ? <p className="text-[11px] text-[#6B7380]">Showing {displayedEdges.length} of the busiest {visibleEdges.length} selected arrows out of {compactNumber(data.totalEdges)}. Increase the limit to reveal more.</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm"><caption className="mb-2 text-left text-xs text-[#8B93A1]">Arrows, busiest first</caption>
          <thead><tr className="text-left text-xs text-[#8B93A1]"><th scope="col" className="border-b border-[#1F242C] px-3 py-2 font-medium">From → to</th><th scope="col" className="border-b border-[#1F242C] px-3 py-2 font-medium">Times</th><th scope="col" className="border-b border-[#1F242C] px-3 py-2 font-medium">Traces</th><th scope="col" className="border-b border-[#1F242C] px-3 py-2 font-medium">Failed</th><th scope="col" className="border-b border-[#1F242C] px-3 py-2 font-medium">Median latency</th></tr></thead>
          <tbody>{data.edges.map((edge) => <tr key={`${edge.source}→${edge.target}`} className="hover:bg-[#12161C]"><td className="max-w-[320px] truncate border-b border-[#171B21] px-3 py-2"><button type="button" className="truncate text-left text-[#8AB4FF] hover:underline" onClick={() => onEdge(edge.source, edge.target)}>{stepLabel(edge.source)} → {stepLabel(edge.target)}</button></td><td className="border-b border-[#171B21] px-3 py-2 font-mono text-xs">{compactNumber(edge.count + (edge.back ?? 0))}{edge.back ? " ↕" : ""}</td><td className="border-b border-[#171B21] px-3 py-2 font-mono text-xs">{compactNumber(edge.traces)}</td><td className={`border-b border-[#171B21] px-3 py-2 font-mono text-xs ${edge.errorRate > 0 ? "text-[#FF8A8A]" : "text-[#8B93A1]"}`}>{(edge.errorRate * 100).toFixed(edge.errorRate && edge.errorRate < 0.1 ? 1 : 0)}%</td><td className="border-b border-[#171B21] px-3 py-2 font-mono text-xs">{formatDuration(edge.p50LatencyMs)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
