"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { TraceTimeline, type ViewSpan } from "@/components/dashboard/tracing/trace-views";
import { compactNumber, formatCost, formatDuration } from "@/components/dashboard/tracing/format";
import { buildSpanTree, type SpanTreeNode } from "@/lib/uncoil-ports/treeBuilding";
import { alignSteps, isFailed as diffFailed, stepName, stepType, totals, type AlignedRow, type DiffSpan } from "@/lib/trace-diff";
import { totalCost, tokens, usd, type ExampleSpan } from "./run-data";
import type { Case } from "./cases";

// The product's trace view draws in the dashboard's own greys and step colours. Inside this
// page's frame they map onto the page palette: ink grounds, cream lines and text, model calls
// stay yellow, the failed step stays red.
const SKIN = `
.uc-frame [style*="rgb(138, 180, 255)"],.uc-frame [style*="rgb(124, 245, 200)"],.uc-frame [style*="rgb(201, 206, 214)"],.uc-frame [style*="rgb(139, 147, 161)"],.uc-frame [style*="#8AB4FF" i],.uc-frame [style*="#7CF5C8" i],.uc-frame [style*="#C9CED6" i],.uc-frame [style*="#8B93A1" i]{background:#eceae3!important}
.uc-frame [style*="rgb(255, 107, 107)"],.uc-frame [style*="#FF6B6B" i]{background:#ff4d3d!important}
.uc-frame svg[stroke="#8AB4FF"],.uc-frame svg[stroke="#7CF5C8"],.uc-frame svg[stroke="#C9CED6"],.uc-frame svg[stroke="#8B93A1"]{stroke:#eceae3}
.uc-frame svg[stroke="#FF6B6B"]{stroke:#ff4d3d}
.uc-frame .text-\\[\\#FF8A8A\\]{color:#ff4d3d}
.uc-frame .text-\\[\\#C9CED6\\],.uc-frame .text-\\[\\#E6E9EE\\]{color:#eceae3}
.uc-frame .text-\\[\\#8B93A1\\]{color:rgba(236,234,227,.62)}
.uc-frame .text-\\[\\#6B7380\\]{color:rgba(236,234,227,.48)}
.uc-frame .bg-\\[\\#0E1115\\],.uc-frame .bg-\\[\\#111418\\],.uc-frame .bg-\\[\\#0B0D10\\]{background:#090909}
.uc-frame .bg-\\[\\#161B22\\],.uc-frame .bg-\\[\\#12161C\\],.uc-frame .hover\\:bg-\\[\\#12161C\\]:hover,.uc-frame .hover\\:bg-\\[\\#1A1F27\\]:hover,.uc-frame .group:hover .group-hover\\:bg-\\[\\#12161C\\]{background:#1c1b19}
.uc-frame .border-\\[\\#1F242C\\],.uc-frame .border-\\[\\#262C35\\]{border-color:rgba(236,234,227,.16)}
.uc-frame .border-\\[\\#171B21\\]{border-color:rgba(236,234,227,.08)}
.uc-frame .rounded-\\[3px\\],.uc-frame .rounded-md,.uc-frame .rounded{border-radius:0}
@media (max-width:767px){
.uc-frame ol[aria-label="Timeline"]>li>button{height:44px}
.uc-frame ol[aria-label="Timeline"]>li>button>span>span{top:12px}
.uc-frame [aria-label="Zoom"] button{min-width:44px;min-height:44px}
.uc-frame .sticky.top-0>span:last-child>span:nth-child(even){display:none}
}
`;

