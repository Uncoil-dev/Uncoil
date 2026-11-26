import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) =>
    ctx.db.insert("projects", {
      name: "Test",
      clerkOrgId: "org",
      clerkUserId: "owner",
    }),
  );
  const addAlert = (runId: string, readAt?: number) =>
    t.run((ctx) =>
      ctx.db.insert("alerts", {
        projectId,
        runId,
        type: "error",
        message: `Alert for ${runId}`,
        triggeredAt: "2026-01-01T00:00:00.000Z",
        state: "active",
        ...(readAt === undefined ? {} : { readAt }),
      }),
    );
  const readAtOf = (id: Id<"alerts">) =>
    t.run(async (ctx) => (await ctx.db.get(id))?.readAt ?? null);
  return {
    t,
    projectId,
    addAlert,
    readAtOf,
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}

test("markAllRead stamps unread alerts only and reports how many changed", async () => {
  const { owner, projectId, addAlert, readAtOf } = await setup();
  const unreadA = await addAlert("run-a");
  const unreadB = await addAlert("run-b");
  const alreadyRead = await addAlert("run-c", 123);

  expect(await owner.mutation(api.alerts.markAllRead, { projectId })).toEqual({
    updated: 2,
  });
  expect(await readAtOf(unreadA)).toEqual(expect.any(Number));
  expect(await readAtOf(unreadB)).toEqual(expect.any(Number));
  expect(await readAtOf(alreadyRead)).toBe(123);

  expect(await owner.mutation(api.alerts.markAllRead, { projectId })).toEqual({
    updated: 0,
  });
});

test("markRead updates once, then reports no change", async () => {
  const { owner, addAlert, readAtOf } = await setup();
  const alertId = await addAlert("run-a");

  expect(await owner.mutation(api.alerts.markRead, { alertId })).toEqual({
    updated: true,
  });
  const firstReadAt = await readAtOf(alertId);
  expect(firstReadAt).toEqual(expect.any(Number));

  expect(await owner.mutation(api.alerts.markRead, { alertId })).toEqual({
    updated: false,
  });
  expect(await readAtOf(alertId)).toBe(firstReadAt);
});

test("signed-out and outside callers cannot mark alerts read", async () => {
  const { t, outsider, projectId, addAlert, readAtOf } = await setup();
  const alertId = await addAlert("run-a");

  for (const caller of [t, outsider]) {
    expect(await caller.mutation(api.alerts.markAllRead, { projectId })).toEqual({
      updated: 0,
    });
    expect(await caller.mutation(api.alerts.markRead, { alertId })).toEqual({
      updated: false,
    });
  }
  expect(await readAtOf(alertId)).toBeNull();
});

test("listByProject returns alerts to the owner and nothing to others", async () => {
  const { t, owner, outsider, projectId, addAlert } = await setup();
  await addAlert("run-a");
  await addAlert("run-b");

  const rows = await owner.query(api.alerts.listByProject, { projectId });
  expect(rows.map((alert) => alert.runId).sort()).toEqual(["run-a", "run-b"]);

  expect(await outsider.query(api.alerts.listByProject, { projectId })).toEqual([]);
  expect(await t.query(api.alerts.listByProject, { projectId })).toEqual([]);
});
