"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useMotionValue, useMotionValueEvent } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { pricingCheckoutHref } from "@/lib/billing-links";
import { monthlyPrice, plans, type Plan } from "@/lib/pricing-plans";
import { Eyebrow } from "./eyebrow";
import { AFTER_EYEBROW, AFTER_HEADLINE, DUR, EASE, H2, LABEL, WRAP, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";
import { useCell } from "./use-grid";

// Dither tones for the three steps of the staircase: the higher the plan, the denser the ink.
const TONES = [
  { id: "ed-d1", cells: [[0, 0], [2, 2]] },
  { id: "ed-d2", cells: [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]] },
  { id: "ed-d3", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [3, 3]] },
] as const;
/** Heights of the three steps in page cells, on phones and on wider screens. */
const STEP_ROWS = { phone: [6, 10, 14], wide: [13, 24, 35] } as const;
/** The plan the page recommends gets the one primary button. */
const FEATURED = "pro";
const pro = plans.find((p) => p.id === FEATURED)!;

function href(plan: Plan) {
  return plan.id === "free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(plan.id, "monthly"));
}

/**
 * One step of the staircase, dithered on the page grid. It rises a whole cell at a time when it
 * comes into view, so the dither never stretches.
 */
function Step({ rows, cell, tone, featured, delay, calm }: { rows: number; cell: number; tone: string; featured: boolean; delay: number; calm: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const grow = useMotionValue(calm ? 1 : 0);
  const [k, setK] = useState(calm ? 1 : 0);
  useMotionValueEvent(grow, "change", setK);
  useEffect(() => {
    if (!inView && !calm) return;
    const run = animate(grow, 1, { duration: calm ? 0 : DUR.slow, delay: calm ? 0 : delay, ease: EASE });
    return () => run.stop();
  }, [inView, calm, grow, delay]);
  const shown = Math.round(rows * k);
  return (
    <div ref={ref} className="relative" style={{ height: rows * cell }}>
      <div className="absolute inset-x-0 bottom-0 border-[#eceae3]" style={{ height: shown * cell, borderTopWidth: shown ? cell : 0 }}>
        <svg className="absolute inset-0 size-full" shapeRendering="crispEdges">
          <rect width="100%" height="100%" fill={`url(#${tone})`} />
        </svg>
        {featured && shown > 0 && <span className="absolute right-0 w-1/3 bg-[#f4d44d]" style={{ top: -cell, height: 2 * cell }} />}
      </div>
    </div>
  );
}

export function Price() {
  const reduce = useCalm();
  const cell = useCell();
  return (
    <section id="price" className="scroll-mt-16 overflow-hidden bg-[#090909] px-5 pt-8 text-[#eceae3] md:px-10 md:pt-12" aria-labelledby="ed-price-title">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          {TONES.map((t) => (
            <pattern key={t.id} id={t.id} width={4 * cell} height={4 * cell} patternUnits="userSpaceOnUse">
              {t.cells.map(([x, y]) => (
                <rect key={`${x}${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#eceae3" />
              ))}
            </pattern>
          ))}
        </defs>
      </svg>
      <div className={WRAP}>
        <Eyebrow n="07" on="ink">The price</Eyebrow>
        <h2 id="ed-price-title" className={`${AFTER_EYEBROW} max-w-[16ch] ${H2}`}>
          Free to start. Pro is ${pro.monthly} a month.
        </h2>

        {/* The plans line up; the staircase under them climbs, so the step up is drawn, not implied by misalignment. */}
        <div className={`${AFTER_HEADLINE} grid gap-14 md:grid-cols-3 md:gap-0`}>
          {plans.map((plan) => {
            const featured = plan.id === FEATURED;
            return (
              <div key={plan.id} className="flex flex-col md:pr-8 lg:pr-12">
                <p className={`flex min-h-6 items-center gap-3 ${LABEL}`}>
                  {plan.name}
                  {featured && <span className="bg-[#f4d44d] px-2 py-1 text-black">Recommended</span>}
                </p>
                <p className="mt-3 font-pixel text-[clamp(4.5rem,8vw,8rem)] leading-[0.85] tracking-[-0.08em]">
                  ${plan.monthly}
                  <span className="ml-2 font-mono text-xs tracking-normal text-[#eceae3]/55">/ mo</span>
                </p>
                <p className="mt-5 text-base font-medium leading-7">{plan.line}</p>
                <ul className="mt-3 grid gap-1.5 text-[15px] leading-6 text-[#eceae3]/80">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 bg-[#eceae3]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <ul className={`mt-5 grid gap-1 text-[#eceae3]/60 ${LABEL}`}>
                  <li>{plan.spans} spans a month</li>
                  <li>Kept {plan.retention}</li>
                  <li>{plan.members} {plan.members === "1" ? "member" : "members"}</li>
                  {plan.monthly > 0 && <li>or ${monthlyPrice(plan, "annual")} / mo billed yearly</li>}
                </ul>
                <div className="mt-auto pt-7">
                  <Link href={href(plan)} className={featured ? primary("ink") : secondary("ink")}>
                    {plan.monthly === 0 ? "Start free" : `Get ${plan.name}`}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* The plans line up; the staircase under them is what climbs. */}
        <div className="mt-12 grid grid-cols-3 items-end md:mt-16" aria-hidden="true">
          {plans.map((plan, i) => (
            <Step key={plan.id} rows={(cell >= 5 ? STEP_ROWS.wide : STEP_ROWS.phone)[i]} cell={cell} tone={TONES[i].id} featured={plan.id === FEATURED} delay={0.12 * i} calm={reduce} />
          ))}
        </div>
      </div>
      <div className={`${WRAP} bg-[#eceae3]`} style={{ height: 3 * cell }} aria-hidden="true" />
      <p className={`${WRAP} pb-10 pt-6 text-[#eceae3]/60 ${LABEL}`}>
        Free needs no card. Bigger rollout?{" "}
        <Link href="/contact" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-[#f4d44d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae3]">Enterprise is custom</Link> ·{" "}
        <Link href="/pricing" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-[#f4d44d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae3]">Compare every plan</Link>
      </p>
    </section>
  );
}
