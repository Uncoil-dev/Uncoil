"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { pricingCheckoutHref, type PaidPlan } from "@/lib/billing-links";
import { planById } from "@/lib/pricing-plans";

/** A calm "this is part of Pro" card, shown where a Free project reaches a paid feature. */
export function UpgradePrompt({ feature, plan = "pro", children, onClose }: { feature: string; plan?: PaidPlan; children: ReactNode; onClose?: () => void }) {
  const target = planById(plan);
  return (
    <div role="dialog" aria-label={`${feature} is part of ${target.name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md border border-black bg-[#eceae3] p-6 text-[#090909]">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]"><span className="bg-[#f4d44d] px-1.5 py-0.5">{target.name}</span> feature</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{feature} is part of {target.name}</h2>
        <p className="mt-2 text-sm leading-6 text-black/75">{children}</p>
        <p className="mt-3 font-mono text-[11px] text-black/60">{target.name} is ${target.monthly} a month. Tracing, costs and the trace viewer stay free.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={pricingCheckoutHref(plan, "monthly")} className="inline-flex items-center gap-2 bg-black px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white hover:bg-black/85">Upgrade to {target.name} <ArrowRight className="size-3.5" /></Link>
          {onClose ? <button type="button" onClick={onClose} className="font-mono text-[11px] uppercase tracking-[0.12em] underline underline-offset-4">Not now</button> : null}
        </div>
      </div>
    </div>
  );
}
