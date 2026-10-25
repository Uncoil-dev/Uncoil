"use client";

import { enforcedSpanLimit, usageLevel } from "@/lib/plan-limits";
import { planById, type PlanId } from "@/lib/pricing-plans";

/** Thin dark-surface meter: fills toward the plan's stop point, with ticks at 80% and at the included spans. */
export function UsageBar({ spans, tier, className = "" }: { spans: number; tier: string; className?: string }) {
  const included = planById(tier as PlanId).spanLimit;
  const hard = enforcedSpanLimit(tier) ?? included;
  const level = usageLevel(spans, tier);
  const includedAt = (included / hard) * 100;
  return (
    <div
      className={`relative h-2 border border-[#262C35] bg-[#0B0D10] ${className}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={hard}
      aria-valuenow={Math.min(spans, hard)}
      aria-label={`${spans.toLocaleString()} spans used`}
    >
      <div className={`absolute inset-y-0 left-0 ${level === "ok" ? "bg-[#E6E9EE]" : "bg-[#F4D44D]"}`} style={{ width: `${Math.min(100, (spans / hard) * 100)}%` }} />
      <div className="absolute -inset-y-0.5 w-px bg-[#6B7380]" style={{ left: `${includedAt * 0.8}%` }} />
      <div className="absolute -inset-y-1 w-px bg-[#8B93A1]" style={{ left: `${includedAt}%` }} />
    </div>
  );
}
