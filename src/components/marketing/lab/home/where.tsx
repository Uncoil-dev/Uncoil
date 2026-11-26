"use client";

import { useId, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Eyebrow } from "./eyebrow";
import { PLAN_CALL, tokens } from "./run-data";
import { cellsPath } from "./story";
import { AFTER_EYEBROW, AFTER_HEADLINE, DUR, EASE, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";
import { inked, segment } from "../editorial/art";

// One example run, the same one the hero calls out. Step 4 is where it went wrong; step 6 is where it showed.
const STEPS = [
  { name: "support-agent", note: "run started" },
  { name: "llm.chat", note: `${tokens(PLAN_CALL).toLocaleString("en-US")} tok · ${PLAN_CALL.latencyMs} ms` },
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

type Pt = { x: number; y: number };
type Layout = { vertical: boolean; w: number; h: number; at: (i: number) => Pt };

const HORIZONTAL: Layout = { vertical: false, w: 1200, h: 350, at: (i) => ({ x: 90 + i * 196, y: 196 + Math.sin(i * 1.1) * 26 }) };
const VERTICAL: Layout = { vertical: true, w: 360, h: 860, at: (i) => ({ x: 70 + Math.sin(i * 1.1) * 14, y: 60 + i * 138 }) };

/** The pixel grid every line on the plate snaps to; the same cell the knots are drawn with. */
const CELL = 4;

function threadPoints(l: Layout, from: number, to: number): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k <= 120; k++) {
    const t = from + ((to - from) * k) / 120;
    const i = Math.floor(t);
    const f = t - i;
    const a = l.at(i);
    const b = l.at(Math.min(i + 1, STEPS.length - 1));
    const sag = Math.sin(f * Math.PI) * (l.vertical ? 10 : 18);
    pts.push({ x: a.x + (b.x - a.x) * f + (l.vertical ? sag : 0), y: a.y + (b.y - a.y) * f + (l.vertical ? 0 : sag) });
  }
  return pts;
}

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt[] {
  return Array.from({ length: 61 }, (_, k) => {
    const t = k / 60;
    const u = 1 - t;
    return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
  });
}

/**
 * A line through `pts` drawn as a run of grid cells, stepping one cell at a time so it reads as a
 * stair-stepped pixel line like the ridges in the hero. `keep` drops cells to make dashes.
 */
function pixelLine(pts: readonly Pt[], keep: (i: number) => boolean = () => true) {
  const cells: [number, number][] = [];
  const seen = new Set<string>();
  const add = (c: number, r: number) => {
    const key = `${c},${r}`;
    if (seen.has(key)) return;
    seen.add(key);
    cells.push([c, r]);
  };
  let c = Math.round(pts[0].x / CELL);
  let r = Math.round(pts[0].y / CELL);
  add(c, r);
  for (const p of pts.slice(1)) {
    const tc = Math.round(p.x / CELL);
    const tr = Math.round(p.y / CELL);
    while (c !== tc || r !== tr) {
      if (Math.abs(tc - c) >= Math.abs(tr - r)) c += Math.sign(tc - c);
      else r += Math.sign(tr - r);
      add(c, r);
    }
  }
  return cellsPath(cells.filter((_, i) => keep(i)), CELL);
}

/** Yellow pixel corner brackets around a 68px target centred on 0,0: Uncoil's scan, as in the hero. */
function reticlePath() {
  const cells: [number, number][] = [];
  const r = 9; // half size, in cells
  const arm = 4;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    for (let k = 0; k < arm; k++) {
      cells.push([sx * r - sx * k, sy * r]);
      if (k) cells.push([sx * r, sy * r - sy * k]);
    }
  }
  return cellsPath(cells, CELL);
}
const RETICLE = reticlePath();

