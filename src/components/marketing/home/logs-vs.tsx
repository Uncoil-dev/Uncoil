"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { formatCost } from "@/components/dashboard/tracing/format";
import { logLines } from "./logs";
import { RUN_A, tokens } from "./run-data";
import { H2, LABEL, SECTION, WRAP } from "./ui";

const LEVEL: Record<string, string> = { DEBUG: "text-[#eceae3]/40", INFO: "text-[#eceae3]/60", WARN: "text-[#eceae3]", ERROR: "text-[#eceae3]" };

/** The same run as the six steps Uncoil shows, read from the example spans. */
function useSteps() {
  return useMemo(() => {
    const by = (id: string) => RUN_A.find((s) => s.spanId === id)!;
    const loop = RUN_A.filter((s) => s.parentSpanId === "a-loop");
    const plan = by("a-plan");
    return [
      { n: "01", name: by("a-root").name, note: "run started" },
      { n: "02", name: plan.name, note: `${tokens(plan).toLocaleString("en-US")} tok · ${formatCost(plan.costUsd)}` },
      { n: "03", name: by("a-order").name, note: `${by("a-order").latencyMs} ms` },
      { n: "04", name: by("a-search").name, note: "0 results", cause: true },
      { n: "05", name: `${by("a-loop").name} × ${loop.length}`, note: formatCost(loop.reduce((n, s) => n + s.costUsd, 0)) },
      { n: "06", name: by("a-refund").name, note: "502 · 5000 ms", failed: true },
    ];
  }, []);
}

function Logs() {
  const lines = useMemo(() => logLines(RUN_A, "run_9f3a"), []);
  return (
    <div className="flex h-full min-w-0 flex-col border-2 border-[#eceae3]/40 bg-[#090909]">
      <p className={`border-b border-[#eceae3]/20 px-4 py-2.5 text-[#eceae3]/55 ${LABEL}`}>$ tail -f agent.log</p>
      <pre className="flex min-h-0 min-w-0 flex-1 flex-col justify-end overflow-hidden px-4 py-3 font-mono text-[10.5px] leading-[1.55] sm:text-[11px]">
        {lines.map((l, i) => (
          <span key={i} className={`block truncate ${LEVEL[l.level]}`}>
            <span className="text-[#eceae3]/30">{l.time} </span>
            <span className="inline-block w-[5ch]">{l.level}</span> {l.text}
          </span>
        ))}
      </pre>
    </div>
  );
}

const search = RUN_A.find((s) => s.spanId === "a-search")!;

function Trace() {
  const steps = useSteps();
  return (
    <div className="flex h-full min-w-0 flex-col border-2 border-[#eceae3] bg-[#090909]">
      <p className={`flex justify-between gap-3 border-b border-[#eceae3]/20 px-4 py-2.5 text-[#eceae3]/55 ${LABEL}`}>
        <span>Uncoil · run_9f3a</span>
        <span className="flex items-center gap-2 text-[#eceae3]"><span aria-hidden="true" className="size-2 bg-[#ff4d3d]" />Failed</span>
      </p>
      <ol className="flex-1 overflow-hidden py-2 font-mono text-[12px]">
        {steps.map((s) => (
          <li key={s.n} className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 ${s.cause ? "bg-[#f4d44d] text-black" : ""}`}>
            <span className={s.cause ? "text-black/60" : "text-[#eceae3]/45"}>{s.n}</span>
            <span className={`truncate ${s.failed ? "text-[#ff4d3d]" : ""}`}>{s.name}</span>
            <span className={`text-right ${s.cause ? "text-black" : s.failed ? "text-[#ff4d3d]" : "text-[#eceae3]/60"}`}>
              {s.note}
              {s.cause ? " · cause" : s.failed ? " · failed" : ""}
            </span>
          </li>
        ))}
      </ol>
      <dl className="border-t border-[#eceae3]/20 px-4 py-3 font-mono text-[11px] leading-5">
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
          <dt className="text-[#eceae3]/50">Input</dt>
          <dd className="truncate">{search.detail.input}</dd>
        </div>
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
          <dt className="text-[#eceae3]/50">Output</dt>
          <dd><span className="bg-[#f4d44d] px-1 text-black">{search.detail.output}</span></dd>
        </div>
      </dl>
    </div>
  );
}

const VIEWS = ["Your logs", "Uncoil"] as const;

/**
 * Logs against Uncoil, one run on both sides: the log tail generated from the example spans, and
 * the six steps as Uncoil marks them. Side by side on wide screens; a two-way switch on phones.
 */
export function LogsVs() {
  const [view, setView] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - view;
    setView(n);
    tabs.current[n]?.focus();
  };
  return (
    <section id="logs" className={`scroll-mt-16 bg-[#090909] text-[#eceae3] ${SECTION}`} aria-labelledby="mix-logs-title">
      <div className={WRAP}>
        <p className={`text-[#eceae3]/60 ${LABEL}`}>02 · Logs or Uncoil</p>
        <h2 id="mix-logs-title" className={`mt-5 max-w-[16ch] ${H2}`}>Same run. Your logs, then Uncoil.</h2>

        <div role="tablist" aria-label="View the run as" className="mt-8 grid grid-cols-2 border-2 border-[#eceae3] lg:hidden">
          {VIEWS.map((v, i) => (
            <button
              key={v}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={view === i}
              aria-controls="logs-panel"
              tabIndex={view === i ? 0 : -1}
              onClick={() => setView(i)}
              onKeyDown={onKey}
              className={`min-h-12 font-mono text-[11px] uppercase tracking-[0.14em] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#f4d44d] ${view === i ? "bg-[#eceae3] text-black" : "text-[#eceae3]/70"}`}
            >
              {v}
            </button>
          ))}
        </div>

        <div id="logs-panel" className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:mt-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-6">
          <div className={`h-[27rem] lg:block ${view === 0 ? "" : "hidden"}`}>
            <Logs />
          </div>
          <div className={`h-[27rem] lg:block ${view === 1 ? "" : "hidden"}`}>
            <Trace />
          </div>
        </div>
        <p className={`mt-4 text-[#eceae3]/50 ${LABEL}`}>Both sides: the example run, from the same data</p>
      </div>
    </section>
  );
}
