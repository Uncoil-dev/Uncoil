import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  const { projectId, datasetId, itemIds } = await t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" });
    const now = Date.now();
    const datasetId = await ctx.db.insert("datasets", { projectId, name: "Golden", createdBy: "owner", createdAt: now, updatedAt: now });
    const itemIds = [];
    for (const input of ["a", "b"]) itemIds.push(await ctx.db.insert("datasetItems", { projectId, datasetId, input, createdAt: now }));
    return { projectId, datasetId, itemIds };
  });
  return {
    projectId,
    datasetId,
    itemIds,
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}
test("create links a draft experiment to its dataset and get returns the dataset items", async () => {
  const { owner, projectId, datasetId, itemIds } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "  Baseline  " });
  const found = await owner.query(api.experiments.get, { projectId, experimentId });
  expect(found?.experiment).toMatchObject({ name: "Baseline", datasetId, status: "draft", createdBy: "owner" });
  expect(found?.items.map((item) => item._id)).toEqual(itemIds);
});
test("setStatus moves an experiment to running and then completed", async () => {
  const { owner, projectId, datasetId } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "Run" });
  await owner.mutation(api.experiments.setStatus, { projectId, experimentId, status: "running" });
  const running = await owner.query(api.experiments.get, { projectId, experimentId });
  expect(running?.experiment.status).toBe("running");
  expect(running?.experiment.completedAt).toBeUndefined();
  await owner.mutation(api.experiments.setStatus, { projectId, experimentId, status: "completed" });
  const done = await owner.query(api.experiments.get, { projectId, experimentId });
  expect(done?.experiment.status).toBe("completed");
  expect(done?.experiment.completedAt).toBeTypeOf("number");
});
test("recordResult stores output, latency and error per item", async () => {
  const { owner, projectId, datasetId, itemIds } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "Run" });
  await owner.mutation(api.experiments.recordResult, { projectId, experimentId, datasetItemId: itemIds[0], output: "ok", latencyMs: 120 });
  await owner.mutation(api.experiments.recordResult, { projectId, experimentId, datasetItemId: itemIds[1], output: "", error: "timeout" });
  const [summary] = await owner.query(api.experiments.list, { projectId });
  const byItem = new Map(summary.results.map((result) => [result.datasetItemId, result]));
  expect(byItem.get(itemIds[0])).toMatchObject({ output: "ok", latencyMs: 120 });
  expect(byItem.get(itemIds[0])?.error).toBeUndefined();
  expect(byItem.get(itemIds[1])).toMatchObject({ output: "", error: "timeout" });
});
test("a caller from another project cannot read or change the experiment", async () => {
  const { owner, outsider, projectId, datasetId, itemIds } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "Private" });
  expect(await outsider.query(api.experiments.get, { projectId, experimentId })).toBeNull();
  expect(await outsider.query(api.experiments.list, { projectId })).toEqual([]);
  await expect(outsider.mutation(api.experiments.setStatus, { projectId, experimentId, status: "running" })).rejects.toThrow("access denied");
  await expect(
    outsider.mutation(api.experiments.recordResult, { projectId, experimentId, datasetItemId: itemIds[0], output: "x" }),
  ).rejects.toThrow("access denied");
});
