import { hasOneTimeApiKey } from "@/lib/onboarding-client-state";

const PROJECT_ID_STORAGE_KEY = "uncoil.onboarding.projectId";
const LAST_PROJECT_STORAGE_KEY = "uncoil.lastProjectId";
const API_KEY_COPIED_STORAGE_KEY = "uncoil.onboarding.apiKeyCopied";

export function getOnboardingHref(projectId?: string) {
  if (typeof window === "undefined") {
    return "/onboarding/project";
  }

  const sessionProjectId =
    window.sessionStorage.getItem(PROJECT_ID_STORAGE_KEY) ?? "";
  const lastProjectId = window.localStorage.getItem(LAST_PROJECT_STORAGE_KEY) ?? "";
  const effectiveProjectId = projectId ?? sessionProjectId ?? lastProjectId;

  if (!effectiveProjectId || effectiveProjectId === "no-project") {
    return "/onboarding/project";
  }

  const hasCopiedKey =
    window.sessionStorage.getItem(API_KEY_COPIED_STORAGE_KEY) === "true";

  if (hasOneTimeApiKey() && !hasCopiedKey) {
    return "/onboarding/api-key";
  }

  return "/onboarding/install";
}
