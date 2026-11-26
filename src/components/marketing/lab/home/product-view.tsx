"use client";

import { useMemo, useState } from "react";
import { TraceTimeline, type ViewSpan } from "@/components/dashboard/tracing/trace-views";
import { formatCost, formatDuration } from "@/components/dashboard/tracing/format";
import { buildSpanTree, type SpanTreeNode } from "@/lib/uncoil-ports/treeBuilding";
import { SUGGESTED_QUESTIONS } from "@/lib/ask-ai";
import { RUN_A, RUN_B, totalCost, type ExampleSpan } from "./run-data";

// The product's trace view uses its own step colours. Inside this page's frame they map onto the
// page palette: tools and agents in cream, model calls stay yellow, the failed step stays red.
const SKIN = `
.uc-frame [style*="rgb(138, 180, 255)"],.uc-frame [style*="rgb(124, 245, 200)"],.uc-frame [style*="rgb(201, 206, 214)"],.uc-frame [style*="#8AB4FF" i],.uc-frame [style*="#7CF5C8" i],.uc-frame [style*="#C9CED6" i]{background:#eceae3!important}
.uc-frame [style*="rgb(255, 107, 107)"],.uc-frame [style*="#FF6B6B" i]{background:#ff4d3d!important}
.uc-frame svg[stroke="#8AB4FF"],.uc-frame svg[stroke="#7CF5C8"],.uc-frame svg[stroke="#C9CED6"]{stroke:#eceae3}
.uc-frame svg[stroke="#FF6B6B"]{stroke:#ff4d3d}
.uc-frame .text-\\[\\#FF8A8A\\]{color:#ff4d3d}
.uc-frame .bg-\\[\\#0E1115\\],.uc-frame .bg-\\[\\#111418\\]{background:#090909}
.uc-frame .bg-\\[\\#161B22\\],.uc-frame .bg-\\[\\#12161C\\],.uc-frame .hover\\:bg-\\[\\#12161C\\]:hover,.uc-frame .group:hover .group-hover\\:bg-\\[\\#12161C\\]{background:#1a1a18}
.uc-frame .border-\\[\\#1F242C\\],.uc-frame .border-\\[\\#171B21\\],.uc-frame .border-\\[\\#262C35\\]{border-color:rgba(236,234,227,.14)}
.uc-frame .rounded-\\[3px\\],.uc-frame .rounded-md,.uc-frame .rounded{border-radius:0}
@media (max-width:767px){
.uc-frame ol[aria-label="Timeline"]>li>button{height:44px}
.uc-frame ol[aria-label="Timeline"]>li>button>span>span{top:12px}
.uc-frame [aria-label="Zoom"] button{min-width:44px;min-height:44px}
}
`;

const usd = (n: number) => `$${n.toFixed(2)}`;

function useRun(run: readonly ExampleSpan[]) {
  return useMemo(() => {
    const { roots } = buildSpanTree(run.map((s) => ({ ...s })));
    const rows: SpanTreeNode[] = [];
    const walk = (n: SpanTreeNode) => {
      rows.push(n);
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    const spans = new Map<string, ViewSpan>(run.map((s) => [s.spanId, s]));
    const byId = new Map(run.map((s) => [s.spanId, s]));
    return { rows, spans, byId, totalMs: run[0].latencyMs };
  }, [run]);
}

const failed = (s: ViewSpan) => Boolean(s.errorType);

function TitleBar({ crumbs, status, bad }: { crumbs: string; status: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eceae3]/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#eceae3]/60">
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="flex gap-1">
          <span className="size-2 bg-[#eceae3]/30" />
          <span className="size-2 bg-[#eceae3]/30" />
          <span className="size-2 bg-[#eceae3]/30" />
        </span>
        <span className="truncate">{crumbs}</span>
      </span>
      <span className={`flex shrink-0 items-center gap-2 ${bad ? "text-[#eceae3]" : "text-[#f4d44d]"}`}>
        <span className={`size-2 ${bad ? "bg-[#ff4d3d]" : "bg-[#f4d44d]"}`} aria-hidden="true" />
        {status}
      </span>
    </div>
  );
}

