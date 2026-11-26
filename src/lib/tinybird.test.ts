import assert from "node:assert/strict";
import { register } from "node:module";
import test, { afterEach, beforeEach } from "node:test";

// tinybird.ts uses path aliases and extensionless relative imports that plain Node
// cannot resolve, so a resolve hook maps them to the real .ts files.
const root = new URL("../", import.meta.url).pathname;
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next("file://${root}" + specifier.slice(2) + (/\\.[a-z]+$/.test(specifier) ? "" : ".ts"), context);
    }
    if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/.test(specifier) && context.parentURL?.endsWith(".ts")) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const ENV_KEYS = ["CLICKHOUSE_URL", "CLICKHOUSE_USER", "CLICKHOUSE_PASSWORD"] as const;
const savedEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
process.env.CLICKHOUSE_URL = "https://ch.example.test/";
process.env.CLICKHOUSE_USER = "reader";
process.env.CLICKHOUSE_PASSWORD = "pw" + "-" + "fake";

const { sqlString, IS_ERROR, tinybirdRows, checkTinybirdHealth, analyticsBackend, exportAnalyticsPage, deleteProjectAnalytics, purgeExpiredAnalytics, getSpansForRun, resolveTraceFlowFilters, listTraces } =
  await import("./tinybird.ts");

import { groupTraceTopics } from "./trace-topics.ts";

type Call = { url: string; init: RequestInit };
const realFetch = globalThis.fetch;
let calls: Call[];
let reply: (call: Call) => Response;

