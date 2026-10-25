import { afterEach, expect, test, vi } from "vitest";
import { explainFailure, postJson } from "./notify";
import { slackEscape, slackPayload, webhookPayload } from "./alertMessages";

afterEach(() => vi.restoreAllMocks());

const reply = (status: number, body = "") => new Response(status === 204 ? null : body, { status });

test("a good Slack post says ok", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, "ok"));
  expect(await postJson("slack", "https://hooks.slack.com/services/x", {})).toEqual({ ok: true, status: 200 });
});

test("Slack answering 200 with an error word counts as a failure with a plain reason", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, "invalid_token"));
  const result = await postJson("slack", "https://hooks.slack.com/services/x", {});
  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/no longer works/);
});

test("a dead Slack link (404 no_service) is explained", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(404, "no_service"));
  const result = await postJson("slack", "https://hooks.slack.com/services/x", {});
  expect(result.error).toMatch(/new incoming webhook/);
  expect(fetchMock).toHaveBeenCalledTimes(1); // 4xx is not retried
});

test("server errors are retried once, then reported", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(503));
  const result = await postJson("webhook", "https://example.com/hook", {});
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result).toMatchObject({ ok: false, status: 503 });
  expect(result.error).toMatch(/server error/);
});

test("a retry that works counts as delivered", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply(502)).mockResolvedValueOnce(reply(204));
  expect(await postJson("webhook", "https://example.com/hook", {})).toEqual({ ok: true, status: 204 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("network errors never throw", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  const result = await postJson("webhook", "https://example.com/hook", {});
  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/Could not reach/);
});

test("redirects are explained, not followed", () => {
  expect(explainFailure("webhook", 302, "")).toMatch(/redirected/);
  expect(explainFailure("webhook", 401, "")).toMatch(/refused/);
});

test("Slack messages escape user text and link to the dashboard", () => {
  expect(slackEscape("a <b> & c")).toBe("a &lt;b&gt; &amp; c");
  const payload = slackPayload({ event: "alert.fired", ruleName: "Cost <spike>", metric: "cost_usd", threshold: 5, value: 9, message: "Too much", projectId: "p1", dashboardUrl: "https://x/dashboard/p1/alerts", at: "2026-01-01T00:00:00Z" });
  expect(payload.text).toContain("Cost &lt;spike&gt;");
  expect(JSON.stringify(payload.blocks)).toContain("https://x/dashboard/p1/alerts");
});

test("webhook messages keep a stable shape for each event", () => {
  const base = { ruleId: "r1", ruleName: "R", metric: "failed_runs", threshold: 2, value: 3, message: "m", projectId: "p1", dashboardUrl: "u", at: "t" };
  expect(webhookPayload({ ...base, event: "alert.resolved" })).toEqual({ event: "alert.resolved", rule: { id: "r1", name: "R", metric: "failed_runs", threshold: 2 }, value: 3, message: "m", projectId: "p1", dashboardUrl: "u", firedAt: "t" });
  expect(webhookPayload({ event: "alert.test", ruleName: "R", metric: "failed_runs", threshold: 2, message: "m", projectId: "p1", dashboardUrl: "u", at: "t" }).value).toBeNull();
});
