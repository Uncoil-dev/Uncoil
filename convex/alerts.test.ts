import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
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

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a new failed-run alert posts to the project's Discord channel exactly once", async () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  const { t, projectId } = await setup();
  const url = "https://discord.com/api/webhooks/1/secret";
  await t.run((ctx) => ctx.db.patch(projectId, { discordWebhookUrl: url }));

  const args = { projectId, runId: "run-1", type: "run_failed", message: "boom", triggeredAt: "2026-01-01T00:00:00.000Z", failingStep: "search_tool" };
  await t.mutation(api.alerts.create, args);
  await t.mutation(api.alerts.create, args); // a second error span in the same run
  await t.finishAllScheduledFunctions(() => {});

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [target, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(target).toBe(url);
  expect(init.redirect).toBe("manual");
  const body = JSON.parse(String(init.body));
  expect(body.allowed_mentions).toEqual({ parse: [] });
  expect(body.embeds[0].fields).toContainEqual({ name: "Failing step", value: "search_tool", inline: true });
});

test("no Discord post is made when the project has no Discord link", async () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  const { t, projectId } = await setup();
  await t.mutation(api.alerts.create, { projectId, runId: "run-2", type: "run_failed", message: "boom", triggeredAt: "2026-01-01T00:00:00.000Z" });
  await t.finishAllScheduledFunctions(() => {});
  expect(fetchMock).not.toHaveBeenCalled();
});
