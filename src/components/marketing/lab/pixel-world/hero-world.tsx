"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CREAM, YELLOW, brokenStep, bridge, flag, ground, landscape, pines, rebuild, reticle, robot, type Scene } from "./pixels";
import { heroState, heroTrack, type HeroPhase } from "./world";
import { usePixelCanvas, type Frame } from "./use-pixel-canvas";

const heroPixel = (w: number) => (w < 640 ? 4 : w < 1100 ? 5 : 6);

function layout(w: number, h: number) {
  const groundY = Math.round(h * (w < 200 ? 0.8 : 0.76));
  const gap0 = Math.round(w * (w < 200 ? 0.5 : 0.58));
  return { groundY, gap0, gap1: gap0 + 36, start: Math.round(w * 0.05), goal: Math.round(w * 0.93) };
}

const STATUS: Record<HeroPhase, string> = {
  walk: "Recording · step 05",
  break: "Failed · step 06",
  scan: "Uncoil found it · step 06",
  rebuild: "Rebuilding step 06",
  cross: "Passed · step 06",
  goal: "Run passed · 6 / 6",
};

export function HeroWorld() {
  const reduce = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<HeroPhase>(reduce ? "goal" : "walk");
  const [label, setLabel] = useState({ left: 60, top: 60 });
  const lastPhase = useRef<HeroPhase>(phase);

  usePixelCanvas(
    canvasRef,
    ({ px, seconds }: Frame) => {
      const st = reduce ? { phase: "goal" as const, local: 1 } : heroState(seconds);
      const { groundY, gap0, gap1, start, goal } = layout(px.w, px.h);
      const plankX = gap0 + 12;
      const s: Scene = { px, cam: 0, groundY, t: seconds };
      const edge = (gap0 - 7 - start) / (goal - 8 - start);
      const pos = heroTrack(st, edge);
      const rx = Math.round(start + pos * (goal - 8 - start));

      landscape(s, px.w < 200 ? 0.78 : 0.8, px.w < 200 ? 0.8 : 0.6);
      pines(s, [[gap0 - 14, gap1 + 4], [goal - 10, goal + 30]], 1);
      const fixed = st.phase === "cross" || st.phase === "goal";
      ground(s, [[gap0, gap1]], fixed ? rx + 6 : -1, gap1);
      bridge(s, gap0, gap1, 1);

      if (st.phase === "walk") px.rect(plankX, groundY - 2, 11, 3, CREAM);
      if (st.phase === "break") {
        const shake = st.local < 0.45;
        brokenStep({ ...s, groundY: groundY + (shake && Math.floor(seconds * 30) % 2 ? 1 : 0) }, plankX, 11, shake ? 0 : (st.local - 0.45) / 0.55);
      }
      if (st.phase === "scan") {
        brokenStep(s, plankX, 11, 1);
        reticle(px, plankX, groundY - 2, 11, 3, st.local);
      }
      if (st.phase === "rebuild") {
        reticle(px, plankX, groundY - 2, 11, 3, 1);
        rebuild(px, plankX, groundY - 2, 11, 3, st.local);
      }
      if (fixed) {
        px.rect(plankX, groundY - 2, 11, 3, YELLOW);
        px.rect(gap0, groundY - 3, gap1 - gap0, 1, YELLOW);
      }

      flag(px, goal, groundY - 3, st.phase === "goal" ? Math.min(1, st.local * 2.5) : 0);
      const walking = st.phase === "walk" || st.phase === "cross";
      robot(px, rx, groundY - 3, walking ? Math.floor(seconds * 8) : 0, st.phase === "break" || st.phase === "scan");

      if (st.phase !== lastPhase.current) {
        lastPhase.current = st.phase;
        setPhase(st.phase);
        setLabel({ left: ((plankX + 5) / px.w) * 100, top: ((groundY - 14) / px.h) * 100 });
      }
    },
    { pixel: heroPixel, still: reduce },
  );

  const showTag = phase !== "walk";
  const broken = phase === "break" || phase === "scan";

  return (
    <section data-phase={phase} className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#090909] text-[#eceae3]" aria-labelledby="pw-hero-title">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>

      <AnimatePresence>
        {showTag && (
          <motion.div
            key={broken ? "broken" : "fixed"}
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: `${label.left}%`, top: `${label.top}%` }}
          >
            <div className={`border-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] md:text-[11px] ${broken ? "border-[#eceae3] bg-[#090909] text-[#eceae3]" : "border-[#f4d44d] bg-[#f4d44d] text-black"}`}>
              <p className="whitespace-nowrap">Step 06 · refund.issue</p>
              <p className={`mt-1 whitespace-nowrap ${broken ? "text-[#eceae3]/70" : "text-black/70"}`}>{broken ? "502 · hung 5000 ms" : "passing again"}</p>
            </div>
            <div className={`mx-auto h-6 w-[2px] ${broken ? "bg-[#eceae3]" : "bg-[#f4d44d]"}`} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto w-full max-w-[1320px] px-5 pt-[clamp(1.5rem,7svh,5rem)] md:px-10">
        <p className="inline-flex items-center gap-2 border border-[#eceae3]/40 bg-[#090909] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#eceae3]">
          <span className="size-1.5 animate-pulse bg-[#f4d44d]" /> Agent observability for Claude Code, Cursor and Codex builds
        </p>
        <h1 id="pw-hero-title" className="mt-6 max-w-[11ch] font-pixel text-[clamp(3.1rem,min(9vw,13svh),8.5rem)] leading-[0.86] tracking-[-0.07em]">
          See the step that broke.
        </h1>
        <p className="mt-5 max-w-[34rem] bg-[#090909]/80 text-base leading-7 text-[#eceae3]/85 md:mt-6 md:text-lg md:leading-8">
          Your agent takes dozens of steps every run. Uncoil records each one, points at the step that failed and shows what it cost, so you can fix it and keep walking.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
          <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-[#f4d44d] px-7 py-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-black shadow-[6px_6px_0_0_#eceae3] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#eceae3]">
            Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <a href="#pw-setup" className="inline-flex items-center gap-3 border-2 border-[#eceae3] bg-[#090909] px-7 py-4 font-mono text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#eceae3] hover:text-black">
            Paste one prompt <ArrowDown className="size-4" aria-hidden="true" />
          </a>
        </div>
        {/* Leaves room under the copy on narrow screens so the pixel scene stays visible. */}
        <div className="h-[36svh] md:hidden" aria-hidden="true" />
      </div>

      <div className="relative mt-auto flex items-center justify-between gap-4 border-t-2 border-[#eceae3] bg-[#090909] py-3 pl-5 pr-20 font-mono text-[10px] uppercase tracking-[0.14em] md:pl-10 md:pr-24">
        <span className="text-[#eceae3]/60">Example run · support-agent</span>
        <span className="flex items-center gap-2" aria-live="off">
          <span className={`size-2 ${phase === "cross" || phase === "goal" || phase === "rebuild" || phase === "scan" ? "bg-[#f4d44d]" : "bg-[#eceae3]"}`} />
          {STATUS[phase]}
        </span>
      </div>
    </section>
  );
}
