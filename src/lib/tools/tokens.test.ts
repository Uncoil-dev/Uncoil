import assert from "node:assert/strict";
import test from "node:test";
import { countFor, countForModel, familyFactor, heuristicTokens, methodLabel } from "./tokens.ts";

test("heuristicTokens returns 0 for empty input and at least 1 otherwise", () => {
  assert.equal(heuristicTokens(""), 0);
  assert.equal(heuristicTokens(" "), 1);
  assert.equal(heuristicTokens("\n\n"), 1);
  assert.equal(heuristicTokens("a"), 1);
});

test("heuristicTokens weighs words, numbers, CJK, emoji and symbols", () => {
  assert.equal(heuristicTokens("hello world"), 2);
  assert.equal(heuristicTokens("tokenization"), 3); // 12 letters / 4.2 -> 3
  assert.equal(heuristicTokens("123456"), 2);
  assert.equal(heuristicTokens("日本語"), 4); // 3 * 1.3 = 3.9
  assert.equal(heuristicTokens("😀"), 2);
  assert.equal(heuristicTokens("{}"), 1);
});

test("heuristicTokens charges extra for newlines and grows with length", () => {
  assert.equal(heuristicTokens("a\nb\nc\nd\ne"), 7); // 5 words + 4 newlines * 0.4
  assert.ok(heuristicTokens("word ".repeat(100)) > heuristicTokens("word ".repeat(10)));
});

test("countFor returns the exact count for openai when available", () => {
  assert.deepEqual(countFor("openai", "hi there", 7), { tokens: 7, exact: true, method: "tokenizer" });
});

test("countFor scales the openai count for other families", () => {
  const r = countFor("claude", "hi there", 100);
  assert.deepEqual(r, { tokens: Math.round(100 * familyFactor.claude), exact: false, method: "scaled-tokenizer" });
  assert.equal(countFor("gemini", "x", 50).tokens, 50);
  assert.equal(countFor("llama", "x", 1).tokens, 1);
  assert.equal(countFor("deepseek", "x", 0).tokens, 1); // never rounds to zero for non-empty text
});

test("countFor falls back to the heuristic without an openai count", () => {
  const text = "hello world";
  const r = countFor("mistral", text, null);
  assert.equal(r.method, "heuristic");
  assert.equal(r.exact, false);
  assert.equal(r.tokens, Math.max(1, Math.round(heuristicTokens(text) * familyFactor.mistral)));
  assert.equal(countFor("openai", text, null).exact, false);
});

test("countFor handles empty text for every method", () => {
  assert.deepEqual(countFor("openai", "", 0), { tokens: 0, exact: true, method: "tokenizer" });
  assert.deepEqual(countFor("openai", "", null), { tokens: 0, exact: false, method: "heuristic" });
  assert.deepEqual(countFor("claude", "", 0), { tokens: 0, exact: false, method: "scaled-tokenizer" });
  assert.deepEqual(countFor("grok", "", null), { tokens: 0, exact: false, method: "heuristic" });
});

test("countForModel delegates to the model family", () => {
  assert.deepEqual(countForModel({ family: "claude" }, "abc", 10), countFor("claude", "abc", 10));
  assert.deepEqual(countForModel({ family: "openai" }, "abc", null), countFor("openai", "abc", null));
});

test("methodLabel describes each counting method", () => {
  assert.equal(methodLabel({ tokens: 1, exact: true, method: "tokenizer" }), "Exact");
  assert.match(methodLabel({ tokens: 1, exact: false, method: "scaled-tokenizer" }), /^Estimate/);
  assert.match(methodLabel({ tokens: 1, exact: false, method: "heuristic" }), /^Rough estimate/);
});

test("familyFactor has a positive factor for every family", () => {
  assert.equal(familyFactor.openai, 1);
  for (const [family, factor] of Object.entries(familyFactor)) assert.ok(factor > 0, family);
});
