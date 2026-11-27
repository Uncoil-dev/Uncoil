import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const seeded = await t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" });
    const otherProjectId = await ctx.db.insert("projects", { name: "Other", clerkOrgId: "other", clerkUserId: "outsider" });
    const datasetId = await ctx.db.insert("datasets", { projectId, name: "Support", createdBy: "owner", createdAt: now, updatedAt: now });
    const itemIds = [];
    for (const input of ["first question", "second question"]) {
      itemIds.push(await ctx.db.insert("datasetItems", { projectId, datasetId, input, expectedOutput: `answer to ${input}`, createdAt: now }));
    }
    return { projectId, otherProjectId, datasetId, itemIds };
  });
  return { t, ...seeded, owner: t.withIdentity({ subject: "owner", orgId: "org" }), outsider: t.withIdentity({ subject: "outsider", orgId: "other" }) };
}

test("create links an experiment to a dataset and get returns it with the dataset items", async () => {
  const { owner, projectId, datasetId, itemIds } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "  Baseline  ", model: " model-a " });
  const found = await owner.query(api.experiments.get, { projectId, experimentId });
  expect(found?.experiment).toMatchObject({ datasetId, projectId, name: "Baseline", model: "model-a", status: "draft", createdBy: "owner" });
  expect(found?.items.map((item) => item._id)).toEqual(itemIds);
  expect(found?.promptVersion).toBeNull();
  await expect(owner.mutation(api.experiments.create, { projectId, datasetId, name: "   " })).rejects.toThrow("name is required");
});

test("setStatus moves an experiment to running and completed", async () => {
  const { owner, projectId, datasetId } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "Run" });
  await owner.mutation(api.experiments.setStatus, { projectId, experimentId, status: "running" });
  const running = await owner.query(api.experiments.get, { projectId, experimentId });
  expect(running?.experiment.status).toBe("running");
  expect(running?.experiment.completedAt).toBeUndefined();
  await owner.mutation(api.experiments.setStatus, { projectId, experimentId, status: "completed" });
  const done = await owner.query(api.experiments.get, { projectId, experimentId });
  expect(done?.experiment.status).toBe("completed");
  expect(typeof done?.experiment.completedAt).toBe("number");
});

test("recordResult stores output, latency and error per dataset item", async () => {
  const { owner, projectId, datasetId, itemIds } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "Results" });
  await owner.mutation(api.experiments.recordResult, { projectId, experimentId, datasetItemId: itemIds[0], output: "hello", latencyMs: 120 });
  await owner.mutation(api.experiments.recordResult, { projectId, experimentId, datasetItemId: itemIds[1], output: "", latencyMs: 80, error: "timeout" });
  const [summary] = await owner.query(api.experiments.list, { projectId });
  const byItem = new Map(summary.results.map((result) => [result.datasetItemId, result]));
  expect(summary.resultCount).toBe(2);
  expect(byItem.get(itemIds[0])).toMatchObject({ output: "hello", latencyMs: 120 });
  expect(byItem.get(itemIds[0])?.error).toBeUndefined();
  expect(byItem.get(itemIds[1])).toMatchObject({ output: "", latencyMs: 80, error: "timeout" });
  expect(summary.avgLatencyMs).toBe(100);
});

test("recordResult rejects items from a different dataset", async () => {
  const { t, owner, projectId, datasetId } = await setup();
  const strayItemId = await t.run(async (ctx) => {
    const now = Date.now();
    const otherDatasetId = await ctx.db.insert("datasets", { projectId, name: "Other", createdBy: "owner", createdAt: now, updatedAt: now });
    return ctx.db.insert("datasetItems", { projectId, datasetId: otherDatasetId, input: "stray", createdAt: now });
  });
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "Scoped" });
  await expect(owner.mutation(api.experiments.recordResult, { projectId, experimentId, datasetItemId: strayItemId, output: "x" })).rejects.toThrow("not found");
});

test("another project's caller cannot read or change the experiment", async () => {
  const { owner, outsider, projectId, otherProjectId, datasetId, itemIds } = await setup();
  const experimentId = await owner.mutation(api.experiments.create, { projectId, datasetId, name: "Private" });
  expect(await outsider.query(api.experiments.get, { projectId, experimentId })).toBeNull();
  expect(await outsider.query(api.experiments.get, { projectId: otherProjectId, experimentId })).toBeNull();
  expect(await outsider.query(api.experiments.list, { projectId })).toEqual([]);
  await expect(outsider.mutation(api.experiments.setStatus, { projectId, experimentId, status: "running" })).rejects.toThrow("access denied");
  await expect(outsider.mutation(api.experiments.recordResult, { projectId, experimentId, datasetItemId: itemIds[0], output: "x" })).rejects.toThrow("access denied");
  await expect(outsider.mutation(api.experiments.create, { projectId, datasetId, name: "Nope" })).rejects.toThrow("access denied");
  expect((await owner.query(api.experiments.get, { projectId, experimentId }))?.experiment.status).toBe("draft");
});
