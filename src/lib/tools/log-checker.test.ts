import assert from "node:assert/strict";
import test from "node:test";
import { analyzeLog, classifyError } from "./log-checker.ts";

const trace = [
  { name: "plan", type: "llm", model: "gpt-4o", usage: { prompt_tokens: 1200, completion_tokens: 150 }, duration_ms: 900, start_time: "2026-10-17T10:00:00Z" },
  { name: "search_web", type: "tool", input: { q: "uncoil pricing" }, duration_ms: 400, start_time: "2026-10-17T10:00:01Z" },
  { name: "search_web", type: "tool", input: { q: "uncoil pricing" }, duration_ms: 420, start_time: "2026-10-17T10:00:02Z" },
  { name: "search_web", type: "tool", input: { q: "uncoil pricing" }, duration_ms: 410, start_time: "2026-10-17T10:00:03Z" },
  { name: "answer", type: "llm", model: "gpt-4o", usage: { prompt_tokens: 5200, completion_tokens: 300 }, duration_ms: 9000, start_time: "2026-10-17T10:00:04Z" },
  { name: "answer", type: "llm", model: "gpt-4o", usage: { prompt_tokens: 5600, completion_tokens: 320 }, duration_ms: 1000, start_time: "2026-10-17T10:00:14Z", status: "error", error: "429 Rate limit reached for gpt-4o" },
];

test("reads a JSON trace, finds failure, repeats, slow step", () => {
  const a = analyzeLog(JSON.stringify(trace));
  assert.equal(a.format, "json-trace");
  assert.equal(a.totals.steps, 6);
  assert.equal(a.totals.errors, 1);
  assert.equal(a.firstFailure?.index, 5);
  const ids = a.findings.map((f) => f.id);
  assert.ok(ids.includes("first-failure"));
  assert.ok(ids.some((i) => i.startsWith("repeat-")));
  assert.ok(ids.some((i) => i.startsWith("slow-4")));
  assert.ok(ids.includes("context-growth"));
  assert.match(a.findings[0].fix ?? "", /rate|queue|slow/i);
  assert.equal(a.totals.wallMs, 14000 + 1000);
});

test("reads a wrapped object, JSON lines and OpenTelemetry", () => {
  assert.equal(analyzeLog(JSON.stringify({ trace: { spans: trace } })).totals.steps, 6);
  assert.equal(analyzeLog(trace.map((t) => JSON.stringify(t)).join("\n")).format, "json-lines");
  const otel = { resourceSpans: [{ scopeSpans: [{ spans: [
    { name: "chat gpt-4o", startTimeUnixNano: "1760695200000000000", endTimeUnixNano: "1760695201500000000", attributes: [{ key: "gen_ai.usage.input_tokens", value: { intValue: 900 } }, { key: "gen_ai.usage.output_tokens", value: { intValue: 80 } }], status: { code: 1 } },
    { name: "tool.run", startTimeUnixNano: "1760695201500000000", endTimeUnixNano: "1760695202000000000", status: { code: 2, message: "Connection refused" } },
  ] }] }] };
  const a = analyzeLog(JSON.stringify(otel));
  assert.equal(a.totals.steps, 2);
  assert.equal(a.totals.inputTokens, 900);
  assert.equal(a.steps[0].durationMs, 1500);
  assert.equal(a.firstFailure?.name, "tool.run");
});

test("reads OpenAI-style messages with a failed tool call", () => {
  const messages = [
    { role: "user", content: "weather in Oslo?" },
    { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "get_weather", arguments: '{"city":"Oslo"}' } }] },
    { role: "tool", tool_call_id: "c1", content: "Error: 503 service unavailable" },
    { role: "assistant", content: "Sorry, I could not look that up." },
  ];
  const a = analyzeLog(JSON.stringify(messages));
  assert.equal(a.format, "messages");
  assert.equal(a.firstFailure?.name, "get_weather");
  assert.equal(classifyError(a.firstFailure?.error)?.id, "overloaded");
});

test("reads a plain text log with timestamps", () => {
  const log = [
    "2026-10-17 10:00:00,100 INFO Starting agent run",
    "2026-10-17 10:00:00,900 INFO calling tool: search_docs query=pricing",
    "2026-10-17 10:00:08,900 INFO model gpt-4o prompt_tokens=3000 completion_tokens=200",
    "2026-10-17 10:00:09,100 ERROR Traceback (most recent call last):",
    '  File "agent.py", line 10, in run',
    "ValueError: invalid JSON in tool arguments",
    "2026-10-17 10:00:09,500 INFO Run finished",
  ].join("\n");
  const a = analyzeLog(log);
  assert.equal(a.format, "text-log");
  assert.ok(a.totals.errors >= 1);
  assert.equal(a.steps.find((s) => s.name === "search_docs")?.durationMs, 8000);
  assert.ok(a.findings.some((f) => f.id.startsWith("slow-")));
});

test("detects a loop", () => {
  const steps = Array.from({ length: 8 }, (_, i) => ({ name: i % 2 ? "read_file" : "search", type: "tool", input: { n: i } }));
  const a = analyzeLog(JSON.stringify(steps));
  assert.ok(a.findings.some((f) => f.id === "loop"));
});

test("messy and hostile input never throws", () => {
  const inputs = ["", "   ", "{", "[1,2,3]", "null", '"just a string"', "{\"a\":[]}", "\u0000\u0001", "x".repeat(100000), "[[[[[[[[", '[{"name":null,"duration":"abc","usage":5}]', '{"steps":[{"error":false,"status":{"code":"weird"}}]}', "ERROR\n\n\nERROR"];
  for (const input of inputs) assert.doesNotThrow(() => analyzeLog(input), input.slice(0, 20));
  assert.equal(analyzeLog("").format, "empty");
  assert.equal(analyzeLog("{\"a\":[]}").totals.steps, 0);
});

test("a healthy trace reports no problems", () => {
  const a = analyzeLog(JSON.stringify([{ name: "a", type: "llm", model: "x", usage: { prompt_tokens: 100, completion_tokens: 10 }, duration_ms: 100 }, { name: "b", type: "tool", duration_ms: 90 }]));
  assert.equal(a.totals.errors, 0);
  assert.equal(a.findings[0].id, "clean");
});
