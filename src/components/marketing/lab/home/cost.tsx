"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useCalm } from "./use-calm";
import { segment, type Pt } from "../editorial/art";
import { DissolveCanvas, textPoints } from "../editorial/dissolve-canvas";

const W = 240;
const H = 84;

function buildCost(family: string): { from: Pt[]; to: Pt[] } {
  return { from: textPoints("$0.42", W, H, family, 74), to: textPoints("$0.06", W, H, family, 74) };
}

export function Cost() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useCalm();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scrolled = useTransform(scrollYProgress, (p) => segment(p, 0.12, 0.72));
  const done = useMotionValue(1);
  const t = reduce ? done : scrolled;
  const [passed, setAfter] = useState(false);
  const after = !!reduce || passed;
  useMotionValueEvent(scrolled, "change", (v) => setAfter(v > 0.6));
  const bar = useTransform(scrolled, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} id="cost" className="relative h-[200svh] bg-[#eceae3] text-[#090909]" aria-labelledby="ed-cost-title">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col">
          <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span>03</span>
            <span className="h-px flex-1 bg-black" />
            <span>What it cost</span>
          </p>

          <div className="flex flex-1 flex-col justify-center">
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">
              <span>Cost per run · example support agent</span>
              <span className="tabular-nums">{after ? "after: one model call" : "before: retry loop × 7"}</span>
            </div>
            <DissolveCanvas width={W} height={H} build={buildCost} progress={t} label="Cost per run fell from $0.42 to $0.06 in this example." className="mt-2" />
            <div className="relative h-[3px] bg-black/15">
              <motion.div className="absolute inset-y-0 left-0 bg-[#090909]" style={{ width: reduce ? "100%" : bar }} />
            </div>
          </div>

          <div className="grid gap-6 border-t border-black pt-6 md:grid-cols-[1.1fr_1fr] md:gap-16">
            <h2 id="ed-cost-title" className="font-pixel text-[clamp(2rem,4vw,3.75rem)] leading-[0.92] tracking-[-0.07em]">
              Same answer. A seventh of the price.
            </h2>
            <p className="max-w-xl text-base leading-7 text-black/75 md:text-lg md:leading-8">
              With nothing to go on, the model was asked the same question again and again inside a retry loop. Every call in the trace carries its tokens and its price, so the expensive step is obvious. Fix the search and the run makes a single call.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
