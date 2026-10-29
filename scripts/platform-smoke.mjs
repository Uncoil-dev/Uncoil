const baseUrl = (process.env.UNCOIL_SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const routes = [
  ["/", 200],
  ["/demo", [200, 302, 307, 308]],
  ["/docs", 200],
  ["/docs/python", 200],
  ["/docs/typescript", 200],
  ["/docs/playwright", 200],
  ["/docs/api", 200],
  ["/docs/prompts", 200],
  ["/docs/evaluation", 200],
  ["/docs/lifecycle", 200],
  ["/docs/integrations", 200],
  ["/docs/self-hosting", 200],
  ["/integrations", 200],
  ["/product/evaluation-engine", 200],
  ["/product/lifecycle", 200],
  ["/roadmap", 200],
  ["/api/otel", 200],
  ["/this-route-should-not-exist", 404],
  ["/dashboard/not-a-project/prompts", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/evaluation", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/datasets", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/experiments", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/compare", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/investigate", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/journey/not-a-run", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/resilience", [200, 302, 307, 308]],
  ["/dashboard/not-a-project/playground", [200, 302, 307, 308]],
];

let failed = 0;
async function fetchWithTimeout(url, options = {}) {
  const signal = AbortSignal.timeout(8000);
  return fetch(url, { ...options, signal });
}
for (const [path, expected] of routes) {
  try {
    const response = await fetchWithTimeout(baseUrl + path, { redirect: "manual" });
    const allowed = Array.isArray(expected) ? expected.includes(response.status) : response.status === expected;
    if (!allowed) {
      failed += 1;
      console.error("FAIL " + path + ": expected " + expected + ", got " + response.status);
    } else {
      console.log("PASS " + path + ": " + response.status);
    }
  } catch (error) {
    failed += 1;
    console.error("FAIL " + path + ": " + (error instanceof Error ? error.message : error));
  }
}

for (const [path, body, expectedStatuses] of [
  ["/api/prompts/support-agent?environment=production", null, [401, 503]],
  ["/api/ingest", { spanId: "smoke", runId: "smoke", spanType: "llm", createdAt: new Date().toISOString(), latencyMs: 1, input: "smoke" }, [401]],
  ["/api/otel", { resourceSpans: [] }, [401]],
  ["/api/playground", { projectId: "not-a-project", prompt: "hello" }, [401, 403, 503]],
  ["/api/evaluators/run", { projectId: "not-a-project", evaluatorId: "not-an-evaluator", traceId: "trace", output: "hello" }, [401, 403, 404, 422]],
  ["/api/evaluation/run", { projectId: "not-a-project", jobId: "not-a-job" }, [401, 403, 404, 422, 503]],
  ["/api/feedback", { projectId: "not-a-project", traceId: "trace", value: 1 }, [401, 403, 422, 503]],
  ["/api/experiments/run", { projectId: "not-a-project", experimentId: "not-an-experiment" }, [401, 403, 404, 422, 503]],
]) {
  try {
    const response = body === null
      ? await fetchWithTimeout(baseUrl + path, { redirect: "manual" })
      : await fetchWithTimeout(baseUrl + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), redirect: "manual" });
    if (!expectedStatuses.includes(response.status)) {
      failed += 1;
      console.error("FAIL " + path + ": expected one of " + expectedStatuses.join(", ") + ", got " + response.status);
    } else {
      console.log("PASS " + path + ": " + response.status);
    }
  } catch (error) {
    failed += 1;
    console.error("FAIL " + path + ": " + (error instanceof Error ? error.message : error));
  }
}

console.log("\nPlatform smoke summary: " + (failed ? "failed" : "passed"));
if (failed) process.exitCode = 1;
