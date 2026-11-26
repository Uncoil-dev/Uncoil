"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { pricingCheckoutHref } from "@/lib/billing-links";
import { monthlyPrice, plans, type Plan } from "@/lib/pricing-plans";
import { useCalm } from "./use-calm";

// Dither tones for the three steps of the staircase: the higher the plan, the denser the ink.
const TONES = [
  { id: "ed-d1", cells: [[0, 0], [2, 2]] },
  { id: "ed-d2", cells: [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]] },
  { id: "ed-d3", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [3, 3]] },
] as const;
const STEP_HEIGHTS = ["h-16 md:h-28", "h-24 md:h-52", "h-32 md:h-76"] as const;

function href(plan: Plan) {
  return plan.id === "free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(plan.id, "monthly"));
}

export function Price() {
  const reduce = useCalm();
  return (
    <section id="price" className="overflow-hidden bg-[#eceae3] px-5 pt-10 text-[#090909] md:px-10 md:pt-14" aria-labelledby="ed-price-title">
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
      <div className="mx-auto max-w-[1320px]">
        <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>07</span>
          <span className="h-px flex-1 bg-black" />
          <span>The price</span>
        </p>
        <h2 id="ed-price-title" className="mt-10 max-w-[16ch] font-pixel text-[clamp(2.8rem,6.4vw,6.5rem)] leading-[0.9] tracking-[-0.07em]">
          Start at nothing. Climb when it pays.
        </h2>

        <div className="mt-16 grid gap-12 md:mt-24 md:grid-cols-3 md:items-end md:gap-0">
          {plans.map((plan, i) => (
            <div key={plan.id} className="flex flex-col">
              <div className="md:px-6 md:first:pl-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em]">{plan.name}</p>
                <p className="mt-2 font-pixel text-[clamp(5rem,9vw,9rem)] leading-[0.85] tracking-[-0.08em]">
                  ${plan.monthly}
                  <span className="ml-2 font-mono text-xs tracking-normal text-black/55">/ mo</span>
                </p>
                <p className="mt-4 text-base leading-7 text-black/75">{plan.line}</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-black/70">
                  {plan.features.join(" · ")}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase leading-6 tracking-[0.08em] text-black/60">
                  {plan.spans} spans · {plan.retention} · {plan.members} {plan.members === "1" ? "member" : "members"}
                  {plan.monthly > 0 && <><br />or ${monthlyPrice(plan, "annual")} / mo billed yearly</>}
                </p>
                <Link
                  href={href(plan)}
                  className={`group mt-6 mb-6 inline-flex min-h-12 items-center gap-3 px-5 font-mono text-[10px] uppercase tracking-[0.14em] ${i === 1 ? "bg-[#090909] text-[#eceae3] hover:bg-[#f4d44d] hover:text-black" : "border-2 border-black hover:bg-black hover:text-[#eceae3]"}`}
                >
                  {plan.monthly === 0 ? "Start free" : `Get ${plan.name}`}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
              <motion.div
                aria-hidden="true"
                className={`relative origin-bottom border-t-4 border-black ${STEP_HEIGHTS[i]}`}
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
              >
                <svg className="absolute inset-0 size-full" shapeRendering="crispEdges">
                  <rect width="100%" height="100%" fill={`url(#${TONES[i].id})`} />
                </svg>
                {i === 1 && <span className="absolute -top-1 right-0 h-3 w-1/3 bg-[#f4d44d]" />}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-4 bg-[#090909]" aria-hidden="true" />
      <p className="mx-auto max-w-[1320px] py-6 font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">
        No card for Free. Bigger rollout? <Link href="/contact" className="underline underline-offset-4 hover:text-black">Enterprise is custom</Link> ·{" "}
        <Link href="/pricing" className="underline underline-offset-4 hover:text-black">Compare every plan</Link>
      </p>
    </section>
  );
}
