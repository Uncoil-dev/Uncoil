import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// The route imports path-aliased modules that plain Node cannot resolve. A resolve hook
// stubs the external services (Convex, Inngest, Redis) and maps the other "@/" imports
// to the real source files, so the route's own mapping logic runs unchanged.
const stubs: Record<string, string> = {
  "next/server": `export {};`,
  "convex/_generated/api": `
    export const api = { projects: { getProjectByApiKey: "getProjectByApiKey", isApiKeyPaused: "isApiKeyPaused", markApiKeyUsed: "markApiKeyUsed" } };`,
  "@/lib/convex": `
    export const getConvexClient = () => ({
      query: async () => ({ _id: "project_1", planTier: "pro", apiKeyLastUsedAt: Date.now() }),
      mutation: async () => null,
    });`,
  "@/lib/inngest": `
    export const inngest = { send: async (event) => { globalThis.__sent.push(event); } };`,
  "@/lib/redis-cache": `
    export const consumeRateLimit = async () => ({ allowed: true, remaining: 100, retryAfterSeconds: 0 });`,
  "@/lib/plan-limits-server": `
    export const planLimitResponse = async () => null;
    export const recordRateLimitStrike = async () => undefined;`,
};
const srcRoot = new URL("../../../../../../", import.meta.url).href;
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) {
      return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    if (specifier.startsWith("@/")) return next(${JSON.stringify(srcRoot)} + specifier.slice(2) + ".ts", context);
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

process.env.UNCOIL_API_KEY_HASH_SECRET = "test-secret";
const g = globalThis as unknown as { __sent: { name: string; data: Record<string, unknown> }[] };
const { POST } = await import("./route.ts");
const { POST: basePOST } = await import("../../route.ts");

function span(overrides: Record<string, unknown> = {}) {
  return {
    traceId: "trace1",
    spanId: "span1",
    name: "agent",
    kind: 1,
    startTimeUnixNano: "1700000000000000000",
    endTimeUnixNano: "1700000001000000000",
    ...overrides,
  };
}

function exportRequest(path: string, spans: Record<string, unknown>[]) {
  return new Request(`https://uncoil.test${path}`, {
    method: "POST",
    headers: { authorization: "Bearer uncoil_sk_live_eu_test", "content-type": "application/json" },
    body: JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] }),
  }) as never;
}

beforeEach(() => {
  g.__sent = [];
});

test("POST to /api/otel/v1/traces is accepted like /api/otel", async () => {
  const spans = [span({ parentSpanId: "root", attributes: [{ key: "ai.input", value: { stringValue: "hi" } }] })];

  const response = await POST(exportRequest("/api/otel/v1/traces", spans));
  const baseResponse = await basePOST(exportRequest("/api/otel", spans));

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), await baseResponse.json());
  assert.deepEqual(g.__sent.map((event) => event.data.spanId), ["span1", "span1"]);
});
