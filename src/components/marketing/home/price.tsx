"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { plans } from "@/lib/pricing-plans";
import { LABEL, WRAP, primary } from "./ui";

/** The plan the page recommends is marked in yellow. */
const FEATURED = "pro";
const pro = plans.find((p) => p.id === FEATURED)!;

/**
 * The price as one strip: the three plans with their price, spans and retention, the way in, and
 * a link to the full comparison. A single line in the page's rhythm, between two larger sections.
 */
export function Price() {
  return (
    <section id="price" className="scroll-mt-16 border-b-2 border-[#090909] bg-[#eceae3] px-5 py-8 text-[#090909] md:px-10 md:py-10" aria-labelledby="ed-price-title">
      <div className={`${WRAP} grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_auto] lg:items-center lg:gap-10`}>
        <div>
          <p className={`text-black/60 ${LABEL}`}>05 · The price</p>
          <h2 id="ed-price-title" className="mt-3 max-w-[16ch] font-pixel text-[clamp(1.9rem,2.8vw,2.6rem)] leading-[0.95] tracking-[-0.06em]">
            Free to start. Pro is ${pro.monthly} a month.
          </h2>
        </div>
        <ul className="grid grid-cols-3 border-l-2 border-[#090909]">
          {plans.map((plan) => (
            <li key={plan.id} className="border-r-2 border-[#090909] px-3 sm:px-5">
              <p className={`flex items-center gap-2 ${LABEL}`}>
                {plan.name}
                
                {plan.id === FEATURED && <span aria-hidden="true" className="size-2 bg-[#f4d44d] outline outline-2 outline-[#090909]" />}
              </p>
              <p className="mt-2 font-pixel text-[clamp(2.6rem,5vw,4.5rem)] leading-[0.85] tracking-[-0.08em]">
                ${plan.monthly}
                <span className="ml-1 hidden font-mono text-[10px] tracking-normal text-black/55 sm:inline">/ mo</span>
              </p>
              <p className={`mt-3 text-black/60 ${LABEL}`}>
                {plan.spans} spans<span className="hidden xl:inline"> · {plan.retention}</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:flex-col lg:items-start">
          <Link href={appHref("/sign-up")} className={primary("cream")}>
            Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <p className={`text-black/60 ${LABEL}`}>Free needs no card</p>
          <Link href="/pricing" className={`inline-flex min-h-11 items-center gap-2 underline underline-offset-4 hover:text-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909] ${LABEL}`}>
            Compare every plan <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
