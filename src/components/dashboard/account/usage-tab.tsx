"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { UsageBar } from "@/components/dashboard/usage-bar";
import { pricingCheckoutHref } from "@/lib/billing-links";
import { usageLevel } from "@/lib/plan-limits";
import { planById, type PlanId } from "@/lib/pricing-plans";

const LABEL = { ok: "On track", warn: "Getting close", over: "Over your plan", blocked: "New data paused" } as const;

function resetDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

function ProjectUsage({ projectId, name, tier }: { projectId: string; name: string; tier: string }) {
  const usage = useQuery(api.billing.getMonthlyUsage, { projectId: projectId as Id<"projects"> });
  const plan = planById(tier as PlanId);
  const next = tier === "free" ? "pro" : tier === "pro" ? "team" : null;
  const level = usage ? usageLevel(usage.spans, tier) : "ok";
  return (
    <div className="border border-[#1F242C] bg-[#0E1115] px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm">{name}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-widest text-[#6B7380]">{plan.name} plan</div>
        </div>
        {usage && tier !== "enterprise" ? (
          <span className={`px-2 py-1 text-[10px] uppercase tracking-widest ${level === "ok" ? "border border-[#262C35] text-[#8B93A1]" : "bg-[#F4D44D] !text-[#090909]"}`}>{LABEL[level]}</span>
        ) : null}
      </div>
      {!usage ? (
        <div className="mt-4 h-8 animate-pulse bg-[#111418]" />
      ) : tier === "enterprise" ? (
        <p className="mt-4 text-[12px] text-[#8B93A1]">{usage.spans.toLocaleString()} spans this month. Enterprise has no monthly cap.</p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between text-[12px]">
            <span className="text-xl">{usage.spans.toLocaleString()}</span>
            <span className="text-[#8B93A1]">of {plan.spanLimit.toLocaleString()} included</span>
          </div>
          <UsageBar spans={usage.spans} tier={tier} className="mt-2" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#8B93A1]">
            <span>Resets {resetDate()} (UTC).</span>
            <span className="flex items-center gap-4">
              <Link href={`/dashboard/${projectId}/billing`} className="!text-[#8B93A1] hover:!text-[#F4D44D]">Billing</Link>
              {next && level !== "ok" ? (
                <Link href={pricingCheckoutHref(next, "monthly")} className="inline-flex items-center gap-1 !text-[#F4D44D]">
                  Upgrade to {planById(next).name} <ArrowRight className="size-3" />
                </Link>
              ) : null}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/** Account > Usage: this month's spans for every project the person can open, against each project's plan. */
export function UsageTab() {
  const projects = useQuery(api.projects.getProjectsByUserOrOrg);
  if (projects === undefined) return <div className="h-32 animate-pulse border border-[#1F242C] bg-[#0E1115]" />;
  if (projects.length === 0) return <p className="text-sm text-[#8B93A1]">No projects yet. Usage appears here once you create one.</p>;
  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <ProjectUsage key={project._id} projectId={project._id} name={project.name} tier={project.planTier ?? "free"} />
      ))}
      <p className="text-[11px] text-[#6B7380]">Usage counts saved spans per project, by UTC month. Limits apply to each project separately.</p>
    </div>
  );
}
