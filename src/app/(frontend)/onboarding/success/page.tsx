import { redirect } from "next/navigation";

import { onboardingSuccessTarget } from "@/lib/onboarding-redirect";

// The first-run confirmation lives in the install step now. Old links go straight
// to the run when it is known, otherwise back to install.
export default async function OnboardingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string | string[]; runId?: string | string[] }>;
}) {
  const { projectId, runId } = await searchParams;
  redirect(onboardingSuccessTarget(projectId, runId));
}
