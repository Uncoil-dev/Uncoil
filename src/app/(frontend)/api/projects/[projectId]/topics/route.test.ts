import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// The route runs unchanged with the real access check, filter parsing and topic grouping. Only the
// external services (session, Convex, ClickHouse) are stubbed.
const stubs: Record<string, string> = {
  "next/server": `export const NextResponse = { json: (body, init) => ({ body, status: init?.status ?? 200 }) };`,
  "convex/_generated/api": `export const api = { projects: { getProjectById: "getProjectById" } };`,
  "@/lib/auth-server": `export const isAuthenticated = async () => globalThis.__topics.authed;`,
  "@/lib/convex-server": `export const getAuthedConvexClient = async () => ({ query: async () => globalThis.__topics.project });`,
  "@/lib/crash-report": `export const reportHandledError = async () => undefined;`,
  "@/lib/tinybird": `
    export const FACET_KEYS = ["traceName"];
    export const resolveTraceFlowFilters = async (_id, filters) => filters;
    export const traceTopicInputs = async (projectId, filters) => {
      globalThis.__topics.calls.push({ projectId, filters });
      if (globalThis.__topics.fail) throw new Error("down");
      return globalThis.__topics.inputs;
    };`,
};
const srcRoot = new URL("../../../../../../", import.meta.url).href;
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    if (specifier.startsWith("@/")) return next(${JSON.stringify(srcRoot)} + specifier.slice(2) + ".ts", context);
    if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/.test(specifier) && context.parentURL?.endsWith(".ts")) return next(specifier + ".ts", context);
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

type State = { authed: boolean; project: unknown; fail: boolean; calls: Array<{ projectId: string; filters: { fromMs?: number } }>; inputs: unknown };
const g = globalThis as unknown as { __topics: State };
const { GET } = await import("./route.ts");

const refunds = Array.from({ length: 4 }, (_, i) => ({ runId: `r${i}`, input: "Refund my order please", hasError: i === 0 }));
const request = (query = "") => ({ nextUrl: new URL(`http://localhost/api/projects/p1/topics${query}`), cookies: { getAll: () => [] } }) as never;
const call = (query?: string) => GET(request(query), { params: Promise.resolve({ projectId: "p1" }) }) as unknown as Promise<{ body: Record<string, unknown>; status: number }>;

beforeEach(() => {
  g.__topics = { authed: true, project: { _id: "p1" }, fail: false, calls: [], inputs: { total: 4, traces: refunds } };
});

test("signed-out requests are rejected before any query runs", async () => {
  g.__topics.authed = false;
  assert.equal((await call()).status, 401);
  assert.equal(g.__topics.calls.length, 0);
});

test("a project the user cannot read is not found", async () => {
  g.__topics.project = null;
  assert.equal((await call()).status, 404);
  assert.equal(g.__topics.calls.length, 0);
});

test("groups the first inputs of the filtered traces into topics", async () => {
  const { body, status } = await call("?from=1700000000000");
  assert.equal(status, 200);
  assert.equal(body.sampled, false);
  assert.equal(body.total, 4);
  const topics = body.topics as Array<{ count: number; errorRate: number }>;
  assert.equal(topics.length, 1);
  assert.equal(topics[0].count, 4);
  assert.equal(topics[0].errorRate, 0.25);
  assert.equal(g.__topics.calls[0].projectId, "p1");
});

test("says sampled when more traces matched than were read", async () => {
  g.__topics.inputs = { total: 5000, traces: refunds };
  assert.equal((await call()).body.sampled, true);
});

test("answers 503 when the trace store fails", async () => {
  g.__topics.fail = true;
  assert.equal((await call()).status, 503);
});
