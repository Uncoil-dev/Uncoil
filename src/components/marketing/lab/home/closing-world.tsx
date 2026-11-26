"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useInView } from "framer-motion";
import { appHref } from "@/lib/app-links";
import { YELLOW, bridge, flag, ground, landscape, pines, robot, type Scene } from "../pixel-world/pixels";
import { usePixelCanvas } from "../pixel-world/use-pixel-canvas";
import { clamp01, ease } from "../pixel-world/world";
import { CopyPromptButton } from "./copy-prompt";
import { clearStars, toBuffer, useCopyBoxes } from "./sky";
import { BODY, HERO, LABEL, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

const closingPixel = (w: number) => (w < 640 ? 4 : w < 1100 ? 5 : 6);

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

  usePixelCanvas(
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

      // The sun sits to the right of the copy, never behind a word.
      const words = toBuffer(copy.current, scale, 4);
      const r = Math.round(Math.min(px.w * 0.11, px.h * 0.2));
      const sunTop = groundY - px.h * 0.2 - r * 1.6;
      const right = Math.max(0, ...words.filter((b) => b.y + b.h > sunTop).map((b) => b.x + b.w));
      const sunX = Math.min(0.9, Math.max(narrow ? 0.78 : 0.8, (right + r + 4) / px.w));
      landscape(s, sunX, 0.7);
      clearStars(px, words);
      pines(s, [[gap0 - 14, gap1 + 4], [goal - 14, goal + 30]], 1);
      ground(s, [[gap0, gap1]], rx + 6, start);
      bridge(s, gap0, gap1, -1);
      px.rect(gap0 + 12, groundY - 2, 11, 3, YELLOW);
      px.rect(gap0, groundY - 3, gap1 - gap0, 1, YELLOW);
      flag(px, goal, groundY - 3, clamp01((t - 3) / 0.8));
      robot(px, rx, groundY - 3, walk > 0 && walk < 1 ? Math.floor(seconds * 8) : 0);
    },
    { pixel: closingPixel, still: reduce },
  );

  return (
    <section ref={sectionRef} id="close" className="relative isolate flex min-h-[max(40rem,84svh)] flex-col overflow-hidden bg-[#090909] text-[#eceae3]" aria-labelledby="mix-close-title">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      <div className="mx-auto w-full max-w-[1400px] px-5 pt-14 md:px-10 md:pt-16">
        <p data-clear className={`w-fit text-[#eceae3]/60 ${LABEL}`}>Run passed · 6 / 6 · your turn</p>
        <h2 id="mix-close-title" className={`mt-6 ${HERO}`}>
          <span data-clear className="inline-block max-w-[18ch]">
            Know which step broke.
            <br className="hidden md:block" />{" "}
            Before your users do.
          </span>
        </h2>
        <p data-clear className={`mt-6 max-w-xl text-[#eceae3]/85 ${BODY}`}>Copy the prompt into Claude Code, Cursor or Codex. It installs Uncoil, signs you in and sends your first trace. The free plan needs no card.</p>
        <div data-clear className="mt-8 flex w-fit flex-wrap gap-4">
          <Link href={appHref("/sign-up")} className={primary("ink")}>
            Start tracing free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <CopyPromptButton className={secondary("ink")} done="Copied · paste it in your agent" />
        </div>
      </div>
    </section>
  );
}
