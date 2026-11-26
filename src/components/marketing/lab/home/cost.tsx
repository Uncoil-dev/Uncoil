"use client";

import { useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "./eyebrow";
import { BODY, H3, LABEL, WRAP } from "./ui";
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

  return (
    <section ref={ref} id="cost" className="relative h-[170svh] bg-[#eceae3] text-[#090909]" aria-labelledby="ed-cost-title">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col px-5 pb-10 pt-10 md:px-10 md:pb-12 md:pt-14">
        <div className={`${WRAP} flex flex-1 flex-col`}>
          <Eyebrow n="03" on="cream">What it cost</Eyebrow>

          <div className="flex flex-1 flex-col justify-center py-6">
            <div className={`flex items-baseline justify-between gap-4 text-black/60 ${LABEL}`}>
              <span>Cost per run · example support agent</span>
              <span className="text-right tabular-nums">{after ? "after: one model call" : "before: retry loop × 7"}</span>
            </div>
            <DissolveCanvas width={W} height={H} build={buildCost} progress={t} label="Cost per run fell from $0.42 to $0.06 in this example." className="mt-2" />
          </div>

          <div className="grid gap-6 border-t border-[#090909] pt-6 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-8">
            <h2 id="ed-cost-title" className={H3}>
              Same answer. A seventh of the price.
            </h2>
            <p className={`max-w-xl text-black/75 ${BODY}`}>
              With nothing to go on, the model was asked the same question again and again inside a retry loop. Every call in the trace carries its tokens and its price, so the expensive step is obvious. Fix the search and the run makes a single call.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
