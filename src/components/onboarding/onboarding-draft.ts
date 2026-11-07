"use client";

export type OnboardingDraft = {
  name?: string;
  runtime?: string;
  keyCopied?: boolean;
  arrived?: boolean;
};

const EVENT = "uncoil:onboarding-draft";

// Remember what was published so a component that mounts late still sees it.
let latest: OnboardingDraft = {};

export function publishOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") return;
  latest = { ...latest, ...draft };
  window.dispatchEvent(new CustomEvent<OnboardingDraft>(EVENT, { detail: draft }));
}

export function onOnboardingDraft(handler: (draft: OnboardingDraft) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<OnboardingDraft>).detail);
  window.addEventListener(EVENT, listener);
  if (Object.keys(latest).length > 0) handler(latest);
  return () => window.removeEventListener(EVENT, listener);
}
