import assert from "node:assert/strict";
import test from "node:test";
import { slackEscape, slackPayload, webhookPayload } from "./alertMessages.ts";
import { describeBreach, metricAt, metricSeries } from "./alertMetrics.ts";

type Run = Parameters<typeof metricAt>[0][number];

const AT = Date.parse("2026-01-01T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(AT - m * 60_000).toISOString();
const run = (over: Partial<Run> = {}): Run => ({
  status: "completed",
  totalCostUsd: 0,
  startedAt: minutesAgo(1),
  finishedAt: undefined,
  environment: "production",
  ...over,
} as Run);

const info = {
  event: "alert.fired" as const,
  ruleName: "Errors <prod> & co",
  metric: "failed_runs",
  threshold: 5,
  message: "Too many <failures> & more",
  projectId: "proj_1",
  dashboardUrl: "https://example.com/dashboard/proj_1",
  at: "2026-01-01T12:00:00.000Z",
};

test("slackEscape escapes the three mrkdwn characters", () => {
  assert.equal(slackEscape("a & b < c > d"), "a &amp; b &lt; c &gt; d");
  assert.equal(slackEscape(""), "");
  assert.equal(slackEscape("plain"), "plain");
  assert.equal(slackEscape("&lt;"), "&amp;lt;");
});

test("slackPayload builds heading, escaped body and button per event", () => {
  const fired = slackPayload(info);
  assert.equal(fired.text, ":rotating_light: Alert: Errors &lt;prod&gt; &amp; co. Too many <failures> & more");
  assert.equal(fired.blocks[0].text?.text, "*:rotating_light: Alert: Errors &lt;prod&gt; &amp; co*\nToo many &lt;failures&gt; &amp; more");
  assert.equal(fired.blocks[1].elements?.[0].url, info.dashboardUrl);
  assert.match(slackPayload({ ...info, event: "alert.resolved" }).text, /^:white_check_mark: Back to normal: /);
  assert.match(slackPayload({ ...info, event: "alert.test" }).text, /^:test_tube: Test message: /);
});

test("slackPayload throws on an unknown event", () => {
  assert.throws(() => slackPayload({ ...info, event: "alert.unknown" as never }));
});

test("webhookPayload maps fields and defaults missing ones to null", () => {
  const full = webhookPayload({ ...info, ruleId: "rule_1", value: 7 });
  assert.deepEqual(full, {
    event: "alert.fired",
    rule: { id: "rule_1", name: info.ruleName, metric: "failed_runs", threshold: 5 },
    value: 7,
    message: info.message,
    projectId: "proj_1",
    dashboardUrl: info.dashboardUrl,
    firedAt: info.at,
  });
  const bare = webhookPayload(info);
  assert.equal(bare.rule.id, null);
  assert.equal(bare.value, null);
  assert.equal(webhookPayload({ ...info, value: 0 }).value, 0);
});

test("metricAt returns zero or the window for empty runs", () => {
  assert.equal(metricAt([], "failed_runs", 60, AT), 0);
  assert.equal(metricAt([], "cost_usd", 60, AT), 0);
  assert.equal(metricAt([], "slow_p95_seconds", 60, AT), 0);
  assert.equal(metricAt([], "minutes_without_runs", 60, AT), 60);
});

test("metricAt counts failed runs inside the window only", () => {
  const runs = [
    run({ status: "failed", startedAt: minutesAgo(5) }),
    run({ status: "failed", startedAt: minutesAgo(90) }),
    run({ status: "completed", startedAt: minutesAgo(5) }),
    run({ status: "failed", startedAt: new Date(AT + 60_000).toISOString() }),
    run({ status: "failed", startedAt: "not a date" }),
  ];
  assert.equal(metricAt(runs, "failed_runs", 60, AT), 1);
});

test("metricAt filters by environment and rounds cost", () => {
  const runs = [
    run({ totalCostUsd: 0.111 }),
    run({ totalCostUsd: 0.222 }),
    run({ totalCostUsd: 5, environment: "staging" }),
  ];
  assert.equal(metricAt(runs, "cost_usd", 60, AT, "production"), 0.33);
  assert.equal(metricAt(runs, "cost_usd", 60, AT, "staging"), 5);
  assert.equal(metricAt(runs, "cost_usd", 60, AT, "unknown-env"), 0);
  assert.equal(metricAt(runs, "cost_usd", 60, AT), 5.33);
});

test("metricAt computes p95 duration and skips unfinished or negative runs", () => {
  const runs = Array.from({ length: 20 }, (_, i) =>
    run({ startedAt: minutesAgo(10), finishedAt: new Date(AT - 10 * 60_000 + (i + 1) * 1000).toISOString() }),
  );
  runs.push(run({ finishedAt: undefined }), run({ startedAt: minutesAgo(10), finishedAt: minutesAgo(11) }));
  assert.equal(metricAt(runs, "slow_p95_seconds", 60, AT), 19);
});

test("metricAt reports minutes since the latest run", () => {
  const runs = [run({ startedAt: minutesAgo(30) }), run({ startedAt: minutesAgo(10) })];
  assert.equal(metricAt(runs, "minutes_without_runs", 60, AT), 10);
  assert.equal(metricAt(runs, "minutes_without_runs", 60, AT, "staging"), 60);
});

test("metricSeries returns ordered points and handles empty input", () => {
  const runs = [run({ status: "failed", startedAt: minutesAgo(1) })];
  const series = metricSeries(runs, "failed_runs", 60, AT, undefined, 3, 120);
  assert.deepEqual(series, [0, 0, 1]);
  assert.equal(metricSeries([], "cost_usd", 60, AT).length, 30);
  assert.deepEqual(metricSeries([], "cost_usd", 60, AT, undefined, 0), []);
});

test("describeBreach words each metric and window", () => {
  const base = { name: "Rule", threshold: 3, windowMinutes: 60 };
  assert.equal(describeBreach({ ...base, metric: "failed_runs" }, 4), "Rule: 4 failed runs in the last hour (limit 3).");
  assert.equal(describeBreach({ ...base, metric: "cost_usd", windowMinutes: 1440 }, 1.5), "Rule: $1.50 spent in the last day (limit $3).");
  assert.equal(describeBreach({ ...base, metric: "failed_runs", windowMinutes: 15 }, 1), "Rule: 1 failed runs in the last 15 min (limit 3).");
  assert.equal(describeBreach({ ...base, metric: "slow_p95_seconds" }, 12.5), "Rule: slowest 5% of runs took 12.5s (limit 3s).");
  assert.equal(describeBreach({ ...base, metric: "minutes_without_runs" }, 30), "Rule: no runs for 30 minutes (limit 3).");
  assert.equal(describeBreach({ ...base, metric: "mystery" as never }, 9), "Rule: no runs for 9 minutes (limit 3).");
});
