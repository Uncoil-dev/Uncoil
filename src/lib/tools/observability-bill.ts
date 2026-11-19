/**
 * Monthly bill on each tracing tool for the same traffic.
 * Vendor prices were read from their public pricing pages on VENDOR_PRICES_AS_OF.
 * Where a page does not publish a rate (LangSmith and Helicone usage above the included amount),
 * the result is marked "from" and no number is invented.
 */

import { monthlyPrice, plans } from "../pricing-plans.ts";

export const VENDOR_PRICES_AS_OF = "19 November 2026";

export type BillInput = {
  runsPerMonth: number;
  modelCallsPerRun: number;
  toolCallsPerRun: number;
  members: number;
  /** Evaluation scores per run. Langfuse counts each score as a billable unit. */
  scoresPerRun: number;
};

export const defaultBill: BillInput = { runsPerMonth: 20_000, modelCallsPerRun: 5, toolCallsPerRun: 3, members: 3, scoresPerRun: 0 };

export type BillRow = {
  tool: "Uncoil" | "Langfuse" | "LangSmith" | "Helicone";
  plan: string;
  /** Monthly dollars. For kind "from" this is the least you would pay. */
  amount: number | null;
  kind: "exact" | "from" | "contact";
  what: string;
  note: string;
};

const clean = (v: number) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** Langfuse overage, graduated: $8/100k to 1M units, $7 to 10M, $6.50 to 50M, $6 above. Page read on VENDOR_PRICES_AS_OF. */
export function langfuseOverage(units: number): number {
  const tiers: ReadonlyArray<readonly [number, number]> = [[1_000_000, 8], [10_000_000, 7], [50_000_000, 6.5], [Infinity, 6]];
  let cost = 0;
  let from = 100_000;
  for (const [to, per100k] of tiers) {
    if (units <= from) break;
    cost += ((Math.min(units, to) - from) / 100_000) * per100k;
    from = to;
  }
  return cost;
}

export function spansFor(input: BillInput) {
  return clean(input.runsPerMonth) * (1 + clean(input.modelCallsPerRun) + clean(input.toolCallsPerRun));
}

export function uncoilBill(input: BillInput): BillRow {
  const spans = spansFor(input);
  const members = Math.max(1, clean(input.members));
  const plan = plans.find((p) => spans <= p.spanLimit && members <= Number(p.members));
  if (!plan) {
    return { tool: "Uncoil", plan: "Enterprise", amount: null, kind: "contact", what: `${spans.toLocaleString("en-US")} spans`, note: "Above the Team plan. Ask for a quote." };
  }
  return {
    tool: "Uncoil",
    plan: plan.name,
    amount: monthlyPrice(plan, "monthly"),
    kind: "exact",
    what: `${spans.toLocaleString("en-US")} spans, ${plan.spans} included`,
    note: plan.id === "free" ? "Free stops at its limit. Nothing is billed." : "Flat price. Members are not billed per seat.",
  };
}

export function langfuseBill(input: BillInput): BillRow {
  const runs = clean(input.runsPerMonth);
  const units = runs * (1 + clean(input.modelCallsPerRun) + clean(input.toolCallsPerRun) + clean(input.scoresPerRun));
  const members = Math.max(1, clean(input.members));
  const what = `${units.toLocaleString("en-US")} units`;
  if (units <= 50_000 && members <= 2) return { tool: "Langfuse", plan: "Hobby", amount: 0, kind: "exact", what, note: "50k units and 2 users included. 30 days of data." };
  const extra = langfuseOverage(units);
  return {
    tool: "Langfuse",
    plan: "Core",
    amount: Math.round((29 + extra) * 100) / 100,
    kind: "exact",
    what,
    note: "$29 with 100k units, then $8 per 100k (less at higher volume). A unit is a trace, a step or a score.",
  };
}

export function langsmithBill(input: BillInput): BillRow {
  const traces = clean(input.runsPerMonth);
  const members = Math.max(1, clean(input.members));
  const what = `${traces.toLocaleString("en-US")} traces, ${members} seat${members === 1 ? "" : "s"}`;
  if (members === 1 && traces <= 5_000) return { tool: "LangSmith", plan: "Developer", amount: 0, kind: "exact", what, note: "1 seat and 5k base traces included." };
  const amount = 39 * members;
  if (traces <= 10_000) return { tool: "LangSmith", plan: "Plus", amount, kind: "exact", what, note: "$39 per seat. 10k base traces included. 14 days of history." };
  return { tool: "LangSmith", plan: "Plus", amount, kind: "from", what, note: "$39 per seat covers 10k base traces. Above that is pay as you go, and the rate is not on their pricing page, so we do not guess it." };
}

export function heliconeBill(input: BillInput): BillRow {
  const requests = clean(input.runsPerMonth) * clean(input.modelCallsPerRun);
  const members = Math.max(1, clean(input.members));
  const what = `${requests.toLocaleString("en-US")} requests`;
  if (requests <= 10_000 && members === 1) return { tool: "Helicone", plan: "Hobby", amount: 0, kind: "exact", what, note: "10,000 requests and 1 seat included. 7 days of history." };
  if (requests <= 10_000) return { tool: "Helicone", plan: "Pro", amount: 79, kind: "exact", what, note: "$79 with unlimited seats and 10k requests." };
  return { tool: "Helicone", plan: "Pro", amount: 79, kind: "from", what, note: "$79 covers 10k requests. Usage-based pricing applies above that, and the rate is not on their pricing page, so we do not guess it." };
}

export function allBills(input: BillInput): BillRow[] {
  return [uncoilBill(input), langfuseBill(input), langsmithBill(input), heliconeBill(input)];
}
