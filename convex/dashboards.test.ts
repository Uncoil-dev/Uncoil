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
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}
const DENIED = "Project not found or access denied";

test("a created dashboard is listed for its project only", async () => {
  const { t, owner, projectId } = await setup();
  const otherProject = await t.run((ctx) =>
    ctx.db.insert("projects", { name: "Other", clerkUserId: "owner" }),
  );
  const id = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "  Latency  ",
  });
  const [row] = await owner.query(api.dashboards.list, { projectId });
  expect(row).toMatchObject({
    _id: id,
    name: "Latency",
    isDefault: false,
    createdBy: "owner",
    widgets: [],
  });
  expect(
    await owner.query(api.dashboards.list, { projectId: otherProject }),
  ).toEqual([]);
  await expect(
    owner.mutation(api.dashboards.create, { projectId, name: "Latency" }),
  ).rejects.toThrow("A dashboard with this name already exists");
  await expect(
    owner.mutation(api.dashboards.create, { projectId, name: "   " }),
  ).rejects.toThrow("Dashboard name is required");
});

test("widgets are added in order and reorderWidgets stores the new order", async () => {
  const { owner, projectId } = await setup();
  const dashboardId = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "Board",
  });
  const ids = [];
  for (const widgetType of ["cost", "errors", "latency"]) {
    ids.push(
      await owner.mutation(api.dashboards.addWidget, {
        projectId,
        dashboardId,
        widgetType,
      }),
    );
  }
  await expect(
    owner.mutation(api.dashboards.addWidget, {
      projectId,
      dashboardId,
      widgetType: "cost",
    }),
  ).rejects.toThrow("Widget is already on this dashboard");
  const order = async () =>
    (await owner.query(api.dashboards.list, { projectId }))[0].widgets
      .sort((a, b) => a.position - b.position)
      .map((w) => w.widgetType);
  expect(await order()).toEqual(["cost", "errors", "latency"]);
  const result = await owner.mutation(api.dashboards.reorderWidgets, {
    projectId,
    dashboardId,
    widgetIds: [ids[2], ids[0], ids[1]],
  });
  expect(result).toEqual({ updated: 3 });
  expect(await order()).toEqual(["latency", "cost", "errors"]);
});

test("rename trims, rejects blank and duplicate names, and protects the default", async () => {
  const { owner, projectId } = await setup();
  const id = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "Old",
  });
  await owner.mutation(api.dashboards.create, { projectId, name: "Taken" });
  const home = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "Home",
    isDefault: true,
  });
  await owner.mutation(api.dashboards.rename, {
    projectId,
    dashboardId: id,
    name: " New ",
  });
  const rows = await owner.query(api.dashboards.list, { projectId });
  expect(rows.find((r) => r._id === id)?.name).toBe("New");
  for (const name of ["", "   "]) {
    await expect(
      owner.mutation(api.dashboards.rename, {
        projectId,
        dashboardId: id,
        name,
      }),
    ).rejects.toThrow("Dashboard name is required");
  }
  await expect(
    owner.mutation(api.dashboards.rename, {
      projectId,
      dashboardId: id,
      name: "Taken",
    }),
  ).rejects.toThrow("A dashboard with this name already exists");
  await expect(
    owner.mutation(api.dashboards.rename, {
      projectId,
      dashboardId: home,
      name: "Renamed",
    }),
  ).rejects.toThrow("The default dashboard cannot be renamed");
});

test("outsiders and anonymous callers cannot read or change dashboards", async () => {
  const { t, owner, outsider, projectId } = await setup();
  const dashboardId = await owner.mutation(api.dashboards.create, {
    projectId,
    name: "Private",
  });
  const widgetId = await owner.mutation(api.dashboards.addWidget, {
    projectId,
    dashboardId,
    widgetType: "cost",
  });
  expect(await outsider.query(api.dashboards.list, { projectId })).toEqual([]);
  expect(await t.query(api.dashboards.list, { projectId })).toEqual([]);
  const writes = [
    (u: typeof outsider) =>
      u.mutation(api.dashboards.create, { projectId, name: "X" }),
    (u: typeof outsider) =>
      u.mutation(api.dashboards.addWidget, {
        projectId,
        dashboardId,
        widgetType: "errors",
      }),
    (u: typeof outsider) =>
      u.mutation(api.dashboards.rename, {
        projectId,
        dashboardId,
        name: "Hacked",
      }),
    (u: typeof outsider) =>
      u.mutation(api.dashboards.reorderWidgets, {
        projectId,
        dashboardId,
        widgetIds: [widgetId],
      }),
  ];
  for (const write of writes) {
    await expect(write(outsider)).rejects.toThrow(DENIED);
    await expect(write(t)).rejects.toThrow("Unauthorized");
  }
  const [row] = await owner.query(api.dashboards.list, { projectId });
  expect(row.name).toBe("Private");
  expect(row.widgets).toHaveLength(1);
});