const PHONE = "(max-width: 767px)";
function usePhone() {
  return useSyncExternalStore(
    (on) => {
      const m = window.matchMedia(PHONE);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

/** Every step's own cost plus everything under it, so a group shows what its children cost. */
function rolledUp(run: readonly ExampleSpan[]) {
  const kids = new Map<string, ExampleSpan[]>();
  for (const s of run) kids.set(s.parentSpanId, [...(kids.get(s.parentSpanId) ?? []), s]);
  const sum = (s: ExampleSpan): number => s.costUsd + (kids.get(s.spanId) ?? []).reduce((n, k) => n + sum(k), 0);
  return { cost: new Map(run.map((s) => [s.spanId, sum(s)])), kids };
}

function useRun(run: readonly ExampleSpan[], folded: ReadonlySet<string>) {
  return useMemo(() => {
    const { roots } = buildSpanTree(run.map((s) => ({ ...s })));
    const { cost, kids } = rolledUp(run);
    const rows: SpanTreeNode[] = [];
    const walk = (n: SpanTreeNode) => {
      rows.push(n);
      if (!folded.has(n.id)) n.children.forEach(walk);
    };
    roots.forEach(walk);
    // The bar label of a group carries the summed cost of its steps, like its row in the tree.
    const spans = new Map<string, ViewSpan>(run.map((s) => [s.spanId, { ...s, costUsd: cost.get(s.spanId) ?? s.costUsd }]));
    const byId = new Map(run.map((s) => [s.spanId, s]));
    return { rows, spans, byId, cost, kids, totalMs: run[0].latencyMs };
  }, [run, folded]);
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

const NO_FOLD: ReadonlySet<string> = new Set();

/**
 * The trace view from the dashboard, drawing one example run and opened on the step that explains
 * it. Click any step to read it. `rows` is the row count the timeline makes room for, so switching
 * between runs never makes the page jump.
 */
export function TraceWindow({ c, rows: room }: { c: Case; rows: { desk: number; phone: number } }) {
  const phone = usePhone();
  // On phones a long group starts folded, so the run fits one screen; it opens from its panel.
  const [open, setOpen] = useState<boolean | null>(null);
  const groupOpen = open ?? !phone;
  const folded = useMemo(() => (c.fold && !groupOpen ? new Set([c.fold]) : NO_FOLD), [c.fold, groupOpen]);
  const run = c.run;
  const { rows, spans, byId, cost, kids, totalMs } = useRun(run, folded);
  const [selected, setSelected] = useState(c.causeSpan);
  const step = byId.get(selected) ?? byId.get(c.causeSpan)!;
  const children = kids.get(step.spanId) ?? [];
  const isGroup = children.length > 0;
  const calls = children.filter((k) => k.modelId).length;
  const hot = step.spanId === c.causeSpan;
  const fields: [string, string, boolean?][] = isGroup
    ? [
        ["Kind", `Group · ${children.length} steps${calls ? ` · ${calls} model calls` : ""}`],
        ["Input", step.detail.input],
        ["Output", step.detail.output],
        ["Cost · latency", `${formatCost(cost.get(step.spanId) ?? 0)} for its steps · ${formatDuration(step.latencyMs)}`, hot],
      ]
    : [
        ["Input", step.detail.input, hot && !step.errorType && c.id === "wrong"],
        ["Output", step.detail.output, (hot && c.id !== "wrong") || Boolean(step.errorType)],
        step.modelId ? ["Model · tokens", `${step.modelId} · ${tokens(step).toLocaleString("en-US")} (${step.inputTokens!.toLocaleString("en-US")} in, ${step.outputTokens!.toLocaleString("en-US")} out)`] : ["Kind", "Tool call · no model, no tokens"],
        ["Cost · latency", `${formatCost(step.costUsd)} · ${formatDuration(step.latencyMs)}`],
      ];
  const bad = run.some((s) => s.errorType);
  const timelineH = 34 + 25 + (phone ? room.phone * 44 : room.desk * 28) + 6;
  // The step panel beside (or under) the timeline keeps one height for every example run, so
  // switching runs never moves the page; its tallest content is the loop group with its button.

  return (
    <div className="uc-frame border-2 border-[#eceae3] bg-[#090909] text-[#eceae3]">
      <style>{SKIN}</style>
      <TitleBar crumbs={`Tracing › ${c.agent} › ${c.runId}`} status={`${bad ? "Failed" : "Passed"} · ${usd(totalCost(run))} · ${formatDuration(totalMs)}`} bad={bad} />
      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-[#eceae3]/15 lg:border-b-0 lg:border-r" style={{ height: timelineH }}>
          <TraceTimeline rows={rows} spans={spans} totalMs={totalMs} selectedId={selected} isFailed={failed} onSelect={setSelected} />
        </div>
        <div className="min-h-[25rem] min-w-0 p-4 md:p-5 lg:min-h-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]/55">Selected step</p>
          <p className={`mt-2 font-mono text-base ${step.errorType ? "text-[#ff4d3d]" : ""}`}>{step.name}</p>
          <dl className="mt-4 border-t border-[#eceae3]/25 font-mono text-[11px]">
            {fields.map(([k, v, hot]) => (
              <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-b border-[#eceae3]/15 py-2.5">
                <dt className="uppercase tracking-[0.1em] text-[#eceae3]/55">{k}</dt>
                <dd className="min-w-0 break-words">{hot ? <span className="bg-[#f4d44d] px-1 text-black">{v}</span> : v}</dd>
              </div>
            ))}
          </dl>
          {c.fold && (step.spanId === c.fold || !groupOpen) && (
            <button
              type="button"
              onClick={() => {
                setOpen(!groupOpen);
                setSelected(c.fold!);
              }}
              className="mt-4 inline-flex min-h-11 items-center border border-[#eceae3]/40 px-3 font-mono text-[10px] uppercase tracking-[0.14em] hover:border-[#f4d44d] hover:text-[#f4d44d] focus-visible:outline-2 focus-visible:outline-[#f4d44d]"
            >
              {groupOpen ? "Fold the loop" : `Unfold its ${kids.get(c.fold)?.length ?? 0} calls`}
            </button>
          )}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#eceae3]/45">Tap a step on the left · example data</p>
          <span className="sr-only" aria-live="polite">{`${step.name} selected`}</span>
        </div>
      </div>
    </div>
  );
}

const asDiff = (run: readonly ExampleSpan[]): DiffSpan[] => run.map((s) => ({ ...s }));
// Both runs are fixed example data, so each case's comparison is worked out once.
const compared = new Map<string, { ta: ReturnType<typeof totals>; tb: ReturnType<typeof totals>; rows: AlignedRow[] }>();
function compare(c: Case) {
  let hit = compared.get(c.id);
  if (!hit) {
    const a = asDiff(c.run);
    const b = asDiff(c.fix.after);
    hit = { ta: totals(a), tb: totals(b), rows: alignSteps(a, b) };
    compared.set(c.id, hit);
  }
  return hit;
}

const TOTALS: { label: string; pick: (t: ReturnType<typeof totals>) => number; show: (n: number) => string }[] = [
  { label: "Latency", pick: (t) => t.durationMs, show: formatDuration },
  { label: "Cost", pick: (t) => t.costUsd, show: formatCost },
  { label: "Tokens", pick: (t) => t.tokens, show: compactNumber },
  { label: "Model calls", pick: (t) => t.llm, show: String },
  { label: "Errors", pick: (t) => t.errors, show: String },
];

function Cell({ span }: { span?: DiffSpan }) {
  if (!span) return <div className="px-3 py-1.5 text-[11px] text-[#eceae3]/35">— not in this run</div>;
  const bad = diffFailed(span);
  return (
    <div className="min-w-0 px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="bg-[#eceae3]/10 px-1.5 font-mono text-[10px] uppercase text-[#eceae3]/65">{stepType(span)}</span>
        <span className={`min-w-0 truncate ${bad ? "text-[#ff4d3d]" : ""}`}>{stepName(span)}</span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-[#eceae3]/60">
          {formatDuration(span.latencyMs)}
          {span.costUsd ? ` · ${formatCost(span.costUsd)}` : ""}
        </span>
      </div>
      {bad ? <div className="truncate font-mono text-[11px] text-[#ff4d3d]">{span.errorType} · {span.errorMessage}</div> : null}
    </div>
  );
}

function StepRow({ row }: { row: AlignedRow }) {
  const changed = row.kind !== "same";
  return (
    <li className={`grid grid-cols-2 border-b border-[#eceae3]/8 text-[12px] last:border-b-0 [&>*:first-child]:border-r [&>*:first-child]:border-[#eceae3]/10 ${changed ? "bg-[#eceae3]/[0.04] shadow-[inset_3px_0_0_#f4d44d]" : ""}`}>
      <Cell span={row.a} />
      <Cell span={row.b} />
    </li>
  );
}

/**
 * The Compare view's "Two runs" mode, as the dashboard lays it out: the totals of both runs, then
 * every step lined up side by side with the rows that differ marked. Computed with the product's
 * own comparison code from the two example runs.
 */
export function CompareWindow({ c, rows: room }: { c: Case; rows: number }) {
  const { ta, tb, rows } = compare(c);
  return (
    <div className="uc-frame border-2 border-[#eceae3] bg-[#090909] text-[#eceae3]">
      <TitleBar crumbs="Compare › two runs" status={`Run B passed · ${usd(totalCost(c.fix.after))}`} />
      <div className="grid grid-cols-2 gap-3 border-b border-[#eceae3]/15 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className="min-w-0 truncate"><span className="bg-[#f4d44d] px-1.5 text-black">Run A</span> {c.runId} · failed</span>
        <span className="min-w-0 truncate"><span className="bg-[#eceae3] px-1.5 text-black">Run B</span> {c.fix.afterId} · after the fix</span>
      </div>
      <dl aria-label="Totals" className="grid grid-cols-2 gap-px border-b border-[#eceae3]/15 bg-[#eceae3]/15 sm:grid-cols-5">
        {TOTALS.map(({ label, pick, show }) => {
          const va = pick(ta);
          const vb = pick(tb);
          const drop = va === 0 ? 0 : Math.round(((va - vb) / va) * 100);
          return (
            <div key={label} className="bg-[#090909] px-3 py-2.5 last:col-span-2 sm:last:col-span-1">
              <dt className="text-[11px] text-[#eceae3]/60">{label}</dt>
              <dd className="font-mono text-[13px] tabular-nums">
                {show(va)} <span className="text-[#eceae3]/45">vs</span> {show(vb)}
              </dd>
              <dd className={`font-mono text-[11px] ${drop > 0 ? "text-[#f4d44d]" : "text-[#eceae3]/45"}`}>{drop > 0 ? `−${drop}%` : "same"}</dd>
            </div>
          );
        })}
      </dl>
      <div className="flex items-center gap-3 border-b border-[#eceae3]/15 px-3 py-2">
        <p className="text-xs font-medium">Steps side by side</p>
        <p className="font-mono text-[11px] text-[#eceae3]/60">
          {rows.filter((r) => r.kind !== "same").length} of {rows.length} differ
        </p>
      </div>
      {/* A fixed window onto the steps, so switching cases never moves the page; long runs scroll inside it. */}
      <ul aria-label="Steps side by side" tabIndex={0} className="overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d]" style={{ height: room * 30 }}>
        {rows.map((row, i) => (
          <StepRow key={i} row={row} />
        ))}
      </ul>
    </div>
  );
}
