import assert from "node:assert/strict";
import test from "node:test";
import { clampCursor, searchSpans, splitMatch, type SearchableSpan } from "./span-search.ts";

const spans: SearchableSpan[] = [
  { spanId: "root", parentSpanId: "", spanType: "agent", toolName: "", modelId: "", errorMessage: "" },
  { spanId: "plan", parentSpanId: "root", spanType: "llm", toolName: "", modelId: "gpt-4o-mini", errorMessage: "" },
  { spanId: "search", parentSpanId: "plan", spanType: "tool", toolName: "web_search", modelId: "", errorMessage: "" },
  { spanId: "fetch", parentSpanId: "root", spanType: "tool", toolName: "http_fetch", modelId: "", errorMessage: "Request TIMEOUT after 30s" },
];

test("matches tool name case-insensitively and keeps ancestors visible", () => {
  const result = searchSpans(spans, "WEB_Search");
  assert.deepEqual(result.matches, ["search"]);
  assert.deepEqual([...result.visible].sort(), ["plan", "root", "search"]);
});

test("matches model and error text", () => {
  assert.deepEqual(searchSpans(spans, "gpt-4o").matches, ["plan"]);
  assert.deepEqual(searchSpans(spans, "timeout").matches, ["fetch"]);
});

test("matches span type as the step name", () => {
  assert.deepEqual(searchSpans(spans, "agent").matches, ["root"]);
});

test("blank query shows every span and no matches", () => {
  const result = searchSpans(spans, "  ");
  assert.equal(result.active, false);
  assert.equal(result.visible.size, spans.length);
  assert.deepEqual(result.matches, []);
});

test("terminates on a parent cycle", () => {
  const cyclic = [
    { ...spans[0], spanId: "a", parentSpanId: "b", toolName: "x" },
    { ...spans[0], spanId: "b", parentSpanId: "a" },
  ];
  assert.deepEqual([...searchSpans(cyclic, "x").visible].sort(), ["a", "b"]);
});

test("splitMatch separates the matched text", () => {
  assert.deepEqual(splitMatch("web_Search", "SEARCH"), ["web_", "Search", ""]);
  assert.deepEqual(splitMatch("abc", "z"), ["abc", "", ""]);
  assert.deepEqual(splitMatch("abc", ""), ["abc", "", ""]);
});

test("clampCursor keeps the cursor inside a shrinking match list", () => {
  assert.equal(clampCursor(null, 3), null);
  assert.equal(clampCursor(1, 3), 1);
  assert.equal(clampCursor(4, 3), 2);
  assert.equal(clampCursor(2, 0), null);
});
