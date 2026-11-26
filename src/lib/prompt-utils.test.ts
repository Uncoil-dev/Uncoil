import assert from "node:assert/strict";
import test from "node:test";
import { compilePrompt, decodePromptName, diffSummary, estimateTokens, extractVariables, lineDiff } from "./prompt-utils.ts";

test("extractVariables keeps first-use order and drops duplicates", () => {
  assert.deepEqual(extractVariables("Hi {{ name }}, {{topic}} and {{name}} {{user.id}}"), ["name", "topic", "user.id"]);
  assert.deepEqual(extractVariables("no variables {single} {{ }}"), []);
});

test("compilePrompt fills values and reports missing ones without blanking them", () => {
  const result = compilePrompt("A {{a}} B {{b}} C {{a}}", { a: "1", b: "" });
  assert.equal(result.text, "A 1 B {{b}} C 1");
  assert.deepEqual(result.missing, ["b"]);
  assert.deepEqual(compilePrompt("{{x}}", { constructor: "z" }).missing, ["x"]);
});

test("lineDiff marks added, removed and unchanged lines with line numbers", () => {
  const diff = lineDiff("a\nb\nc", "a\nB\nc\nd")!;
  assert.deepEqual(diff.map((line) => line.kind), ["same", "remove", "add", "same", "add"]);
  assert.deepEqual(diffSummary(diff), { added: 2, removed: 1 });
  assert.equal(diff[0].oldLine, 1);
  assert.equal(diff[2].newLine, 2);
  assert.deepEqual(diffSummary(lineDiff("same", "same")!), { added: 0, removed: 0 });
});

test("lineDiff refuses huge inputs and estimateTokens rounds up", () => {
  assert.equal(lineDiff("x\n".repeat(2001), "y"), null);
  assert.equal(estimateTokens("abcde"), 2);
  assert.equal(estimateTokens(""), 0);
});

test("decodePromptName decodes URL names and rejects ones that cannot be decoded", () => {
  assert.equal(decodePromptName("support%20triage"), "support triage");
  assert.equal(decodePromptName("summarize-v2"), "summarize-v2");
  assert.equal(decodePromptName("%E0%A4%A"), null);
  assert.equal(decodePromptName("100%"), null);
});
