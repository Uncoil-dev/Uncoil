"use client";

import { useEffect, useState } from "react";
import { onOnboardingDraft } from "@/components/onboarding/onboarding-draft";
import { onboardingSteps } from "@/components/onboarding/onboarding-progress";

/** Pixel progress bar. Turns fully black the moment the first run arrives. */
export function PixelStepper({ activeIndex }: { activeIndex: number }) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => onOnboardingDraft((draft) => { if (draft.arrived) setArrived(true); }), []);
  const index = arrived ? onboardingSteps.length : activeIndex;
  return (
    <ol className="flex w-full max-w-xl items-stretch gap-2" aria-label="Setup progress">
      {onboardingSteps.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={step.id} className="min-w-0 flex-1" aria-current={active ? "step" : undefined}>
            <div className={`h-3.5 ${done ? "bg-black" : active ? "animate-mono-pulse bg-[#fff4b5] outline outline-[3px] -outline-offset-[1px] outline-black" : "bg-black/25 outline outline-1 -outline-offset-1 outline-black/50"}`} />
            <p className={`mt-2 hidden truncate font-mono text-[11px] uppercase tracking-[0.1em] sm:block ${active ? "font-bold text-black" : done ? "text-black" : "text-black/65"}`}>{step.label}</p>
          </li>
        );
      })}
    </ol>
  );
}
