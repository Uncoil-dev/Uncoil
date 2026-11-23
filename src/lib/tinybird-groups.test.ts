import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// tinybird-groups.ts imports ./tinybird (network client), so a resolve hook swaps
// it for a stub that records the SQL and returns canned rows.
const stub = `
  export const IS_ERROR = "IS_ERROR_EXPR";
  export const sqlString = (v) => String(v).replace(/'/g, "''");
  export const tinybirdRows = async (sql) => {
    globalThis.__sql.push(sql);
    return globalThis.__respond(sql);
  };`;
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier === "./tinybird") {
      return { url: "data:text/javascript," + encodeURIComponent(${JSON.stringify(stub)}), shortCircuit: true };
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const g = globalThis as unknown as {
  __sql: string[];
  __respond: (sql: string) => Record<string, unknown>[];
};
const { listGroups, groupDetail } = await import("./tinybird-groups.ts");

const base = { fromMs: 1_700_000_000_000, toMs: 1_700_000_100_500, query: "", environment: "", status: "all", sort: "lastSeenAt", direction: "desc", page: 0, pageSize: 25 } as never;
const filters = (over: Record<string, unknown>) => ({ ...(base as object), ...over }) as never;

beforeEach(() => {
  g.__sql = [];
  g.__respond = () => [];
});

test("listGroups builds scoped, paginated SQL for sessions", async () => {
  await listGroups("proj_1", "session", filters({ page: 2, pageSize: 10 }));
  assert.equal(g.__sql.length, 3);
  const [rowsSql] = g.__sql;
  assert.match(rowsSql, /projectId = 'proj_1'/);
  assert.match(rowsSql, /sessionId != ''/);
  assert.match(rowsSql, /sessionId AS id/);
  assert.match(rowsSql, /createdAt >= toDateTime\(1700000000\)/);
  assert.match(rowsSql, /createdAt <= toDateTime\(1700000101\)/);
  assert.match(rowsSql, /ORDER BY lastSeenAt DESC, id LIMIT 10 OFFSET 20/);
});

test("listGroups groups users by endUserId and escapes filter values", async () => {
  const email = "a" + "@" + "example.test";
  await listGroups("p'1", "user", filters({ query: email + "'x", environment: "pro'd" }));
  const [rowsSql] = g.__sql;
  assert.match(rowsSql, /endUserId AS id/);
  assert.match(rowsSql, /projectId = 'p''1'/);
  assert.match(rowsSql, /environment = 'pro''d'/);
  assert.match(rowsSql, /positionCaseInsensitive\(endUserId, 'a@example\.test''x'\) > 0 OR positionCaseInsensitive\(sessionId,/);
});

test("status filter adds HAVING and unknown sort falls back to lastSeenAt", async () => {
  await listGroups("p", "session", filters({ status: "error", sort: "bogus", direction: "asc" }));
  assert.match(g.__sql[0], /HAVING failedRuns > 0/);
  assert.match(g.__sql[0], /ORDER BY lastSeenAt ASC/);
  g.__sql = [];
  await listGroups("p", "session", filters({ status: "healthy", sort: "tokens" }));
  assert.match(g.__sql[0], /HAVING failedRuns = 0/);
  assert.match(g.__sql[0], /ORDER BY inputTokens \+ outputTokens DESC/);
  g.__sql = [];
  await listGroups("p", "session", base);
  assert.doesNotMatch(g.__sql[0], /HAVING/);
});

test("environment list ignores the environment filter", async () => {
  await listGroups("p", "session", filters({ environment: "staging" }));
  const envSql = g.__sql.find((s) => s.includes("SELECT environment,"))!;
  assert.doesNotMatch(envSql, /environment = 'staging'/);
  assert.match(envSql, /environment != ''/);
  assert.match(g.__sql[0], /environment = 'staging'/);
});

test("listGroups cleans rows and coerces totals", async () => {
  g.__respond = (sql) => {
    if (sql.includes("SELECT environment,")) return [{ environment: "prod", groups: "3" }];
    if (sql.includes("FROM (")) return [{ groups: "7", sumRuns: 20, sumFailedRuns: "2", groupsWithErrors: 1, sumCostUsd: "1.5", sumTokens: "bad" }];
    return [{ id: "s1", runs: "4", failedRuns: null, totalCostUsd: "0.25", firstEnvironment: "prod", topModel: "m1" }];
  };
  const result = await listGroups("p", "session", base);
  assert.equal(result.total, 7);
  assert.deepEqual(result.stats, { groups: 7, runs: 20, failedRuns: 2, groupsWithErrors: 1, totalCostUsd: 1.5, tokens: 0 });
  assert.deepEqual(result.environments, [{ value: "prod", groups: 3 }]);
  assert.equal(result.rows[0].id, "s1");
  assert.equal(result.rows[0].runs, 4);
  assert.equal(result.rows[0].failedRuns, 0);
  assert.equal(result.rows[0].environment, "prod");
  assert.equal(result.rows[0].other, "");
  assert.equal(result.page, 0);
  assert.equal(result.pageSize, 25);
});

test("listGroups returns zeroed totals when there are no matches", async () => {
  const result = await listGroups("p", "user", base);
  assert.equal(result.total, 0);
  assert.deepEqual(result.rows, []);
  assert.equal(result.stats.totalCostUsd, 0);
});

test("groupDetail uses a 90 day window and the escaped id", async () => {
  const now = 1_800_000_000_000;
  await groupDetail("p", "user", "u'1", now);
  const [detailSql, siblingSql] = g.__sql;
  assert.match(detailSql, new RegExp(`createdAt >= toDateTime\\(${(now - 90 * 86_400_000) / 1000}\\)`));
  assert.match(detailSql, /endUserId = 'u''1'/);
  assert.match(siblingSql, /sessionId AS id/);
  assert.match(siblingSql, /sessionId != ''/);
  assert.match(siblingSql, /LIMIT 25/);
});

test("groupDetail returns null row and cleaned siblings", async () => {
  g.__respond = (sql) => (sql.includes("LIMIT 25") ? [{ id: "x", runs: "2", failedRuns: "1", totalCostUsd: "0.5", lastSeenAt: "t" }, {}] : []);
  const result = await groupDetail("p", "session", "s1");
  assert.equal(result.row, null);
  assert.deepEqual(result.siblings[0], { id: "x", runs: 2, failedRuns: 1, totalCostUsd: 0.5, lastSeenAt: "t" });
  assert.deepEqual(result.siblings[1], { id: "", runs: 0, failedRuns: 0, totalCostUsd: 0, lastSeenAt: "" });
});
