import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) =>
    ctx.db.insert("projects", {
      name: "Test",
      clerkOrgId: "org",
      clerkUserId: "owner",
    }),
  );
  return {
    t,
    projectId,
    member: t.withIdentity({
      subject: "member",
      orgId: "org",
      email: "member@example.com",
    }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}

async function seed(
  t: Awaited<ReturnType<typeof setup>>["t"],
  projectId: Id<"projects">,
  count: number,
) {
  await t.run(async (ctx) => {
    for (let i = 1; i <= count; i++) {
      await ctx.db.insert("auditLogs", {
        projectId,
        actorId: "owner",
        action: "test.seed",
        resource: `item-${i}`,
        summary: `Entry ${i}`,
        createdAt: i,
      });
    }
  });
}

test("record stores actor, action, resource and summary for a member", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(1_700_000_000_000);
  const { member, projectId } = await setup();
  await member.mutation(api.auditLogs.record, {
    projectId,
    action: "apiKey.create",
    resource: "key-1",
    summary: "Created an API key",
    metadata: { source: "dashboard" },
  });
  const [entry] = await member.query(api.auditLogs.listByProject, {
    projectId,
  });
  expect(entry).toMatchObject({
    projectId,
    actorId: "member",
    actorEmail: "member@example.com",
    action: "apiKey.create",
    resource: "key-1",
    summary: "Created an API key",
    metadata: { source: "dashboard" },
    createdAt: 1_700_000_000_000,
  });
});

test("listByProject returns entries newest first", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const { member, projectId } = await setup();
  for (const [i, summary] of ["first", "second", "third"].entries()) {
    vi.setSystemTime(1_700_000_000_000 + i * 1000);
    await member.mutation(api.auditLogs.record, {
      projectId,
      action: "test.action",
      resource: "res",
      summary,
    });
  }
  const rows = await member.query(api.auditLogs.listByProject, { projectId });
  expect(rows.map((r) => r.summary)).toEqual(["third", "second", "first"]);
});

test("limit is clamped between 1 and 250", async () => {
  const { t, member, projectId } = await setup();
  await seed(t, projectId, 260);
  const list = (limit?: number) =>
    member.query(api.auditLogs.listByProject, { projectId, limit });
  expect(await list(0)).toHaveLength(1);
  expect(await list(-5)).toHaveLength(1);
  expect(await list(10)).toHaveLength(10);
  expect(await list(1000)).toHaveLength(250);
  expect(await list()).toHaveLength(100);
  const [newest] = await list(0);
  expect(newest.summary).toBe("Entry 260");
});

test("people outside the project get an empty list and cannot record", async () => {
  const { t, member, outsider, projectId } = await setup();
  await member.mutation(api.auditLogs.record, {
    projectId,
    action: "test.action",
    resource: "res",
    summary: "visible to members only",
  });
  expect(
    await outsider.query(api.auditLogs.listByProject, { projectId }),
  ).toEqual([]);
  expect(await t.query(api.auditLogs.listByProject, { projectId })).toEqual([]);
  await expect(
    outsider.mutation(api.auditLogs.record, {
      projectId,
      action: "test.action",
      resource: "res",
      summary: "nope",
    }),
  ).rejects.toThrow("access denied");
});
