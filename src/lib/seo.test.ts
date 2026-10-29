import assert from "node:assert/strict";
import test from "node:test";
import { fitDescription, fitTitle, fitTitleText } from "./seo.ts";

test("short titles keep the brand suffix", () => {
  assert.equal(fitTitle("Pricing"), "Pricing");
  assert.equal(fitTitleText("Pricing"), "Pricing | Uncoil");
});

test("titles that only fit without the suffix drop it", () => {
  assert.deepEqual(fitTitle("Laminar vs Uncoil: Trace Compression vs Full Observability"), { absolute: "Laminar vs Uncoil: Trace Compression vs Full Observability" });
});

test("long titles are cut at a natural break and never pass 60 characters", () => {
  const long = "AI Observability Metrics That Matter: Latency, Cost, Quality, and Reliability";
  const fitted = fitTitle(long) as { absolute: string };
  assert.equal(fitted.absolute, "AI Observability Metrics That Matter");
  const noBreak = "Enterprise adoption of governed autonomous assistants across large regulated organizations";
  assert.ok((fitTitle(noBreak) as { absolute: string }).absolute.length <= 60);
});

test("descriptions land between 110 and 160 characters", () => {
  const short = fitDescription("Install the Python SDK.");
  assert.ok(short.length >= 110 && short.length <= 160, short);
  const long = fitDescription("A ".repeat(120));
  assert.ok(long.length <= 160);
  const sentence = fitDescription("First sentence that explains the page in plain words and goes on for a while longer. Second sentence that keeps going and going past the limit for descriptions.");
  assert.ok(sentence.endsWith("."));
  assert.ok(sentence.length <= 160 && sentence.length >= 110);
});
