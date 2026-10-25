import { planById, type PlanId } from "./pricing-plans.ts";

/** Paid plans may run this far past their included spans before new data is refused (a buffer, not a promise). */
export const PAID_GRACE = 0.1;

/**
 * Monthly span limits applied when data comes in.
 * Free stops exactly at its limit. Pro and Team stop at their limit plus a 10% buffer, so a busy day never cuts off a paying customer right at the line.
 * Enterprise and unknown tiers are never blocked, so a backend that has not been redeployed yet cannot lock anyone out.
 */
export function enforcedSpanLimit(tier: string | undefined): number | null {
  if (tier === "free") return planById("free" as PlanId).spanLimit;
  if (tier === "pro" || tier === "team") return Math.floor(planById(tier).spanLimit * (1 + PAID_GRACE));
  return null;
}

export type UsageLevel = "ok" | "warn" | "over" | "blocked";

/** Where a project stands against its plan: ok under 80%, warn from 80%, over the included spans, blocked once new data is refused. */
export function usageLevel(spans: number, tier: string | undefined): UsageLevel {
  if (tier === "enterprise") return "ok";
  const included = planById((tier ?? "free") as PlanId).spanLimit;
  const hard = enforcedSpanLimit(tier);
  if (hard !== null && spans >= hard) return "blocked";
  if (spans >= included) return "over";
  return spans / included >= 0.8 ? "warn" : "ok";
}

/** Calendar month in UTC, e.g. "2026-10". Matches the usage meter, which also counts by UTC month. */
export function monthKey(now: Date) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Whole seconds until the next UTC month begins (at least 1). */
export function secondsUntilNextMonth(now: Date) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

export function planLimitMessage(limit: number, tier: string | undefined = "free") {
  const formatted = limit.toLocaleString("en-US");
  if (tier === "free") {
    return `This project has used its ${formatted} free spans for the month. New data is not saved until the month resets or the project is upgraded.`;
  }
  return `This project has used all ${formatted} spans allowed on its plan this month. New data is not saved until the month resets or the plan is upgraded.`;
}
