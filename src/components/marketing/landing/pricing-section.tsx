"use client";

import { appHref } from "@/lib/app-links";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { pricingCheckoutHref } from "@/lib/billing-links";

// Plans and prices mirror the /pricing page. Change them there first.
const plans = [
  { name: "Free", monthly: 0, line: "Try it on a real agent.", spans: "25k", retention: "7 days", members: "1", projects: "3", features: ["Trace viewer", "Cost visibility", "Community support"] },
  { name: "Pro", monthly: 19, line: "For a builder shipping agents.", spans: "500k", retention: "30 days", members: "5", projects: "3", features: ["Evaluations + datasets", "Prompt versions", "Slack alerts"] },
  { name: "Team", monthly: 39, line: "For teams running agents in prod.", spans: "2m", retention: "90 days", members: "20", projects: "Unlimited", features: ["Release gates", "Collaboration + reviews", "Priority support"] },
] as const;

export function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const reduce = useReducedMotion();
  const interval = annual ? "annual" : "monthly";

  return (
    <section id="pricing" className="bg-[#eceae3] mk-section px-5 text-black md:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Pricing</p>
            <h2 className="mt-4 max-w-4xl font-pixel mk-h2 leading-[0.92] tracking-[-0.07em]">Free to start. Fair as you grow.</h2>
          </div>
          <div className="relative flex w-fit border-2 border-black p-1 font-mono text-[10px] uppercase tracking-[0.12em]">
            {(["Monthly", "Annual −20%"] as const).map((label, i) => {
              const on = (i === 1) === annual;
              return (
                <button key={label} type="button" aria-pressed={on} onClick={() => setAnnual(i === 1)} className={`relative z-10 min-h-11 px-5 ${on ? "text-[#f4d44d]" : ""}`}>
                  {on && <motion.span layoutId="billing-pill" className="absolute inset-0 -z-10 bg-black" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.12em] text-black/55 md:hidden">Swipe to compare plans →</p>
        <div className="-mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:mt-[var(--mk-gap)] md:grid md:grid-cols-2 md:gap-[2px] md:overflow-visible md:border-2 md:border-black md:bg-black md:p-0 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = annual ? plan.monthly * 0.8 : plan.monthly;
            const label = `$${price % 1 ? price.toFixed(2) : price}`;
            const featured = plan.name === "Pro";
            return (
              <div key={plan.name} className={`flex w-[80vw] shrink-0 snap-start flex-col border-2 border-black p-6 transition-colors md:w-auto md:border-0 md:p-7 ${featured ? "bg-black text-[#eceae3]" : "bg-[#eceae3] hover:bg-[#f4d44d]"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-pixel text-4xl tracking-[-0.06em]">{plan.name}</h3>
                  {featured && <span className="bg-[#f4d44d] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-black">Popular</span>}
                </div>
                <p className={`mt-2 text-sm ${featured ? "text-white/60" : "text-black/60"}`}>{plan.line}</p>
                <div className="mt-5 flex h-20 items-end gap-2 overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={label}
                      initial={reduce ? false : { y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -40, opacity: 0 }}
                      className={`font-pixel text-7xl leading-none tracking-[-0.07em] ${featured ? "text-[#f4d44d]" : ""}`}
                    >
                      {label}
                    </motion.span>
                  </AnimatePresence>
                  <span className={`pb-2 font-mono text-[10px] uppercase ${featured ? "text-white/50" : "text-black/50"}`}>/ mo</span>
                </div>
                <p className={`mt-1 h-4 font-mono text-[9px] uppercase ${featured ? "text-white/50" : "text-black/50"}`}>{annual && plan.monthly ? "billed annually" : ""}</p>
                <ul className="mt-5 grid gap-2 text-sm">
                  {[`${plan.spans} spans / month`, `${plan.retention} retention`, `${plan.members} member${plan.members === "1" ? "" : "s"} · ${plan.projects} projects`, ...plan.features].map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className={`mt-1.5 size-1.5 shrink-0 ${featured ? "bg-[#f4d44d]" : "bg-black"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <span className="block h-7 shrink-0" aria-hidden="true" />
                <Link
                  href={plan.name === "Free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(plan.name.toLowerCase() as "pro" | "team", interval))}
                  className={`mt-auto flex min-h-12 items-center justify-between px-4 font-mono text-[10px] uppercase tracking-[0.13em] ${featured ? "bg-[#f4d44d] text-black hover:bg-white" : "border-2 border-black hover:bg-black hover:text-white"}`}
                >
                  {plan.name === "Free" ? "Start free" : `Get ${plan.name}`}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            );
          })}
          <div className="flex w-[80vw] shrink-0 snap-start flex-col border-2 border-black bg-[#eceae3] p-6 md:border-0 transition-colors hover:bg-[#f4d44d] md:w-auto md:p-7">
            <h3 className="font-pixel text-4xl tracking-[-0.06em]">Enterprise</h3>
            <p className="mt-2 text-sm text-black/60">For larger rollouts.</p>
            <div className="mt-5 flex h-20 items-end">
              <span className="font-pixel text-6xl leading-none tracking-[-0.07em]">Custom</span>
            </div>
            <p className="mt-1 h-4" />
            <ul className="mt-5 grid gap-2 text-sm">
              {["Unlimited spans, custom retention", "SSO (SAML / OIDC)", "On-prem deployment", "Rollout support"].map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 bg-black" />
                  {f}
                </li>
              ))}
            </ul>
            <span className="block h-7 shrink-0" aria-hidden="true" />
            <Link href="/contact" className="mt-auto flex min-h-12 items-center justify-between border-2 border-black px-4 font-mono text-[10px] uppercase tracking-[0.13em] hover:bg-black hover:text-white">
              Talk to us <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-black/55">
          No card needed for Free. <Link href="/pricing" className="underline underline-offset-4 hover:text-black">Compare every plan →</Link>
        </p>
      </div>
    </section>
  );
}
