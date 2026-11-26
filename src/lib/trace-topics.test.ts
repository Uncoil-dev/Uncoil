import assert from "node:assert/strict";
import test from "node:test";
import { groupTraceTopics, normalizeTopicText, type TopicTrace } from "./trace-topics.ts";

const t = (runId: string, input: string, hasError = false): TopicTrace => ({ runId, input, hasError });

test("strips ids, emails, links and numbers before grouping", () => {
  assert.equal(
    normalizeTopicText('Refund order 12345 for bob@x.com see https://a.io/o/9 "ABC"'),
    "refund order <n> for <email> see <url> <value>",
  );
});

test("similar requests share a topic and unrelated ones do not", () => {
  const { topics } = groupTraceTopics([
    t("a", "Please refund my order 123"), t("b", "refund order 456 please"), t("c", "I want a refund for order 789", true),
    t("d", "Change my flight seat to aisle"), t("e", "change seat on my flight"), t("f", "flight seat change to window"),
  ], { minSize: 2 });
  const refund = topics.find((x) => x.sampleRunIds.includes("a"));
  const seat = topics.find((x) => x.sampleRunIds.includes("d"));
  assert.ok(refund && seat && refund.id !== seat.id);
  assert.deepEqual([...refund.sampleRunIds].sort(), ["a", "b", "c"]);
  assert.equal(refund.count, 3);
  assert.equal(Math.round(refund.errorRate * 100), 33);
  assert.match(refund.name, /refund/);
});

test("topic ids are stable across runs and input order", () => {
  const traces = [t("a", "refund order 1"), t("b", "refund my order 2"), t("c", "reset password now"), t("d", "reset my password")];
  const first = groupTraceTopics(traces, { minSize: 2 }).topics.map((x) => x.id).sort();
  const second = groupTraceTopics([...traces].reverse(), { minSize: 2 }).topics.map((x) => x.id).sort();
  assert.deepEqual(first, second);
});

test("small leftover groups go to Other and empty input gives nothing", () => {
  const { topics } = groupTraceTopics([t("a", "refund order 1"), t("b", "refund order 2"), t("c", "translate this poem")], { minSize: 2 });
  assert.equal(topics.at(-1)?.id, "other");
  assert.deepEqual(topics.at(-1)?.sampleRunIds, ["c"]);
  assert.deepEqual(groupTraceTopics([]).topics, []);
  assert.deepEqual(groupTraceTopics([t("x", "   ")]).topics, []);
});

test("contractions keep their words and non-English inputs are kept", () => {
  assert.equal(normalizeTopicText("I can't find my order, it's late"), "i can't find my order, it's late");
  const { total, topics } = groupTraceTopics([
    t("a", "I don't know my status"), t("b", "don't know order status"), t("c", "what's my order status"),
    t("d", "退款订单"), t("e", "退款订单"), t("f", "退款订单"),
  ], { minSize: 2 });
  assert.equal(total, 6);
  assert.equal(topics.reduce((sum, x) => sum + x.count, 0), 6);
  assert.ok(topics.every((x) => !x.terms.includes("don")));
  assert.ok(topics.some((x) => x.terms.includes("status")));
});

test("groups 2,000 traces quickly", () => {
  const words = ["refund", "seat", "password", "invoice", "weather", "translate", "booking", "cancel"];
  const traces = Array.from({ length: 2000 }, (_, i) => t(String(i), `${words[i % 8]} request ${words[(i * 7) % 8]} item ${i}`));
  const start = performance.now();
  const { topics } = groupTraceTopics(traces);
  assert.ok(performance.now() - start < 3000);
  assert.equal(topics.reduce((sum, x) => sum + x.count, 0), 2000);
});
