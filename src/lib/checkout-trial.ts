/** Free days before the first charge on a new paid subscription. */
export const TRIAL_DAYS = 7;

/** Short plan-card line; keep in step with the pricing FAQ ("Each project gets one trial"). */
export function trialLine(): string {
  return `${TRIAL_DAYS} days free, once per project`;
}

/**
 * A project gets the trial once: any earlier subscription (even a cancelled one)
 * means the first charge happens at checkout. Guest checkouts have no project yet.
 */
export function trialDaysFor(project: { stripeSubscriptionId?: string | null } | null): number {
  return project?.stripeSubscriptionId ? 0 : TRIAL_DAYS;
}

export type CheckoutPanelInput = {
  status?: string | null;
  planTier?: string | null;
  /** Epoch ms; while trialing this is when the first charge happens. */
  periodEnd?: number | null;
};

export type CheckoutPanelCopy = {
  eyebrow: string;
  heading: string;
  detail: string;
  steps: { title: string; body: string; href: string }[];
};

/** Wording and next-step links for the panel shown after checkout, for trial vs paid subscriptions. */
export function checkoutPanelCopy(input: CheckoutPanelInput, base: string): CheckoutPanelCopy {
  const plan = input.planTier === "pro" ? "Pro " : input.planTier === "team" ? "Team " : "";
  const steps = [
    { title: "Set an alert", body: "Get told when a run fails or costs spike.", href: `${base}/alerts` },
    { title: "Ask AI about a run", body: "Open a run and ask what went wrong.", href: `${base}/runs` },
    { title: "Create an evaluation", body: "Score your agent's answers automatically.", href: `${base}/evaluation` },
  ];
  if (input.status === "active" || input.status === "past_due") {
    return {
      eyebrow: "Payment received",
      heading: "Thank you. You're all set.",
      detail: "Higher limits are live now. Stripe emailed your receipt; you can also manage your plan below.",
      steps,
    };
  }
  if (input.status !== "trialing") {
    // Status not synced yet (webhook pending) or unknown: make no payment or charge claims.
    return {
      eyebrow: "Checkout complete",
      heading: "Checkout complete",
      detail: "We're setting up your plan. It can take a moment to show here.",
      steps,
    };
  }
  const chargeDate = input.periodEnd
    ? new Date(input.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : null;
  return {
    eyebrow: "Trial started",
    heading: `Your ${TRIAL_DAYS}-day ${plan}trial is on`,
    detail: chargeDate
      ? `Your first charge is on ${chargeDate}. Cancel before then and you pay nothing.`
      : "Cancel before the trial ends and you pay nothing.",
    steps,
  };
}
