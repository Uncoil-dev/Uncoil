"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildSpanTree, type SpanTreeNode } from "@/lib/tracify-ports/treeBuilding";
import { chatMessages, compactNumber, downloadFile, formatCost, formatDuration, formatTime, parsePayload } from "./format";
import { AskAiPanel } from "./ask-ai-panel";
import { ScoreRunButton } from "../scores/score-run-button";
import { stepKind, TraceGraph, TraceTimeline, TypeIcon } from "./trace-views";

type Span = {
  spanId: string; parentSpanId: string; spanType: string; createdAt: string; latencyMs: number; costUsd: number;
  modelId?: string; toolName?: string; traceName?: string; input?: string; output?: string; metadata?: string;
  inputTokens?: number; outputTokens?: number; ttftMs?: number; retryCount?: number; errorType?: string; errorMessage?: string;
  environment?: string; release?: string; promptVersionId?: string; endUserId?: string; sessionId?: string; tags?: string[];
  stackTrace?: string; timedOut?: boolean;
};
type Summary = { traceName: string; durationMs: number; totalCostUsd: number; inputTokens: number; outputTokens: number; endUserId: string; sessionId: string; tags: string[]; errorCount: number } | undefined;

const STEP_FILTERS = [
  { id: "all", label: "All" }, { id: "llm", label: "LLM" }, { id: "tool", label: "Tools" }, { id: "error", label: "Errors" },
] as const;
type StepFilter = (typeof STEP_FILTERS)[number]["id"];

export const TRACE_VIEWS = [{ id: "tree", label: "Tree" }, { id: "timeline", label: "Timeline" }, { id: "graph", label: "Graph" }] as const;
export type TraceView = (typeof TRACE_VIEWS)[number]["id"];

function isFailed(span: Pick<Span, "spanType" | "errorType">) {
  return span.spanType === "error" || Boolean(span.errorType);
}

function matchesFilter(span: Span, filter: StepFilter) {
  const type = stepKind(span.spanType);
  if (filter === "error") return isFailed(span);
  if (filter === "llm") return type === "llm";
  if (filter === "tool") return type === "tool" || type === "retrieval";
  return true;
}

function earliestFailedId(list: Span[]) {
  return list.filter(isFailed).sort((x, y) => toIso(x.createdAt).localeCompare(toIso(y.createdAt)))[0]?.spanId ?? null;
}

function spanName(span: Span) {
  return span.toolName || span.modelId || span.traceName || span.spanType || "span";
}

