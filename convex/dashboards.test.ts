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
    projectId,
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}
test("a created dashboard appears in list for its project only for authorized users", async () => {
  const { owner, outsider, projectId } = await setup();
  const id = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "  Latency  ",
  });
  const rows = await owner.query(api.dashboards.list, { projectId });
  expect(rows.map((row) => [row._id, row.name, row.widgets])).toEqual([
    [id, "Latency", []],
  ]);
  expect(await outsider.query(api.dashboards.list, { projectId })).toEqual([]);
});
test("addWidget appends widgets and reorderWidgets stores the new order", async () => {
  const { owner, projectId } = await setup();
  const dashboardId = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "Costs",
  });
  const a = await owner.mutation(api.dashboards.addWidget, {
    projectId,
    dashboardId,
    widgetType: "cost",
  });
  const b = await owner.mutation(api.dashboards.addWidget, {
    projectId,
    dashboardId,
    widgetType: "errors",
  });
  await expect(
    owner.mutation(api.dashboards.addWidget, {
      projectId,
      dashboardId,
      widgetType: "cost",
    }),
  ).rejects.toThrow("already on this dashboard");
  await owner.mutation(api.dashboards.reorderWidgets, {
    projectId,
    dashboardId,
    widgetIds: [b, a],
  });
  const [row] = await owner.query(api.dashboards.list, { projectId });
  const byPosition = [...row.widgets].sort((x, y) => x.position - y.position);
  expect(byPosition.map((w) => [w._id, w.position])).toEqual([
    [b, 0],
    [a, 1],
  ]);
});
test("rename trims the name and rejects empty or whitespace names", async () => {
  const { owner, projectId } = await setup();
  const dashboardId = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "Old",
  });
  await owner.mutation(api.dashboards.rename, {
    projectId,
    dashboardId,
    name: "  New name ",
  });
  const nameOf = async () =>
    (await owner.query(api.dashboards.list, { projectId }))[0].name;
  expect(await nameOf()).toBe("New name");
  for (const name of ["", "   "]) {
    await expect(
      owner.mutation(api.dashboards.rename, { projectId, dashboardId, name }),
    ).rejects.toThrow("Dashboard name is required");
  }
  expect(await nameOf()).toBe("New name");
});
