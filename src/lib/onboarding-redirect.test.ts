import assert from "node:assert/strict";
import test from "node:test";

import { onboardingSuccessTarget } from "./onboarding-redirect.ts";

test("success screen sends users to the first run, or back to install", () => {
  assert.equal(
    onboardingSuccessTarget("proj_1", "run-2"),
    "/dashboard/proj_1/runs/run-2",
  );
  assert.equal(onboardingSuccessTarget("proj_1", undefined), "/onboarding/install");
  assert.equal(onboardingSuccessTarget(undefined, "run-2"), "/onboarding/install");
  assert.equal(onboardingSuccessTarget("", ""), "/onboarding/install");
  // Values that could escape the dashboard path are never interpolated.
  assert.equal(onboardingSuccessTarget("../x", "run-2"), "/onboarding/install");
  assert.equal(onboardingSuccessTarget("//evil.com", "r"), "/onboarding/install");
  assert.equal(onboardingSuccessTarget("p", "a/b?c=d"), "/onboarding/install");
  assert.equal(onboardingSuccessTarget(["p", "q"], "r"), "/onboarding/install");
});
