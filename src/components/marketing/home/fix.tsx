"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { SUGGESTED_QUESTIONS } from "@/lib/ask-ai";
import { Eyebrow } from "./eyebrow";
import { modelCalls } from "./run-data";
import { useCase } from "./case-state";
import { type Case } from "./cases";
import { AFTER_EYEBROW, BODY, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";
import { segment } from "./math";
import type { Pt } from "./dissolve";
import { DissolveCanvas, textPoints } from "./dissolve-canvas";
import { MorningGround } from "./morning-ground";

const CompareWindow = dynamic(() => import("./product-view").then((m) => m.CompareWindow));

const W = 240;
const H = 84;

// One build per case, kept, so the dissolve only starts over when the case changes.
const builds = new Map<string, (family: string) => { from: Pt[]; to: Pt[] }>();
function buildFor(c: Case) {
  let b = builds.get(c.id);
  if (!b) {
    b = (family: string) => ({ from: textPoints(c.fix.before, W, H, family, 74), to: textPoints(c.fix.afterValue, W, H, family, 74) });
    builds.set(c.id, b);
  }
  return b;
}

/**
 * Fix and verify in one beat: Ask AI names the cause, you change the one thing, and the re-run's
 * price dissolves from before to after as it scrolls up the screen, with the product's Compare
 * view underneath to prove it step by step.
 */
export function Fix() {
  const c = useCase();
  const ref = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "center 0.45"] });
  const scrolled = useTransform(scrollYProgress, (p) => segment(p, 0.25, 0.95));
  const done = useMotionValue(1);
  const [passed, setPassed] = useState(false);
  useMotionValueEvent(scrolled, "change", (v) => setPassed(v > 0.6));
  const after = calm || passed;

  return (
    <section id="fix" className={`relative scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="ed-fix-title">
      <div className={WRAP}>
        <Eyebrow n="03" on="cream">Fix and verify</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14`}>
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            {/* Three lines held for every case, so a shorter headline never pulls the page up. */}
            <h2 id="ed-fix-title" className={`min-h-[2.7em] ${H2}`}>
              Fix step {c.cause}. {c.fix.result}
            </h2>
            <div className="mt-8 border-2 border-black bg-[#090909] p-4 text-[#eceae3] md:p-5">
              <p className={`text-[#eceae3]/60 ${LABEL}`}>Ask AI · on {c.runId}</p>
              <p className="mt-3 w-fit bg-[#f4d44d] px-2 py-1 font-mono text-[11px] text-black">{SUGGESTED_QUESTIONS[0]}</p>
              <p className="mt-4 min-h-[8.75rem] border-l-4 border-[#f4d44d] pl-4 text-[15px] leading-7 text-[#eceae3]/90 lg:min-h-0">
                {c.fix.answer}
              </p>
              <p className={`mt-3 text-[#eceae3]/45 ${LABEL}`}>Example answer</p>
            </div>
            <p className={`mt-6 min-h-[7rem] max-w-xl text-black/75 lg:min-h-0 ${BODY}`}>
              {c.fix.body} Compare puts both runs side by side: {modelCalls(c.run)} model {modelCalls(c.run) === 1 ? "call" : "calls"} {modelCalls(c.run) === modelCalls(c.fix.after) ? "stay" : "become"} {modelCalls(c.fix.after)}, and {c.fix.passes}.
            </p>
          </div>

          <div ref={ref} className="min-w-0">
            <div className={`flex flex-col gap-1 text-black/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 ${LABEL}`}>
              <span className="shrink-0 whitespace-nowrap">{c.fix.metric}</span>
              <span className="min-w-0 sm:truncate sm:text-right">{after ? "after the fix" : `before: ${c.fix.why}`}</span>
            </div>
            {/* Two screen pixels per dissolve pixel on wide screens, so every pixel of the number is the same size. */}
            <div className="mt-2 max-w-[480px]">
              <DissolveCanvas width={W} height={H} build={buildFor(c)} progress={calm ? done : scrolled} label={`${c.fix.metric}: ${c.fix.before} before the fix, ${c.fix.afterValue} after, in this example.`} />
            </div>
            <div className="mt-6">
              <CompareWindow c={c} rows={6} />
            </div>
            <p className={`mt-3 text-black/55 ${LABEL}`}>The Compare view, two runs · example data</p>
          </div>
        </div>
      </div>
      {/* The horizon and ground line carry on under the fix, in the first light of morning. */}
      <MorningGround rows={7} glow={0.9} hills={0.35} stones className="absolute inset-x-0 bottom-0" />
    </section>
  );
}
