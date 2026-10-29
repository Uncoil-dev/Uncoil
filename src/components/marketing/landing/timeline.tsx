"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { UncoilMark } from "@/components/brand/uncoil-mark";

/* ---------- Timeline: a trace waterfall drawn in the logo's pixel bars ---------- */

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Pixel path for one bar: dithered on the left, solid to the right, like the logo. */
function dissolvePath(w: number, h: number) {
  const zone = Math.max(3, Math.min(w * 0.55, 16));
  let d = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (BAYER[y % 4][x % 4] / 16 < ((x + 0.5) / zone) * 1.9 - 0.15) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}

type Span = {
  name: string;
  kind: string;
  depth: number;
  start: number;
  end: number;
  cost: number;
  tone?: "warn" | "root" | "skipped";
  note?: string;
};

const T = 3.4;
const spans: Span[] = [
  { name: "support-agent", kind: "agent", depth: 0, start: 0, end: 3.4, cost: 0 },
  { name: "plan", kind: "llm", depth: 1, start: 0.04, end: 0.8, cost: 0.004 },
  { name: "orders.lookup", kind: "tool", depth: 1, start: 0.86, end: 1.3, cost: 0 },
  { name: "policy.search", kind: "tool", depth: 1, start: 1.36, end: 1.94, cost: 0, tone: "warn", note: "0 results" },
  { name: "fallback", kind: "llm", depth: 1, start: 2.0, end: 2.92, cost: 0.006, tone: "root", note: "Root cause · guessed the refund" },
  { name: "refund.issue", kind: "tool", depth: 1, start: 2.96, end: 3.06, cost: 0, tone: "skipped", note: "skipped" },
  { name: "reply", kind: "llm", depth: 1, start: 3.08, end: 3.4, cost: 0.002 },
];
const totalCost = spans.reduce((s, x) => s + x.cost, 0);

function Bar({ span, t, trackW, cell }: { span: Span; t: MotionValue<number>; trackW: number; cell: number }) {
  const left = (span.start / T) * 100;
  const width = ((span.end - span.start) / T) * 100;
  const wCells = Math.max(2, Math.round(((span.end - span.start) / T) * (trackW / cell)));
  const reveal = useTransform(t, (v) => Math.min(1, Math.max(0, (v - span.start) / (span.end - span.start))));
  const clip = useTransform(reveal, (r) => `inset(-40% ${(1 - r) * 100}% -40% 0)`);
  const done = useTransform(reveal, [0.85, 1], [0, 1]);

  const fill = span.tone === "warn" ? "rgba(244,212,77,0.35)" : span.tone === "root" ? "#eceae3" : "#f4d44d";

  return (
    <div className="relative h-[38px] max-md:h-6" style={{ marginLeft: `${left}%`, width: `${width}%` }}>
      <motion.div style={{ clipPath: clip }} className="absolute inset-0" >
        {span.tone === "skipped" ? (
          <div className="h-full border border-dashed border-[#eceae3]/60" />
        ) : (
          <svg viewBox={`0 0 ${wCells} 7`} preserveAspectRatio="none" className="block h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
            <path d={dissolvePath(wCells, 7)} fill={fill} />
          </svg>
        )}
      </motion.div>
      {span.tone === "root" && (
        <motion.span style={{ opacity: done }} className="pointer-events-none absolute -inset-2">
          <span className="block size-full border-2 border-[#f4d44d] shadow-[0_0_40px_6px_rgba(244,212,77,0.4)] motion-safe:animate-pulse" />
        </motion.span>
      )}
      {span.note && (
        <motion.span
          style={{ opacity: done }}
          className={`absolute top-full mt-2 whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.12em] ${
            span.tone === "root" ? "bg-[#f4d44d] px-1.5 py-0.5 text-black" : "text-[#f4d44d]"
          } ${span.start / T > 0.55 ? "right-0" : "left-0"}`}
        >
          {span.note}
        </motion.span>
      )}
    </div>
  );
}

