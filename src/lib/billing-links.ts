export type PaidPlan = "pro" | "team";
export type BillingInterval = "monthly" | "annual";

// Pass projectId from in-app links so checkout covers the project the user is looking at.
export function pricingCheckoutHref(plan: PaidPlan, interval: BillingInterval, projectId?: string) {
  const base = `/pricing/checkout?plan=${plan}&interval=${interval}`;
  return projectId ? `${base}&project=${encodeURIComponent(projectId)}` : base;
}

// Picks the project checkout starts on: the requested one if the user owns it, else their first project.
export function initialCheckoutProjectId(requested: string | null, projects: ReadonlyArray<{ _id: string }> | undefined) {
  if (!projects?.length) return "";
  return projects.find((project) => project._id === requested)?._id ?? projects[0]._id;
}