beforeEach(() => {
  calls = [];
  reply = () => Response.json({ data: [] });
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    const call = { url: String(url), init };
    calls.push(call);
    return reply(call);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test.after(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

test("sqlString escapes backslashes before quotes", () => {
  assert.equal(sqlString("plain"), "plain");
  assert.equal(sqlString("it's"), "it''s");
  assert.equal(sqlString("a\\b"), "a\\\\b");
  assert.equal(sqlString("\\'"), "\\\\''");
});

test("IS_ERROR matches error spans and spans with an error type", () => {
  assert.match(IS_ERROR, /spanType = 'error'/);
  assert.match(IS_ERROR, /errorType != ''/);
});

test("analyticsBackend reports clickhouse", () => {
  assert.equal(analyticsBackend(), "clickhouse");
});

test("tinybirdRows posts the query with auth and returns the data rows", async () => {
  reply = () => Response.json({ data: [{ n: 1 }, { n: 2 }] });
  const rows = await tinybirdRows<{ n: number }>("SELECT n FROM t  \n");
  assert.deepEqual(rows, [{ n: 1 }, { n: 2 }]);
  const [call] = calls;
  const url = new URL(call.url);
  assert.equal(url.origin + url.pathname, "https://ch.example.test/");
  assert.equal(url.searchParams.get("output_format_json_quote_64bit_integers"), "1");
  assert.ok(url.searchParams.get("database"));
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.body, "SELECT n FROM t\nFORMAT JSON");
  const expected = "Basic " + Buffer.from("reader:" + "pw" + "-" + "fake").toString("base64");
  assert.equal((call.init.headers as Record<string, string>).Authorization, expected);
});

test("tinybirdRows throws with status and body on a failed response", async () => {
  reply = () => new Response("boom", { status: 500 });
  await assert.rejects(tinybirdRows("SELECT 1"), /Analytics query failed: 500 boom/);
});

test("requests fail fast when credentials are missing", async () => {
  delete process.env.CLICKHOUSE_PASSWORD;
  try {
    await assert.rejects(tinybirdRows("SELECT 1"), /CLICKHOUSE_USER and CLICKHOUSE_PASSWORD must be set/);
    assert.equal(calls.length, 0);
  } finally {
    process.env.CLICKHOUSE_PASSWORD = "pw" + "-" + "fake";
  }
});

test("checkTinybirdHealth resolves on ok and throws on a bad status", async () => {
  await checkTinybirdHealth();
  assert.match(String(calls[0].init.body), /SELECT 1 AS healthy\nFORMAT JSON$/);
  reply = () => new Response("", { status: 503 });
  await assert.rejects(checkTinybirdHealth(), /ClickHouse returned 503/);
});

test("exportAnalyticsPage escapes the project id, floors paging and picks the order", async () => {
  reply = () => Response.json({ data: [{ spanId: "s1" }] });
  const rows = await exportAnalyticsPage("spans", "p'1", 10.9, 5.5);
  assert.deepEqual(rows, [{ spanId: "s1" }]);
  const body = String(calls[0].init.body);
  assert.match(body, /projectId = 'p''1'/);
  assert.match(body, /ORDER BY createdAt, spanId LIMIT 5 OFFSET 10\n/);
  await exportAnalyticsPage("evaluation_scores", "p", 0);
  assert.match(String(calls[1].init.body), /ORDER BY createdAt, scoreId LIMIT 2000/);
  reply = () => new Response("", { status: 400 });
  await assert.rejects(exportAnalyticsPage("spans", "p", 0), /Analytics export failed: 400/);
});

test("getSpansForRun filters by run and project", async () => {
  await getSpansForRun("run'1", "proj1");
  assert.match(String(calls[0].init.body), /run''1/);
});

test("deleteProjectAnalytics issues one delete per table and surfaces failures", async () => {
  await deleteProjectAnalytics("p'1");
  assert.equal(calls.length, 2);
  assert.match(String(calls[0].init.body), /^ALTER TABLE spans DELETE WHERE projectId = 'p''1'$/);
  assert.match(String(calls[1].init.body), /^ALTER TABLE evaluation_scores DELETE/);
  reply = () => new Response("", { status: 500 });
  await assert.rejects(deleteProjectAnalytics("p"), /Could not delete spans: 500/);
});

test("purgeExpiredAnalytics validates input and builds an IN list", async () => {
  await purgeExpiredAnalytics([], 30);
  assert.equal(calls.length, 0);
  await assert.rejects(purgeExpiredAnalytics(["a"], 0), /positive integer/);
  await assert.rejects(purgeExpiredAnalytics(["a"], 1.5), /positive integer/);
  await purgeExpiredAnalytics(["a", "b'c"], 30);
  assert.equal(calls.length, 2);
  assert.match(String(calls[0].init.body), /projectId IN \('a','b''c'\) AND createdAt < now\(\) - INTERVAL 30 DAY/);
  reply = () => new Response("", { status: 502 });
  await assert.rejects(purgeExpiredAnalytics(["a"], 7), /Could not purge spans: 502/);
});

test("a topic filter limits the list to that topic's runs and an unknown topic matches none", async () => {
  const row = (runId: string, firstInput: string) => ({ runId, firstInput, errorCount: 0, timeoutCount: 0, matched: 6 });
  reply = () => Response.json({ data: [
    ...["a1", "a2", "a3"].map((id) => row(id, "refund the order please")),
    ...["b1", "b2", "b3"].map((id) => row(id, "summarize the weather forecast")),
  ] });
  const base = { fromMs: 0, toMs: 60_000 };
  const { topics } = groupTraceTopics(
    ["a1", "a2", "a3"].map((runId) => ({ runId, input: "refund the order please", hasError: false }))
      .concat(["b1", "b2", "b3"].map((runId) => ({ runId, input: "summarize the weather forecast", hasError: false }))),
  );
  const refunds = topics.find((topic) => topic.runIds.includes("a1"))!;
  const resolved = await resolveTraceFlowFilters("p1", { ...base, topic: refunds.id });
  assert.deepEqual(resolved.topicRunIds, ["a1", "a2", "a3"]);

  reply = () => Response.json({ data: [] });
  calls = [];
  await listTraces("p1", resolved);
  assert.ok(calls.some((call) => String(call.init.body).includes("runId IN ('a1','a2','a3')")));
  calls = [];
  await listTraces("p1", await resolveTraceFlowFilters("p1", { ...base, topic: "deadbeef" }));
  assert.ok(calls.every((call) => !String(call.init.body).includes("runId IN ('")) && calls.some((call) => /AND 0\b/.test(String(call.init.body))));
});
