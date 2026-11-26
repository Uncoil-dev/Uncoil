"use client";

import { useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Eyebrow, NextStep } from "./eyebrow";
import { AFTER_EYEBROW, BODY, H2, LABEL, SECTION, WRAP } from "./ui";
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
  // The figure dissolves from before to after as it scrolls up into the middle of the screen; no pinning.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "center 0.45"] });
  const scrolled = useTransform(scrollYProgress, (p) => segment(p, 0.25, 0.95));
  const done = useMotionValue(1);
  const t = reduce ? done : scrolled;
  const [passed, setAfter] = useState(false);
  const after = !!reduce || passed;
  useMotionValueEvent(scrolled, "change", (v) => setAfter(v > 0.6));

  return (
    <section ref={ref} id="cost" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="ed-cost-title">
      <div className={WRAP}>
        <Eyebrow n="03" on="cream">What it cost</Eyebrow>
        <h2 id="ed-cost-title" className={`${AFTER_EYEBROW} max-w-[18ch] ${H2}`}>
          Every model call shows its price.
        </h2>

        <div className="mt-10 md:mt-14">
          <div className={`flex items-baseline justify-between gap-4 text-black/60 ${LABEL}`}>
            <span>Cost per run · example support agent</span>
            <span className="text-right tabular-nums">{after ? "after the fix: no retry loop" : "before: retry loop × 7"}</span>
          </div>
          <DissolveCanvas width={W} height={H} build={buildCost} progress={t} label="Cost per run fell from $0.42 to $0.06 in this example." className="mt-2" />
        </div>

        <div className="mt-6 grid gap-6 border-t border-[#090909] pt-6 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-8">
          <p className="font-pixel text-[clamp(1.9rem,3.4vw,3.25rem)] leading-[0.92] tracking-[-0.06em] text-balance">
            The broken run cost seven times what the fixed one does.
          </p>
          <p className={`max-w-xl text-black/75 ${BODY}`}>
            With no policy to read, the model was asked the same question seven times. Each call in the trace carries its tokens and price, so the expensive step is the first thing you see, not a line on next month&apos;s bill.
          </p>
        </div>
        <NextStep href="#fix" on="cream">How the fix is checked</NextStep>
      </div>
    </section>
  );
}
