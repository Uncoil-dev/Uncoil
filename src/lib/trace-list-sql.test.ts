import assert from "node:assert/strict";
import test from "node:test";
import { LEAN_AGGREGATE, inPageOrder, isLeanSort, leanCountSql, leanPageSql, pageRowsSql } from "./trace-list-sql.ts";

const HEAVY = ["input", "output", "metadata", "tags", "traceName", "modelId", "errorMessage"];

test("the lean row never reads the large text columns", () => {
  for (const column of HEAVY) assert.ok(!new RegExp(`\\b${column}\\b`).test(LEAN_AGGREGATE), `${column} must not be in the lean row`);
});

test("only sorts the lean row can answer take the fast path", () => {
  for (const id of ["startedAt", "latency", "cost", "tokens", "errors", "steps", "status"]) assert.ok(isLeanSort(id), id);
  for (const id of ["name", "input", "output", "model", "tags", "meta:x"]) assert.ok(!isLeanSort(id), id);
});

test("the page query orders, then limits, with a stable tie-break and the right offset", () => {
  const sql = leanPageSql({ where: "projectId = 'p'", having: "HAVING errorCount > 0", sortColumn: "startedAt", direction: "DESC", pageSize: 50, page: 3 });
  assert.match(sql, /HAVING errorCount > 0/);
  assert.match(sql, /ORDER BY startedAt DESC, runId LIMIT 50 OFFSET 150/);
});

test("the count is a plain distinct count unless a HAVING filter needs trace totals", () => {
  assert.match(leanCountSql({ where: "projectId = 'p'", having: "" }), /uniqExact\(runId\)/);
  assert.match(leanCountSql({ where: "projectId = 'p'", having: "HAVING durationMs >= 5" }), /HAVING durationMs >= 5/);
});

test("the page rows keep the same filters and quote every run id", () => {
  const sql = pageRowsSql({ aggregate: "runId", where: "projectId = 'p'", runIds: ["a", "b'c"], quote: (v) => v.replace(/'/g, "\\'") });
  assert.match(sql, /WHERE projectId = 'p' AND runId IN \('a','b\\'c'\) GROUP BY runId/);
});

test("rows come back in the order the page query chose, and a missing row is skipped", () => {
  const rows = [{ runId: "b" }, { runId: "a" }];
  assert.deepEqual(inPageOrder(["a", "x", "b"], rows).map((r) => r.runId), ["a", "b"]);
});
