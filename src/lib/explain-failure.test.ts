import assert from "node:assert/strict";
import test from "node:test";

import { explainFailure, type ExplainSpan } from "./explain-failure.ts";

let n = 0;
function span(over: Partial<ExplainSpan>): ExplainSpan {
  n += 1;
  return {
    spanId: `s${n}`,
    spanType: "llm",
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString(),
    latencyMs: 100,
    costUsd: 0.01,
    inputTokens: 10,
    outputTokens: 5,
    ...over,
  };
}

test("returns null when nothing failed", () => {
  assert.equal(explainFailure([span({}), span({ spanType: "tool", toolName: "search" })]), null);
});

test("tool timeout names the tool, duration and the step that ran blind", () => {
  const r = explainFailure([
    span({ spanType: "tool", toolName: "search", errorMessage: "ETIMEDOUT", latencyMs: 30000 }),
    span({ spanType: "llm", modelId: "gpt-4o" }),
  ]);
  assert.equal(
    r?.sentence1,
    "`search` timed out after 30.0s, so the agent never got the data it needed and gpt-4o ran blind.",
  );
  assert.equal(r?.stepIndex, 1);
  assert.equal(r?.totalSteps, 2);
  assert.equal(r?.afterTokens, 0);
});

test("empty tool output followed by a model call", () => {
  const r = explainFailure([
    span({ spanType: "tool", toolName: "lookup", output: "[]", errorType: "empty" }),
    span({ spanType: "llm", modelId: "gpt-4o" }),
  ]);
  assert.match(r?.sentence1 ?? "", /^`lookup` returned nothing, and the model carried on/);
});

test("model 401 reports a rejected key at the step number", () => {
  const r = explainFailure([span({}), span({ modelId: "claude-x", errorMessage: "401 Unauthorized" })]);
  assert.equal(
    r?.sentence1,
    "The call to claude-x was rejected because the API key is missing or invalid, so the agent stopped at step 2.",
  );
});

test("model 429 reports the cost of the retries after it", () => {
  const r = explainFailure([
    span({ modelId: "gpt-4o", errorMessage: "429 rate limit exceeded", latencyMs: 100 }),
    span({ costUsd: 0.02 }),
    span({ costUsd: 0.03 }),
  ]);
  assert.equal(r?.sentence1, "gpt-4o rate-limited the agent at step 1; the retries that followed cost $0.05 and still failed.");
  assert.equal(r?.afterUsd, 0.05);
  assert.ok(Math.abs((r?.burnedUsd ?? 0) - 0.06) < 1e-9);
});

test("parse error after a model span blames the failing step", () => {
  const r = explainFailure([
    span({ modelId: "gpt-4o" }),
    span({ spanType: "tool", toolName: "parse_order", errorMessage: "Unexpected token in JSON at position 0" }),
  ]);
  assert.equal(r?.sentence1, "gpt-4o returned text your code couldn't parse, so `parse_order` crashed on its output.");
});

test("same tool called five times with identical input is a loop", () => {
  const calls = Array.from({ length: 5 }, () => span({ spanType: "tool", toolName: "fetch", input: "{\"q\":1}" }));
  const r = explainFailure([...calls.slice(0, 4), { ...calls[4], errorMessage: "boom" }]);
  assert.equal(r?.sentence1, "The agent looped on `fetch` 5 times with the same input, and never got past step 5.");
});

test("step limit error", () => {
  const r = explainFailure([span({ errorMessage: "Max iterations reached" })]);
  assert.equal(r?.sentence1, "The agent hit its step limit without finishing.");
});

test("fallback redacts and truncates the error text", () => {
  const msg = `bad thing for dev@example.com ${"x".repeat(200)}`;
  const r = explainFailure([span({ spanType: "tool", toolName: "send", errorMessage: msg })]);
  assert.ok(r?.sentence1.startsWith("Step 1 (`send`) failed with \""));
  assert.ok(!r?.sentence1.includes("dev@example.com"));
  assert.ok(r?.sentence1.endsWith("and every step after it depended on it."));
});

test("spans are ordered by start time before picking the first failure", () => {
  const late = span({ spanType: "error", errorMessage: "later", createdAt: "2026-01-02T00:00:00.000Z" });
  const early = span({ errorMessage: "earlier", createdAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(explainFailure([late, early])?.stepId, early.spanId);
});
