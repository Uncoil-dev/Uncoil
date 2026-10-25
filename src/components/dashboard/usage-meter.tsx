"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";
import { pricingCheckoutHref } from "@/lib/billing-links";
import { enforcedSpanLimit, usageLevel, type UsageLevel } from "@/lib/plan-limits";
import { planById, type PlanId } from "@/lib/pricing-plans";

const STATUS: Record<UsageLevel, string> = {
  ok: "On track",
  warn: "Getting close",
  over: "Over your plan",
  blocked: "New data paused",
};

function resetDate(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Monthly span meter: the bar covers the plan's included spans plus the paid buffer, with ticks at 80% and 100%. */
export function UsageMeter({ projectId }: { projectId: string }) {
  const { isAuthenticated } = useConvexAuthReadiness();
  const usage = useQuery(
    api.billing.getMonthlyUsage,
    isAuthenticated ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  if (!usage) return <div className="h-44 w-full animate-pulse border border-black/15 bg-white" />;
  return <UsageMeterView usage={usage} />;
}

export function UsageMeterView({ usage }: { usage: { spans: number; planTier: string; truncated?: boolean } }) {
  const tier = usage.planTier;
  const plan = planById(tier as PlanId);
  if (tier === "enterprise") {
    return (
      <section className="border border-black bg-white p-6" aria-label="Monthly usage">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">Spans this month</div>
        <div className="mt-3 font-mono text-4xl text-black">{usage.spans.toLocaleString()}</div>
        <p className="mt-2 font-mono text-[11px] text-black/55">Enterprise has no monthly span cap.</p>
      </section>
    );
  }

  const included = plan.spanLimit;
  const hard = enforcedSpanLimit(tier) ?? included;
  const level = usageLevel(usage.spans, tier);
  const fill = Math.min(100, (usage.spans / hard) * 100);
  const includedAt = (included / hard) * 100;
  const warnAt = includedAt * 0.8;
  const next = tier === "free" ? "pro" : tier === "pro" ? "team" : null;
  const left = Math.max(0, hard - usage.spans);

  return (
    <section
      className={`border bg-white p-6 ${level === "blocked" ? "border-black bg-[#fff4b5]" : "border-black/15"}`}
      aria-label="Monthly usage"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">Spans this month · {plan.name} plan</div>
          <div className="mt-3 flex items-baseline gap-3 font-mono">
            <span className="text-4xl text-black">{usage.spans.toLocaleString()}</span>
            <span className="text-[12px] text-black/55">of {included.toLocaleString()} included</span>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
            level === "ok" ? "border border-black/20 text-black/70" : level === "warn" ? "bg-[#fff4b5] text-black" : "bg-black text-[#f4d44d]"
          }`}
        >
          {STATUS[level]}
        </span>
      </div>

      <div
        className="relative mt-6 h-4 border border-black bg-white"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={hard}
        aria-valuenow={Math.min(usage.spans, hard)}
        aria-label={`${usage.spans.toLocaleString()} spans used`}
      >
        {hard > included ? (
          <div
            className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.18)_0_2px,transparent_2px_6px)]"
            style={{ width: `${100 - includedAt}%` }}
          />
        ) : null}
        <div className={`absolute inset-y-0 left-0 ${level === "ok" ? "bg-black" : "bg-[#f4d44d] outline outline-1 -outline-offset-1 outline-black"}`} style={{ width: `${fill}%` }} />
        <div className="absolute -inset-y-1 w-px bg-black/50" style={{ left: `${warnAt}%` }} />
        <div className="absolute -inset-y-1.5 w-px bg-black" style={{ left: `${includedAt}%` }} />
      </div>
      <div className="relative mt-2 h-4 font-mono text-[9px] uppercase tracking-widest text-black/55">
        <span className="absolute -translate-x-1/2" style={{ left: `${warnAt}%` }}>80%</span>
        <span className="absolute -translate-x-full whitespace-nowrap pr-1" style={{ left: `${includedAt}%` }}>{plan.spans} included</span>
      </div>
      {hard > included ? <div className="mt-1 text-right font-mono text-[9px] uppercase tracking-widest text-black/55">Hatched = buffer · new data stops at {hard.toLocaleString()}</div> : null}

      <p className="mt-4 max-w-2xl font-mono text-[11px] leading-relaxed text-black/60">
        {level === "blocked"
          ? `New data is paused until ${resetDate()}${next ? " or you upgrade" : ""}. Everything already saved stays visible.`
          : level === "over"
            ? `You are past the included spans. Data keeps arriving for another ${left.toLocaleString()} spans, then pauses. Counts reset on ${resetDate()}.`
            : `${left.toLocaleString()} spans left before new data pauses. Counts reset on ${resetDate()}.`}
        {usage.truncated ? " Very large months are counted approximately." : ""}
      </p>
      {next && level !== "ok" ? (
        <Link
          href={pricingCheckoutHref(next, "monthly")}
          className="mt-4 inline-flex items-center gap-2 bg-black px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white hover:bg-black/85"
        >
          Upgrade to {planById(next).name} <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </section>
  );
}
