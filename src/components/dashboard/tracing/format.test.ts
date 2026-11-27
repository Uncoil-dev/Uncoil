import assert from "node:assert/strict";
import test from "node:test";

import {
  chatMessages,
  compactNumber,
  listPaging,
  formatCost,
  formatDuration,
  formatTime,
  parsePayload,
  parseTime,
  previewText,
  relativeTime,
  stepRowLabel,
  stepKind,
  toCsv,
  traceRowLabel,
} from "./format.ts";

test("formatDuration: zero, negative and invalid values collapse to 0 ms", () => {
  for (const value of [0, -5, -1_000_000, NaN, Infinity, null, undefined]) {
    assert.equal(formatDuration(value as number), "0 ms", String(value));
  }
});

test("formatDuration: picks the unit by magnitude", () => {
  assert.equal(formatDuration(0.4), "0 ms");
  assert.equal(formatDuration(999), "999 ms");
  assert.equal(formatDuration(1000), "1.00 s");
  assert.equal(formatDuration(9_990), "9.99 s");
  assert.equal(formatDuration(12_340), "12.3 s");
  assert.equal(formatDuration(60_000), "1m 0s");
  assert.equal(formatDuration(125_000), "2m 5s");
  assert.equal(formatDuration(3_600_000), "1h 0m");
  assert.equal(formatDuration(5_400_000), "1h 30m");
  assert.equal(formatDuration(86_400_000), "1d 0h");
  assert.equal(formatDuration(90_000_000), "1d 1h");
});

test("formatDuration: very large values stay in days", () => {
  assert.equal(formatDuration(86_400_000 * 400), "400d 0h");
});

test("formatCost: zero, null and negative", () => {
  assert.equal(formatCost(0), "$0");
  assert.equal(formatCost(null), "$0");
  assert.equal(formatCost(undefined), "$0");
  assert.equal(formatCost(NaN), "$0");
  assert.match(formatCost(-0.5), /^\$-0\.5/);
});

test("formatCost: precision depends on magnitude", () => {
  assert.equal(formatCost(0.000123), "$0.00012");
  assert.equal(formatCost(0.05), "$0.0500");
  assert.equal(formatCost(0.9999), "$0.9999");
  assert.equal(formatCost(1), "$1.00");
  assert.equal(formatCost(12.5), "$12.50");
  assert.equal(formatCost(1_000_000), "$1000000.00");
});

test("compactNumber: small, zero, negative and large values", () => {
  assert.equal(compactNumber(0), "0");
  assert.equal(compactNumber(null), "0");
  assert.equal(compactNumber(undefined), "0");
  assert.equal(compactNumber(999), "999");
  assert.equal(compactNumber(1500), "1.5K");
  assert.equal(compactNumber(-1500), "-1.5K");
  assert.equal(compactNumber(2_500_000), "2.5M");
  assert.equal(compactNumber(3_000_000_000), "3B");
  assert.equal(compactNumber(7e12), "7T");
  assert.equal(compactNumber(1e15), "1000T");
});

test("listPaging: keeps known page sizes and a non-negative page, and falls back otherwise", () => {
  assert.deepEqual(listPaging({ page: "2", pageSize: "100" }), { page: 2, pageSize: 100 });
  assert.deepEqual(listPaging({}), { page: 0, pageSize: 50 });
  assert.deepEqual(listPaging({ page: "-3", pageSize: "abc" }), { page: 0, pageSize: 50 });
  assert.deepEqual(listPaging({ page: "1.5", pageSize: "30" }), { page: 0, pageSize: 50 });
});

test("parseTime: treats space-separated timestamps as UTC", () => {
  assert.equal(parseTime("2024-01-02 03:04:05"), Date.UTC(2024, 0, 2, 3, 4, 5));
  assert.equal(parseTime("2024-01-02T03:04:05Z"), Date.UTC(2024, 0, 2, 3, 4, 5));
  assert.ok(Number.isNaN(parseTime("not a date")));
});

test("parseTime: reads ISO offsets and fractional database timestamps as UTC", () => {
  assert.equal(parseTime("2024-01-02T05:04:05+02:00"), Date.UTC(2024, 0, 2, 3, 4, 5));
  assert.equal(parseTime("2024-01-02 03:04:05.250"), Date.UTC(2024, 0, 2, 3, 4, 5, 250));
  assert.ok(Number.isNaN(parseTime("")));
});

