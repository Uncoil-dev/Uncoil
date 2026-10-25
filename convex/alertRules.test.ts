import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) => ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" }));
  return { t, projectId, owner: t.withIdentity({ subject: "owner", orgId: "org" }), outsider: t.withIdentity({ subject: "outsider", orgId: "other" }) };
}

const rule = { name: "Failed runs per hour", metric: "failed_runs" as const, threshold: 2, windowMinutes: 60, emailTo: ["Me@Example.com"] };

async function addRuns(t: ReturnType<typeof convexTest>, projectId: never, status: "failed" | "completed", count: number) {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i += 1) {
      await ctx.db.insert("agentRuns", { runId: `${status}-${i}-${Math.random()}`, status, spanCount: 1, totalCostUsd: 0.5, startedAt: new Date(Date.now() - 60_000).toISOString(), projectId });
    }
  });
}

test("a rule opens one alert when it goes over its limit and resolves it on recovery", async () => {
  const { t, projectId, owner } = await setup();
  const ruleId = await owner.mutation(api.alertRules.create, { projectId, ...rule });
  await addRuns(t, projectId as never, "failed", 3);

  const first = await t.mutation(internal.alertRules.evaluate, { ruleId });
  expect(first).toMatchObject({ fired: true, emailTo: ["me@example.com"] });
  expect(await t.mutation(internal.alertRules.evaluate, { ruleId })).toEqual({ fired: false });
  expect(await t.run((ctx) => ctx.db.query("alerts").collect())).toHaveLength(1);

  await t.run(async (ctx) => { for (const run of await ctx.db.query("agentRuns").collect()) await ctx.db.patch(run._id, { status: "completed" }); });
  await t.mutation(internal.alertRules.evaluate, { ruleId });
  const alerts = await t.run((ctx) => ctx.db.query("alerts").collect());
  expect(alerts[0].state).toBe("resolved");
  expect((await owner.query(api.alertRules.overview, { projectId }))?.rules[0].state).toBe("ok");
});

test("paused rules are skipped and people outside the project cannot see or change rules", async () => {
  const { t, projectId, owner, outsider } = await setup();
  const ruleId = await owner.mutation(api.alertRules.create, { projectId, ...rule });
  await addRuns(t, projectId as never, "failed", 5);
  await owner.mutation(api.alertRules.setEnabled, { ruleId, enabled: false });
  expect(await t.mutation(internal.alertRules.evaluate, { ruleId })).toEqual({ fired: false });
  expect(await outsider.query(api.alertRules.overview, { projectId })).toBeNull();
  await expect(outsider.mutation(api.alertRules.create, { projectId, ...rule })).rejects.toThrow();
  await expect(outsider.mutation(api.alertRules.remove, { ruleId })).rejects.toThrow();
});

test("rules need a valid email and a sensible limit", async () => {
  const { projectId, owner } = await setup();
  await expect(owner.mutation(api.alertRules.create, { projectId, ...rule, emailTo: ["nope"] })).rejects.toThrow(/email/i);
  await expect(owner.mutation(api.alertRules.create, { projectId, ...rule, threshold: -1 })).rejects.toThrow(/limit/i);
});

test("preview reports how often a rule would have fired", async () => {
  const { t, projectId, owner } = await setup();
  await addRuns(t, projectId as never, "failed", 4);
  const result = await owner.query(api.alertRules.preview, { projectId, metric: "failed_runs", threshold: 2, windowMinutes: 60 });
  expect(result?.fires).toBeGreaterThanOrEqual(1);
  expect(result?.series).toHaveLength(70);
});

test("Slack and webhook destinations are validated, hidden from the page and returned when a rule fires", async () => {
  const { t, projectId, owner } = await setup();
  const base = { projectId, ...rule, emailTo: [] as string[] };
  await expect(owner.mutation(api.alertRules.create, base)).rejects.toThrow(/at least one/i);
  await expect(owner.mutation(api.alertRules.create, { ...base, slackUrl: "https://evil.example.com/services/x" })).rejects.toThrow(/slack/i);
  await expect(owner.mutation(api.alertRules.create, { ...base, webhookUrl: "http://example.com/hook" })).rejects.toThrow(/https/i);
  await expect(owner.mutation(api.alertRules.create, { ...base, webhookUrl: "https://127.0.0.1/hook" })).rejects.toThrow(/public/i);
  await expect(owner.mutation(api.alertRules.create, { ...base, webhookUrl: "https://localhost/hook" })).rejects.toThrow(/public/i);

  const slackUrl = "https://hooks.slack.com/services/T000/B000/secret";
  const ruleId = await owner.mutation(api.alertRules.create, { ...base, slackUrl, webhookUrl: "https://hooks.example.com/tracify" });
  const listed = (await owner.query(api.alertRules.overview, { projectId }))?.rules[0];
  expect(JSON.stringify(listed)).not.toContain("secret");
  expect(listed).toMatchObject({ hasSlack: true, webhookHost: "hooks.example.com" });

  await addRuns(t, projectId as never, "failed", 3);
  expect(await t.mutation(internal.alertRules.evaluate, { ruleId })).toMatchObject({ fired: true, emailTo: [], slackUrl, webhookUrl: "https://hooks.example.com/tracify" });
});

