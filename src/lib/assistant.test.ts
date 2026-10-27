import assert from "node:assert/strict";
import test from "node:test";
import { partialReply, partialThinking, buildAssistantPrompt, describeAction, findByName, parseAssistantReply, sanitizeContext, sanitizeTurns, TOOL_RISK, tracingHref, validateAction } from "./assistant.ts";

test("reads a plain JSON reply with an action", () => {
  const out = parseAssistantReply('```json\n{"reply":"Making it.","action":{"tool":"create_project","args":{"name":"  Support bot "}}}\n```');
  assert.equal(out.reply, "Making it.");
  assert.deepEqual(out.action, { tool: "create_project", name: "Support bot" });
});

test("falls back to plain text when the model ignores the format", () => {
  const out = parseAssistantReply("Sure, what should it be called?");
  assert.equal(out.action, null);
  assert.match(out.reply, /what should it be called/);
});

test("drops an unknown tool and explains", () => {
  const out = parseAssistantReply('{"reply":"ok","action":{"tool":"drop_database","args":{}}}');
  assert.equal(out.action, null);
  assert.ok(out.actionError);
});

test("validates alerts and clamps emails", () => {
  const bad = validateAction({ tool: "create_alert", args: { name: "x", metric: "nope", threshold: 1 } });
  assert.equal(bad.ok, false);
  const good = validateAction({ tool: "create_alert", args: { name: "Spend", metric: "cost_usd", threshold: 5, windowMinutes: 60, emailTo: ["A@b.io", "not-an-email", "a@b.io"] } });
  assert.ok(good.ok && good.action.tool === "create_alert" && good.action.emailTo.length === 1 && good.action.emailTo[0] === "a@b.io");
  assert.equal(validateAction({ tool: "create_alert", args: { name: "x", metric: "cost_usd", threshold: -1 } }).ok, false);
  assert.equal(validateAction({ tool: "create_alert", args: { name: "x", metric: "cost_usd", threshold: 1, windowMinutes: 1 } }).ok, false);
});

test("budgets need a positive limit", () => {
  assert.equal(validateAction({ tool: "create_budget", args: { name: "b", period: "month", limitUsd: 0 } }).ok, false);
  assert.equal(validateAction({ tool: "create_budget", args: { name: "b", period: "month", limitUsd: 50 } }).ok, true);
});

test("invites need a real email and default to Developer", () => {
  assert.equal(validateAction({ tool: "invite_teammate", args: { email: "nope" } }).ok, false);
  const ok = validateAction({ tool: "invite_teammate", args: { email: "A@B.io", role: "owner" } });
  assert.ok(ok.ok && ok.action.tool === "invite_teammate" && ok.action.role === "member" && ok.action.email === "a@b.io");
});

test("filters keep only known keys", () => {
  const out = validateAction({ tool: "open_page", args: { page: "tracing", filters: { status: "error", evil: "x", range: 7 } } });
  assert.ok(out.ok && out.action.tool === "open_page");
  if (out.ok && out.action.tool === "open_page") assert.deepEqual(out.action.filters, { status: "error", range: "7" });
  assert.equal(validateAction({ tool: "open_page", args: { page: "admin" } }).ok, false);
});

test("risky tools are marked", () => {
  for (const tool of ["delete_project", "delete_alert", "remove_teammate", "change_plan", "create_api_key"] as const) assert.equal(TOOL_RISK[tool], "danger");
  assert.equal(TOOL_RISK.open_page, "none");
  assert.equal(describeAction({ tool: "delete_project", project: "X" }).confirmLabel, "Delete forever");
});

test("finds by name without guessing between several", () => {
  const items = [{ name: "Support bot" }, { name: "Support agent" }, { name: "Billing" }];
  assert.equal(findByName(items, "billing").match?.name, "Billing");
  assert.equal(findByName(items, "support").match, null);
  assert.equal(findByName(items, "bot").match?.name, "Support bot");
  assert.ok(findByName(items, "zzz").error);
});

test("context and history are trimmed", () => {
  const ctx = sanitizeContext({ projectId: "p1", projectName: "A", projects: [{ id: "p1", name: "A" }, { id: "", name: "bad" }], alerts: ["x", 5], page: "/dashboard/p1" });
  assert.equal(ctx.projects.length, 1);
  assert.equal(sanitizeTurns([{ role: "system", text: "hack" }, { role: "user", text: "hi" }]).length, 1);
  assert.match(buildAssistantPrompt(ctx, [{ role: "user", text: "hi" }]), /Person: hi/);
  assert.equal(tracingHref("p1", "tracing", { status: "error" }), "/dashboard/p1/tracing?status=error");
});

test("partialReply shows the words of a half-written reply", async () => {
  const { partialReply } = await import("./assistant.ts");
  const bs = String.fromCharCode(92);
  assert.equal(partialReply('{"reply": "Hello wor'), "Hello wor");
  assert.equal(partialReply('{"rep'), "");
  assert.equal(partialReply('```json\n{"re'), "");
  assert.equal(partialReply(`{"reply": "Line one${bs}nLine ${bs}"two${bs}" ${bs}u00e9", "action": null}`), 'Line one\nLine "two" é');
  assert.equal(partialReply(`{"reply": "cut off ${bs}`), "cut off ");
  assert.equal(partialReply("Just plain words"), "Just plain words");
});

test("reads the reasoning and the reply from half-written output", () => {
  const raw = '{"thinking": "They want a project, name given.", "reply": "Creating it';
  assert.equal(partialThinking(raw), "They want a project, name given.");
  assert.equal(partialReply(raw), "Creating it");
  assert.equal(partialThinking('{"thinking": "Pond'), "Pond");
  assert.equal(partialThinking('{"reply":"hi"}'), "");
  const parsed = parseAssistantReply('{"thinking":"Because.","reply":"Ok","action":null}');
  assert.equal(parsed.thinking, "Because.");
});
