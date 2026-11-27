import assert from "node:assert/strict";
import test from "node:test";
import { groupTraceTopics, isTopicId, normalizeTopicText, topicRunIds, type TopicTrace } from "./trace-topics.ts";

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

test("counts succeeded, failed and timed out traces per topic", () => {
  const { topics } = groupTraceTopics([
    t("a", "refund order 1"), t("b", "refund order 2"), t("c", "refund order 3", true),
    { runId: "d", input: "refund order 4", hasError: false, timedOut: true },
    { runId: "e", input: "refund order 5", hasError: true, timedOut: true },
  ], { minSize: 2 });
  assert.equal(topics.length, 1);
  assert.deepEqual(topics[0].outcome, { succeeded: 2, failed: 1, timedOut: 2 });
  assert.equal(topics[0].silentFailures, 0);
});

test("lists the three most common error groups per topic, most frequent first", () => {
  const fail = (id: string, topic: string, errorMessage: string): TopicTrace => ({ runId: id, input: `${topic} request`, hasError: true, errorMessage });
  const { topics } = groupTraceTopics([
    fail("a1", "refund", "Card 4111 declined"), fail("a2", "refund", "Card 9999 declined"), fail("a3", "refund", "Card 1234 declined"),
    fail("b1", "refund", "Order 17 not found"), fail("b2", "refund", "Order 18 not found"),
    fail("c1", "refund", "Gateway timeout"),
    fail("d1", "refund", "Rate limited"),
    fail("s1", "seat", "Seat map unavailable"), fail("s2", "seat", "Seat map unavailable"), fail("s3", "seat", "Seat map unavailable"),
  ], { minSize: 2 });
  const refund = topics.find((x) => x.runIds.includes("a1"));
  const seat = topics.find((x) => x.runIds.includes("s1"));
  assert.ok(refund && seat);
  assert.deepEqual(refund.issues.map((i) => [i.message, i.count]), [["Card <n> declined", 3], ["Order <n> not found", 2], ["Gateway timeout", 1]]);
  assert.equal(refund.issues.length, 3);
  assert.deepEqual(seat.issues.map((i) => i.count), [3]);
  assert.notEqual(refund.issues[0].id, refund.issues[1].id);
});

test("a trace with no error and an empty final output is a silent failure", () => {
  const ok = (runId: string, output?: string): TopicTrace => ({ runId, input: "refund order 1", hasError: false, output });
  const { topics } = groupTraceTopics([ok("a", "Done"), ok("b", ""), ok("c", "   "), ok("d"), { ...ok("e", ""), hasError: true }], { minSize: 2 });
  assert.equal(topics[0].silentFailures, 2);
  assert.equal(topics[0].outcome.succeeded, 4);
});

test("a topic id selects exactly that topic's runs and an unknown id selects none", () => {
  const traces = [
    ...Array.from({ length: 3 }, (_, i) => t(`r${i}`, "refund the order please")),
    ...Array.from({ length: 3 }, (_, i) => t(`w${i}`, "summarize the weather forecast")),
  ];
  const { topics } = groupTraceTopics(traces, { minSize: 2 });
  assert.ok(topics.length >= 2);
  for (const topic of topics) assert.deepEqual(topicRunIds(traces, topic.id, { minSize: 2 }), topic.runIds);
  assert.deepEqual(topicRunIds(traces, "deadbeef", { minSize: 2 }), []);
});

test("topic ids are only accepted in the shape groupTraceTopics produces", () => {
  for (const ok of ["0a1b2c3d", "0a1b2c3d-2", "other"]) assert.ok(isTopicId(ok), ok);
  for (const bad of ["", "OTHER", "0a1b2c3", "0a1b2c3d-", "x'; DROP", "0a1b2c3d-1-2"]) assert.ok(!isTopicId(bad), bad);
});
