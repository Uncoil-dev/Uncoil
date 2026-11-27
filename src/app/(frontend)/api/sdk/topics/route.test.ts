import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// The route runs unchanged with the real key check, filter parsing and topic grouping. Only the
// external services (Convex, ClickHouse, rate limiter) are stubbed.
const stubs: Record<string, string> = {
  "next/server": `export const NextResponse = { json: (body, init) => ({ body, status: init?.status ?? 200 }) };`,
  "convex/_generated/api": `export const api = { projects: { getProjectByApiKey: "getProjectByApiKey" } };`,
  "@/lib/api-keys": `
    export const isUncoilApiKey = (key) => /^uncoil_sk_live_/.test(key);
    export const getWrongRegionApiKeyResponse = () => null;
    export const hashApiKey = (key) => "hash:" + key;`,
  "@/lib/cli-login": `export const overLimit = async (key) => { globalThis.__topics.limits.push(key); return globalThis.__topics.limited === key.split(":")[0]; }; export const requestIp = () => "1.1.1.1";`,
  "@/lib/convex": `export const getConvexClient = () => ({ query: async (_fn, args) => { globalThis.__topics.lookups.push(args.apiKeyHash); return globalThis.__topics.project; } });`,
  "@/lib/crash-report": `export const reportHandledError = async () => undefined;`,
  "@/lib/tinybird": `
    export const FACET_KEYS = ["traceName"];
    export const resolveTraceFlowFilters = async (_id, filters) => filters;
    export const traceTopicInputs = async (projectId) => {
      globalThis.__topics.calls.push(projectId);
      if (globalThis.__topics.fail) throw new Error("down");
      return globalThis.__topics.inputs;
    };`,
};
const srcRoot = new URL("../../../../../", import.meta.url).href;
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    if (specifier.startsWith("@/")) return next(${JSON.stringify(srcRoot)} + specifier.slice(2) + ".ts", context);
    if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/.test(specifier) && context.parentURL?.endsWith(".ts")) return next(specifier + ".ts", context);
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

type State = { limited: string; limits: string[]; project: unknown; fail: boolean; lookups: string[]; calls: string[]; inputs: unknown };
const g = globalThis as unknown as { __topics: State };
const { GET } = await import("./route.ts");

const refunds = Array.from({ length: 4 }, (_, i) => ({ runId: `r${i}`, input: "Refund my order please", hasError: i === 0 }));
const call = (key?: string) =>
  GET({
    headers: { get: () => (key ? `Bearer ${key}` : null) },
    nextUrl: new URL("http://localhost/api/sdk/topics"),
  } as never) as unknown as Promise<{ body: Record<string, unknown>; status: number }>;

beforeEach(() => {
  g.__topics = { limited: "", limits: [], project: { _id: "p1" }, fail: false, lookups: [], calls: [], inputs: { total: 4, traces: refunds } };
});

test("a missing or malformed key is rejected before any lookup", async () => {
  assert.equal((await call()).status, 401);
  assert.equal((await call("nope")).status, 401);
  assert.equal(g.__topics.lookups.length, 0);
});

test("a key that matches no project is rejected without reading traces", async () => {
  g.__topics.project = null;
  assert.equal((await call("uncoil_sk_live_x")).status, 401);
  assert.equal(g.__topics.calls.length, 0);
});

test("returns the topics of the key's own project", async () => {
  const { body, status } = await call("uncoil_sk_live_x");
  assert.equal(status, 200);
  assert.equal(g.__topics.lookups[0], "hash:uncoil_sk_live_x");
  assert.deepEqual(g.__topics.calls, ["p1"]);
  // The caller is limited by IP before the key lookup, then by project only, never by key or forwarded IP.
  assert.deepEqual(g.__topics.limits, ["sdk-topics-ip:1.1.1.1", "sdk-topics-project:p1"]);
  assert.equal(body.sampled, false);
  const topics = body.topics as Array<{ count: number; sampleRunIds: string[] }>;
  assert.equal(topics.length, 1);
  assert.equal(topics[0].count, 4);
  assert.ok(topics[0].sampleRunIds.length > 0);
});

test("answers 429 when rate limited and 503 when the trace store fails", async () => {
  g.__topics.limited = "sdk-topics-ip";
  assert.equal((await call("uncoil_sk_live_x")).status, 429);
  assert.equal(g.__topics.lookups.length, 0);
  g.__topics.limited = "sdk-topics-project";
  assert.equal((await call("uncoil_sk_live_y")).status, 429);
  assert.equal(g.__topics.calls.length, 0);
  g.__topics.limited = "";
  g.__topics.fail = true;
  assert.equal((await call("uncoil_sk_live_x")).status, 503);
});
