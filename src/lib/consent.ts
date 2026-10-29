export const CONSENT_VERSION = "2026-09-02";
export type ConsentState = { version: string; analytics: boolean; marketing: boolean };
export const CONSENT_KEY = "uncoil.consent";
// Analytics is enabled by default; marketing remains opt-in. Users can reject analytics from the banner.
export const defaultConsent: ConsentState = { version: CONSENT_VERSION, analytics: true, marketing: false };

export const CONSENT_EVENT = "uncoil:consent" as const;
export type ConsentEvent = CustomEvent<ConsentState>;

export function hasCurrentConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return parsed?.version === CONSENT_VERSION && typeof parsed.analytics === "boolean" && typeof parsed.marketing === "boolean";
  } catch { return false; }
}

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return defaultConsent;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || "null") as Partial<ConsentState> | null;
    if (!parsed || parsed.version !== CONSENT_VERSION) return defaultConsent;
    return { version: CONSENT_VERSION, analytics: parsed.analytics === true, marketing: parsed.marketing === true };
  } catch { return defaultConsent; }
}

export function writeConsent(value: Omit<ConsentState, "version">) {
  const next = { version: CONSENT_VERSION, ...value };
  try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); } catch { /* private browsing / blocked storage */ }
  window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: next }));
  return next;
}
