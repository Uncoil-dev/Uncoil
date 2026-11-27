import { dailySpanLimit, enforcedSpanLimit } from "./plan-limits.ts";
import { monthlyPrice, planForSpans, plans, type Plan } from "./pricing-plans.ts";
import { planRetentionDays } from "./retention.ts";

/** Typical monthly usage for the three example bills on the pricing page. Spans are runs times steps, as in the price calculator. */
const EXAMPLE_USAGE = [
  { label: "Side project", what: "a hobby agent answering a few hundred questions", runs: 400, steps: 8 },
  { label: "Small product", what: "a support bot with real customers", runs: 25_000, steps: 8 },
  { label: "Busy agent", what: "an agent running all day in production", runs: 100_000, steps: 14 },
] as const;

export type ExampleBill = { label: string; what: string; runs: number; steps: number; spans: number; plan: Plan; monthly: number; annual: number };

/** Each example is priced on the smallest plan that includes its spans, using the shared plan list. */
export function exampleBills(): ExampleBill[] {
  return EXAMPLE_USAGE.map((usage) => {
    const spans = usage.runs * usage.steps;
    const plan = planForSpans(spans);
    if (!plan) throw new Error(`Example "${usage.label}" is larger than the biggest plan`);
    return { ...usage, spans, plan, monthly: monthlyPrice(plan, "monthly"), annual: monthlyPrice(plan, "annual") };
  });
}

export type LimitRow = { plan: Plan; retentionDays: number; included: number; stopsAt: number; daily: number | null };

/** Retention, daily and monthly limits per plan, read from the same functions ingest and the retention job use. */
export function limitRows(): LimitRow[] {
  return plans.map((plan) => ({
    plan,
    retentionDays: planRetentionDays(plan.id) ?? 0,
    included: plan.spanLimit,
    stopsAt: enforcedSpanLimit(plan.id) ?? plan.spanLimit,
    daily: dailySpanLimit(plan.id),
  }));
}
