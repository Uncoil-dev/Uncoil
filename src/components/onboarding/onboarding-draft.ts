"use client";

export type OnboardingDraft = {
  name?: string;
  runtime?: string;
  keyCopied?: boolean;
  arrived?: boolean;
};

const EVENT = "uncoil:onboarding-draft";

export function publishOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OnboardingDraft>(EVENT, { detail: draft }));
}

export function onOnboardingDraft(handler: (draft: OnboardingDraft) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<OnboardingDraft>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
