import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlan,
  previewUrls,
  PREVIEW_BRANCH,
} from "./saved-view-preview-build.mjs";
const env = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: PREVIEW_BRANCH,
  NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND: "cloud",
  CONVEX_DEPLOY_KEY: "preview:test:project|test",
};
test("only the authorized cloud preview branch can deploy a backend", () => {
  assert.equal(buildPlan(env), "isolated");
  for (const patch of [
    { VERCEL_ENV: "production" },
    { VERCEL_GIT_COMMIT_REF: "main" },
    { NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND: "marketing" },
    { CONVEX_DEPLOY_KEY: "" },
  ])
    assert.equal(buildPlan({ ...env, ...patch }), "frontend");
});
test("production deploy keys are rejected in preview", () => {
  assert.throws(
    () => buildPlan({ ...env, CONVEX_DEPLOY_KEY: "prod:test|test" }),
    /production key/,
  );
});
test("preview URL derivation rejects production and arbitrary hosts", () => {
  assert.deepEqual(
    previewUrls({
      NEXT_PUBLIC_CONVEX_URL: "https://isolated-test.eu-west-1.convex.cloud",
    }),
    {
      cloud: "https://isolated-test.eu-west-1.convex.cloud",
      site: "https://isolated-test.eu-west-1.convex.site",
      deployment: "isolated-test",
    },
  );
  for (const value of [
    "https://jovial-owl-711.eu-west-1.convex.cloud",
    "https://example.com",
    "http://test.convex.cloud",
  ])
    assert.throws(() => previewUrls({ NEXT_PUBLIC_CONVEX_URL: value }));
});
