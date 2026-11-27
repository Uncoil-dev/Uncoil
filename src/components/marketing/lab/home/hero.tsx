"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, RotateCcw, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CREAM, PALE, YELLOW, flag, pines, rebuild, type Scene } from "../pixel-world/pixels";
import { ease } from "../pixel-world/world";
import { HURRY, breakTarget, focusStep, heroState, scanAt, type HeroPhase } from "./hero-clock";
import { brackets, bridgeArt, brokenPlank, gantrySign, groundArt, robotInFront, stem, stoneSign } from "./hero-art";
import { useGridCanvas, type Frame } from "./use-grid";
import { CopyPromptButton } from "./copy-prompt";
import { clearStars, landscapeUnder, placeCallout, toBuffer, useCopyBoxes } from "./sky";
import { causeStone, stepStones } from "./steps-art";
import { DUR, EASE, HERO, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

/** The callout's box in CSS px, on the scene's grid; `b` is its border, one cell wide. */
const HIDDEN = { x: -9999, y: 0, w: 0, h: 0, b: 0 };

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
  // The callout box in CSS pixels relative to the section; its stem is drawn in the scene.
  const [tag, setTag] = useState(HIDDEN);
  const lastTag = useRef("");
  const lastPhase = useRef<HeroPhase>(phase);
  // The scene's own clock: it runs in real time, and hurries ahead when the visitor breaks the step.
  const clock = useRef({ v: 0, last: -1, target: -1 });
  const breakIt = () => {
    const c = clock.current;
    if (c.target < 0) c.target = breakTarget(c.v);
  };

  useGridCanvas(
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
      // The robot stops on the bridge's first plank, right before step 06.
      const edge = (gap0 + 5 - start) / (goal - 8 - start);
      const rx = Math.round(start + track(st.phase, st.local, edge) * (goal - 8 - start));

      const sunX = 0.8;
      // No star ever sits behind a word, and the far ridge never climbs into the copy: if it
      // would, the hills are drawn a little lower.
      const words = toBuffer(copy.current, scale, 6);
      landscapeUnder(s, sunX, px.w < 200 ? 0.8 : 0.6, words);
      clearStars(px, words);
      pines(s, [[four - 20, gap1 + 4], [goal - 10, goal + 30]], 1);

      const passed = st.phase === "cross" || st.phase === "goal";
      const tracing = st.phase === "trace" || st.phase === "mark" || st.phase === "repair";
      const shake = st.phase === "fail" && st.local < 0.45;
      const jolt = shake && Math.floor(vt * 30) % 2 ? 1 : 0;
      // Uncoil's scan reads the run back from step 06 to step 04; everything it has read lights up.
      const k = tracing ? scanAt(st) : 0;
      const scanX = Math.round(plankX + (four - plankX) * k);
      const read = (x: number) => tracing && x + 12 > scanX && x < plankX;
      groundArt(s, [[gap0, gap1]], (wx) => (passed && wx >= start && wx < rx + 6 ? YELLOW : read(wx) ? PALE : undefined));
      bridgeArt(px, gap0, gap1, groundY, 1, (x) => (tracing && x >= scanX ? PALE : CREAM), (x) => (read(x) ? PALE : CREAM));

      // Step 04 returned nothing: its stone is hollow until the fix lands.
      const fixed = st.phase === "repair" ? st.local >= 1 : passed;
      causeStone(px, four, groundY, fixed);
      if (st.phase === "repair") rebuild(px, four, groundY - 3, 12, 3, st.local);

      // Step 06, the plank: whole while walking, cracking and falling when it fails, whole again on the re-run.
      if (st.phase === "walk" || passed) px.rect(plankX, groundY - 2, 11, 3, CREAM);
      if (st.phase === "fail") brokenPlank(px, plankX, groundY + jolt, st.local > 0.15, shake ? 0 : (st.local - 0.45) / 0.55);
      if (tracing) brokenPlank(px, plankX, groundY, true, 1);

      // Every step carries its number on a board: 01 to 05 on signposts on their stones, 06 on the
      // bridge's gantry. 04 turns yellow once the scan has found it; 06 is red while it is failing.
      const found = st.phase === "mark" || st.phase === "repair" || passed || (st.phase === "trace" && k >= 1);
      const boards = stones.map((x, i) => (x < 1 ? null : stoneSign(px, i + 1, x, groundY, i === 3 && found ? "lit" : "plain")));
      const six = gantrySign(px, plankX, gap1, groundY, passed ? "lit" : st.phase === "walk" ? "plain" : "failed", jolt);
      const four4 = boards[3];
      if (tracing && four4) {
        const box = { x: Math.round(six.x + (four4.x - six.x) * k), y: Math.round(six.y + (four4.y - six.y) * k), w: six.w, h: six.h };
        brackets(px, box, st.phase === "trace" ? 3 : st.phase === "mark" ? Math.round(3 - 2 * st.local) : 1);
      }

      flag(px, goal, groundY - 3, st.phase === "goal" ? Math.min(1, st.local * 2.5) : 0);
      const walking = st.phase === "walk" || st.phase === "cross";
      // On the bridge the planks sit one cell lower than the stones.
      const onBridge = rx - 5 >= gap0 && rx + 4 < gap1;
      robotInFront(px, rx, groundY - (onBridge ? 2 : 3), walking ? Math.floor(vt * 8) : 0, st.phase === "fail" || st.phase === "trace", true);

      if (st.phase !== lastPhase.current) {
        lastPhase.current = st.phase;
        setPhase(st.phase);
      }

      // The callout sits in clear sky above the ridge, on a one-cell stem down to the board it
      // names, away from the copy and the sun. Its frame is drawn on the same grid as the scene.
      const el = tagRef.current;
      const size = { w: Math.ceil((el?.offsetWidth ?? (px.w < 200 ? 196 : 216)) / scale) + 2, h: Math.ceil((el?.offsetHeight ?? 52) / scale) + 2 };
      const r = Math.round(Math.min(px.w * 0.11, px.h * 0.2));
      const sun = { x: Math.round(px.w * sunX) - r - 3, y: Math.round(groundY - px.h * 0.2 - r * 0.6) - r - 3, w: 2 * r + 6, h: 2 * r + 6 };
      const onFour = focusStep(st.phase) === 4 && four4;
      const stemX = onFour ? four4.x + 5 : six.x + 5;
      const stemTo = onFour ? four4.y - (st.phase === "mark" || st.phase === "repair" ? 2 : 0) : six.top;
      const box = placeCallout(px, stemX, stemTo - 4, size, [...toBuffer(copy.current, scale, 3), sun]);
      const cause = onFour;
      if (box) stem(px, stemX, box.y + box.h, stemTo, cause ? YELLOW : CREAM, st.phase === "walk");
      const next = box ? { x: box.x * scale, y: box.y * scale, w: box.w * scale, h: box.h * scale, b: scale } : HIDDEN;
      const key = JSON.stringify(next);
      if (key !== lastTag.current) {
        lastTag.current = key;
        setTag(next);
      }
    },
    { still: reduce },
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
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            onClick={waiting ? breakIt : undefined}
            className={`absolute z-10 flex items-center justify-center border-solid text-left font-mono text-[10px] uppercase tracking-[0.12em] md:text-[11px] ${
              waiting
                ? "cursor-pointer border-[#eceae3] bg-[#090909] text-[#eceae3] hover:border-[#f4d44d]"
                : mode === "cause"
                  ? "pointer-events-none border-[#f4d44d] bg-[#090909] text-[#eceae3]"
                  : passed
                    ? "pointer-events-none border-[#eceae3] bg-[#eceae3] text-black"
                    : "pointer-events-none border-[#eceae3] bg-[#090909] text-[#eceae3]"
            }`}
            style={{ left: tag.x, top: tag.y, width: tag.w, height: tag.h, borderWidth: tag.b }}
          >
            <div ref={tagRef} className="px-3 py-2">
              <p className="whitespace-nowrap">{title}</p>
              <p className={`mt-1 whitespace-nowrap ${waiting || mode === "cause" ? "text-[#f4d44d]" : passed ? "text-black/70" : "text-[#eceae3]/70"}`}>{line}</p>
            </div>
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
