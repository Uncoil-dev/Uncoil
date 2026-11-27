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
