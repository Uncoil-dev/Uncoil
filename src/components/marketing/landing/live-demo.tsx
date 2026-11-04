"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Reveal } from "./reveal";

/* ---------- Live demo: a run streams into the trace view, step by step ---------- */

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function dissolvePath(w: number, h: number) {
  const zone = Math.max(3, Math.min(w * 0.5, 14));
  let d = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (BAYER[y % 4][x % 4] / 16 < ((x + 0.5) / zone) * 1.9 - 0.15) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}

type Step = {
  name: string;
  kind: "LLM" | "Tool";
  start: number;
  end: number;
  tokens: number;
  cost: number;
  tone?: "warn" | "root";
  tag?: string;
  log: string;
};

const TOTAL = 3400; // ms of run time shown on the ruler
const steps: Step[] = [
  { name: "plan", kind: "LLM", start: 0, end: 700, tokens: 412, cost: 0.004, log: "Customer wants a refund for order 4821." },
  { name: "orders.lookup", kind: "Tool", start: 760, end: 1200, tokens: 0, cost: 0, log: "Order found · $64 · delivered 9 days ago." },
  { name: "policy.search", kind: "Tool", start: 1260, end: 1840, tokens: 0, cost: 0, tone: "warn", tag: "0 results", log: "Nothing found for “refund window”." },
  { name: "fallback", kind: "LLM", start: 1900, end: 2800, tokens: 1180, cost: 0.006, tone: "root", tag: "Root cause", log: "No policy, so it guessed: refund approved." },
  { name: "reply", kind: "LLM", start: 2860, end: 3400, tokens: 240, cost: 0.002, log: "“Your refund is on its way.” (it is not)" },
];
const ROOT = steps.findIndex((s) => s.tone === "root");

const PLAY_MS = 2200; // wall-clock time the run takes to stream, once

const fmtTime = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

function Bar({ step, progress }: { step: Step; progress: number }) {
  const left = (step.start / TOTAL) * 100;
  const width = ((step.end - step.start) / TOTAL) * 100;
  const cells = Math.max(6, Math.round(width * 1.6));
  const r = Math.min(1, Math.max(0, (progress - step.start) / (step.end - step.start)));
  const fill = step.tone === "warn" ? "rgba(244,212,77,0.4)" : step.tone === "root" ? "#eceae3" : "#f4d44d";
  return (
    <div className="relative h-6" style={{ marginLeft: `${left}%`, width: `${width}%` }}>
      <div className="absolute inset-0 border border-dashed border-white/10" aria-hidden="true" />
      <div className="absolute inset-0" style={{ clipPath: `inset(-30% ${(1 - r) * 100}% -30% 0)` }}>
        <svg viewBox={`0 0 ${cells} 7`} preserveAspectRatio="none" className="block h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
          <path d={dissolvePath(cells, 7)} fill={fill} />
        </svg>
      </div>
      {step.tone === "root" && r >= 1 && <span className="pointer-events-none absolute -inset-1 border-2 border-[#f4d44d] shadow-[0_0_24px_2px_rgba(244,212,77,0.4)]" />}
    </div>
  );
}

