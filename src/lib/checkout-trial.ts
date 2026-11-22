/** Free days before the first charge on a new paid subscription. */
export const TRIAL_DAYS = 7;

/**
 * A project gets the trial once: any earlier subscription (even a cancelled one)
 * means the first charge happens at checkout. Guest checkouts have no project yet.
 */
export function trialDaysFor(project: { stripeSubscriptionId?: string | null } | null): number {
  return project?.stripeSubscriptionId ? 0 : TRIAL_DAYS;
}
