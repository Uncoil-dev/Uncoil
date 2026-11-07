export const onboardingSteps = [
  { id: "project", label: "Create project" },
  { id: "api-key", label: "API key" },
  { id: "install", label: "Send first run" },
] as const;

/** "waiting" and "success" are legacy routes that now fold into the last step. */
export type OnboardingStepId = (typeof onboardingSteps)[number]["id"] | "waiting" | "success";

export function getOnboardingStepIndex(step: OnboardingStepId) {
  if (step === "waiting") return onboardingSteps.length - 1;
  if (step === "success") return onboardingSteps.length;
  return onboardingSteps.findIndex((candidate) => candidate.id === step);
}

export function OnboardingProgress({
  currentStep,
}: {
  currentStep: OnboardingStepId;
}) {
  const activeIndex = getOnboardingStepIndex(currentStep);

  return (
    <div className="border-t border-current/25 pt-5">
      <div className="mb-4 text-[9px] uppercase tracking-[0.14em] opacity-55">
        {activeIndex + 1} / {onboardingSteps.length} {onboardingSteps[activeIndex]?.label}
      </div>
      <ol className="grid grid-cols-3 gap-2">
        {onboardingSteps.map((step, index) => {
          const active = index === activeIndex;
          const complete = index < activeIndex;

          return (
            <li key={step.id} className="min-w-0">
              <div
                className={
                  complete || active
                    ? "mb-2 h-0.5 bg-current"
                    : "mb-2 h-0.5 bg-current opacity-20"
                }
              />
              <div
                className={
                  active
                    ? "truncate text-[8px] uppercase tracking-[0.08em]"
                    : "truncate text-[8px] uppercase tracking-[0.08em] opacity-30"
                }
              >
                {step.label}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
