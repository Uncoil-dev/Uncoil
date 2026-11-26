"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { SUGGESTED_QUESTIONS } from "@/lib/ask-ai";
import { Eyebrow, NextStep } from "./eyebrow";
import { AFTER_EYEBROW, AFTER_HEADLINE, BODY, DUR, EASE, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";

const CompareWindow = dynamic(() => import("./product-view").then((m) => m.CompareWindow));

/**
 * The fix loop as the product runs it: ask Ask AI about the run (its ready-made questions), change
 * the one thing in your code, run the agent again and put both runs side by side in Compare.
 */
export function Fix() {
  const calm = useCalm();
  const reveal = (i: number) => ({
    initial: calm ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.4 },
    transition: { duration: DUR.base, delay: i * 0.08, ease: EASE },
  });
  return (
    <section id="fix" className={`scroll-mt-16 bg-[#090909] text-[#eceae3] ${SECTION}`} aria-labelledby="ed-fix-title">
      <div className={WRAP}>
        <Eyebrow n="04" on="ink">Fix and verify</Eyebrow>
        <h2 id="ed-fix-title" className={`${AFTER_EYEBROW} max-w-[20ch] ${H2}`}>
          Ask why, fix it, then compare the two runs.
        </h2>

        <div className={`${AFTER_HEADLINE} grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12`}>
          <div className="flex flex-col gap-8">
            <motion.div {...reveal(0)} className="border-2 border-[#eceae3] p-4 md:p-5">
              <p className={`text-[#eceae3]/60 ${LABEL}`}>Ask AI · on run_9f3a</p>
              <ul className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]" aria-label="Ready-made questions in the trace view">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <li key={q} className={i === 0 ? "bg-[#f4d44d] px-2 py-1 text-black" : "border border-[#eceae3]/35 px-2 py-1 text-[#eceae3]/75"}>
                    {q}
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-l-4 border-[#f4d44d] pl-4">
                <p className={`text-[#eceae3]/50 ${LABEL}`}>Example answer</p>
                <p className="mt-2 text-[15px] leading-7 text-[#eceae3]/90">
                  refund.issue failed at step 06, but the run went wrong at step 04: docs.search returned 0 results, so the model retried seven times without the refund policy and guessed. Fix the search first.
                </p>
              </div>
            </motion.div>
            <motion.div {...reveal(1)}>
              <p className={`text-[#eceae3]/60 ${LABEL}`}>Then, in your code</p>
              <p className={`mt-3 text-[#eceae3]/85 ${BODY}`}>
                Change one thing you can point at: here, the search query. Run the agent again, open Compare and pick both runs. Same request: two model calls instead of eight, and no failed step.
              </p>
              <dl className="mt-6 grid grid-cols-3 border-y border-[#eceae3]">
                {[
                  ["Cost", "$0.42 → $0.06"],
                  ["Time", "11.2s → 2.4s"],
                  ["Failed", "1 → 0"],
                ].map(([k, v], i) => (
                  <div key={k} className={`py-3 ${i ? "border-l border-[#eceae3]/25 pl-4" : ""}`}>
                    <dt className={`text-[#eceae3]/55 ${LABEL}`}>{k}</dt>
                    <dd className="mt-1 font-mono text-sm tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className={`mt-2 text-[#eceae3]/45 ${LABEL}`}>Example run</p>
            </motion.div>
          </div>
          <div className="min-h-[29rem]">
            <CompareWindow />
          </div>
        </div>
        <NextStep href="#pw-setup" on="ink">Set it up on your agent</NextStep>
      </div>
    </section>
  );
}