test("tags are cleaned, capped and limited to the project", async () => {
  const { projectId, owner, outsider } = await setup();
  const ruleId = await owner.mutation(api.alertRules.create, { projectId, ...rule });
  const tags = await owner.mutation(api.alertRules.setTags, { ruleId, tags: [" Prod ", "prod", "on call", "", "x".repeat(40)] });
  expect(tags).toEqual(["prod", "on-call", "x".repeat(24)]);
  await expect(outsider.mutation(api.alertRules.setTags, { ruleId, tags: ["a"] })).rejects.toThrow();
  const overview = await owner.query(api.alertRules.overview, { projectId });
  expect(overview?.rules[0].tags).toEqual(tags);
});

test("coming back under the limit hands back the links to tell, and nothing for rules without any", async () => {
  const { t, projectId, owner } = await setup();
  const ruleId = await owner.mutation(api.alertRules.create, { projectId, ...rule, slackUrl: "https://hooks.slack.com/services/T/B/x" });
  await addRuns(t, projectId as never, "failed", 3);
  await t.mutation(internal.alertRules.evaluate, { ruleId });
  await t.run(async (ctx) => { for (const run of await ctx.db.query("agentRuns").collect()) await ctx.db.patch(run._id, { status: "completed" }); });
  const back = await t.mutation(internal.alertRules.evaluate, { ruleId });
  expect(back).toMatchObject({ fired: false, resolved: { slackUrl: "https://hooks.slack.com/services/T/B/x", name: "Failed runs per hour" } });
  expect(await t.mutation(internal.alertRules.evaluate, { ruleId })).toEqual({ fired: false });
});

test("delivery results show on the rule and old ones are trimmed", async () => {
  const { t, projectId, owner, outsider } = await setup();
  const ruleId = await owner.mutation(api.alertRules.create, { projectId, ...rule, slackUrl: "https://hooks.slack.com/services/T/B/x" });
  await t.mutation(internal.alertRules.recordDelivery, { projectId, ruleId, channel: "slack", kind: "fired", ok: false, status: 404, error: "gone" });
  await t.mutation(internal.alertRules.recordDelivery, { projectId, ruleId, channel: "slack", kind: "test", ok: true, status: 200 });
  const shown = (await owner.query(api.alertRules.overview, { projectId }))?.rules[0];
  expect(shown?.slackDelivery).toMatchObject({ ok: true, kind: "test" });
  expect(shown?.webhookDelivery).toBeUndefined();
  expect(JSON.stringify(shown)).not.toContain("hooks.slack.com");
  for (let i = 0; i < 30; i += 1) await t.mutation(internal.alertRules.recordDelivery, { projectId, ruleId, channel: "slack", kind: "fired", ok: true, status: 200 });
  expect(await t.run((ctx) => ctx.db.query("alertDeliveries").collect())).toHaveLength(20);
  await expect(outsider.action(api.alertRules.sendTest, { ruleId })).rejects.toThrow();
});

test("sending a test needs a Slack or webhook link, and only accepts real Slack addresses", async () => {
  const { projectId, owner } = await setup();
  const emailOnly = await owner.mutation(api.alertRules.create, { projectId, ...rule });
  await expect(owner.action(api.alertRules.sendTest, { ruleId: emailOnly })).rejects.toThrow(/no Slack or webhook/);
  await expect(owner.action(api.alertRules.testLink, { projectId, slackUrl: "https://evil.example/services/x" })).rejects.toThrow(/Slack/);
  await expect(owner.action(api.alertRules.testLink, { projectId })).rejects.toThrow(/Paste a link/);
});
