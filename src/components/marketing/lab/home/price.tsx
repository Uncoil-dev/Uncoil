"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { pricingCheckoutHref } from "@/lib/billing-links";
import { monthlyPrice, plans, type Plan } from "@/lib/pricing-plans";
import { Eyebrow } from "./eyebrow";
import { AFTER_EYEBROW, AFTER_HEADLINE, DUR, EASE, H2, LABEL, WRAP, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

// Dither tones for the three steps of the staircase: the higher the plan, the denser the ink.
const TONES = [
  { id: "ed-d1", cells: [[0, 0], [2, 2]] },
  { id: "ed-d2", cells: [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]] },
  { id: "ed-d3", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [3, 3]] },
] as const;
const STEP_HEIGHTS = ["h-6 md:h-20", "h-10 md:h-36", "h-14 md:h-52"] as const;
/** The plan the live pricing page marks as popular gets the one primary button. */
const FEATURED = "pro";

function href(plan: Plan) {
  return plan.id === "free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(plan.id, "monthly"));
}

export function Price() {
  const reduce = useCalm();
  return (
    <section id="price" className="scroll-mt-16 overflow-hidden bg-[#eceae3] px-5 pt-8 text-[#090909] md:px-10 md:pt-12" aria-labelledby="ed-price-title">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          {TONES.map((t) => (
            <pattern key={t.id} id={t.id} width="8" height="8" patternUnits="userSpaceOnUse">
              {t.cells.map(([x, y]) => (
                <rect key={`${x}${y}`} x={x * 2} y={y * 2} width="2" height="2" fill="#090909" />
              ))}
            </pattern>
          ))}
        </defs>
      </svg>
      <div className={WRAP}>
        <Eyebrow n="07" on="cream">The price</Eyebrow>
        <h2 id="ed-price-title" className={`${AFTER_EYEBROW} max-w-[16ch] ${H2}`}>
          Free to start. Pro is $19 a month.
        </h2>

        {/* The plans line up; the staircase under them climbs, so the step up is drawn, not implied by misalignment. */}
        <div className={`${AFTER_HEADLINE} grid gap-14 md:grid-cols-3 md:gap-0`}>
          {plans.map((plan) => {
            const featured = plan.id === FEATURED;
            return (
              <div key={plan.id} className="flex flex-col md:pr-8 lg:pr-12">
                <p className={`flex min-h-6 items-center gap-3 ${LABEL}`}>
                  {plan.name}
                  {featured && <span className="bg-[#f4d44d] px-2 py-1 text-black">Popular</span>}
                </p>
                <p className="mt-3 font-pixel text-[clamp(4.5rem,8vw,8rem)] leading-[0.85] tracking-[-0.08em]">
                  ${plan.monthly}
                  <span className="ml-2 font-mono text-xs tracking-normal text-black/55">/ mo</span>
                </p>
                <p className="mt-5 text-base font-medium leading-7">{plan.line}</p>
                <ul className="mt-3 grid gap-1.5 text-[15px] leading-6 text-black/75">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 bg-[#090909]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <ul className={`mt-5 grid gap-1 text-black/60 ${LABEL}`}>
                  <li>{plan.spans} spans a month</li>
                  <li>Kept {plan.retention}</li>
                  <li>{plan.members} {plan.members === "1" ? "member" : "members"}</li>
                  {plan.monthly > 0 && <li>or ${monthlyPrice(plan, "annual")} / mo billed yearly</li>}
                </ul>
                <div className="mt-auto pt-7">
                  <Link href={href(plan)} className={featured ? primary("cream") : secondary("cream")}>
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
            <motion.div
              key={plan.id}
              className={`relative origin-bottom border-t-4 border-black ${STEP_HEIGHTS[i]}`}
              initial={reduce ? false : { scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: DUR.slow, delay: 0.12 * i, ease: EASE }}
            >
              <svg className="absolute inset-0 size-full" shapeRendering="crispEdges">
                <rect width="100%" height="100%" fill={`url(#${TONES[i].id})`} />
              </svg>
              {plan.id === FEATURED && <span className="absolute -top-1 right-0 h-3 w-1/3 bg-[#f4d44d]" />}
            </motion.div>
          ))}
        </div>
      </div>
      <div className={`${WRAP} h-4 bg-[#090909]`} aria-hidden="true" />
      <p className={`${WRAP} py-6 text-black/60 ${LABEL}`}>
        No card for Free. Bigger rollout?{" "}
        <Link href="/contact" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]">Enterprise is custom</Link> ·{" "}
        <Link href="/pricing" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]">Compare every plan</Link>
      </p>
    </section>
  );
}
