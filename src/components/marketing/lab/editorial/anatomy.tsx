"use client";

import { motion, useReducedMotion } from "framer-motion";
import { inked } from "./art";

// One example run, the same one the hero calls out. Step 4 is where it went wrong; step 6 is where it showed.
const STEPS = [
  { name: "support-agent", note: "run started" },
  { name: "llm.chat", note: "412 tok · 820 ms" },
  { name: "order.lookup", note: "140 ms" },
  { name: "docs.search", note: "0 results", cause: true },
  { name: "llm.chat · retry", note: "guessed the policy" },
  { name: "refund.issue", note: "502 · 5000 ms", failed: true },
] as const;

/** A dithered pixel disc as one SVG path, so the knots share the pixel language of the logo. */
function pixelDisc(cx: number, cy: number, r: number, cell: number, tone: number) {
  let d = "";
  const n = Math.ceil(r / cell);
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const dist = Math.hypot(i * cell, j * cell) / r;
      if (dist > 1) continue;
      if (!inked(i + 64, j + 64, tone * (1.15 - dist * 0.55))) continue;
      d += `M${cx + i * cell - cell / 2} ${cy + j * cell - cell / 2}h${cell}v${cell}h-${cell}z`;
    }
  }
  return d;
}

type Layout = { vertical: boolean; w: number; h: number; at: (i: number) => { x: number; y: number } };

const HORIZONTAL: Layout = { vertical: false, w: 1200, h: 460, at: (i) => ({ x: 90 + i * 196, y: 230 + Math.sin(i * 1.1) * 26 }) };
const VERTICAL: Layout = { vertical: true, w: 360, h: 860, at: (i) => ({ x: 70 + Math.sin(i * 1.1) * 14, y: 60 + i * 138 }) };