export function TracePanel({ projectId, runId, summary, view, onView, onClose, onFilter, onStep, initialStepId }: {
  initialStepId?: string; projectId: string; runId: string; summary: Summary; view: TraceView; onView: (view: TraceView) => void;
  onClose: () => void; onFilter: (key: string, value: string) => void; onStep: (delta: number) => void;
}) {
  const [spans, setSpans] = useState<Span[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialStepId ?? null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stepFilter, setStepFilter] = useState<StepFilter>("all");
  const [stepSearch, setStepSearch] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [side, setSide] = useState<"step" | "ask">("step");

  useEffect(() => {
    let live = true;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/spans${attempt ? "?refresh=manual" : ""}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
        return body as { spans: Span[]; unavailable?: boolean };
      })
      .then((body) => {
        if (!live) return;
        if (body.unavailable && !body.spans.length) throw new Error("Step data is temporarily unavailable.");
        setSpans(body.spans);
        setSelectedId((current) => current ?? earliestFailedId(body.spans) ?? body.spans[0]?.spanId ?? null);
      })
      .catch((reason: unknown) => live && setError(reason instanceof Error ? reason.message : "Could not load this trace"));
    return () => { live = false; };
  }, [projectId, runId, attempt]);

  // Live updates: a trace can keep gaining spans after it is opened. Poll with live=1 (the server skips its
  // Convex auth and cache work after a recent read) and only re-render when something changed. The interval
  // starts at 3s, doubles up to 30s while nothing changes or a poll fails, and drops back when spans arrive.
  useEffect(() => {
    const url = `/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/spans?refresh=manual&live=1`;
    const signature = (list: Span[]) => `${list.length}:${list.reduce((sum, span) => sum + Number(span.latencyMs ?? 0), 0)}`;
    let delay = 3000;
    let lastSignature: string | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          const body = response.ok ? ((await response.json()) as { spans?: Span[] }) : null;
          const next = body?.spans;
          if (next?.length) {
            const nextSignature = signature(next);
            const changed = nextSignature !== lastSignature;
            lastSignature = nextSignature;
            if (changed) setSpans(next);
            setError(null);
            delay = changed ? 3000 : Math.min(delay * 2, 30_000);
          } else {
            delay = Math.min(delay * 2, 30_000);
          }
        } catch {
          delay = Math.min(delay * 2, 30_000);
        }
      }
      if (!stopped) timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => { stopped = true; clearTimeout(timer); };
  }, [projectId, runId]);

  const bySpanId = useMemo(() => new Map((spans ?? []).map((span) => [span.spanId, span])), [spans]);
  const tree = useMemo(() => buildSpanTree((spans ?? []).map((span) => ({
    spanId: span.spanId, parentSpanId: span.parentSpanId && bySpanId.has(span.parentSpanId) ? span.parentSpanId : "",
    spanType: span.spanType, name: spanName(span), createdAt: toIso(span.createdAt), latencyMs: Number(span.latencyMs ?? 0),
    costUsd: Number(span.costUsd ?? 0), modelId: span.modelId, toolName: span.toolName,
  }))), [spans, bySpanId]);

  const rows = useMemo(() => {
    const out: SpanTreeNode[] = [];
    const stack = [...tree.roots].reverse();
    while (stack.length) {
      const node = stack.pop()!;
      out.push(node);
      if (!collapsed.has(node.id)) for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]!);
    }
    return out;
  }, [tree, collapsed]);

  const filtering = stepFilter !== "all" || stepSearch.trim() !== "";
  const visibleRows = useMemo(() => {
    if (!filtering) return rows;
    const needle = stepSearch.trim().toLowerCase();
    const all: SpanTreeNode[] = [];
    const stack = [...tree.roots].reverse();
    while (stack.length) {
      const node = stack.pop()!;
      all.push(node);
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]!);
    }
    return all.filter((node) => {
      const span = bySpanId.get(node.id);
      if (!span || !matchesFilter(span, stepFilter)) return false;
      if (!needle) return true;
      return [node.name, span.spanType, span.toolName, span.modelId, span.input, span.output, span.errorMessage]
        .some((value) => typeof value === "string" && value.toLowerCase().includes(needle));
    });
  }, [filtering, rows, tree, bySpanId, stepFilter, stepSearch]);
  const counts = useMemo(() => Object.fromEntries(STEP_FILTERS.map((filter) => [filter.id, (spans ?? []).filter((span) => matchesFilter(span, filter.id)).length])) as Record<StepFilter, number>, [spans]);
  // Earliest failing step by start time.
  const firstErrorId = useMemo(() => earliestFailedId(spans ?? []), [spans]);
  const firstError = firstErrorId ? bySpanId.get(firstErrorId) : undefined;

  // When a trace opens on its failing step, bring that step into view once (not on every live update).
  const scrolledToFailure = useRef(false);
  useEffect(() => {
    if (scrolledToFailure.current || !spans?.length) return;
    scrolledToFailure.current = true;
    if (!firstErrorId || selectedId !== firstErrorId) return;
    requestAnimationFrame(() => document.getElementById(`${view === "tree" ? "step" : view}-${firstErrorId}`)?.scrollIntoView({ block: "center", inline: "center" }));
  }, [spans, firstErrorId, selectedId, view]);

  const totalMs = Math.max(1, ...tree.roots.map((root) => root.subtreeWallClockDurationMs));
  const selected = selectedId ? bySpanId.get(selectedId) : undefined;
  const name = summary?.traceName || spans?.find((span) => span.traceName)?.traceName || "Trace";
  const tokens = summary ? Number(summary.inputTokens) + Number(summary.outputTokens) : (spans ?? []).reduce((sum, span) => sum + Number(span.inputTokens ?? 0) + Number(span.outputTokens ?? 0), 0);
  const cost = summary?.totalCostUsd ?? (spans ?? []).reduce((sum, span) => sum + Number(span.costUsd ?? 0), 0);
  const firstWithUser = spans?.find((span) => span.endUserId);
  const firstWithSession = spans?.find((span) => span.sessionId);
  const user = summary?.endUserId || firstWithUser?.endUserId || "";
  const session = summary?.sessionId || firstWithSession?.sessionId || "";

  function setAllCollapsed(collapse: boolean) {
    setCollapsed(collapse ? new Set((spans ?? []).filter((span) => (spans ?? []).some((child) => child.parentSpanId === span.spanId)).map((span) => span.spanId)) : new Set());
  }

  function jumpToError() {
    const target = firstErrorId;
    if (!target) return;
    setCollapsed(new Set());
    setStepFilter("all");
    setStepSearch("");
    setSelectedId(target);
    requestAnimationFrame(() => document.getElementById(`${view === "tree" ? "step" : view}-${target}`)?.scrollIntoView({ block: "center", inline: "center" }));
  }

  function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("trace", runId);
    void navigator.clipboard?.writeText(url.toString());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1200);
  }

  function downloadJson() {
    const body = JSON.stringify({ runId, summary: summary ?? null, spans: (spans ?? []).map((span) => ({ ...span, input: parsePayload(span.input), output: parsePayload(span.output), metadata: parsePayload(span.metadata) })) }, null, 2);
    downloadFile(`trace-${runId.replace(/[^\w.-]+/g, "_").slice(0, 80)}.json`, body, "application/json");
  }

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const toolButton = "h-7 rounded-md border border-[#262C35] px-2 text-xs text-[#C9CED6] hover:border-[#4A5260]";
  return (
    <aside aria-label="Trace detail" className="fixed inset-0 z-40 flex min-w-0 flex-col border-l border-[#1F242C] bg-[#0E1115] font-[family-name:var(--font-geist-sans)] text-[13px] shadow-[-24px_0_48px_rgba(0,0,0,0.45)] lg:left-auto lg:w-[min(1180px,84vw)]">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[#1F242C] px-3 py-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</h2>
        <button type="button" onClick={() => setSide("ask")} className="h-7 rounded-md bg-[#F4D44D] px-2.5 text-xs font-medium text-[#0B0D10] hover:bg-[#F7DC6B]">Ask AI</button>
        <ScoreRunButton projectId={projectId} traceId={runId} className={toolButton} />
        <button type="button" onClick={copyLink} className={toolButton}>{linkCopied ? "Link copied" : "Copy link"}</button>
        <button type="button" onClick={downloadJson} disabled={!spans?.length} className={`${toolButton} disabled:opacity-40`}>JSON</button>
        <button type="button" aria-label="Previous trace" onClick={() => onStep(-1)} className="h-7 w-7 rounded-md border border-[#262C35] hover:border-[#4A5260]">↑</button>
        <button type="button" aria-label="Next trace" onClick={() => onStep(1)} className="h-7 w-7 rounded-md border border-[#262C35] hover:border-[#4A5260]">↓</button>
        <button type="button" aria-label="Close trace" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#262C35] hover:border-[#4A5260]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#1F242C] px-3 py-1.5 font-mono text-[11px] text-[#C9CED6]">
        <button type="button" className="text-[#8B93A1] hover:text-white" onClick={() => { void navigator.clipboard?.writeText(runId); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
          {copied ? "copied" : `${runId.slice(0, 16)}… copy`}
        </button>
        <span>{formatDuration(summary?.durationMs ?? totalMs)}</span>
        <span>{formatCost(cost)}</span>
        <span>{compactNumber(tokens)} tokens</span>
        {spans ? <span>{spans.length} step{spans.length === 1 ? "" : "s"}</span> : null}
        {counts.error ? <button type="button" onClick={jumpToError} className="rounded bg-[#3A1C1F] px-1.5 py-0.5 text-[#FF8A8A] hover:bg-[#4A2226]">{counts.error} error{counts.error === 1 ? "" : "s"} · jump</button> : null}
        {user ? <button type="button" className="text-[#8AB4FF] hover:underline" onClick={() => onFilter("endUserId", user)}>user: {user}</button> : null}
        {session ? <button type="button" className="text-[#8AB4FF] hover:underline" onClick={() => onFilter("sessionId", session)}>session: {session}</button> : null}
        {(summary?.tags ?? []).map((tag) => <button key={tag} type="button" className="rounded bg-[#1A1F27] px-1.5 py-0.5 hover:bg-[#232A34]" onClick={() => onFilter("tag", tag)}>{tag}</button>)}
      </div>

      {firstError ? (
        <div role="status" className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#5A2A2A] bg-[#1E1314] px-3 py-2 text-xs">
          <span className="rounded bg-[#3A1C1F] px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-[#FF8A8A]">{counts.error > 1 ? `Failed · first of ${counts.error}` : "Failed"}</span>
          <span className="font-medium text-[#FFB4B4]">{spanName(firstError)}</span>
          {firstError.errorType ? <span className="font-mono text-[#FF8A8A]">{firstError.errorType}</span> : null}
          {firstError.errorMessage ? <span className="min-w-0 flex-1 truncate text-[#E6C3C3]" title={firstError.errorMessage}>{firstError.errorMessage}</span> : <span className="flex-1" />}
          <button type="button" onClick={jumpToError} disabled={selectedId === firstErrorId} className="h-6 rounded-md border border-[#5A2A2A] px-2 text-[#FFB4B4] hover:bg-[#2A1719] disabled:opacity-50">{selectedId === firstErrorId ? "Showing" : "Show failing step"}</button>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="m-4 rounded-lg border border-[#5A2A2A] bg-[#1E1314] p-4 text-sm">
          <p className="text-[#FF8A8A]">{error}</p>
          <button type="button" className="mt-3 rounded-md border border-[#5A2A2A] px-3 py-1.5 text-xs" onClick={() => { setError(null); setSpans(null); setAttempt((value) => value + 1); }}>Try again</button>
        </div>
      ) : spans === null ? (
        <p className="p-4 text-sm text-[#8B93A1]">Loading steps…</p>
      ) : spans.length === 0 ? (
        <p className="p-4 text-sm text-[#8B93A1]">This trace has no recorded steps yet.</p>
      ) : (
        // Two panes that each scroll on their own: steps (tree, timeline or graph) and the selected step's detail.
        // Phones stack them, with the steps pane capped so the detail is always reachable.
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,48%)_minmax(0,1fr)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:grid-rows-1">
          <div className="flex min-h-0 min-w-0 flex-col border-b border-[#1F242C] md:border-b-0 md:border-r">
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[#1F242C] px-2 py-1.5">
              <div role="tablist" aria-label="Trace view" className="flex rounded-md border border-[#262C35] p-0.5 text-xs">
                {TRACE_VIEWS.map((item) => (
                  <button key={item.id} type="button" role="tab" aria-selected={view === item.id} aria-controls="trace-view" onClick={() => onView(item.id)}
                    className={`rounded px-2 py-0.5 ${view === item.id ? "bg-[#F4D44D] font-medium text-[#0B0D10]" : "text-[#8B93A1] hover:text-white"}`}>{item.label}</button>
                ))}
              </div>
              <label htmlFor="step-search" className="sr-only">Search steps</label>
              <input id="step-search" value={stepSearch} onChange={(event) => setStepSearch(event.target.value)} placeholder="Search steps"
                className="h-7 min-w-[90px] flex-1 rounded-md border border-[#262C35] bg-[#111418] px-2 text-xs outline-none placeholder:text-[#6B7380] focus:border-[#4A5260]" />
              <div role="group" aria-label="Step type" className="flex rounded-md border border-[#262C35] p-0.5 text-xs">
                {STEP_FILTERS.map((filter) => (
                  <button key={filter.id} type="button" aria-pressed={stepFilter === filter.id} onClick={() => setStepFilter(filter.id)}
                    disabled={filter.id !== "all" && !counts[filter.id]}
                    className={`rounded px-1.5 py-0.5 disabled:opacity-40 ${stepFilter === filter.id ? "bg-[#232A34] text-white" : "text-[#8B93A1] hover:text-white"}`}>
                    {filter.label} <span className="font-mono text-[10px] text-[#6B7380]">{counts[filter.id]}</span>
                  </button>
                ))}
              </div>
              <button type="button" aria-label="Expand all" title="Expand all" onClick={() => setAllCollapsed(false)} disabled={filtering || view === "graph"} className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B93A1] hover:bg-[#1A1F27] hover:text-white disabled:opacity-30">
                <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6l4-3 4 3M4 10l4 3 4-3" /></svg>
              </button>
              <button type="button" aria-label="Collapse all" title="Collapse all" onClick={() => setAllCollapsed(true)} disabled={filtering || view === "graph"} className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B93A1] hover:bg-[#1A1F27] hover:text-white disabled:opacity-30">
                <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 3l4 3 4-3M4 13l4-3 4 3" /></svg>
              </button>
            </div>
            <div id="trace-view" role="tabpanel" aria-label={`${TRACE_VIEWS.find((item) => item.id === view)!.label} view`} className={`min-h-0 flex-1 ${view === "tree" ? "overflow-auto" : "overflow-hidden"}`}>
              {view === "timeline" ? (
                <TraceTimeline rows={visibleRows} spans={bySpanId} totalMs={totalMs} selectedId={selectedId} isFailed={isFailed} onSelect={setSelectedId} />
              ) : view === "graph" ? (
                <TraceGraph roots={tree.roots} spans={bySpanId} selectedId={selectedId} isFailed={isFailed} onSelect={setSelectedId} />
              ) : (
                <ol aria-label="Steps" className="py-1">
                  {visibleRows.length === 0 ? <li className="px-4 py-3 text-sm text-[#8B93A1]">No steps match.</li> : null}
                  {visibleRows.map((node) => {
                    const span = bySpanId.get(node.id)!;
                    const failed = isFailed(span);
                    const depth = filtering ? 0 : node.depth;
                    const tokenCount = Number(span.inputTokens) + Number(span.outputTokens);
                    return (
                      <li key={node.id} id={`step-${node.id}`}>
                        <div className={`relative flex items-start pr-2 ${selectedId === node.id ? "bg-[#161B22] shadow-[inset_3px_0_0_#F4D44D]" : "hover:bg-[#12161C]"}`} style={{ paddingLeft: 6 + depth * 14 }}>
                          {Array.from({ length: depth }, (_, level) => <span key={level} aria-hidden="true" className="absolute inset-y-0 border-l border-[#1F242C]" style={{ left: 14 + level * 14 }} />)}
                          {node.children.length && !filtering ? (
                            <button type="button" aria-label={collapsed.has(node.id) ? "Expand" : "Collapse"} aria-expanded={!collapsed.has(node.id)} onClick={() => toggle(node.id)} className="mt-1 h-5 w-4 shrink-0 text-[10px] text-[#6B7380] hover:text-white">{collapsed.has(node.id) ? "▸" : "▾"}</button>
                          ) : <span className="w-4 shrink-0" />}
                          <button type="button" onClick={() => setSelectedId(node.id)} className="flex min-w-0 flex-1 flex-col py-1 pl-1 text-left">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <TypeIcon type={span.spanType} failed={failed} size={13} />
                              <span className={`truncate ${failed ? "text-[#FF8A8A]" : "text-[#E6E9EE]"}`}>{node.name}</span>
                              <span className="sr-only">{(span.spanType || "span").toLowerCase()}</span>
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-2 pl-[19px] font-mono text-[11px] text-[#8B93A1]">
                              <span>{formatDuration(span.latencyMs)}</span>
                              {Number(span.costUsd) ? <span>{formatCost(Number(span.costUsd))}</span> : null}
                              {tokenCount ? <span>{compactNumber(tokenCount)} tok</span> : null}
                              {failed && span.errorType ? <span className="truncate text-[#FF8A8A]">{span.errorType}</span> : null}
                            </span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col">
            <div role="tablist" aria-label="Side panel" className="flex shrink-0 gap-1 border-b border-[#1F242C] px-2 py-1.5 text-xs">
              {([["step", "Step"], ["ask", "Ask AI"]] as const).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={side === id} onClick={() => setSide(id)}
                  className={`rounded px-2.5 py-1 ${side === id ? "bg-[#232A34] font-medium text-white" : "text-[#8B93A1] hover:text-white"}`}>{label}</button>
              ))}
            </div>
            {side === "ask" ? (
              <div className="min-h-0 flex-1 overflow-hidden"><AskAiPanel projectId={projectId} runId={runId} spans={spans} onSelectStep={(id) => { setCollapsed(new Set()); setStepFilter("all"); setStepSearch(""); setSelectedId(id); requestAnimationFrame(() => document.getElementById(`${view === "tree" ? "step" : view}-${id}`)?.scrollIntoView({ block: "center", inline: "center" })); }} /></div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto p-4">{selected ? <StepDetail span={selected} /> : null}</div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function toIso(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
}

function StepDetail({ span }: { span: Span }) {
  const [raw, setRaw] = useState(false);
  const failed = span.spanType === "error" || Boolean(span.errorType);
  const attributes: Array<[string, string]> = [
    ["Type", span.spanType], ["Started", formatTime(span.createdAt)], ["Latency", formatDuration(span.latencyMs)],
    ["Time to first token", span.ttftMs ? formatDuration(span.ttftMs) : ""], ["Model", span.modelId ?? ""], ["Tool", span.toolName ?? ""],
    ["Input tokens", span.inputTokens ? String(span.inputTokens) : ""], ["Output tokens", span.outputTokens ? String(span.outputTokens) : ""],
    ["Cost", Number(span.costUsd) ? formatCost(Number(span.costUsd)) : ""], ["Retries", span.retryCount ? String(span.retryCount) : ""],
    ["Prompt version", span.promptVersionId ?? ""], ["Environment", span.environment ?? ""], ["Release", span.release ?? ""], ["Span id", span.spanId],
  ].filter(([, value]) => value) as Array<[string, string]>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="truncate text-sm font-semibold">{spanName(span)}</h3>
        <div role="group" aria-label="Display" className="flex rounded-md border border-[#262C35] p-0.5 text-xs">
          <button type="button" aria-pressed={!raw} onClick={() => setRaw(false)} className={`rounded px-2 py-1 ${!raw ? "bg-[#232A34] text-white" : "text-[#8B93A1]"}`}>Formatted</button>
          <button type="button" aria-pressed={raw} onClick={() => setRaw(true)} className={`rounded px-2 py-1 ${raw ? "bg-[#232A34] text-white" : "text-[#8B93A1]"}`}>Raw</button>
        </div>
      </div>
      {failed ? (
        <div role="alert" className="rounded-lg border border-[#5A2A2A] bg-[#1E1314] p-3 text-sm">
          <p className="font-medium text-[#FF8A8A]">{span.errorType || "Error"}{span.timedOut ? " · timed out" : ""}</p>
          {span.errorMessage ? <p className="mt-1 text-[#E6C3C3]">{span.errorMessage}</p> : null}
          {span.stackTrace ? <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-[#C9A0A0]">{span.stackTrace}</pre> : null}
        </div>
      ) : null}
      <Payload title="Input" raw={raw} value={span.input} />
      <Payload title="Output" raw={raw} value={span.output} />
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8B93A1]">Attributes</h4>
        <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {attributes.map(([key, value]) => <div key={key} className="contents"><dt className="text-[#8B93A1]">{key}</dt><dd className="truncate font-mono text-xs leading-5">{value}</dd></div>)}
        </dl>
      </section>
      {span.metadata && span.metadata !== "{}" ? <Payload title="Metadata" raw={raw} value={span.metadata} /> : null}
    </div>
  );
}

function Payload({ title, value, raw }: { title: string; value?: string; raw: boolean }) {
  const [copied, setCopied] = useState(false);
  const parsed = parsePayload(value);
  const messages = raw ? null : chatMessages(parsed);
  const empty = parsed === "" || parsed === null || (typeof parsed === "object" && parsed !== null && !Object.keys(parsed).length);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[#8B93A1]">{title}</h4>
        {!empty ? <button type="button" onClick={() => { void navigator.clipboard?.writeText(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="text-xs text-[#8B93A1] hover:text-white" aria-label={`Copy ${title.toLowerCase()}`}>{copied ? "Copied" : "Copy"}</button> : null}
      </div>
      {empty ? <p className="text-sm text-[#4A5260]">Nothing recorded</p> : messages ? (
        <div className="flex flex-col gap-2">
          {messages.map((message, index) => (
            <div key={index} className={`rounded-lg border p-3 ${message.role === "assistant" ? "border-[#3A3420] bg-[#16140C]" : "border-[#1F242C] bg-[#111418]"}`}>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-[#8B93A1]">{message.role}</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-[#1F242C] bg-[#111418] p-3 font-mono text-xs leading-5 text-[#C9CED6]">
          {raw ? value : typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </section>
  );
}
