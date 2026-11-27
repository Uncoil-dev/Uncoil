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
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
    member: t.withIdentity({ subject: "member", orgId: "org" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}
const state = {
  name: "Production errors",
  target: "traces" as const,
  shared: false,
  query: { range: "7d", status: "error", trace: "temporary", q: "why" },
  columns: ["name", "cost", "meta:mission", "unknown"],
};
test("views are private until shared, members can reopen but only owners mutate", async () => {
  const { owner, member, projectId } = await setup();
  const id = await owner.mutation(api.savedViews.save, { projectId, ...state });
  expect(await member.query(api.savedViews.list, { projectId })).toEqual([]);
  await owner.mutation(api.savedViews.save, {
    projectId,
    id,
    ...state,
    shared: true,
  });
  const [row] = await member.query(api.savedViews.list, { projectId });
  expect(row.editable).toBe(false);
  expect(row.query).not.toHaveProperty("trace");
  expect(row.columns).not.toContain("unknown");
  await expect(
    member.mutation(api.savedViews.save, { projectId, id, ...state }),
  ).rejects.toThrow("Only the owner");
  await expect(
    member.mutation(api.savedViews.remove, { projectId, id }),
  ).rejects.toThrow("Only the owner");
  await owner.mutation(api.savedViews.remove, { projectId, id });
  expect(await owner.query(api.savedViews.list, { projectId })).toEqual([]);
});
test("project access is enforced for every operation", async () => {
  const { t, owner, outsider, projectId } = await setup();
  const id = await owner.mutation(api.savedViews.save, {
    projectId,
    ...state,
    shared: true,
  });
  for (const user of [t, outsider]) {
    // Reads return nothing instead of throwing, so a page that mounts this query never crashes.
    expect(await user.query(api.savedViews.list, { projectId })).toEqual([]);
    expect(await user.query(api.savedViews.get, { projectId, id })).toBeNull();
    await expect(
      user.mutation(api.savedViews.save, { projectId, ...state }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.savedViews.remove, { projectId, id }),
    ).rejects.toThrow();
  }
});
test("rename, relative and absolute ranges survive; blank names fail", async () => {
  const { owner, projectId } = await setup();
  await expect(
    owner.mutation(api.savedViews.save, { projectId, ...state, name: " " }),
  ).rejects.toThrow("view name");
  const id = await owner.mutation(api.savedViews.save, { projectId, ...state });
  await owner.mutation(api.savedViews.save, {
    projectId,
    id,
    ...state,
    name: "Fixed dates",
    query: { from: "1000", to: "2000", sort: "meta:mission", dir: "asc" },
  });
  const [row] = await owner.query(api.savedViews.list, { projectId });
  expect(row.name).toBe("Fixed dates");
  expect(row.query).toEqual({
    from: "1000",
    to: "2000",
    sort: "meta:mission",
    dir: "asc",
  });
  expect(row.editable).toBe(true);
});
test("shared IDs cannot cross projects or reveal private views",async()=>{const {t,owner,member,projectId}=await setup();const other=await t.run(ctx=>ctx.db.insert("projects",{name:"Other",clerkUserId:"member"}));const id=await owner.mutation(api.savedViews.save,{projectId,...state});expect(await member.query(api.savedViews.get,{projectId,id})).toBeNull();expect(await member.query(api.savedViews.get,{projectId:other,id})).toBeNull();await expect(member.mutation(api.savedViews.save,{projectId:other,id,...state})).rejects.toThrow("Only the owner");});
