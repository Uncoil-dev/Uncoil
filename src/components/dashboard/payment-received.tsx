"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Check } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { checkoutPanelCopy } from "@/lib/checkout-trial";

/** Shown on the billing page right after Stripe checkout for an existing project. */
export function PaymentReceived({ projectId }: { projectId: string }) {
  const base = `/dashboard/${projectId}`;
  const summary = useQuery(api.projects.getProjectManagementSummary, { projectId: projectId as Id<"projects"> });
  const project = summary?.project;
  const copy = checkoutPanelCopy(
    { status: project?.stripeSubscriptionStatus, planTier: project?.planTier, periodEnd: project?.subscriptionCurrentPeriodEnd },
    base,
  );
  return (
    <section aria-labelledby="payment-received" className="border-2 border-black bg-[#fff4b5] text-black">
      <div className="flex items-start justify-between gap-4 border-b-2 border-black p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">{copy.eyebrow}</p>
          <h2 id="payment-received" className="mt-2 font-pixel text-4xl leading-[0.9] tracking-[-0.07em]">{copy.heading}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-black/75">{copy.detail}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center bg-black text-[#f4d44d]"><Check className="size-5" aria-hidden="true" /></span>
      </div>
      <ol className="grid gap-px bg-black sm:grid-cols-3">
        {copy.steps.map((s, i) => (
          <li key={s.href} className="bg-[#fff4b5] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em]">{i + 1}. {s.title}</p>
            <p className="mt-2 text-sm leading-6 text-black/75">{s.body}</p>
            <Link href={s.href} className="group mt-3 inline-flex min-h-11 items-center gap-2 bg-black px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4d44d]">
              Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3 border-t-2 border-black p-5">
        <Link href={`${base}/billing`} className="inline-flex min-h-11 items-center border-2 border-black px-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#fff4b5]">Close</Link>
      </div>
    </section>
  );
}
