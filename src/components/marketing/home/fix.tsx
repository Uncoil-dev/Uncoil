"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { SUGGESTED_QUESTIONS } from "@/lib/ask-ai";
import { Eyebrow } from "./eyebrow";
import { RUN_A, RUN_B, modelCalls, totalCost, usd } from "./run-data";
import { AFTER_EYEBROW, BODY, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";
import { segment } from "./math";
import type { Pt } from "./dissolve";
import { DissolveCanvas, textPoints } from "./dissolve-canvas";

const CompareWindow = dynamic(() => import("./product-view").then((m) => m.CompareWindow));

const W = 240;
const H = 84;
const BEFORE = usd(totalCost(RUN_A));
const AFTER = usd(totalCost(RUN_B));

function buildCost(family: string): { from: Pt[]; to: Pt[] } {
  return { from: textPoints(BEFORE, W, H, family, 74), to: textPoints(AFTER, W, H, family, 74) };
}

/**
 * Fix and verify in one beat: Ask AI names the cause, you change the one thing, and the re-run's
 * price dissolves from before to after as it scrolls up the screen, with the product's Compare
 * view underneath to prove it step by step.
 */
export function Fix() {
  const ref = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "center 0.45"] });
  const scrolled = useTransform(scrollYProgress, (p) => segment(p, 0.25, 0.95));
  const done = useMotionValue(1);
  const [passed, setPassed] = useState(false);
  useMotionValueEvent(scrolled, "change", (v) => setPassed(v > 0.6));
  const after = calm || passed;

  return (
    <section id="fix" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="ed-fix-title">
      <div className={WRAP}>
        <Eyebrow n="04" on="cream">Fix and verify</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14`}>
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <h2 id="ed-fix-title" className={H2}>
              Fix step 4. The run drops to {AFTER}.
            </h2>
            <div className="mt-8 border-2 border-black bg-[#090909] p-4 text-[#eceae3] md:p-5">
              <p className={`text-[#eceae3]/60 ${LABEL}`}>Ask AI · on run_9f3a</p>
              <p className="mt-3 w-fit bg-[#f4d44d] px-2 py-1 font-mono text-[11px] text-black">{SUGGESTED_QUESTIONS[0]}</p>
              <p className="mt-4 border-l-4 border-[#f4d44d] pl-4 text-[15px] leading-7 text-[#eceae3]/90">
                refund.issue failed at step 06, but the run went wrong at step 04: docs.search returned 0 results, so the model retried seven times without the refund policy and guessed. Fix the search first.
              </p>
              <p className={`mt-3 text-[#eceae3]/45 ${LABEL}`}>Example answer</p>
            </div>
            <p className={`mt-6 max-w-xl text-black/75 ${BODY}`}>
              You change one thing you can point at, here the search query, and run the agent again. Compare puts both runs side by side: {modelCalls(RUN_A)} model calls become {modelCalls(RUN_B)}, and the failed step is gone.
            </p>
          </div>

          <div ref={ref} className="min-w-0">
            <div className={`flex items-baseline justify-between gap-4 text-black/60 ${LABEL}`}>
              <span>Cost of this run</span>
              <span className="text-right">{after ? "after the fix" : "before: retry loop × 7"}</span>
            </div>
            <DissolveCanvas width={W} height={H} build={buildCost} progress={calm ? done : scrolled} label={`Cost of the run fell from ${BEFORE} to ${AFTER} in this example.`} className="mt-2" />
            <div className="mt-6">
              <CompareWindow />
            </div>
            <p className={`mt-3 text-black/55 ${LABEL}`}>The Compare view, two runs · example data</p>
          </div>
        </div>
      </div>
    </section>
  );
}
