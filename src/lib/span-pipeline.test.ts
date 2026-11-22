import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// span-pipeline.ts imports path-aliased modules that plain Node cannot resolve,
// so a resolve hook swaps them for stubs that record calls on globalThis.
const stubs: Record<string, string> = {
  "convex/_generated/api": `
    export const api = {
      agentRuns: { upsertRunFromSpan: "agentRuns.upsertRunFromSpan" },
      sessions: { upsertFromSpan: "sessions.upsertFromSpan" },
    };`,
  "@/lib/convex": `
    export const getConvexClient = () => ({
      mutation: async (name, args) => {
        globalThis.__calls.push(["mutation", name, args]);
        return { created: globalThis.__created };
      },
    });`,
  "@/lib/tinybird": `
    export const ingestSpan = async (row) => { globalThis.__calls.push(["ingest", row]); };`,
};
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) {
      return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const g = globalThis as unknown as { __calls: unknown[][]; __created: boolean };
const { persistSpan } = await import("./span-pipeline.ts");
type Span = Parameters<typeof persistSpan>[0];

function makeSpan(overrides: Partial<Span> = {}): Span {
  return {
    spanId: "s1", runId: "r1", projectId: "p1", projectDocId: "doc1", spanType: "llm",
    input: "in", output: "out", latencyMs: 12, costUsd: 0.5, modelId: "m", toolName: "",
    metadata: { a: 1 }, parentSpanId: "", sessionId: "", endUserId: "", environment: "",
    release: "", tags: [], traceName: "", inputTokens: 1, outputTokens: 2, ttftMs: 3,
    retryCount: 0, errorType: "", errorMessage: "", isStreamChunk: false, streamSequence: 0,
    streamFinal: true, payloadFormat: "json", stackTrace: "", timedOut: false, timeoutMs: 0,
    createdAt: "2026-01-01T00:00:00.000Z", ...overrides,
  };
}

beforeEach(() => {
  g.__calls = [];
  g.__created = true;
});

test("persistSpan writes Tinybird before the run mutation and skips sessions without a sessionId", async () => {
  const run = await persistSpan(makeSpan());
  assert.deepEqual(run, { created: true });
  assert.deepEqual(g.__calls.map((c) => c[0] === "ingest" ? "ingest" : c[1]), ["ingest", "agentRuns.upsertRunFromSpan"]);
  const [, , args] = g.__calls[1] as [string, string, Record<string, unknown>];
  assert.equal(args.projectId, "doc1");
  assert.equal(args.modelId, "m");
  assert.equal(args.sessionId, undefined);
  assert.equal(args.environment, undefined);
});

test("persistSpan defaults missing optional fields in the Tinybird row", async () => {
  const sparse = makeSpan() as Record<string, unknown>;
  for (const k of ["attachments", "sessionId", "tags", "inputTokens", "isStreamChunk", "streamFinal", "payloadFormat", "timedOut"]) delete sparse[k];
  await persistSpan(sparse as Span);
  const row = g.__calls[0][1] as Record<string, unknown>;
  assert.equal(row.attachments, "[]");
  assert.equal(row.sessionId, "");
  assert.deepEqual(row.tags, []);
  assert.equal(row.inputTokens, 0);
  assert.equal(row.isStreamChunk, false);
  assert.equal(row.streamFinal, true);
  assert.equal(row.payloadFormat, "json");
  assert.equal(row.timedOut, false);
});

test("persistSpan upserts the session with a status derived from the span type", async () => {
  const cases: Array<[string, string]> = [["error", "failed"], ["run_end", "completed"], ["llm", "running"]];
  for (const [spanType, status] of cases) {
    g.__calls = [];
    await persistSpan(makeSpan({ spanType, sessionId: "sess", tags: ["t"] }));
    const call = g.__calls.find((c) => c[1] === "sessions.upsertFromSpan") as [string, string, Record<string, unknown>];
    assert.equal(call[2].status, status);
    assert.equal(call[2].sessionId, "sess");
    assert.deepEqual(call[2].tags, ["t"]);
    assert.equal(call[2].endUserId, undefined);
  }
});

test("persistSpan passes the new-trace flag from the run upsert and returns the run", async () => {
  g.__created = false;
  const run = await persistSpan(makeSpan({ sessionId: "sess" }));
  assert.deepEqual(run, { created: false });
  const call = g.__calls.find((c) => c[1] === "sessions.upsertFromSpan") as [string, string, Record<string, unknown>];
  assert.equal(call[2].isNewTrace, false);
});