function Plate({ l, className, scan }: { l: Layout; className: string; scan: MotionValue<number> }) {
  const reduce = useCalm();
  const clipId = useId().replace(/:/g, "");
  const view = { once: true, amount: 0.35 } as const;
  const pop = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, scale: 0.4 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: view,
    transition: { duration: DUR.base, delay, ease: EASE },
  });
  const five = l.at(4);
  const six = l.at(5);
  // The thread snaps just before step 6; the loose end hangs away from it.
  const brk = { x: five.x + (six.x - five.x) * 0.72, y: five.y + (six.y - five.y) * 0.72 };
  const tail = l.vertical
    ? bezier({ x: six.x, y: six.y + 22 }, { x: six.x + 6, y: six.y + 60 }, { x: six.x - 20, y: six.y + 70 }, { x: six.x - 26, y: six.y + 110 })
    : bezier({ x: six.x + 22, y: six.y }, { x: six.x + 50, y: six.y + 4 }, { x: six.x + 70, y: six.y + 60 }, { x: six.x + 64, y: six.y + 140 });
  const thread = pixelLine(threadPoints(l, 0, 4 + 0.66));
  const dashes = pixelLine(tail, (i) => i % 4 < 2);

  // The scan walks the thread back from step 06 to step 04 as the plate scrolls up the screen,
  // leaving a dotted yellow trail; step 04 lights up when it arrives.
  const back = threadPoints(l, 3, 5).reverse();
  const at = (k: number) => back[Math.round(Math.min(1, Math.max(0, k)) * (back.length - 1))];
  const sx = useTransform(scan, (k) => at(k).x);
  const sy = useTransform(scan, (k) => at(k).y);
  const trail = pixelLine(back, (i) => i % 3 === 0);
  const clipX = useTransform(scan, (k) => (l.vertical ? 0 : at(k).x));
  const clipY = useTransform(scan, (k) => (l.vertical ? at(k).y : 0));
  const clipW = useTransform(scan, (k) => (l.vertical ? l.w : Math.max(0, six.x - at(k).x)));
  const clipH = useTransform(scan, (k) => (l.vertical ? Math.max(0, six.y - at(k).y) : l.h));
  const found = useTransform(scan, [0.92, 1], [0, 1]);
  const scanOn = useTransform(scan, [0, 0.02], [0, 1]);
  const trailId = `${clipId}-trail`;

  return (
    <svg viewBox={`0 0 ${l.w} ${l.h}`} className={className} shapeRendering="crispEdges" role="img" aria-label="Diagram of one run: six steps on a thread. Step 4, docs.search, returned 0 results. The thread snaps at step 6, refund.issue, which failed with a 502.">
      <defs>
        <clipPath id={clipId}>
          {/* Sweeps along the run so the thread draws in like a pen stroke. */}
          <motion.rect
            x={0}
            y={0}
            width={l.w}
            height={l.h}
            initial={reduce ? false : l.vertical ? { height: 0 } : { width: 0 }}
            whileInView={l.vertical ? { height: l.h } : { width: l.w }}
            viewport={view}
            transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
          />
        </clipPath>
        <clipPath id={trailId}>
          <motion.rect x={clipX} y={clipY} width={clipW} height={clipH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} transform={`translate(${-CELL / 2} ${-CELL / 2})`}>
        <path d={thread} fill="#090909" />
      </g>
      {/* frayed end of the break */}
      {Array.from({ length: 14 }, (_, k) => {
        const ox = l.vertical ? ((k * 37) % 23) - 11 : ((k * 29) % 30) + 4;
        const oy = l.vertical ? ((k * 29) % 30) + 4 : ((k * 37) % 23) - 11;
        return <motion.rect key={k} x={Math.round((brk.x + ox) / CELL) * CELL - CELL / 2} y={Math.round((brk.y + oy) / CELL) * CELL - CELL / 2} width={CELL} height={CELL} fill="#ff4d3d" {...pop(1.5 + k * 0.03)} />;
      })}
      <motion.path d={dashes} fill="#ff4d3d" transform={`translate(${-CELL / 2} ${-CELL / 2})`} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={view} transition={{ duration: DUR.base, delay: 1.8, ease: EASE }} />

      {STEPS.map((s, i) => {
        const p = l.at(i);
        const failed = "failed" in s;
        const cause = "cause" in s;
        const above = !l.vertical && i % 2 === 0;
        const tx = l.vertical ? p.x + 56 : p.x;
        const ty = l.vertical ? p.y - 8 : above ? p.y - 110 : p.y + 82;
        // A dotted pixel leader from the knot to its label.
        const leader: [number, number][] = [];
        if (l.vertical) for (let x = p.x + 30; x <= p.x + 46; x += CELL * 2) leader.push([Math.round(x / CELL), Math.round(p.y / CELL)]);
        else for (let y = above ? p.y - 62 : p.y + 34; y <= (above ? p.y - 34 : p.y + 62); y += CELL * 2) leader.push([Math.round(p.x / CELL), Math.round(y / CELL)]);
        return (
          <g key={s.name + i}>
            {cause && <motion.rect x={p.x - 34} y={p.y - 34} width={68} height={68} fill="#f4d44d" style={{ opacity: found }} />}
            <motion.path d={pixelDisc(p.x, p.y, 22, CELL, 1)} fill={failed ? "#ff4d3d" : "#090909"} {...pop(0.2 + i * 0.2)} />
            <motion.path d={cellsPath(leader, CELL)} transform={`translate(${-CELL / 2} ${-CELL / 2})`} fill="#090909" {...pop(0.3 + i * 0.2)} />
            <motion.g {...pop(0.4 + i * 0.2)} style={{ transformOrigin: `${tx}px ${ty}px` }}>
              <text x={tx} y={ty} textAnchor={l.vertical ? "start" : "middle"} className="font-pixel" fontSize={l.vertical ? 34 : 40} fill="#090909" letterSpacing="-0.06em" shapeRendering="auto">
                {String(i + 1).padStart(2, "0")}
              </text>
              <text x={tx} y={ty + 26} textAnchor={l.vertical ? "start" : "middle"} className="font-mono" fontSize={15} fill="#090909" shapeRendering="auto">
                {s.name}
              </text>
              <text x={tx} y={ty + 46} textAnchor={l.vertical ? "start" : "middle"} className="font-mono" fontSize={13} fill="rgba(9,9,9,0.6)" shapeRendering="auto">
                {s.note}
              </text>
            </motion.g>
          </g>
        );
      })}

      <motion.path d={trail} fill="#f4d44d" clipPath={`url(#${trailId})`} transform={`translate(${-CELL / 2} ${-CELL / 2})`} style={{ opacity: scanOn }} />
      <motion.g style={{ x: sx, y: sy, opacity: scanOn }}>
        <path d={RETICLE} fill="#090909" transform={`translate(${-CELL / 2 + 2} ${-CELL / 2 + 2})`} opacity={0.25} />
        <path d={RETICLE} fill="#f4d44d" transform={`translate(${-CELL / 2} ${-CELL / 2})`} />
      </motion.g>
    </svg>
  );
}

