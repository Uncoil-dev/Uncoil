import assert from "node:assert/strict";
import test from "node:test";
import { createRunBuilder } from "./sample-traces.mjs";

const SPAN_TYPES = new Set(["llm_call", "tool_call"]);

function withFixedClock(fn) {
  const realNow = Date.now;
  Date.now = () => 1_800_000_000_000;
  try {
    return fn();
  } finally {
    Date.now = realNow;
  }
}

function buildMany(options, count = 200) {
  const build = createRunBuilder(options);
  return Array.from({ length: count }, () => build());
}

test("createRunBuilder returns a function that yields span arrays", () => {
  const build = createRunBuilder();
  assert.equal(typeof build, "function");
  const spans = build();
  assert.ok(Array.isArray(spans));
  assert.ok(spans.length === 2 || spans.length === 3);
});

test("every span has the required fields", () => {
  for (const spans of buildMany()) {
    for (const span of spans) {
      for (const key of ["runId", "sessionId", "endUserId", "environment", "release", "traceName", "spanId", "createdAt", "spanType", "latencyMs"]) {
        assert.notEqual(span[key], undefined, `missing ${key}`);
      }
      assert.ok(SPAN_TYPES.has(span.spanType));
      assert.ok(Number.isFinite(span.latencyMs) && span.latencyMs > 0);
      assert.ok(!Number.isNaN(Date.parse(span.createdAt)));
      assert.deepEqual(span.tags, ["sample-data"]);
    }
  }
});

test("spans in a run share ids, have sequential span ids and a parent link", () => {
  for (const spans of buildMany()) {
    const [first, second] = spans;
    assert.equal(first.spanType, "llm_call");
    assert.equal(second.spanType, "tool_call");
    assert.equal(second.parentSpanId, first.spanId);
    spans.forEach((span, i) => {
      assert.equal(span.runId, first.runId);
      assert.equal(span.sessionId, first.sessionId);
      assert.equal(span.spanId, `${first.runId}_${i + 1}`);
    });
    const times = spans.map((s) => Date.parse(s.createdAt));
    assert.deepEqual([...times].sort((a, b) => a - b), times);
  }
});

test("llm spans carry model, token and cost fields; tool spans carry a tool name", () => {
  for (const spans of buildMany()) {
    for (const span of spans) {
      if (span.spanType === "llm_call") {
        assert.equal(typeof span.modelId, "string");
        assert.ok(span.inputTokens > 0 && span.outputTokens > 0);
        assert.ok(span.costUsd > 0);
      } else {
        assert.equal(typeof span.toolName, "string");
        assert.ok(span.retryCount === 0 || span.retryCount === 1);
      }
    }
  }
});

test("failed tool spans carry error details and no final llm span follows", () => {
  const runs = buildMany(undefined, 500);
  const toolFailures = runs.filter((spans) => spans[1].errorType);
  assert.ok(toolFailures.length > 0);
  for (const spans of toolFailures) {
    assert.equal(spans.length, 2);
    assert.equal(spans[1].output, undefined);
    assert.equal(typeof spans[1].errorMessage, "string");
    if (spans[1].errorType === "tool_timeout") {
      assert.equal(spans[1].timedOut, true);
      assert.equal(spans[1].latencyMs, 8000);
    }
  }
});

test("options control environment and time window", () => {
  const runs = withFixedClock(() => buildMany({ days: 2, environment: "production" }, 50));
  const now = 1_800_000_000_000;
  for (const spans of runs) {
    assert.equal(spans[0].environment, "production");
    const start = Date.parse(spans[0].createdAt);
    assert.ok(start <= now && start >= now - 2 * 86_400_000 - 1000);
  }
});

test("same seed is deterministic and different seeds differ", () => {
  const strip = (runs) => JSON.stringify(runs).replace(/seed_[a-z0-9]+_/g, "seed_");
  const a = withFixedClock(() => buildMany({ seedValue: 42 }, 20));
  const b = withFixedClock(() => buildMany({ seedValue: 42 }, 20));
  const c = withFixedClock(() => buildMany({ seedValue: 43 }, 20));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(strip(a), strip(c));
});
