import assert from "node:assert/strict";
import test from "node:test";
import type { AskSpan } from "./ask-ai.ts";
import { buildFacetPrompt, ruleFacets, summarizeTrace } from "./trace-facets.ts";

const user = (input: string, at: number): AskSpan => ({ spanId: `u${at}`, spanType: "user", input, createdAt: new Date(at * 1000).toISOString() });
const tool = (toolName: string, at: number, extra: Partial<AskSpan> = {}): AskSpan =>
  ({ spanId: `t${at}`, spanType: "tool", toolName, createdAt: new Date(at * 1000).toISOString(), ...extra });
const answer = (output: string, at: number): AskSpan =>
  ({ spanId: `a${at}`, spanType: "llm", modelId: "m", output, createdAt: new Date(at * 1000).toISOString() });

test("rules: completed trace with a normalized intent and neutral tone", () => {
  const f = ruleFacets([user("Change flight booking 88231 to Friday", 1), tool("change_booking", 2), answer("Your flight is now on Friday.", 3)]);
  assert.deepEqual(
    { intent: f.intent, sentiment: f.sentiment, outcome: f.outcome, issue: f.issue, source: f.source },
    { intent: "change flight booking <n> to friday", sentiment: "Neutral", outcome: "Completed", issue: "none", source: "rules" },
  );
});

test("rules: Unconfirmed when the answer claims a refund but no refund tool succeeded", () => {
  const spans = [user("Refund order 5", 1), tool("lookup_order", 2), tool("issue_refund", 3, { errorType: "Timeout", errorMessage: "refund api down" }), answer("I've refunded your order.", 4)];
  assert.equal(ruleFacets(spans).outcome, "Unconfirmed");
  const ok = [user("Refund order 5", 1), tool("issue_refund", 3), answer("I've refunded your order.", 4)];
  assert.equal(ruleFacets(ok).outcome, "Completed");
  const cancel = [user("Cancel it", 1), tool("lookup_order", 2), answer("Your subscription has been cancelled.", 3)];
  assert.equal(ruleFacets(cancel).outcome, "Unconfirmed");
});

test("rules: Failed without final output, Partial with errors but an answer", () => {
  const err = tool("search", 2, { errorType: "HttpError", errorMessage: "500 for order 123456789" });
  assert.equal(ruleFacets([user("find order", 1), err]).outcome, "Failed");
  assert.equal(ruleFacets([user("find order", 1), err, answer("Here is what I found.", 3)]).outcome, "Partial");
  assert.equal(ruleFacets([user("find order", 1), { ...err, timedOut: true, errorType: undefined }]).outcome, "Failed");
});

test("rules: issue is the most common error group, ignoring ids in messages", () => {
  const e = (n: number, at: number, message: string) => tool("search", at, { errorType: "HttpError", errorMessage: message.replace("N", String(n)) });
  const f = ruleFacets([user("x", 1), e(11, 2, "500 for order N"), e(22, 3, "500 for order N"), tool("send", 4, { errorType: "Auth", errorMessage: "denied" })]);
  assert.match(f.issue, /search/);
  assert.match(f.issue, /<n> for order <n>/);
  assert.match(f.issueGroupId ?? "", /^\[".*"\]$/);
});

test("rules: sentiment from later user messages", () => {
  const base = [user("Fix my login", 1), answer("Try resetting.", 2)];
  assert.equal(ruleFacets([...base, user("This is still not working, useless", 3)]).sentiment, "Negative");
  assert.equal(ruleFacets([...base, user("Great, thanks!", 3)]).sentiment, "Positive");
  assert.equal(ruleFacets([...base, user("thanks but it's still broken", 3)]).sentiment, "Mixed");
  assert.equal(ruleFacets([user("This is terrible, fix it", 1)]).sentiment, "Neutral");
});

test("prompt trims and redacts secrets and emails", () => {
  const prompt = buildFacetPrompt([user(`mail bob@example.com key sk-abcdefghijklmnopqrstuvwx ${"z".repeat(2000)}`, 1)]);
  assert.ok(!prompt.includes("bob@example.com") && !prompt.includes("sk-abcdefgh"));
  assert.ok(prompt.length < 3000);
});

test("AI path uses the model answer; only callModel is mocked", async () => {
  let seen = "";
  const f = await summarizeTrace([user("Change my flight", 1), answer("Done", 2)], {
    callModel: async (p) => { seen = p; return 'Sure:\n```json\n{"intent":"Change a flight booking","sentiment":"positive","outcome":"Completed","issue":"none"}\n```'; },
  });
  assert.match(seen, /Change my flight/);
  assert.deepEqual(f, { intent: "Change a flight booking", sentiment: "Positive", outcome: "Completed", issue: "none", source: "ai" });
});

test("bad JSON, bad values or a throwing model fall back to rules", async () => {
  const spans = [user("Reset password", 1), answer("Link sent.", 2)];
  for (const reply of ["not json", '{"intent":"x","sentiment":"Happy","outcome":"Completed","issue":"none"}']) {
    assert.equal((await summarizeTrace(spans, { callModel: async () => reply })).source, "rules");
  }
  const f = await summarizeTrace(spans, { callModel: async () => { throw new Error("down"); } });
  assert.equal(f.source, "rules");
  assert.equal(f.outcome, "Unconfirmed");
});