const READING = ["06 · refund.issue failed: 502 after 5000 ms", "05 · llm.chat retried 7 times, guessing the policy", "04 · docs.search returned 0 results: the cause"] as const;

export function Where() {
  const calm = useCalm();
  const figRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: figRef, offset: ["start 0.8", "end 0.55"] });
  const scrolled = useTransform(scrollYProgress, (p) => segment(p, 0.12, 0.82));
  const still = useMotionValue(1);
  const scan = calm ? still : scrolled;
  const [read, setRead] = useState(0);
  useMotionValueEvent(scrolled, "change", (k) => setRead(k < 0.35 ? 0 : k < 0.92 ? 1 : 2));
  const line = calm ? 2 : read;

  return (
    <section id="break" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="ed-break-title">
      <div className={WRAP}>
        <Eyebrow n="01" on="cream">Where it broke</Eyebrow>
        <h2 id="ed-break-title" className={`${AFTER_EYEBROW} ${H2}`}>
          It failed at step 6.
          <br />
          It broke at{" "}
          <span className="relative inline-block">
            <span aria-hidden="true" className="absolute -inset-x-[0.06em] bottom-[0.02em] top-[0.14em] bg-[#f4d44d]" />
            <span className="relative">step 4.</span>
          </span>
        </h2>

        <figure ref={figRef} className={AFTER_HEADLINE}>
          <Plate l={HORIZONTAL} scan={scan} className="hidden h-auto w-full md:block" />
          <Plate l={VERTICAL} scan={scan} className="mx-auto h-auto w-full max-w-[420px] md:hidden" />
          <figcaption className={`mt-6 flex flex-col gap-2 border-t border-black/25 pt-3 sm:flex-row sm:items-baseline sm:justify-between ${LABEL}`}>
            <span className="flex items-center gap-2 text-black">
              <span aria-hidden="true" className={`size-2 shrink-0 ${line === 2 ? "bg-[#f4d44d] outline outline-1 outline-black" : line === 0 ? "bg-[#ff4d3d]" : "bg-black"}`} />
              Reading back · {READING[line]}
            </span>
            <span className="text-black/55">Fig. 1 · one run, example data</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
