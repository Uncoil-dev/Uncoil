"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useInView } from "framer-motion";
import { appHref } from "@/lib/app-links";
import { YELLOW, flag, pines, type Scene } from "./pixels";
import { bridgeArt, gantrySign, groundArt, robotInFront, stoneSign } from "./hero-art";
import { useGridCanvas } from "./use-grid";
import { clamp01, ease } from "./math";
import { CopyPromptButton } from "./copy-prompt";
import { MORNING, clearStars, landscapeUnder, sunDisc, toBuffer, useCopyBoxes } from "./sky";
import { useCase } from "./case-state";
import { causeStone, stepStones } from "./steps-art";
import { BODY, HERO, LABEL, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

/**
 * The closing scene pays off the journey in full morning: the sky is cream, the sun stands high
 * and whole, the step Uncoil marked is yellow, the robot walks across and the flag goes up. The
 * scene is drawn like the night scenes and then has ink and cream swapped, so it is the same world
 * by day. It plays once when the scene comes into view.
 */
export function ClosingWorld() {
  const reduce = useCalm();
  const c = useCase();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.35 });
  const startedAt = useRef<number | null>(null);
  const copy = useCopyBoxes(sectionRef);

  useGridCanvas(
    canvasRef,
    ({ px, scale, seconds }) => {
      if (inView && startedAt.current === null) startedAt.current = seconds;
      const t = reduce ? 99 : startedAt.current === null ? 0 : seconds - startedAt.current;
      const narrow = px.w < 140;
      // The ground sits low enough that the tallest sign on it stays clear of the copy above.
      const copyEnd = Math.max(0, ...toBuffer(copy.current, scale, 0).map((b) => b.y + b.h));
      const groundY = Math.min(px.h - 12, Math.max(Math.round(px.h * (narrow ? 0.84 : 0.8)), copyEnd + 24));
      const gap0 = Math.round(px.w * (narrow ? 0.38 : 0.46));
      const gap1 = gap0 + 36;
      const start = gap0 - (narrow ? 20 : 40);
      const goal = Math.round(px.w * (narrow ? 0.86 : 0.8));
      const walk = ease(clamp01((t - 0.4) / 2.6));
      const rx = Math.round(start + (goal - 8 - start) * walk);
      const s: Scene = { px, cam: 0, groundY, t: seconds };

      // The sun sits to the right of the copy, never behind a word and never cut by the screen
      // edge; the ridges settle under the copy, so no line runs through the buttons.
      const words = toBuffer(copy.current, scale, 4);
      let day = MORNING;
      const { r, cy } = sunDisc(px.w, px.h, groundY, 0.8, day);
      const near = toBuffer(copy.current, scale, 2).filter((b) => b.y < cy + r && b.y + b.h > cy - r);
      const right = Math.max(0, ...near.map((b) => b.x + b.w));
      // Where the copy leaves no room beside it (phones), the sun stands lower, under the copy,
      // still whole and clear of the hills.
      if (right + 2 * r + 6 > px.w) {
        const room = (groundY - px.h * 0.08 - r - copyEnd - 3) / (px.h * 0.12 + r * 0.6);
        day = { ...MORNING, sun: Math.max(0.5, Math.min(MORNING.sun, room)) };
      }
      const sunX = Math.min((px.w - r - 2) / px.w, Math.max(narrow ? 0.78 : 0.8, (right + r + 4) / px.w));
      landscapeUnder(s, right + 2 * r + 6 > px.w ? 0.74 : sunX, narrow ? 0.45 : 0.7, words, day);
      clearStars(px, words);
      pines(s, [[gap0 - 30, gap1 + 4], [goal - 14, goal + 30]], 1);
      groundArt(s, [[gap0, gap1]], (wx) => (wx >= start && wx < rx + 6 ? YELLOW : undefined));
      bridgeArt(px, gap0, gap1, groundY, -1);
      // The run's marked steps, whole now: the cause fixed in yellow, step 06 passing.
      const cause = c.cause < 6 ? stepStones(gap0)[c.cause - 1] : -1;
      if (cause > 2) {
        causeStone(px, cause, groundY, true);
        stoneSign(px, c.cause, cause, groundY, "lit-swapped");
      }
      gantrySign(px, gap0 + 12, gap1, groundY, "lit-swapped");
      flag(px, goal, groundY - 3, clamp01((t - 3) / 0.8));
      robotInFront(px, rx, groundY - 3, walk > 0 && walk < 1 ? Math.floor(seconds * 8) : 0);
      px.swap();
    },
    { still: reduce, redraw: c.id },
  );

  return (
    <section ref={sectionRef} id="close" className="relative isolate flex min-h-[max(38rem,80svh)] flex-col overflow-hidden bg-[#eceae3] text-[#090909]" aria-labelledby="mix-close-title">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      <div className="mx-auto w-full max-w-[1360px] px-5 pt-10 md:px-10 md:pt-12">
        <p data-clear className={`w-fit text-black/60 ${LABEL}`}>Run passed · 6 / 6 · morning · your turn</p>
        <h2 id="mix-close-title" className={`mt-6 ${HERO}`}>
          <span data-clear className="block w-fit">Know which step broke.</span>
          <span data-clear className="block w-fit">Before your users do.</span>
        </h2>
        <p data-clear className={`mt-6 max-w-xl text-black/80 ${BODY}`}>Every run recorded. When one fails, the step that caused it comes marked.</p>
        <div data-clear className="mt-8 grid w-full gap-4 sm:flex sm:w-fit sm:flex-wrap">
          <Link href={appHref("/sign-up")} className={`w-full sm:w-auto ${primary("cream")}`}>
            Start tracing free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <CopyPromptButton wide className={secondary("cream")} />
        </div>
        {/* On phones the copy fills the width, so the scene gets its own room below it. */}
        <div className="h-[clamp(16rem,46svh,21rem)] md:hidden" aria-hidden="true" />
      </div>
    </section>
  );
}
