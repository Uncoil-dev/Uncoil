"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, RotateCcw, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CREAM, PALE, RED, YELLOW, brokenStep, bridge, flag, ground, pines, rebuild, reticle, robot, type Scene } from "../pixel-world/pixels";
import { ease } from "../pixel-world/world";
import { HURRY, breakTarget, focusStep, heroState, scanAt, type HeroPhase } from "./hero-clock";
import { usePixelCanvas, type Frame } from "../pixel-world/use-pixel-canvas";
import { CopyPromptButton } from "./copy-prompt";
import { clearStars, landscapeUnder, placeCallout, toBuffer, useCopyBoxes } from "./sky";
import { causeStone, stepStones, stepTag } from "./steps-art";
import { DUR, EASE, HERO, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

const heroPixel = (w: number) => (w < 640 ? 4 : w < 1100 ? 5 : 6);

function layout(w: number, h: number) {
  // On phones the copy fills the top of the screen, so the ground sits low and the scene
  // still lands inside the first screen.
  const groundY = Math.round(h * (w < 200 ? 0.87 : 0.79));
  const gap0 = Math.round(w * (w < 200 ? 0.62 : 0.58));
  return { groundY, gap0, gap1: gap0 + 36, start: Math.round(w * 0.04), goal: Math.round(w * 0.93) };
}

/** Robot position on the track: 0 is the start, `edge` the gap, 1 the flag. */
function track(phase: HeroPhase, local: number, edge: number) {
  if (phase === "walk") return edge * local;
  if (phase === "cross") return edge + (1 - edge) * ease(local);
  if (phase === "goal") return 1;
  return edge;
}

const STATUS_SHORT: Record<HeroPhase, string> = { walk: "Step 05", fail: "Failed · 06", trace: "06 → 04", mark: "Cause · 04", repair: "Fixing 04", cross: "Passed · 06", goal: "Passed · 6/6" };

const STATUS: Record<HeroPhase, string> = {
  walk: "Recording · step 05",
  fail: "Failed · step 06",
  trace: "Reading back · 06 → 05 → 04",
  mark: "Cause · step 04 · 0 results",
  repair: "Fixing step 04 · re-run",
  cross: "Passed · step 06",
  goal: "Run passed · 6 / 6",
};

/** What the callout over the scene says, per phase: the step it points at, and one line about it. */
const CALLOUT: Record<HeroPhase, [string, string]> = {
  walk: ["Step 06 · refund.issue", "Click to break it"],
  fail: ["Step 06 · refund.issue", "502 · hung 5000 ms"],
  trace: ["Step 06 · refund.issue", "failed here. Reading back"],
  mark: ["Step 04 · docs.search", "0 results · the cause"],
  repair: ["Step 04 · docs.search", "fixed · re-running"],
  cross: ["Step 06 · refund.issue", "passing again"],
  goal: ["Step 06 · refund.issue", "passing again"],
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
  const [tag, setTag] = useState({ x: -9999, y: 0, stemX: 0, stemY: 0, stemH: 0 });
  const lastTag = useRef("");
  const lastPhase = useRef<HeroPhase>(phase);
  // The scene's own clock: it runs in real time, and hurries ahead when the visitor breaks the step.
  const clock = useRef({ v: 0, last: -1, target: -1 });
  const breakIt = () => {
    const c = clock.current;
    if (c.target < 0) c.target = breakTarget(c.v);
  };

  usePixelCanvas(
    canvasRef,
    ({ px, scale, seconds }: Frame) => {
      const c = clock.current;
      const dt = c.last < 0 ? 0 : Math.min(0.1, seconds - c.last);
      c.last = seconds;
      c.v += dt * (c.target >= 0 ? HURRY : 1);
      if (c.target >= 0 && c.v >= c.target) {
        c.v = c.target;
        c.target = -1;
      }
      const vt = c.v;
      const st = reduce ? { phase: "goal" as const, local: 1 } : heroState(vt);
      const { groundY, gap0, gap1, start, goal } = layout(px.w, px.h);
      const plankX = gap0 + 12;
      const stones = stepStones(gap0);
      const four = stones[3];
      const s: Scene = { px, cam: 0, groundY, t: seconds };
      const edge = (gap0 - 7 - start) / (goal - 8 - start);
      const rx = Math.round(start + track(st.phase, st.local, edge) * (goal - 8 - start));

      const sunX = px.w < 200 ? 0.8 : 0.8;
      // No star ever sits behind a word, and the far ridge never climbs into the copy: if it
      // would, the hills are drawn a little lower.
      const words = toBuffer(copy.current, scale, 6);
      landscapeUnder(s, sunX, px.w < 200 ? 0.8 : 0.6, words);
      clearStars(px, words);
      pines(s, [[four - 20, gap1 + 4], [goal - 10, goal + 30]], 1);
      const passed = st.phase === "cross" || st.phase === "goal";
      ground(s, [[gap0, gap1]], passed ? rx + 6 : -1, start);
      bridge(s, gap0, gap1, 1);

      // Step 04 returned nothing: its stone is hollow until the fix lands.
      const fixed = st.phase === "repair" ? st.local >= 1 : passed;
      causeStone(px, four, groundY, fixed);
      if (st.phase === "repair") rebuild(px, four, groundY - 3, 12, 3, st.local);

      // Step 06, the plank: whole while walking, red and falling when it fails, whole again on the re-run.
      if (st.phase === "walk" || passed) px.rect(plankX, groundY - 2, 11, 3, CREAM);
      if (st.phase === "fail") {
        const shake = st.local < 0.45;
        brokenStep({ ...s, groundY: groundY + (shake && Math.floor(vt * 30) % 2 ? 1 : 0) }, plankX, 11, shake ? 0 : (st.local - 0.45) / 0.55);
      }
      if (st.phase === "trace" || st.phase === "mark" || st.phase === "repair") brokenStep(s, plankX, 11, 1);

      // Uncoil's scan walks back along the run from 06 to 04, leaving a dotted trail.
      if (st.phase === "trace" || st.phase === "mark" || st.phase === "repair") {
        const k = scanAt(st);
        const sx = Math.round(plankX + (four - plankX) * k);
        for (let x = sx + 6; x < plankX + 6; x += 3) px.set(x, groundY - 7, YELLOW);
        const lock = st.phase === "trace" ? 0.55 : st.phase === "mark" ? 0.55 + 0.45 * st.local : 1;
        reticle(px, sx, groundY - 3, st.phase === "trace" ? 11 : 12, 3, lock);
      }

      // Step tags in the ground under each step.
      const tagY = groundY + 4;
      stones.forEach((x, i) => {
        if (x < 2) return;
        const n = i + 1;
        const lit = n === 4 && st.phase !== "walk" && st.phase !== "fail" && !(st.phase === "trace" && scanAt(st) < 1);
        stepTag(px, n, x + 6, tagY, lit ? YELLOW : PALE);
      });
      stepTag(px, 6, plankX + 5, tagY + 1, st.phase === "fail" ? RED : passed ? YELLOW : PALE);

      flag(px, goal, groundY - 3, st.phase === "goal" ? Math.min(1, st.local * 2.5) : 0);
      const walking = st.phase === "walk" || st.phase === "cross";
      robot(px, rx, groundY - 3, walking ? Math.floor(vt * 8) : 0, st.phase === "fail" || st.phase === "trace");

      if (st.phase !== lastPhase.current) {
        lastPhase.current = st.phase;
        setPhase(st.phase);
      }

      // The callout sits in clear sky above the ridge, on a stem down to the step it names, away
      // from the copy and the sun. Placed from the drawn frame so it follows the ridge at every width.
      const el = tagRef.current;
      const size = { w: Math.ceil((el?.offsetWidth ?? (px.w < 200 ? 196 : 216)) / scale) + 1, h: Math.ceil((el?.offsetHeight ?? 60) / scale) + 1 };
      const r = Math.round(Math.min(px.w * 0.11, px.h * 0.2));
      const sun = { x: Math.round(px.w * sunX) - r - 3, y: Math.round(groundY - px.h * 0.2 - r * 0.6) - r - 3, w: 2 * r + 6, h: 2 * r + 6 };
      const stemX = focusStep(st.phase) === 4 ? four + 6 : plankX + 5;
      const stepTop = groundY - 8;
      const box = placeCallout(px, stemX, stepTop - 8, size, [...toBuffer(copy.current, scale, 3), sun]);
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
      const next = { x: Math.round(box.x < stemX - 2 ? stemCss + 12 - elW : stemCss - 10), y: box.y * scale, stemX: stemCss, stemY: (box.y + box.h) * scale, stemH: (stepTop - box.y - box.h) * scale };
      const key = JSON.stringify(next);
      if (key !== lastTag.current) {
        lastTag.current = key;
        setTag(next);
      }
    },
    { pixel: heroPixel, still: reduce },
  );

  const showTag = tag.x > -9999 && !(reduce && phase === "walk");
  const waiting = phase === "walk";
  const passed = phase === "cross" || phase === "goal";
  const playing = !waiting && !passed;
  const [title, line] = CALLOUT[phase];
  const mode = waiting ? "waiting" : passed ? "passed" : phase === "fail" ? "failed" : focusStep(phase) === 4 ? "cause" : "tracing";

  return (
    <section ref={sectionRef} data-phase={phase} className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col md:min-h-[max(40rem,calc(100svh-4rem))] overflow-hidden bg-[#090909] text-[#eceae3]" aria-labelledby="pw-hero-title">
      <div className={`absolute inset-0 -z-10 overflow-hidden ${reduce ? "" : "cursor-pointer"}`} aria-hidden="true" onClick={reduce ? undefined : breakIt}>
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>

      <AnimatePresence>
        {showTag && (
          <motion.div
            key={mode}
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className="pointer-events-none absolute inset-0 z-10"
          >
            <div
              ref={tagRef}
              onClick={waiting ? breakIt : undefined}
              className={`absolute border-2 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] md:text-[11px] ${
                waiting
                  ? "pointer-events-auto cursor-pointer border-dashed border-[#eceae3] bg-[#090909] text-[#eceae3] hover:border-solid hover:border-[#f4d44d]"
                  : mode === "cause"
                    ? "border-[#f4d44d] bg-[#090909] text-[#eceae3]"
                    : passed
                      ? "border-[#eceae3] bg-[#eceae3] text-black"
                      : "border-[#eceae3] bg-[#090909] text-[#eceae3]"
              }`}
              style={{ left: tag.x, top: tag.y }}
            >
              <p className="whitespace-nowrap">{title}</p>
              <p className={`mt-1 whitespace-nowrap ${waiting || mode === "cause" ? "text-[#f4d44d]" : passed ? "text-black/70" : "text-[#eceae3]/70"}`}>{line}</p>
            </div>
            <div className={`absolute w-[2px] ${waiting ? "bg-[repeating-linear-gradient(to_bottom,#eceae3_0_4px,transparent_4px_8px)]" : mode === "cause" ? "bg-[#f4d44d]" : "bg-[#eceae3]"}`} style={{ left: tag.stemX, top: tag.stemY, height: Math.max(0, tag.stemH) }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto w-full max-w-[1360px] px-5 pt-5 sm:pt-[clamp(1.5rem,5.5svh,4.5rem)] md:px-10">
        <p data-clear className="inline-flex max-w-full items-start gap-2 border border-[#eceae3]/40 bg-[#090909] px-3 py-1.5 font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-[#eceae3] sm:tracking-[0.16em]">
          <span className="mt-[5px] size-1.5 shrink-0 animate-pulse bg-[#f4d44d]" />
          <span>Agent observability for Claude Code, Cursor and Codex builds</span>
        </p>
        <h1 id="pw-hero-title" className={`mt-5 sm:mt-6 ${HERO}`}>
          <span data-clear className="inline-block max-w-[11ch]">See the step that broke.</span>
        </h1>
        <p data-clear className="mt-4 max-w-[34rem] text-[15px] leading-6 text-[#eceae3]/85 sm:mt-5 sm:text-base sm:leading-7 md:mt-6 md:text-lg md:leading-8">
          Your agent takes dozens of steps every run. Uncoil records each one, so when a run fails you can walk it back to the step that caused it, see what it cost, fix it and run again.
        </p>
        <div data-clear className="mt-6 grid w-full gap-4 sm:flex sm:w-fit sm:flex-wrap md:mt-8">
          <Link href={appHref("/sign-up")} className={`w-full sm:w-auto ${primary("ink")}`}>
            Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <CopyPromptButton wide className={secondary("ink")} />
        </div>
        {/* Keeps the pixel ground clear of the copy on phones. */}
        <div className="h-[clamp(9rem,30svh,16rem)] sm:h-[34svh] md:hidden" aria-hidden="true" />
      </div>

      <div className="relative mt-auto border-t-2 border-[#eceae3] bg-[#090909] font-mono text-[10px] uppercase tracking-[0.14em]">
        <div className="mx-auto flex min-h-12 w-full max-w-[1360px] items-center justify-between gap-4 pl-5 pr-20 md:pl-10 md:pr-24 min-[1560px]:pr-10">
          {reduce ? (
            <span className="text-[#eceae3]/60">Example run<span className="hidden sm:inline"> · support-agent</span></span>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!playing) breakIt();
              }}
              aria-disabled={playing}
              className={`group -ml-2 inline-flex min-h-11 items-center gap-2 px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#f4d44d] ${playing ? "cursor-default text-[#eceae3]/50" : "text-[#eceae3] hover:text-[#f4d44d]"}`}
            >
              {passed ? <RotateCcw className="size-3.5" aria-hidden="true" /> : <Zap className="size-3.5" aria-hidden="true" />}
              <span className="sm:hidden">{playing ? "Tracing back" : passed ? "Break again" : "Break it"}</span>
              <span className="hidden sm:inline">{playing ? "Walking back to the cause" : passed ? "Break it again" : "Break step 06 yourself"}</span>
            </button>
          )}
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className={`size-2 ${phase === "fail" ? "bg-[#ff4d3d]" : waiting ? "bg-[#eceae3]" : "bg-[#f4d44d]"}`} />
            <span className="sm:hidden">{STATUS_SHORT[phase]}</span>
            <span className="hidden sm:inline">{STATUS[phase]}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
