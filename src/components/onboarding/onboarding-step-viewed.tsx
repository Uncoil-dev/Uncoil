"use client";

import { useEffect } from "react";
import { getOnboardingStepIndex, onboardingSteps, type OnboardingStepId } from "@/components/onboarding/onboarding-progress";
import { captureAnalytics } from "@/lib/analytics";

export function stepViewedProperties(step: OnboardingStepId) {
  return { step, step_number: getOnboardingStepIndex(step) + 1, total_steps: onboardingSteps.length };
}

/** Sends one `onboarding_step_viewed` event per visit, so the funnel shows where people stop. */
export function OnboardingStepViewed({ step }: { step: OnboardingStepId }) {
  useEffect(() => {
    captureAnalytics("onboarding_step_viewed", stepViewedProperties(step));
  }, [step]);
  return null;
}