/** The trace view from the dashboard, drawing run A. Click any step to read it. */
export function TraceWindow() {
  const { rows, spans, byId, totalMs } = useRun(RUN_A);
  const [selected, setSelected] = useState("a-search");
  const step = byId.get(selected)!;
  const fields: [string, string, boolean?][] = [
    ["Input", step.detail.input],
    ["Output", step.detail.output, selected === "a-search" || Boolean(step.errorType)],
    ["Model", step.detail.model ?? "none · tool call"],
    ["Cost · latency", `${step.costUsd ? formatCost(step.costUsd) : "$0"} · ${formatDuration(step.latencyMs)}`],
  ];
  return (
    <div className="uc-frame border-2 border-[#eceae3] bg-[#090909] text-[#eceae3] shadow-[10px_10px_0_0_#f4d44d]">
      <style>{SKIN}</style>
      <TitleBar crumbs="Tracing › support-agent › run_9f3a" status={`Failed · ${usd(totalCost(RUN_A))} · ${formatDuration(totalMs)}`} bad />
      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="h-[45rem] min-w-0 border-b md:h-[28.5rem] border-[#eceae3]/15 lg:border-b-0 lg:border-r">
          <TraceTimeline rows={rows} spans={spans} totalMs={totalMs} selectedId={selected} isFailed={failed} onSelect={setSelected} />
        </div>
        <div className="min-w-0 p-4 md:p-5" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]/55">Selected step</p>
          <p className={`mt-2 font-mono text-base ${step.errorType ? "text-[#ff4d3d]" : ""}`}>{step.name}</p>
          <dl className="mt-4 border-t border-[#eceae3]/25 font-mono text-[11px]">
            {fields.map(([k, v, hot]) => (
              <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3 border-b border-[#eceae3]/15 py-2.5">
                <dt className="uppercase tracking-[0.1em] text-[#eceae3]/55">{k}</dt>
                <dd className="min-w-0 break-words">{hot ? <span className="bg-[#f4d44d] px-1 text-black">{v}</span> : v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#eceae3]/45">Tap a step on the left · example data</p>
        </div>
      </div>
    </div>
  );
}

function MiniRun({ run, label, hint }: { run: readonly ExampleSpan[]; label: string; hint: string }) {
  // Side by side, the retry loop reads as one bar: its seven calls are folded into it.
  const { rows: all, spans, totalMs } = useRun(run);
  const rows = all.filter((r) => r.parentSpanId !== "a-loop");
  const [selected, setSelected] = useState<string | null>(null);
  const bad = run.some((s) => s.errorType);
  return (
    <div className="min-w-0">
      <TitleBar crumbs={`${label} · ${hint}`} status={`${bad ? "Failed" : "Passed"} · ${usd(totalCost(run))}`} bad={bad} />
      <div className="h-[var(--h)] md:h-[var(--hm)]" style={{ ["--h" as string]: `${50 + rows.length * 44 + 30}px`, ["--hm" as string]: `${30 + rows.length * 28 + 36}px` }}>
        <TraceTimeline rows={rows} spans={spans} totalMs={totalMs} selectedId={selected} isFailed={failed} onSelect={setSelected} />
      </div>
    </div>
  );
}

/** The Compare view's "two runs" mode: the failing run against the re-run after the fix. */
export function CompareWindow() {
  return (
    <div className="uc-frame border-2 border-[#eceae3] bg-[#090909] text-[#eceae3]">
      <style>{SKIN}</style>
      <MiniRun run={RUN_A} label="Run A" hint="the one to look into" />
      <div className="border-t-2 border-[#eceae3]">
        <MiniRun run={RUN_B} label="Run B" hint="the one to measure against" />
      </div>
    </div>
  );
}

/** The questions the trace view offers in Ask AI, straight from the product. */
export const ASK_QUESTIONS = SUGGESTED_QUESTIONS;
