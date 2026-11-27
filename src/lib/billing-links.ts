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

// Rebuilds a checkout page link from the page's own query values, keeping the requested project when there is one.
export function checkoutPageHref(plan: PaidPlan, interval: BillingInterval, requestedProjectId: string | null) {
  return pricingCheckoutHref(plan, interval, requestedProjectId ?? undefined);
}
