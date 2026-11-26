"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useInView, useReducedMotion } from "framer-motion";
import { appHref } from "@/lib/app-links";
import { YELLOW, bridge, flag, ground, landscape, pines, robot, type Scene } from "../pixel-world/pixels";
import { usePixelCanvas } from "../pixel-world/use-pixel-canvas";
import { clamp01, ease } from "../pixel-world/world";

const closingPixel = (w: number) => (w < 640 ? 4 : w < 1100 ? 5 : 6);

/**
 * The closing scene pays off the journey: the plank Uncoil marked is now yellow, the robot
 * walks across it and the flag goes up. It plays once when the scene comes into view.
 */
export function ClosingWorld() {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.35 });
  const startedAt = useRef<number | null>(null);

  usePixelCanvas(
    canvasRef,
    ({ px, seconds }) => {
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

      landscape(s, narrow ? 0.78 : 0.8, 0.7);
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
    <section ref={sectionRef} className="relative isolate flex min-h-[max(44rem,100svh)] flex-col overflow-hidden bg-[#090909] text-[#eceae3]" aria-labelledby="mix-close-title">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      <div className="mx-auto w-full max-w-[1320px] px-5 pt-16 md:px-10 md:pt-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#eceae3]/60">Run passed · 6 / 6 · example</p>
        <h2 id="mix-close-title" className="mt-6 max-w-[22ch] text-balance font-pixel text-[clamp(3rem,8vw,7.5rem)] leading-[0.86] tracking-[-0.08em]">
          Know which step.
          <br className="hidden md:block" />{" "}
          Before your users do.
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[#eceae3]/85">Paste the prompt, run your agent, open the trace. The free plan needs no card.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-[#f4d44d] px-8 py-5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-black shadow-[6px_6px_0_0_#eceae3] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#eceae3]">
            Start tracing free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link href="/docs" className="inline-flex items-center border-2 border-[#eceae3] bg-[#090909] px-8 py-5 font-mono text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#eceae3] hover:text-black">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
