"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useInView } from "framer-motion";
import { appHref } from "@/lib/app-links";
import { YELLOW, flag, pines, type Scene } from "../pixel-world/pixels";
import { bridgeArt, gantrySign, groundArt, robotInFront, stoneSign } from "./hero-art";
import { useGridCanvas } from "./use-grid";
import { clamp01, ease } from "../pixel-world/world";
import { CopyPromptButton } from "./copy-prompt";
import { clearStars, landscapeUnder, toBuffer, useCopyBoxes } from "./sky";
import { causeStone, stepStones } from "./steps-art";
import { BODY, HERO, LABEL, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

/**
 * The closing scene pays off the journey: the plank Uncoil marked is now yellow, the robot
 * walks across it and the flag goes up. It plays once when the scene comes into view.
 */
export function ClosingWorld() {
  const reduce = useCalm();
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
      const groundY = Math.round(px.h * (narrow ? 0.84 : 0.8));
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
      const r = Math.round(Math.min(px.w * 0.11, px.h * 0.2));
      const cy = groundY - px.h * 0.2 - r * 0.6;
      const near = toBuffer(copy.current, scale, 2).filter((b) => b.y < cy + r && b.y + b.h > cy - r);
      const right = Math.max(0, ...near.map((b) => b.x + b.w));
      const sunX = Math.min((px.w - r - 2) / px.w, Math.max(narrow ? 0.78 : 0.8, (right + r + 4) / px.w));
      landscapeUnder(s, sunX, 0.7, words);
      clearStars(px, words);
      pines(s, [[gap0 - 30, gap1 + 4], [goal - 14, goal + 30]], 1);
      groundArt(s, [[gap0, gap1]], (wx) => (wx >= start && wx < rx + 6 ? YELLOW : undefined));
      bridgeArt(px, gap0, gap1, groundY, -1);
      // The run's two marked steps, both whole now: step 04 fixed in yellow, step 06 passing.
      const four = stepStones(gap0)[3];
      if (four > 2) {
        causeStone(px, four, groundY, true);
        stoneSign(px, 4, four, groundY, "lit");
      }
      gantrySign(px, gap0 + 12, gap1, groundY, "lit");
      flag(px, goal, groundY - 3, clamp01((t - 3) / 0.8));
      robotInFront(px, rx, groundY - 3, walk > 0 && walk < 1 ? Math.floor(seconds * 8) : 0);
    },
    { still: reduce },
  );

  return (
    <section ref={sectionRef} id="close" className="relative isolate flex min-h-[max(40rem,84svh)] flex-col overflow-hidden bg-[#090909] text-[#eceae3]" aria-labelledby="mix-close-title">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      <div className="mx-auto w-full max-w-[1360px] px-5 pt-14 md:px-10 md:pt-16">
        <p data-clear className={`w-fit text-[#eceae3]/60 ${LABEL}`}>Run passed · 6 / 6 · your turn</p>
        <h2 id="mix-close-title" className={`mt-6 ${HERO}`}>
          <span data-clear className="block w-fit">Know which step broke.</span>
          <span data-clear className="block w-fit">Before your users do.</span>
        </h2>
        <p data-clear className={`mt-6 max-w-xl text-[#eceae3]/85 ${BODY}`}>Every run recorded. When one fails, the step that caused it comes marked.</p>
        <div data-clear className="mt-8 grid w-full gap-4 sm:flex sm:w-fit sm:flex-wrap">
          <Link href={appHref("/sign-up")} className={`w-full sm:w-auto ${primary("ink")}`}>
            Start tracing free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <CopyPromptButton wide className={secondary("ink")} />
        </div>
      </div>
    </section>
  );
}