export function LiveDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion() ?? false;
  // The server renders the finished run, so the full story is readable without JS.
  // On the client the run resets, then streams once (fast) when it scrolls into view and stays finished.
  const [t, setT] = useState(TOTAL);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  const playedRun = useRef(-1);

  useEffect(() => {
    if (!reduce && playedRun.current < 0) setT(0);
  }, [reduce]);

  useEffect(() => {
    if (reduce || !inView || playedRun.current === run) return;
    playedRun.current = run;
    setPlaying(true);
    let raf = 0;
    let start: number | null = null;
    let over = false;
    const tick = (now: number) => {
      start ??= now;
      const next = Math.min(TOTAL, ((now - start) / PLAY_MS) * TOTAL);
      setT(next);
      if (next < TOTAL) raf = requestAnimationFrame(tick);
      else {
        over = true;
        setPlaying(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      // Scrolled away mid-run: show the finished run instead of a frozen half.
      cancelAnimationFrame(raf);
      if (over) return;
      setT(TOTAL);
      setPlaying(false);
    };
  }, [inView, reduce, run]);

  const done = t >= TOTAL;
  const finished = steps.filter((s) => t >= s.end);
  const tokens = finished.reduce((a, s) => a + s.tokens, 0);
  const cost = finished.reduce((a, s) => a + s.cost, 0);
  const failed = t >= steps[ROOT].end;

  return (
    <section className="overflow-hidden bg-[#eceae3] mk-section px-5 text-black md:px-10">
      <div className="mx-auto max-w-[1320px]">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">Watch one run</p>
            <h2 className="mt-5 max-w-3xl font-pixel mk-h2 leading-[0.92] tracking-[-0.07em]">See it happen, as it happens.</h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-black/65">A support agent answers a refund request. Each step lands in Uncoil the moment it finishes, with its time and cost, so the bad step is plain to see.</p>
        </Reveal>

        <Reveal delay={0.1} className="mk-gap">
          <div ref={ref} className="border-2 border-black bg-[#090909] text-[#eceae3] shadow-[16px_16px_0_#f4d44d] max-md:shadow-[8px_8px_0_#f4d44d]">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em]">
              <span className="flex items-center gap-2 text-white/60">
                <span className={`size-2 ${done ? "bg-white/30" : "bg-[#f4d44d] motion-safe:animate-pulse"}`} />
                {done ? "Run finished" : "Live"} · support-agent · run_9f3a
              </span>
              <button
                type="button"
                disabled={playing}
                onClick={() => {
                  setT(0);
                  setRun((n) => n + 1);
                }}
                className="inline-flex items-center gap-2 border border-white/25 px-2.5 py-1 text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white/70"
              >
                <RotateCcw className="size-3" aria-hidden="true" /> Replay
              </button>
            </div>

            <div className="grid lg:grid-cols-[300px_1fr]">
              {/* conversation: what went in, what came out */}
              <div className="grid content-start gap-5 border-b border-white/15 p-5 sm:grid-cols-2 lg:grid-cols-1 lg:border-b-0 lg:border-r">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">Customer asked</p>
                  <p className="mt-2 border border-white/20 p-3 text-sm leading-6">Hi, can I get a refund on order 4821? It arrived damaged.</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">Agent replied</p>
                  <p className={`mt-2 border p-3 text-sm leading-6 transition-colors ${done ? "border-[#f4d44d] text-[#eceae3]" : "border-white/10 text-white/25"}`}>
                    {done ? "“Your refund is on its way.”" : "Waiting for the run…"}
                  </p>
                  <p className={`mt-2 font-mono text-[11px] leading-5 ${done ? "text-[#f4d44d]" : "invisible"}`}>Wrong: it never found the refund policy.</p>
                </div>
                <ul className="hidden space-y-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50 lg:block" aria-label="Legend">
                  <li className="flex items-center gap-2"><span className="h-2 w-4 bg-[#f4d44d]" />Step ok</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-4 bg-[#f4d44d]/40" />Empty result</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-4 bg-[#eceae3] outline outline-2 outline-[#f4d44d]" />Root cause</li>
                </ul>
              </div>

              {/* trace */}
              <div className="p-5 md:p-7">
                <div className="grid grid-cols-2 gap-px border border-white/15 bg-white/15 font-mono md:grid-cols-4">
                  {[
                    ["Time", fmtTime(t)],
                    ["Tokens", tokens.toLocaleString("en-US")],
                    ["Cost", `$${cost.toFixed(3)}`],
                    ["Status", failed ? `Failed at ${ROOT + 1}` : `Step ${Math.min(5, finished.length + 1)}/5`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-[#090909] px-4 py-2.5">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-white/45">{k}</p>
                      <p className={`mt-1 text-base tabular-nums sm:text-lg md:text-xl ${k === "Status" && failed ? "text-[#f4d44d]" : ""}`}>{v}</p>
                    </div>
                  ))}
                </div>

                <ol className="mt-6 space-y-3">
                  {steps.map((s, i) => {
                    const seen = t >= s.start;
                    const end = t >= s.end;
                    return (
                      <li key={s.name} className="grid grid-cols-[96px_1fr] items-center gap-x-3 gap-y-1 md:grid-cols-[150px_1fr_118px]">
                        <span className={`truncate font-mono text-[10px] md:text-[11px] ${seen ? "text-white/85" : "text-white/30"}`}>
                          <span className="text-white/35">{String(i + 1).padStart(2, "0")} </span>
                          {s.name}
                        </span>
                        <div className="relative">
                          <Bar step={s} progress={t} />
                          {seen && !end && <span className="pointer-events-none absolute inset-y-[-4px] w-px bg-[#f4d44d]" style={{ left: `${(t / TOTAL) * 100}%` }} />}
                        </div>
                        <span className={`hidden text-right font-mono text-[11px] tabular-nums md:block ${end ? "text-white/70" : "text-white/20"}`}>
                          {fmtTime(s.end - s.start)} · {s.cost ? `$${s.cost.toFixed(3)}` : "free"}
                        </span>
                        <p className={`col-start-2 font-mono text-[10px] leading-4 md:col-span-2 md:text-[11px] ${end ? "text-white/60" : "text-white/20"}`}>
                          <span className="mr-2 text-white/35">{s.kind}</span>
                          {s.tag && (
                            <span className={`mr-2 px-1 ${s.tone === "root" ? "bg-[#f4d44d] text-black" : "border border-[#f4d44d]/60 text-[#f4d44d]"} ${end ? "" : "opacity-30"}`}>{s.tag}</span>
                          )}
                          {s.log}
                          <span className="ml-2 text-white/35 md:hidden">
                            {fmtTime(s.end - s.start)} · {s.cost ? `$${s.cost.toFixed(3)}` : "free"}
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ol>

                <div className="mt-6 min-h-[58px]">
                  {failed ? (
                    <div className="border border-[#f4d44d] p-3.5 font-mono text-[12px] leading-6 text-[#f4d44d]">
                      <span className="bg-[#f4d44d] px-1.5 py-0.5 text-black">Root cause</span> Step 3 found no refund policy, so step 4 (<b>fallback</b>) guessed. Fix the search, not the reply.
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/35">Watching for the first bad step…</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
