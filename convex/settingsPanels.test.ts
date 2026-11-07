import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) => ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" }));
  return { t, projectId, owner: t.withIdentity({ subject: "owner", orgId: "org" }), outsider: t.withIdentity({ subject: "outsider", orgId: "other" }) };
}
const run = (t: ReturnType<typeof convexTest>, projectId: never, runId: string, over: Record<string, unknown> = {}) =>
  t.run((ctx) => ctx.db.insert("agentRuns", { runId, status: "running", spanCount: 1, totalCostUsd: 0.01, startedAt: "2026-11-01T00:00:00.000Z", projectId, ...over } as never));

test("a defined score type rejects values outside its range", async () => {
  const { owner, projectId } = await setup();
  await owner.mutation(api.scoreConfigs.create, { projectId, name: "groundedness", dataType: "numeric", min: 0, max: 1, passThreshold: 0.8 });
  await expect(owner.mutation(api.evaluation.createScore, { projectId, traceId: "r1", name: "groundedness", value: 4, dataType: "numeric", source: "human" })).rejects.toThrow(/above/);
  await owner.mutation(api.evaluation.createScore, { projectId, traceId: "r1", name: "groundedness", value: 0.9, dataType: "numeric", source: "human" });
  const list = await owner.query(api.scoreConfigs.list, { projectId });
  expect(list?.configs[0].stats).toMatchObject({ count: 1, passCount: 1 });
});

test("outsiders see nothing and can not change settings", async () => {
  const { outsider, projectId } = await setup();
  expect(await outsider.query(api.scoreConfigs.list, { projectId })).toBeNull();
  expect(await outsider.query(api.modelDefinitions.get, { projectId })).toBeNull();
  await expect(outsider.mutation(api.modelDefinitions.save, { projectId, prices: [] })).rejects.toThrow();
});

test("saved model prices reach the ingest lookup", async () => {
  const { owner, projectId, t } = await setup();
  await owner.mutation(api.modelDefinitions.save, { projectId, prices: [{ pattern: "gpt-4o", inputPerM: 2.5, outputPerM: 10 }] });
  const project = await t.run((ctx) => ctx.db.get(projectId));
  expect(project?.modelPrices).toHaveLength(1);
  await expect(owner.mutation(api.modelDefinitions.save, { projectId, prices: [{ pattern: "", inputPerM: 1, outputPerM: 1 }] })).rejects.toThrow(/model name/);
});

test("connection list never returns the encrypted key", async () => {
  const { owner, projectId } = await setup();
  await expect(owner.mutation(api.llmConnections.create, { projectId, label: "x", provider: "openai", baseUrl: "https://api.openai.com/v1", ciphertext: "plain-key", keyLast4: "1234" })).rejects.toThrow(/encrypted/);
  await owner.mutation(api.llmConnections.create, { projectId, label: "Mine", provider: "openai", baseUrl: "https://api.openai.com/v1", ciphertext: "v1.aa.bb", keyLast4: "1234" });
  const rows = await owner.query(api.llmConnections.list, { projectId });
  expect(rows).toHaveLength(1);
  expect(JSON.stringify(rows)).not.toContain("v1.aa.bb");
  expect(rows?.[0].isDefault).toBe(true);
});

test("bulk close only touches old running runs and writes an audit entry", async () => {
  const { owner, projectId, t } = await setup();
  const stuck = await run(t, projectId as never, "stuck", { lastSpanAt: "2026-11-01T00:00:00.000Z" });
  await run(t, projectId as never, "fresh", { startedAt: new Date().toISOString(), lastSpanAt: new Date().toISOString() });
  const filter = { status: "running" as const, olderThanHours: 2 };
  expect((await owner.query(api.batchActions.preview, { projectId, action: "cancel_stuck", filter }))?.matched).toBe(1);
  expect(await owner.mutation(api.batchActions.run, { projectId, action: "cancel_stuck", filter })).toMatchObject({ affected: 1 });
  expect((await t.run((ctx) => ctx.db.get(stuck)))?.status).toBe("cancelled");
  const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(logs.some((log) => log.action === "batch.cancel_stuck")).toBe(true);
  await expect(owner.mutation(api.batchActions.run, { projectId, action: "cancel_stuck", filter: { status: "running" } })).rejects.toThrow(/at least 1 hour/);
});

test("queue for review skips runs that are already queued", async () => {
  const { owner, projectId, t } = await setup();
  await run(t, projectId as never, "a", { status: "failed" });
  await run(t, projectId as never, "b", { status: "failed" });
  const filter = { status: "failed" as const };
  expect(await owner.mutation(api.batchActions.run, { projectId, action: "queue_review", filter })).toMatchObject({ affected: 2, skipped: 0 });
  expect(await owner.mutation(api.batchActions.run, { projectId, action: "queue_review", filter })).toMatchObject({ affected: 0, skipped: 2 });
});
