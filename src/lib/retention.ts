/**
 * How long each plan keeps data. Must match the numbers on the pricing page (pricing-plans.ts);
 * `retention.test.ts` checks that they agree.
 * Enterprise and unknown tiers have no plan limit, so nothing is deleted for them because of their plan.
 */
export const PLAN_RETENTION_DAYS: Readonly<Record<string, number>> = { free: 7, pro: 30, team: 90 };

/** The oldest data a plan keeps, in days; null when the plan sets no limit. */
export function planRetentionDays(tier: string | undefined): number | null {
  return PLAN_RETENTION_DAYS[tier ?? "free"] ?? null;
}

/**
 * Days of data a project really keeps: the plan limit, or a shorter window the project chose itself.
 * A project can never keep more than its plan allows. null means keep everything (the table's 365-day backstop still applies).
 */
export function effectiveRetentionDays(tier: string | undefined, projectDays: number | undefined): number | null {
  const plan = planRetentionDays(tier);
  const own = projectDays !== undefined && Number.isInteger(projectDays) && projectDays >= 1 ? projectDays : null;
  if (plan === null) return own;
  return own === null ? plan : Math.min(plan, own);
}

/** Groups project ids by the number of days they keep, so each group is one delete. */
export function groupProjectsByRetention(projects: readonly { projectId: string; planTier?: string; retentionDays?: number }[]) {
  const groups = new Map<number, string[]>();
  for (const project of projects) {
    const days = effectiveRetentionDays(project.planTier, project.retentionDays);
    if (days === null) continue;
    groups.set(days, [...(groups.get(days) ?? []), project.projectId]);
  }
  return groups;
}
