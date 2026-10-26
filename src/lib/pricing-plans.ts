import type { BillingInterval, PaidPlan } from "@/lib/billing-links";

// Single source of truth for the pricing and checkout pages.
// The landing page's pricing teaser mirrors these numbers by hand; change them there too.
export type PlanId = "free" | PaidPlan;

export type Plan = {
  id: PlanId;
  name: string;
  monthly: number;
  spanLimit: number;
  spans: string;
  retention: string;
  members: string;
  projects: string;
  line: string;
  features: readonly string[];
};

export const plans: readonly Plan[] = [
  { id: "free", name: "Free", monthly: 0, spanLimit: 25_000, spans: "25k", retention: "7 days", members: "1", projects: "3", line: "Try it on a real agent.", features: ["Trace viewer", "Cost visibility", "Community support"] },
  { id: "pro", name: "Pro", monthly: 19, spanLimit: 500_000, spans: "500k", retention: "30 days", members: "5", projects: "3", line: "For a builder shipping agents.", features: ["Evaluations + datasets", "Prompt versions", "Slack alerts"] },
  { id: "team", name: "Team", monthly: 39, spanLimit: 2_000_000, spans: "2m", retention: "90 days", members: "20", projects: "Unlimited", line: "For teams running agents in prod.", features: ["Release gates", "Collaboration + reviews", "Priority support"] },
];

export const ANNUAL_DISCOUNT = 0.2;

export function monthlyPrice(plan: Plan, interval: BillingInterval) {
  return interval === "annual" ? plan.monthly * (1 - ANNUAL_DISCOUNT) : plan.monthly;
}

export function formatPrice(value: number) {
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export function planById(id: PlanId) {
  return plans.find((plan) => plan.id === id) ?? plans[1];
}

/** Smallest plan whose monthly span limit covers the estimate; null means Enterprise. */
export function planForSpans(spans: number): Plan | null {
  return plans.find((plan) => spans <= plan.spanLimit) ?? null;
}
