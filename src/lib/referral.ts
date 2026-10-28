/** Referral codes travel as ?ref=code. They are remembered in the browser and sent along with newsletter and contact forms. */

export const REFERRAL_STORAGE_KEY = "uncoil.ref";

export function normalizeReferral(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  return code.length >= 2 ? code : null;
}

export function referralLink(code: string, origin = "https://www.uncoil.dev"): string {
  const clean = normalizeReferral(code);
  return clean ? `${origin}/?ref=${clean}` : origin;
}

export function readStoredReferral(): string | null {
  try {
    return normalizeReferral(window.localStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function rememberReferral(code: string): void {
  try {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    /* Storage can be blocked; the link still works for the current visit. */
  }
}

/** Value stored in the lead's campaign field, so every signup can be traced to a link. */
export function campaignFor(source: string, referral: string | null): string {
  return referral ? `${source}|ref:${referral}` : source;
}
