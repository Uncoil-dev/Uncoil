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
  };
}
test("get groups recent runs by trimmed model, sums totals and sorts by run count", async () => {
  const { t, owner, projectId } = await setup();
  const models: Array<[string | undefined, number]> = [
    ["gpt-4o", 0.5],
    [" claude-sonnet ", 1],
    ["claude-sonnet", 2],
    ["claude-sonnet  ", 3],
    ["   ", 9],
    [undefined, 9],
  ];
  await t.run(async (ctx) => {
    for (const [i, [primaryModel, totalCostUsd]] of models.entries()) {
      await ctx.db.insert("agentRuns", {
        runId: `run-${i}`,
        status: "completed",
        spanCount: 1,
        totalCostUsd,
        startedAt: "2026-01-01T00:00:00.000Z",
        projectId,
        primaryModel,
      });
    }
  });
  const result = await owner.query(api.modelDefinitions.get, { projectId });
  expect(result?.prices).toEqual([]);
  expect(result?.scannedRuns).toBe(6);
  expect(result?.seen).toEqual([
    { model: "claude-sonnet", runs: 3, costUsd: 6 },
    { model: "gpt-4o", runs: 1, costUsd: 0.5 },
  ]);
});
test("save trims patterns and notes and stores the cleaned list", async () => {
  const { t, owner, projectId } = await setup();
  const result = await owner.mutation(api.modelDefinitions.save, {
    projectId,
    prices: [
      { pattern: "  gpt-4o  ", inputPerM: 2.5, outputPerM: 10, note: "  list price  " },
      { pattern: "mini", inputPerM: 0.1, outputPerM: 0.4, note: "   " },
    ],
  });
  expect(result).toEqual({ saved: 2 });
  const project = await t.run((ctx) => ctx.db.get(projectId));
  expect(project?.modelPrices).toEqual([
    { pattern: "gpt-4o", inputPerM: 2.5, outputPerM: 10, note: "list price" },
    { pattern: "mini", inputPerM: 0.1, outputPerM: 0.4 },
  ]);
});
test("save rejects a list the price check flags and keeps the stored prices", async () => {
  const { t, owner, projectId } = await setup();
  await expect(
    owner.mutation(api.modelDefinitions.save, {
      projectId,
      prices: [
        { pattern: "gpt-4o", inputPerM: 1, outputPerM: 2 },
        { pattern: " GPT-4O ", inputPerM: 3, outputPerM: 4 },
      ],
    }),
  ).rejects.toThrow('"GPT-4O" is in the list twice.');
  const project = await t.run((ctx) => ctx.db.get(projectId));
  expect(project?.modelPrices).toBeUndefined();
});