test("formatTime: shows database UTC times in the viewer's zone and returns invalid input unchanged", () => {
  const zone = process.env.TZ;
  try {
    process.env.TZ = "UTC";
    assert.match(formatTime("2024-01-02 03:04:05"), /03:04:05/);
    process.env.TZ = "Asia/Tokyo";
    assert.match(formatTime("2024-01-02 03:04:05"), /12:04:05/);
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
  assert.equal(formatTime("not a date"), "not a date");
  assert.equal(formatTime(""), "");
});

test("relativeTime: buckets by elapsed time", () => {
  const now = Date.UTC(2024, 0, 2, 12, 0, 0);
  assert.equal(relativeTime("2024-01-02 12:00:00", now), "just now");
  assert.equal(relativeTime("2024-01-02 12:00:30", now), "just now", "future clamps to zero");
  assert.equal(relativeTime("2024-01-02 11:59:18", now), "42s ago");
  assert.equal(relativeTime("2024-01-02 11:55:00", now), "5m ago");
  assert.equal(relativeTime("2024-01-02 09:00:00", now), "3h ago");
  assert.doesNotMatch(relativeTime("2023-12-01 09:00:00", now), /ago|just now/);
  assert.equal(relativeTime("garbage", now), "garbage");
});

test("stepRowLabel: names the step, its type, its status and when it ran for screen readers", () => {
  const at = "2026-11-20T10:15:00Z";
  assert.equal(stepRowLabel({ name: "search_docs", type: "tool", errors: 0, createdAt: at }), `search_docs, tool, succeeded, ${formatTime(at)}`);
  assert.equal(stepRowLabel({ name: "gpt-5 call", type: "llm", errors: 3, createdAt: at }), `gpt-5 call, llm, failed, ${formatTime(at)}`);
});

test("toCsv: quotes cells, escapes quotes and neutralises formulas", () => {
  assert.equal(toCsv(["a", "b"], [[1, "x,y"]]), '"a","b"\r\n"1","x,y"');
  assert.equal(toCsv(["h"], [['say "hi"']]), '"h"\r\n"say ""hi"""');
  assert.equal(toCsv(["h"], [["=SUM(A1)"], ["+1"], ["-1"], ["@x"]]), '"h"\r\n"\'=SUM(A1)"\r\n"\'+1"\r\n"\'-1"\r\n"\'@x"');
  assert.equal(toCsv(["h"], []), '"h"');
});

test("parsePayload: JSON, double-encoded JSON, plain text and empty", () => {
  assert.deepEqual(parsePayload('{"a":1}'), { a: 1 });
  assert.deepEqual(parsePayload(JSON.stringify('{"a":1}')), { a: 1 });
  assert.equal(parsePayload("plain text"), "plain text");
  assert.equal(parsePayload(""), "");
  assert.equal(parsePayload(null), "");
  assert.equal(parsePayload(undefined), "");
});

test("chatMessages: recognises message arrays and rejects other shapes", () => {
  assert.deepEqual(chatMessages([{ role: "user", content: "hi" }]), [{ role: "user", content: "hi" }]);
  assert.deepEqual(chatMessages({ messages: [{ role: "assistant", content: [{ text: "a" }, { text: "b" }] }] }), [{ role: "assistant", content: "a\nb" }]);
  assert.deepEqual(chatMessages([{ role: "user" }]), [{ role: "user", content: "" }]);
  assert.equal(chatMessages([]), null);
  assert.equal(chatMessages([{ content: "no role" }]), null);
  assert.equal(chatMessages("text"), null);
  assert.equal(chatMessages(null), null);
});

test("previewText: last chat message, collapsed whitespace, 160 char cap", () => {
  assert.equal(previewText(null), "");
  assert.equal(previewText(""), "");
  assert.equal(previewText(JSON.stringify([{ role: "user", content: "first" }, { role: "assistant", content: "  last \n\n one " }])), "last one");
  assert.equal(previewText("just   text"), "just text");
  assert.equal(previewText('{"k":1}'), '{"k":1}');
  assert.equal(previewText("x".repeat(500)).length, 160);
});

test("stepKind: maps aliases, lowercases and tolerates empty input", () => {
  assert.equal(stepKind("llm_call"), "llm");
  assert.equal(stepKind("TOOL_CALL"), "tool");
  assert.equal(stepKind("Chain"), "agent");
  assert.equal(stepKind("retriever"), "retriever");
  assert.equal(stepKind(""), "");
  assert.equal(stepKind(undefined as unknown as string), "");
});

test("traceRowLabel: names the trace, its status and its start time for screen readers", () => {
  const started = "2026-11-20T10:15:00Z";
  assert.equal(traceRowLabel({ traceName: "checkout agent", runId: "run_1", errorCount: 0, startedAt: started }), `checkout agent, succeeded, ${formatTime(started)}`);
  assert.equal(traceRowLabel({ traceName: "", runId: "run_abcdefghijklmnop", errorCount: 2, startedAt: started }), `run_abcdefgh, failed, ${formatTime(started)}`);
});
