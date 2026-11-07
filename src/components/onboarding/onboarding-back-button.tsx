"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { OnboardingStepId } from "./onboarding-progress";

const BACK_MAPPING: Record<string, string> = {
  "api-key": "/onboarding/project",
  "install": "/onboarding/api-key",
};

export function OnboardingBackButton({ currentStep }: { currentStep: OnboardingStepId }) {
  const router = useRouter();
  const backHref = BACK_MAPPING[currentStep];

  if (!backHref) return null;

  return (
    <button
      onClick={() => router.push(backHref)}
      className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-black/55 transition-colors hover:text-black mb-6"
    >
      <ChevronLeft className="size-3" />
      <span>Back</span>
    </button>
  );
}
