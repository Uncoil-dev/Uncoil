"use client";

import { safeRelativePath } from "@/lib/navigation-context";

let apiKey = "";
const listeners = new Set<() => void>();
const ONE_TIME_API_KEY_STORAGE_KEY = "uncoil.onboarding.apiKey";

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function setOneTimeApiKey(value: string) {
  apiKey = value;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(ONE_TIME_API_KEY_STORAGE_KEY, value);
  }
  emit();
}

export function getOneTimeApiKey() {
  if (apiKey) return apiKey;
  if (typeof window !== "undefined") {
    apiKey = window.sessionStorage.getItem(ONE_TIME_API_KEY_STORAGE_KEY) ?? "";
  }
  return apiKey;
}

export function hasOneTimeApiKey() {
  return apiKey.length > 0 || (typeof window !== "undefined" && window.sessionStorage.getItem(ONE_TIME_API_KEY_STORAGE_KEY) !== null);
}

export function clearOneTimeApiKey() {
  apiKey = "";
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(ONE_TIME_API_KEY_STORAGE_KEY);
  }
  emit();
}

const RETURN_PATH_STORAGE_KEY = "uncoil.onboarding.returnPath";
const ONBOARDING_DISMISSED_STORAGE_KEY = "uncoil.onboarding.dismissed";

export function setReturnPath(value: string) {
  if (typeof window !== "undefined") {
    // `?from=` comes from the URL, so only in-app paths are kept.
    const safeValue = safeRelativePath(value);
    const normalizedValue = safeValue.includes("/dashboard/no-project")
      ? "/dashboard"
      : safeValue;
    window.sessionStorage.setItem(RETURN_PATH_STORAGE_KEY, normalizedValue);
    emit();
  }
}

export function getReturnPath() {
  if (typeof window !== "undefined") {
    return window.sessionStorage.getItem(RETURN_PATH_STORAGE_KEY) ?? "";
  }
  return "";
}

export function clearReturnPath() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(RETURN_PATH_STORAGE_KEY);
    emit();
  }
}

/**
 * Setup is always available from the dashboard, but leaving it must not make
 * routine project navigation feel like a required setup flow.
 */
export function dismissOnboarding() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, "true");
    emit();
  }
}

export function hasDismissedOnboarding() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) === "true";
}

export function subscribeToOneTimeApiKey(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whole seconds between account creation and `now`, so activation can be
 * measured from sign-up rather than from opening the install step.
 * Returns null when the creation time is missing, unreadable or in the future.
 */
export function secondsSinceSignup(createdAt: Date | string | number | null | undefined, now = Date.now()) {
  if (createdAt == null) return null;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created) || created > now) return null;
  return Math.floor((now - created) / 1000);
}