function threadPath(l: Layout, from: number, to: number) {
  const pts: string[] = [];
  for (let k = 0; k <= 60; k++) {
    const t = from + ((to - from) * k) / 60;
    const i = Math.floor(t);
    const f = t - i;
    const a = l.at(i);
    const b = l.at(Math.min(i + 1, STEPS.length - 1));
    const sag = Math.sin(f * Math.PI) * (l.vertical ? 10 : 18);
    const x = a.x + (b.x - a.x) * f + (l.vertical ? sag : 0);
    const y = a.y + (b.y - a.y) * f + (l.vertical ? 0 : sag);
    pts.push(`${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function Plate({ l, className }: { l: Layout; className: string }) {
  const reduce = useReducedMotion();
  const draw = (delay: number, duration = 1.6) => ({
    initial: reduce ? false : { pathLength: 0 },
    whileInView: { pathLength: 1 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration, delay, ease: [0.65, 0, 0.35, 1] as const },
  });
  const pop = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, scale: 0.4 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: 0.5, delay },
  });
  const five = l.at(4);
  const six = l.at(5);
  // The thread snaps just before step 6; the loose end hangs away from it.
  const brk = { x: five.x + (six.x - five.x) * 0.72, y: five.y + (six.y - five.y) * 0.72 };
  const tail = l.vertical
    ? `M${six.x} ${six.y + 18} C ${six.x + 6} ${six.y + 60}, ${six.x - 20} ${six.y + 70}, ${six.x - 26} ${six.y + 110}`
    : `M${six.x + 18} ${six.y} C ${six.x + 50} ${six.y + 4}, ${six.x + 70} ${six.y + 60}, ${six.x + 64} ${six.y + 150}`;

  return (
    <svg viewBox={`0 0 ${l.w} ${l.h}`} className={className} role="img" aria-label="Diagram of one run: six steps on a thread. Step 4, docs.search, returned 0 results. The thread snaps at step 6, refund.issue, which failed with a 502.">
      <motion.path d={threadPath(l, 0, 4 + 0.66)} fill="none" stroke="#090909" strokeWidth={3} {...draw(0)} />
      {/* frayed end of the break */}
      {Array.from({ length: 14 }, (_, k) => {
        const ox = l.vertical ? ((k * 37) % 23) - 11 : ((k * 29) % 30) + 4;
        const oy = l.vertical ? ((k * 29) % 30) + 4 : ((k * 37) % 23) - 11;
        return <motion.rect key={k} x={brk.x + ox} y={brk.y + oy} width={4} height={4} fill="#ff4d3d" {...pop(1.6 + k * 0.03)} />;
      })}
      <motion.path d={tail} fill="none" stroke="#ff4d3d" strokeWidth={3} strokeDasharray="4 5" {...draw(1.9, 0.8)} />

      {STEPS.map((s, i) => {
        const p = l.at(i);
        const failed = "failed" in s;
        const cause = "cause" in s;
        const above = !l.vertical && i % 2 === 0;
        const tx = l.vertical ? p.x + 56 : p.x;
        const ty = l.vertical ? p.y - 8 : above ? p.y - 110 : p.y + 82;
        return (
          <g key={s.name + i}>
            {cause && <motion.rect x={p.x - 34} y={p.y - 34} width={68} height={68} fill="#f4d44d" {...pop(0.9)} />}
            <motion.path d={pixelDisc(p.x, p.y, 22, 4, 1)} fill={failed ? "#ff4d3d" : "#090909"} shapeRendering="crispEdges" {...pop(0.2 + i * 0.22)} />
            <motion.line
              x1={l.vertical ? p.x + 28 : p.x}
              y1={l.vertical ? p.y : above ? p.y - 30 : p.y + 30}
              x2={l.vertical ? p.x + 48 : p.x}
              y2={l.vertical ? p.y : above ? p.y - 62 : p.y + 62}
              stroke="#090909"
              strokeWidth={1}
              {...draw(0.3 + i * 0.22, 0.4)}
            />
            <motion.g {...pop(0.45 + i * 0.22)} style={{ transformOrigin: `${tx}px ${ty}px` }}>
              <text x={tx} y={ty} textAnchor={l.vertical ? "start" : "middle"} className="font-pixel" fontSize={l.vertical ? 34 : 40} fill="#090909" letterSpacing="-0.06em">
                {String(i + 1).padStart(2, "0")}
              </text>
              <text x={tx} y={ty + (l.vertical ? 26 : 26)} textAnchor={l.vertical ? "start" : "middle"} className="font-mono" fontSize={l.vertical ? 15 : 15} fill="#090909">
                {s.name}
              </text>
              <text x={tx} y={ty + 46} textAnchor={l.vertical ? "start" : "middle"} className="font-mono" fontSize={13} fill="rgba(9,9,9,0.6)">
                {s.note}
              </text>
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}

export function Anatomy() {
  return (
    <section id="break" className="bg-[#eceae3] px-5 py-24 text-[#090909] md:px-10 md:py-36" aria-labelledby="ed-break-title">
      <div className="mx-auto max-w-[1320px]">
        <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>01</span>
          <span className="h-px flex-1 bg-black" />
          <span>The break</span>
        </p>
        <h2 id="ed-break-title" className="mt-10 font-pixel text-[clamp(2.6rem,6.4vw,6.5rem)] leading-[0.9] tracking-[-0.07em]">
          It failed at step 6.
          <br />
          It broke at{" "}
          <span className="relative inline-block">
            <span aria-hidden="true" className="absolute -inset-x-[0.06em] bottom-[0.02em] top-[0.14em] bg-[#f4d44d]" />
            <span className="relative">step 4.</span>
          </span>
        </h2>

        <figure className="mt-14 md:mt-20">
          <Plate l={HORIZONTAL} className="hidden h-auto w-full md:block" />
          <Plate l={VERTICAL} className="mx-auto h-auto w-full max-w-[420px] md:hidden" />
          <figcaption className="mt-4 border-t border-black/30 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">
            Fig. 2 — Anatomy of one run, read backwards from the failure. Example data.
          </figcaption>
        </figure>

        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-[1fr_1fr_0.9fr] md:gap-12">
          <p className="text-lg leading-8 text-black/80 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-pixel first-letter:text-[5.2rem] first-letter:leading-[0.8] first-letter:text-[#090909]">
            Agent bugs rarely happen where they show up. The refund call timed out at step six, but the run went wrong two steps earlier, when a docs search came back empty and the model filled the gap with a guess.
          </p>
          <p className="text-lg leading-8 text-black/80">
            Logs stop at the crash. A trace keeps every step: what the model was asked, what each tool returned, how long it took and what it cost. You read the run backwards from the failure and land on the step that actually broke.
          </p>
          <blockquote className="border-l-4 border-[#090909] pl-6">
            <p className="font-pixel text-[clamp(1.8rem,2.6vw,2.5rem)] leading-[1] tracking-[-0.06em]">“The error is the symptom. The trace is the story.”</p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
