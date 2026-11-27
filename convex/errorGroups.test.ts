import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) =>
    ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" }),
  );
  return {
    t,
    projectId,
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
    member: t.withIdentity({ subject: "member", orgId: "org" }),
    viewer: t.withIdentity({ subject: "viewer", orgId: "org", orgRole: "org:viewer" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}

test("members resolve a group and the resolve time is listed per signature", async () => {
  const { owner, member, projectId } = await setup();
  await owner.mutation(api.errorGroups.resolve, { projectId, signature: "abc" });
  await member.mutation(api.errorGroups.resolve, { projectId, signature: "def" });
  const resolved = await member.query(api.errorGroups.listResolved, { projectId });
  expect(Object.keys(resolved).sort()).toEqual(["abc", "def"]);
  expect(resolved.abc).toBeGreaterThan(0);
});

test("resolving again moves the resolve time forward without a second row", async () => {
  const { t, owner, projectId } = await setup();
  await owner.mutation(api.errorGroups.resolve, { projectId, signature: "abc" });
  await t.run(async (ctx) => {
    const row = await ctx.db.query("resolvedErrorGroups").first();
    await ctx.db.patch(row!._id, { resolvedAt: 1 });
  });
  await owner.mutation(api.errorGroups.resolve, { projectId, signature: "abc" });
  const resolved = await owner.query(api.errorGroups.listResolved, { projectId });
  expect(resolved.abc).toBeGreaterThan(1);
  expect(await t.run((ctx) => ctx.db.query("resolvedErrorGroups").collect())).toHaveLength(1);
});

test("viewers and outsiders cannot resolve; outsiders read nothing", async () => {
  const { viewer, outsider, owner, projectId } = await setup();
  await expect(viewer.mutation(api.errorGroups.resolve, { projectId, signature: "abc" })).rejects.toThrow("Developer access required");
  await expect(outsider.mutation(api.errorGroups.resolve, { projectId, signature: "abc" })).rejects.toThrow("Project not found or access denied");
  await owner.mutation(api.errorGroups.resolve, { projectId, signature: "abc" });
  expect(await outsider.query(api.errorGroups.listResolved, { projectId })).toEqual({});
  expect(Object.keys(await viewer.query(api.errorGroups.listResolved, { projectId }))).toEqual(["abc"]);
});
