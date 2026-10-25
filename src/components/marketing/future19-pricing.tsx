"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { pricingCheckoutHref } from "@/lib/billing-links";

const plans = [
  {
    name: "Free",
    monthly: "$0",
    annual: "$0",
    features: ["25k spans", "7-day retention", "1 project / 1 member"],
    featured: false,
  },
  {
    name: "Pro",
    monthly: "$19",
    annual: "$15.20",
    features: ["500k spans", "30-day retention", "3 projects / 5 members"],
    featured: true,
  },
  {
    name: "Team",
    monthly: "$39",
    annual: "$31.20",
    features: ["2m spans", "90-day retention", "Unlimited projects / 20 members"],
    featured: false,
  },
] as const;

export function Future19Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <section
      id="navsys-pricing-ledger"
      className="bg-[#eceae3] px-6 py-14 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col justify-between gap-6 border-b border-black/15 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-black/70">
              Pricing
            </p>
            <h2 className="mt-3 font-pixel text-5xl leading-[0.9] tracking-[-0.07em] md:text-6xl">
              Start small. Scale on proof.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div
              role="radiogroup"
              aria-label="Billing interval"
              className="flex border border-black/20 bg-white p-1 font-mono text-[9px] uppercase tracking-[0.11em]"
            >
              {(["monthly", "annual"] as const).map((interval) => (
                <button
                  key={interval}
                  type="button"
                  role="radio"
                  aria-checked={billing === interval}
                  onClick={() => setBilling(interval)}
                  className={`min-h-9 px-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${billing === interval ? "bg-black text-white" : "hover:bg-[#f4d44d]"}`}
                >
                  {interval}
                </button>
              ))}
            </div>
            <span
              className={`inline-flex min-h-9 min-w-[166px] items-center border px-3 font-mono text-[8px] uppercase tracking-[0.11em] transition-colors ${billing === "annual" ? "border-[#d2b32f] bg-[#f4d44d] text-black" : "border-black/15 bg-white text-black/70"}`}
            >
              {billing === "annual"
                ? "Billed annually · save 20%"
                : "Billed monthly"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-px bg-black/15 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex flex-col p-5 md:p-6 ${plan.featured ? "bg-[#f4d44d]" : "bg-white"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-black/70">
                  {plan.name}
                </p>
                {plan.featured ? (
                  <span className="bg-black px-2 py-1 font-mono text-[8px] uppercase tracking-[0.11em] text-white">
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-pixel text-5xl tracking-[-0.07em] md:text-6xl">
                  {billing === "annual" ? plan.annual : plan.monthly}
                </span>
                <span className="text-sm text-black/70">/mo</span>
              </div>
              <ul className="mt-5 space-y-2.5 border-t border-black/15 pt-5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check className="size-3.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(plan.name.toLowerCase() as "pro" | "team", billing))}
                className="mt-6 flex min-h-10 items-center justify-between border-t border-black/15 pt-4 font-mono text-[9px] uppercase tracking-[0.12em] hover:text-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              >
                Choose {plan.name}
                <ArrowRight className="size-3" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
