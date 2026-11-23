import assert from "node:assert/strict";
import test from "node:test";

import { sampleBrokenJson, sampleLog, samplePrompt, sampleTools, sampleTrace } from "./samples.ts";

type Span = {
  name?: unknown;
  type?: unknown;
  start_time?: unknown;
  duration_ms?: unknown;
  status?: unknown;
  error?: unknown;
};

type ToolDef = {
  type?: unknown;
  function?: {
    name?: unknown;
    description?: unknown;
    parameters?: { type?: unknown; properties?: Record<string, unknown>; required?: unknown };
  };
};

const all = { sampleTrace, sampleLog, sampleBrokenJson, sampleTools, samplePrompt };

test("every sample is a non-empty string", () => {
  for (const [name, value] of Object.entries(all)) {
    assert.equal(typeof value, "string", name);
    assert.ok(value.trim().length > 0, `${name} is empty`);
  }
});

test("samples are distinct from each other", () => {
  const values = Object.values(all);
  assert.equal(new Set(values).size, values.length);
});

test("sampleTrace parses to an array of spans with required fields", () => {
  const spans = JSON.parse(sampleTrace) as Span[];
  assert.ok(Array.isArray(spans));
  assert.ok(spans.length > 0);
  for (const span of spans) {
    assert.equal(typeof span.name, "string");
    assert.ok(span.type === "llm" || span.type === "tool", `unexpected type ${String(span.type)}`);
    assert.equal(typeof span.duration_ms, "number");
    assert.ok(Number.isFinite(Date.parse(String(span.start_time))), "start_time must be an ISO date");
  }
});

test("sampleTrace spans are in chronological order", () => {
  const spans = JSON.parse(sampleTrace) as Span[];
  const times = spans.map((s) => Date.parse(String(s.start_time)));
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test("sampleTrace errored spans carry an error message", () => {
  const spans = JSON.parse(sampleTrace) as Span[];
  const errored = spans.filter((s) => s.status === "error");
  assert.ok(errored.length > 0);
  for (const span of errored) {
    assert.equal(typeof span.error, "string");
  }
});

test("sampleTools parses to function tool definitions with unique names", () => {
  const tools = JSON.parse(sampleTools) as ToolDef[];
  assert.ok(Array.isArray(tools));
  assert.ok(tools.length > 0);
  const names = tools.map((t) => {
    assert.equal(t.type, "function");
    assert.equal(typeof t.function?.name, "string");
    assert.equal(typeof t.function?.description, "string");
    assert.equal(t.function?.parameters?.type, "object");
    assert.ok(Array.isArray(t.function?.parameters?.required));
    return String(t.function?.name);
  });
  assert.equal(new Set(names).size, names.length);
});

test("sampleBrokenJson is deliberately not valid JSON", () => {
  assert.throws(() => JSON.parse(sampleBrokenJson));
  assert.ok(sampleBrokenJson.includes("```json"));
});

test("sampleLog has timestamped lines and an error", () => {
  const lines = sampleLog.split("\n");
  assert.ok(lines[0].startsWith("2026-"));
  assert.ok(lines.some((l) => l.includes("ERROR")));
  assert.ok(lines.some((l) => l.includes("WARN")));
});

test("samplePrompt contains the content the prompt checker demonstrates", () => {
  const lines = samplePrompt.split("\n").filter((l) => l.trim());
  assert.ok(new Set(lines).size < lines.length, "expected a duplicated line");
  assert.ok(samplePrompt.includes("\n\n\n"), "expected repeated blank lines");
});
