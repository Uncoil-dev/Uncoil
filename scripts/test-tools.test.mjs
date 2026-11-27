import assert from "node:assert/strict";
import { test } from "node:test";
import { discoverToolTests } from "./test-tools.mjs";

// Files the hand-maintained `test:tools` list ran before discovery replaced it.
const PREVIOUSLY_LISTED = [
  "convex/alertHelpers.test.ts",
  "convex/pricing-scoring.test.ts",
  "convex/rules.test.ts",
  "convex/welcomeEmail.test.ts",
  "scripts/lib/sample-traces.test.mjs",
  "scripts/require-tests.test.mjs",
  "scripts/retry-flaky-checks.test.mjs",
  "scripts/scan-content.test.mjs",
  "scripts/scan-coverage.test.mjs",
  "scripts/scan-lighthouse.test.mjs",
  "src/app/(frontend)/api/otel/error-spans.test.ts",
  "src/app/(frontend)/api/otel/route.test.ts",
  "src/app/(frontend)/api/projects/[projectId]/topics/route.test.ts",
  "src/components/dashboard/alerts/alert-metrics.test.ts",
  "src/components/dashboard/explore/types.test.ts",
  "src/components/dashboard/filter-builder/types.test.ts",
  "src/components/dashboard/groups/group-view.test.ts",
  "src/components/dashboard/tracing/format.test.ts",
  "src/components/dashboard/widgets/board-store.test.ts",
  "src/components/marketing/landing-sample-run.test.ts",
  "src/components/marketing/landing/trace-reach.test.ts",
  "src/components/marketing/section-library-data.test.ts",
  "src/components/marketing/tools/samples.test.ts",
  "src/inngest/topics.test.ts",
  "src/lib/access-cache.test.ts",
  "src/lib/answers/core.test.ts",
  "src/lib/answers/registry.test.ts",
  "src/lib/auto-scoring.test.ts",
  "src/lib/billing-links.test.ts",
  "src/lib/cli-login.test.ts",
  "src/lib/cost-estimator.test.ts",
  "src/lib/dataset-import.test.ts",
  "src/lib/demo/demo-data.test.ts",
  "src/lib/demo/demo-queries.test.ts",
  "src/lib/demo/sample-project-state.test.ts",
  "src/lib/email-templates.test.ts",
  "src/lib/evaluator-rules.test.ts",
  "src/lib/experiment-compare.test.ts",
  "src/lib/explain-failure.test.ts",
  "src/lib/free-plan-limits.test.ts",
  "src/lib/glossary-data/glossary.test.ts",
  "src/lib/group-filters.test.ts",
  "src/lib/i18n/i18n.test.ts",
  "src/lib/ingest-cache.test.ts",
  "src/lib/ingest-payload.test.ts",
  "src/lib/library-access.test.ts",
  "src/lib/llm-providers.test.ts",
  "src/lib/onboarding-redirect.test.ts",
  "src/lib/plan-limits-server.test.ts",
  "src/lib/plan-limits.test.ts",
  "src/lib/playground-demo.test.ts",
  "src/lib/pricing-plans.test.ts",
  "src/lib/product-features.test.ts",
  "src/lib/project-errors.test.ts",
  "src/lib/project-llm.test.ts",
  "src/lib/project-route-access.test.ts",
  "src/lib/prompt-utils.test.ts",
  "src/lib/public-origin.test.ts",
  "src/lib/redaction.test.ts",
  "src/lib/redis-cache.test.ts",
  "src/lib/referral.test.ts",
  "src/lib/related-posts.test.ts",
  "src/lib/report-browser-crash.test.ts",
  "src/lib/retention-job.test.ts",
  "src/lib/retention.test.ts",
  "src/lib/review-utils.test.ts",
  "src/lib/score-utils.test.ts",
  "src/lib/search-integrations.test.ts",
  "src/lib/seo.test.ts",
  "src/lib/settings-rules.test.ts",
  "src/lib/span-pipeline.test.ts",
  "src/lib/span-search.test.ts",
  "src/lib/tinybird-groups.test.ts",
  "src/lib/tinybird.test.ts",
  "src/lib/tools/calculators.test.ts",
  "src/lib/tools/json-fixer.test.ts",
  "src/lib/tools/log-checker.test.ts",
  "src/lib/tools/models.test.ts",
  "src/lib/tools/observability-bill.test.ts",
  "src/lib/tools/prompt-checker.test.ts",
  "src/lib/tools/provider-status.test.ts",
  "src/lib/tools/registry.test.ts",
  "src/lib/tools/tokens.test.ts",
  "src/lib/tools/tool-checker.test.ts",
  "src/lib/trace-facets.test.ts",
  "src/lib/trace-list-sql.test.ts",
  "src/lib/trace-topics.test.ts",
  "src/lib/treemap.test.ts",
  "src/lib/uncoil-ports/facets.test.ts",
  "src/lib/uncoil-ports/scores.test.ts",
  "src/lib/uncoil-ports/trees.test.ts",
  "src/lib/utils.test.ts",
  "src/lib/widget-utils.test.ts",
];

const discovered = new Set(discoverToolTests());

test("discovers every test the old list ran", () => {
  const missing = PREVIOUSLY_LISTED.filter((f) => !discovered.has(f));
  assert.deepEqual(missing, []);
});

test("includes this suite so the runner is exercised in CI", () => {
  assert.ok(discovered.has("scripts/test-tools.test.mjs"));
});

test("leaves out suites owned by other commands", () => {
  for (const f of [
    "src/lib/consent.test.ts", // test:consent
    "src/lib/markdoc-blog.test.ts", // test:content
    "scripts/ci/known-flaky.test.mjs", // test:ci-scripts
    "convex/leads.test.ts", // vitest
    "src/lib/tinybird-groups.integration.test.ts", // integration
  ]) {
    assert.equal(discovered.has(f), false, f);
  }
});
