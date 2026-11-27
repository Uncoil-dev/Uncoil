import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("projects", {
      name: "Test",
      clerkOrgId: "org",
      clerkUserId: "owner",
    });
    await ctx.db.insert("agentRuns", {
      projectId: id,
      runId: "run-1",
      status: "completed",
      spanCount: 3,
      totalCostUsd: 0.5,
      startedAt: "2026-01-01T00:00:00.000Z",
      primaryModel: "model-a",
    });
    return id;
  });
  return {
    t,
    projectId,
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
  };
}

test("create reuses the active link and records a single audit entry", async () => {
  const { t, owner, projectId } = await setup();
  const first = await owner.mutation(api.sharedTraces.create, { projectId, runId: "run-1" });
  const second = await owner.mutation(api.sharedTraces.create, { projectId, runId: "run-1" });
  expect(second.token).toBe(first.token);
  expect(first.token.length).toBeGreaterThanOrEqual(20);

  const { links, logs } = await t.run(async (ctx) => ({
    links: await ctx.db.query("sharedTraces").collect(),
    logs: await ctx.db.query("auditLogs").collect(),
  }));
  expect(links).toHaveLength(1);
  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({ projectId, actorId: "owner", action: "created", resource: "shared_trace" });
});

test("create rejects an unknown run", async () => {
  const { owner, projectId } = await setup();
  await expect(
    owner.mutation(api.sharedTraces.create, { projectId, runId: "missing" }),
  ).rejects.toThrow("Run not found");
});

test("revoke ends public access and the next create issues a new token", async () => {
  const { t, owner, projectId } = await setup();
  const { token } = await owner.mutation(api.sharedTraces.create, { projectId, runId: "run-1" });
  expect(await t.query(api.sharedTraces.resolve, { token })).toMatchObject({
    runId: "run-1",
    status: "completed",
    spanCount: 3,
  });

  await owner.mutation(api.sharedTraces.revoke, { projectId, runId: "run-1" });
  expect(await t.query(api.sharedTraces.resolve, { token })).toBeNull();
  expect(await owner.query(api.sharedTraces.getForRun, { projectId, runId: "run-1" })).toBeNull();

  const next = await owner.mutation(api.sharedTraces.create, { projectId, runId: "run-1" });
  expect(next.token).not.toBe(token);
  expect(await t.query(api.sharedTraces.resolve, { token: next.token })).not.toBeNull();
});
