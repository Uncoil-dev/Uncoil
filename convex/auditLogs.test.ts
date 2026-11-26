import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
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
  return {
    t,
    projectId,
    member: t.withIdentity({ subject: "member", orgId: "org", email: "m@example.com" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}

async function seed(t: Awaited<ReturnType<typeof setup>>["t"], projectId: Awaited<ReturnType<typeof setup>>["projectId"], count: number) {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      await ctx.db.insert("auditLogs", {
        projectId,
        actorId: "member",
        action: `a${i}`,
        resource: "key",
        summary: `entry ${i}`,
        createdAt: 1_000 + i,
      });
    }
  });
}

test("record stores actor, action, resource and summary for a member", async () => {
  const { member, projectId } = await setup();
  await member.mutation(api.auditLogs.record, {
    projectId,
    action: "key.create",
    resource: "api-key",
    summary: "Created key",
  });
  const [row] = await member.query(api.auditLogs.listByProject, { projectId });
  expect(row).toMatchObject({
    actorId: "member",
    actorEmail: "m@example.com",
    action: "key.create",
    resource: "api-key",
    summary: "Created key",
  });
});

test("record rejects people outside the project", async () => {
  const { outsider, projectId } = await setup();
  await expect(
    outsider.mutation(api.auditLogs.record, { projectId, action: "x", resource: "y", summary: "z" }),
  ).rejects.toThrow("access denied");
});

test("listByProject returns newest entries first", async () => {
  const { t, member, projectId } = await setup();
  await seed(t, projectId, 3);
  const rows = await member.query(api.auditLogs.listByProject, { projectId });
  expect(rows.map((r) => r.action)).toEqual(["a2", "a1", "a0"]);
});

test("limit is clamped between 1 and 250", async () => {
  const { t, member, projectId } = await setup();
  await seed(t, projectId, 260);
  expect(await member.query(api.auditLogs.listByProject, { projectId, limit: 0 })).toHaveLength(1);
  expect(await member.query(api.auditLogs.listByProject, { projectId, limit: 1000 })).toHaveLength(250);
  expect(await member.query(api.auditLogs.listByProject, { projectId })).toHaveLength(100);
});

test("listByProject returns an empty list for people outside the project", async () => {
  const { t, outsider, projectId } = await setup();
  await seed(t, projectId, 2);
  expect(await outsider.query(api.auditLogs.listByProject, { projectId })).toEqual([]);
});
