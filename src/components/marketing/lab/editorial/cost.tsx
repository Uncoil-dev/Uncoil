"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { segment, type Pt } from "./art";
import { DissolveCanvas, textPoints } from "./dissolve-canvas";

const W = 240;
const H = 84;

function buildCost(family: string): { from: Pt[]; to: Pt[] } {
  return { from: textPoints("$0.42", W, H, family, 74), to: textPoints("$0.06", W, H, family, 74) };
}

export function Cost() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const t = useTransform(scrollYProgress, (p) => (reduce ? 1 : segment(p, 0.12, 0.72)));
  const [after, setAfter] = useState(!!reduce);
  useMotionValueEvent(t, "change", (v) => setAfter(v > 0.6));
  const bar = useTransform(t, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} id="cost" className="relative h-[240svh] bg-[#eceae3] text-[#090909]" aria-labelledby="ed-cost-title">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col">
          <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span>02</span>
            <span className="h-px flex-1 bg-black" />
            <span>The cost</span>
          </p>

          <div className="flex flex-1 flex-col justify-center">
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">
              <span>Cost per run · example support agent</span>
              <span className="tabular-nums">{after ? "after: one model call" : "before: retry loop × 7"}</span>
            </div>
            <DissolveCanvas width={W} height={H} build={buildCost} progress={t} label="Cost per run fell from $0.42 to $0.06 in this example." className="mt-2" />
            <div className="relative h-[3px] bg-black/15">
              <motion.div className="absolute inset-y-0 left-0 bg-[#090909]" style={{ width: bar }} />
            </div>
          </div>

          <div className="grid gap-6 border-t border-black pt-6 md:grid-cols-[1.1fr_1fr] md:gap-16">
            <h2 id="ed-cost-title" className="font-pixel text-[clamp(2rem,4vw,3.75rem)] leading-[0.92] tracking-[-0.07em]">
              Same answer. A seventh of the price.
            </h2>
            <p className="max-w-xl text-base leading-7 text-black/75 md:text-lg md:leading-8">
              The trace showed the model being asked the same question again and again inside a retry loop. Every call has its tokens and its price on it, so the expensive step is obvious. One prompt fix later, the run makes a single call.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
