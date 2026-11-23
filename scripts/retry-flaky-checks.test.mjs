import assert from "node:assert/strict";
import test from "node:test";
import { candidateRuns, isInfraFailure, selectReruns } from "./retry-flaky-checks.mjs";

const NOW = Date.parse("2026-11-23T12:00:00Z");
const run = (id, over = {}) => ({ id, attempt: 1, conclusion: "failure", createdAt: "2026-11-23T11:00:00Z", ...over });

test("network and runner errors count as infra failures", () => {
  assert.equal(isInfraFailure("npm error network request failed: ECONNRESET"), true);
  assert.equal(isInfraFailure("##[error]The runner has received a shutdown signal"), true);
  assert.equal(isInfraFailure("Error: HTTP 503 Service Unavailable"), true);
});

test("a real code error beats an infra signature", () => {
  assert.equal(isInfraFailure("src/a.ts(1,1): error TS2322: bad\nECONNRESET"), false);
  assert.equal(isInfraFailure("AssertionError [ERR_ASSERTION]: x\nETIMEDOUT"), false);
  assert.equal(isInfraFailure(""), false);
});

test("only first-attempt, recent failures are candidates", () => {
  const runs = [run(1), run(2, { attempt: 2 }), run(3, { createdAt: "2026-11-22T01:00:00Z" }), run(4, { conclusion: "cancelled" })];
  assert.deepEqual(candidateRuns(runs, NOW).map((r) => r.id), [1]);
});

test("selectReruns keeps infra failures only and honours the cap", () => {
  const logs = { 1: "ETIMEDOUT", 2: "error TS2304: nope", 3: "ECONNRESET", 4: "EAI_AGAIN" };
  const runs = [1, 2, 3, 4].map((i) => run(i));
  assert.deepEqual(selectReruns(runs, (id) => logs[id], 2, NOW), [1, 3]);
});
