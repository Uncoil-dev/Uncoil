"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CREAM, YELLOW, brokenStep, bridge, flag, ground, pines, rebuild, reticle, robot, type Scene } from "../pixel-world/pixels";
import { heroState, heroTrack, type HeroPhase } from "../pixel-world/world";
import { usePixelCanvas, type Frame } from "../pixel-world/use-pixel-canvas";
import { clearStars, landscapeUnder, placeCallout, toBuffer, useCopyBoxes } from "./sky";
import { DUR, EASE, HERO, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

const heroPixel = (w: number) => (w < 640 ? 4 : w < 1100 ? 5 : 6);

function layout(w: number, h: number) {
  // On phones the copy fills the top of the screen, so the ground sits low and the scene
  // still lands inside the first screen.
  const groundY = Math.round(h * (w < 200 ? 0.87 : 0.79));
  const gap0 = Math.round(w * (w < 200 ? 0.5 : 0.58));
  return { groundY, gap0, gap1: gap0 + 36, start: Math.round(w * 0.05), goal: Math.round(w * 0.93) };
}

const STATUS: Record<HeroPhase, string> = {
  walk: "Recording · step 05",
  break: "Failed · step 06",
  scan: "Walking back from step 06",
  rebuild: "Cause fixed · step 04 · re-run",
  cross: "Passed · step 06",
  goal: "Run passed · 6 / 6",
};

export function HeroWorld() {
  const reduce = useCalm();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Server and first client render agree on "walk"; the first drawn frame reports the real
  // phase, which is "goal" when motion is reduced.
  const [phase, setPhase] = useState<HeroPhase>("walk");
  const sectionRef = useRef<HTMLElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const copy = useCopyBoxes(sectionRef);
  // The callout box and its stem, in CSS pixels relative to the section.
  const [tag, setTag] = useState({ x: -999, y: 0, stemX: 0, stemY: 0, stemH: 0 });
  const lastTag = useRef("");
  const lastPhase = useRef<HeroPhase>(phase);

  usePixelCanvas(
    canvasRef,
    ({ px, scale, seconds }: Frame) => {
      const st = reduce ? { phase: "goal" as const, local: 1 } : heroState(seconds);
      const { groundY, gap0, gap1, start, goal } = layout(px.w, px.h);
      const plankX = gap0 + 12;
      const s: Scene = { px, cam: 0, groundY, t: seconds };
      const edge = (gap0 - 7 - start) / (goal - 8 - start);
      const pos = heroTrack(st, edge);
      const rx = Math.round(start + pos * (goal - 8 - start));

      const sunX = px.w < 200 ? 0.78 : 0.8;
      // No star ever sits behind a word, and the far ridge never climbs into the copy: if it
      // would, the hills are drawn a little lower.
      const words = toBuffer(copy.current, scale, 4);
      landscapeUnder(s, sunX, px.w < 200 ? 0.8 : 0.6, words);
      clearStars(px, words);
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
      }

      // The step callout sits in clear sky above the ridge, beside its stem, away from the copy
      // and the sun. Placed from the drawn frame so it follows the ridge at every width.
      const el = tagRef.current;
      const size = { w: Math.ceil((el?.offsetWidth ?? (px.w < 200 ? 196 : 216)) / scale) + 1, h: Math.ceil((el?.offsetHeight ?? 60) / scale) + 1 };
      const r = Math.round(Math.min(px.w * 0.11, px.h * 0.2));
      const sun = { x: Math.round(px.w * sunX) - r - 3, y: Math.round(groundY - px.h * 0.2 - r * 0.6) - r - 3, w: 2 * r + 6, h: 2 * r + 6 };
      const stemX = plankX + 5;
      const plankTop = groundY - 6;
      const box = placeCallout(px, stemX, plankTop - 8, size, [...toBuffer(copy.current, scale, 3), sun]);
      if (!box) {
        if (lastTag.current !== "none") {
          lastTag.current = "none";
          setTag({ x: -9999, y: 0, stemX: 0, stemY: 0, stemH: 0 });
        }
        return;
      }
      // The box hangs off its stem: the stem meets the box 10px in from the near edge.
      const stemCss = (stemX + 0.5) * scale - 1;
      const elW = el?.offsetWidth ?? size.w * scale;
      const next = { x: Math.round(box.x < stemX - 2 ? stemCss + 12 - elW : stemCss - 10), y: box.y * scale, stemX: stemCss, stemY: (box.y + box.h) * scale, stemH: (plankTop - box.y - box.h) * scale };
      const key = JSON.stringify(next);
      if (key !== lastTag.current) {
        lastTag.current = key;
        setTag(next);
      }
    },
    { pixel: heroPixel, still: reduce },
  );

  const showTag = phase !== "walk" && tag.x > -9999;
  const broken = phase === "break" || phase === "scan";

  return (
    <section ref={sectionRef} data-phase={phase} className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col md:min-h-[max(40rem,calc(100svh-4rem))] overflow-hidden bg-[#090909] text-[#eceae3]" aria-labelledby="pw-hero-title">
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
            transition={{ duration: DUR.fast, ease: EASE }}
            className="pointer-events-none absolute inset-0 z-10"
          >
            <div ref={tagRef} className={`absolute border-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] md:text-[11px] ${broken ? "border-[#eceae3] bg-[#090909] text-[#eceae3]" : "border-[#f4d44d] bg-[#f4d44d] text-black"}`} style={{ left: tag.x, top: tag.y }}>
              <p className="whitespace-nowrap">Step 06 · refund.issue</p>
              <p className={`mt-1 whitespace-nowrap ${broken ? "text-[#eceae3]/70" : "text-black/70"}`}>{broken ? "502 · hung 5000 ms" : "passing again"}</p>
            </div>
            <div className={`absolute w-[2px] ${broken ? "bg-[#eceae3]" : "bg-[#f4d44d]"}`} style={{ left: tag.stemX, top: tag.stemY, height: Math.max(0, tag.stemH) }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto w-full max-w-[1400px] px-5 pt-5 sm:pt-[clamp(1.5rem,5.5svh,4.5rem)] md:px-10">
        <p data-clear className="inline-flex items-center gap-2 border border-[#eceae3]/40 bg-[#090909] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]">
          <span className="size-1.5 shrink-0 animate-pulse bg-[#f4d44d]" />
          <span className="sm:hidden">For Claude Code, Cursor and Codex builds</span>
          <span className="hidden sm:inline">Agent observability for Claude Code, Cursor and Codex builds</span>
        </p>
        <h1 id="pw-hero-title" className={`mt-5 sm:mt-6 ${HERO}`}>
          <span data-clear className="inline-block max-w-[11ch]">See the step that broke.</span>
        </h1>
        <p data-clear className="mt-4 max-w-[34rem] text-[15px] leading-6 text-[#eceae3]/85 sm:mt-5 sm:text-base sm:leading-7 md:mt-6 md:text-lg md:leading-8">
          Your agent takes dozens of steps every run. Uncoil records each one, points at the step that failed and shows what it cost, so you can fix it and keep walking.
        </p>
        <div data-clear className="mt-6 flex w-fit flex-wrap gap-4 md:mt-8">
          <Link href={appHref("/sign-up")} className={primary("ink")}>
            Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <a href="#pw-setup" className={secondary("ink")}>
            Get the prompt <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
          </a>
        </div>
        {/* Keeps the pixel ground clear of the copy on phones. */}
        <div className="h-[clamp(9rem,30svh,16rem)] sm:h-[34svh] md:hidden" aria-hidden="true" />
      </div>

      <div className="relative mt-auto flex items-center justify-between gap-4 border-t-2 border-[#eceae3] bg-[#090909] py-3 pl-5 pr-20 font-mono text-[10px] uppercase tracking-[0.14em] md:pl-10 md:pr-24">
        <span className="text-[#eceae3]/60">Example run<span className="hidden sm:inline"> · support-agent</span></span>
        <span className="flex items-center gap-2" aria-live="off">
          <span className={`size-2 ${phase === "cross" || phase === "goal" || phase === "rebuild" || phase === "scan" ? "bg-[#f4d44d]" : "bg-[#eceae3]"}`} />
          {STATUS[phase]}
        </span>
      </div>
    </section>
  );
}
