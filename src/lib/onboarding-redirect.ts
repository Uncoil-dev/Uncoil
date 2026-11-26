const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

type QueryValue = string | string[] | undefined;

// Where the retired onboarding success screen sends people: straight to the
// first run when both ids are plain identifiers, otherwise back to the install
// step. Anything else in the query never reaches the redirect path.
export function onboardingSuccessTarget(projectId: QueryValue, runId: QueryValue): string {
  if (
    typeof projectId === "string" &&
    typeof runId === "string" &&
    SAFE_ID.test(projectId) &&
    SAFE_ID.test(runId)
  ) {
    return `/dashboard/${projectId}/runs/${runId}`;
  }
  return "/onboarding/install";
}
