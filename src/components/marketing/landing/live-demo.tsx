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
  kind: string;
  start: number;
  end: number;
  tokens: number;
  cost: number;
  tone?: "warn" | "root";
  log: string;
};

const TOTAL = 3400; // ms of run time shown on the ruler
const steps: Step[] = [
  { name: "plan", kind: "llm", start: 0, end: 700, tokens: 412, cost: 0.004, log: "Customer wants a refund for order 4821." },
  { name: "orders.lookup", kind: "tool", start: 760, end: 1200, tokens: 0, cost: 0, log: "Order found · $64 · delivered 9 days ago." },
  { name: "policy.search", kind: "tool", start: 1260, end: 1840, tokens: 0, cost: 0, tone: "warn", log: "0 results for “refund window”." },
  { name: "fallback", kind: "llm", start: 1900, end: 2800, tokens: 1180, cost: 0.006, tone: "root", log: "No policy found. Guessing: refund approved." },
  { name: "reply", kind: "llm", start: 2860, end: 3400, tokens: 240, cost: 0.002, log: "“Your refund is on its way.” (it is not)" },
];

const RUN_MS = 6200; // one loop: stream in, hold, then restart
const PLAY_MS = 4800; // wall-clock time the run takes to stream

function Bar({ step, progress }: { step: Step; progress: number }) {
  const left = (step.start / TOTAL) * 100;
  const width = ((step.end - step.start) / TOTAL) * 100;
  const cells = Math.max(6, Math.round(width * 1.6));
  const r = Math.min(1, Math.max(0, (progress - step.start) / (step.end - step.start)));
  const fill = step.tone === "warn" ? "rgba(244,212,77,0.4)" : step.tone === "root" ? "#eceae3" : "#f4d44d";
  return (
    <div className="relative h-7" style={{ marginLeft: `${left}%`, width: `${width}%` }}>
      <div className="absolute inset-0" style={{ clipPath: `inset(-30% ${(1 - r) * 100}% -30% 0)` }}>
        <svg viewBox={`0 0 ${cells} 7`} preserveAspectRatio="none" className="block h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
          <path d={dissolvePath(cells, 7)} fill={fill} />
        </svg>
      </div>
      {step.tone === "root" && r >= 1 && <span className="pointer-events-none absolute -inset-1.5 border-2 border-[#f4d44d] shadow-[0_0_30px_4px_rgba(244,212,77,0.45)] motion-safe:animate-pulse" />}
    </div>
  );
}

export function LiveDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion() ?? false;
  const [elapsed, setElapsed] = useState(0); // wall-clock ms in the loop
  const [run, setRun] = useState(1);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (reduce || !inView) return;
    let raf = 0;
    start.current = null;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const e = now - start.current;
      if (e >= RUN_MS) {
        start.current = now;
        setRun((n) => n + 1);
        setElapsed(0);
      } else setElapsed(e);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, run]);

  const t = reduce ? TOTAL : Math.min(TOTAL, (elapsed / PLAY_MS) * TOTAL);
  const done = t >= TOTAL;
  const seen = steps.filter((s) => t >= s.start);
  const finished = steps.filter((s) => t >= s.end);
  const tokens = finished.reduce((a, s) => a + s.tokens, 0);
  const cost = finished.reduce((a, s) => a + s.cost, 0);
  const failed = t >= steps[3].end;

  return (
    <section className="overflow-hidden bg-[#eceae3] px-5 py-24 text-black md:px-10 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">Watch one run</p>
            <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">See it happen, as it happens.</h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-black/65">Every step lands in Uncoil the moment it finishes. Here a support agent answers a refund request, and you can see exactly where it goes wrong.</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <div ref={ref} className="border-2 border-black bg-[#090909] text-[#eceae3] shadow-[16px_16px_0_#f4d44d] max-md:shadow-[8px_8px_0_#f4d44d]">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em]">
              <span className="flex items-center gap-2 text-white/60">
                <span className={`size-2 ${done ? "bg-white/30" : "bg-[#f4d44d] motion-safe:animate-pulse"}`} />
                {done ? "Run finished" : "Live"} · support-agent · run_9f3a
              </span>
              <button
                type="button"
                onClick={() => {
                  start.current = null;
                  setElapsed(0);
                  setRun((n) => n + 1);
                }}
                className="inline-flex items-center gap-2 border border-white/25 px-2.5 py-1 text-white/70 transition-colors hover:bg-white hover:text-black"
              >
                <RotateCcw className="size-3" aria-hidden="true" /> Replay
              </button>
            </div>

            <div className="grid lg:grid-cols-[320px_1fr]">
              {/* conversation + live log */}
              <div className="border-b border-white/15 p-5 lg:border-b-0 lg:border-r">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">Customer</p>
                <p className="mt-2 border border-white/20 p-3 text-sm leading-6">Hi, can I get a refund on order 4821? It arrived damaged.</p>
                <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">What the agent is doing</p>
                <ol className="mt-3 min-h-[200px] space-y-3">
                  {seen.map((s) => (
                    <li key={s.name} className="font-mono text-[11px] leading-5">
                      <span className={s.tone === "root" && t >= s.end ? "bg-[#f4d44d] px-1 text-black" : "text-[#f4d44d]"}>{s.name}</span>
                      <span className="block text-white/60">{t >= s.start + (s.end - s.start) * 0.4 || reduce ? s.log : "…"}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* waterfall */}
              <div className="p-5 md:p-8">
                <div className="grid grid-cols-3 gap-px border border-white/15 bg-white/15 font-mono">
                  {[
                    ["Time", `${(t / 1000).toFixed(2)}s`],
                    ["Tokens", tokens.toLocaleString()],
                    ["Cost", `$${cost.toFixed(3)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-[#090909] px-4 py-3">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-white/45">{k}</p>
                      <p className="mt-1 text-xl tabular-nums md:text-2xl">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="relative mt-8">
                  <div className="space-y-3">
                    {steps.map((s) => (
                      <div key={s.name} className="grid grid-cols-[88px_1fr] items-center gap-3 md:grid-cols-[130px_1fr]">
                        <span className={`truncate font-mono text-[10px] md:text-[11px] ${t >= s.start ? "text-white/80" : "text-white/25"}`}>{s.name}</span>
                        <div className="relative">
                          <Bar step={s} progress={t} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {!done && !reduce && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 left-[100px] md:left-[142px]">
                      <span className="absolute inset-y-[-6px] w-px bg-[#f4d44d]" style={{ left: `${(t / TOTAL) * 100}%` }} />
                    </div>
                  )}
                </div>

                <div className="mt-8 min-h-[72px]">
                  {failed ? (
                    <div className="border border-[#f4d44d] p-4 font-mono text-[12px] leading-6 text-[#f4d44d]">
                      <span className="bg-[#f4d44d] px-1.5 py-0.5 text-black">Root cause</span> policy.search found nothing, so <b>fallback</b> guessed the refund. Start there.
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