export function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Most of the scroll plays the run; the end holds the finished map.
  const played = useTransform(scrollYProgress, [0.04, 0.85], [0, T], { clamp: true });
  const t = useTransform(played, (v) => (reduce ? T : v));
  const playhead = useTransform(t, (v) => `${(v / T) * 100}%`);
  const finale = useTransform(scrollYProgress, [0.86, 0.95], [reduce ? 1 : 0, 1]);

  const [trackW, setTrackW] = useState(900);
  const [readout, setReadout] = useState({ t: 0, cost: 0 });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTrackW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useMotionValueEvent(t, "change", (v) => {
    const cost = spans.filter((s) => s.end <= v + 0.001).reduce((sum, s) => sum + s.cost, 0);
    setReadout({ t: v, cost });
  });
  const shown = reduce ? { t: T, cost: totalCost } : readout;
  const cell = trackW < 500 ? 4 : 6;

  return (
    <section ref={ref} className="relative h-[320vh] bg-[#090909] text-[#eceae3] motion-reduce:h-auto">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-5 pb-6 pt-24 md:px-10 motion-reduce:static motion-reduce:h-auto motion-reduce:py-24">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                <span className="size-2 bg-[#f4d44d] motion-safe:animate-pulse" />
                Replaying run · scroll to play
              </p>
              <h2 className="mt-4 max-w-3xl font-pixel text-[clamp(2.2rem,5.4vw,5rem)] leading-[0.92] tracking-[-0.07em]">
                3.4 seconds. <span className="text-[#f4d44d]">One wrong guess.</span>
              </h2>
            </div>
            <div className="flex items-end gap-5 border border-[#f4d44d]/60 bg-[#f4d44d]/[0.06] px-5 py-3 font-mono uppercase tracking-[0.12em]">
              <span>
                <span className="block text-[10px] text-white/50">Time</span>
                <span className="block font-pixel text-[clamp(2.4rem,5vw,4.6rem)] leading-none tracking-[-0.05em] tabular-nums text-[#f4d44d]">{shown.t.toFixed(2)}s</span>
              </span>
              <span className="pb-1 text-[11px]">
                <span className="block text-[10px] text-white/50">Cost</span>
                <span className="tabular-nums">${shown.cost.toFixed(3)}</span>
              </span>
            </div>
          </div>

          {/* The waterfall: names on the left, one track of pixel bars on the right */}
          <div className="relative mt-5 md:mt-8">
            <div className="flex md:gap-6">
              <div className="hidden w-[200px] shrink-0 md:block" />
              <div className="relative h-5 flex-1 border-b border-white/15 font-mono text-[10px] text-white/40">
                {[0, 1, 2, 3, T].map((s, i, all) => (
                  <span
                    key={s}
                    className="absolute top-0"
                    style={{ left: `${(s / T) * 100}%`, transform: i === 0 ? "none" : i === all.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
                  >
                    {s}s
                  </span>
                ))}
              </div>
            </div>

            {/* Second lines + dithered wake trailing the playhead */}
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 md:left-[224px]" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <span key={n} className="absolute inset-y-0 w-px bg-white/[0.07]" style={{ left: `${(n / T) * 100}%` }} />
              ))}
              <motion.div
                style={{
                  width: playhead,
                  backgroundImage: "radial-gradient(#f4d44d 0.9px, transparent 1px)",
                  backgroundSize: "4px 4px",
                  maskImage: "linear-gradient(to right, transparent, #000)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, #000)",
                }}
                className="absolute inset-y-0 left-0 opacity-25"
              />
            </div>

            {spans.map((s, i) => (
              <div key={s.name} className={`flex md:gap-6 ${s.note ? "pb-6" : "pb-0"} pt-2 md:pt-2.5`}>
                <div className="hidden w-[200px] shrink-0 items-center gap-2 font-mono text-[11px] md:flex" style={{ paddingLeft: s.depth * 16 }}>
                  <span className="text-white/40">{s.kind}</span>
                  <span className={s.tone === "root" ? "text-[#f4d44d]" : ""}>{s.name}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 font-mono text-[10px] text-white/50 md:hidden">
                    {s.kind} · <span className={s.tone === "root" ? "text-[#f4d44d]" : "text-white/80"}>{s.name}</span>
                  </p>
                  <div ref={i === 0 ? track : undefined}>
                    <Bar span={s} t={t} trackW={trackW} cell={cell} />
                  </div>
                </div>
              </div>
            ))}

            {/* Playhead sweeping across the track */}
            {!reduce && (
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 md:left-[224px]" aria-hidden="true">
                <motion.div style={{ left: playhead }} className="absolute inset-y-0 w-[2px] bg-[#f4d44d] shadow-[0_0_24px_4px_rgba(244,212,77,0.55)]">
                  <span className="absolute -left-[5px] -top-[5px] block size-[12px] bg-[#f4d44d]" />
                  <span className="absolute -bottom-[5px] -left-[5px] block size-[12px] bg-[#f4d44d]" />
                </motion.div>
              </div>
            )}
          </div>

          <motion.div
            style={{ opacity: finale }}
            className="mt-5 flex flex-col gap-3 bg-[#f4d44d] px-5 py-4 text-[#090909] md:flex-row md:items-center md:justify-between"
          >
            <span className="flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
              <UncoilMark className="h-4" />
              Found it: the policy search came back empty, so the agent guessed.
            </span>
            <span className="font-pixel text-xl tracking-[-0.04em] md:text-2xl">Every run, read like this.</span>
          </motion.div>
          </div>
      </div>
    </section>
  );
}
