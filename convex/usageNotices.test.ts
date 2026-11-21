import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

async function addProject(t: ReturnType<typeof convexTest>, name: string, planTier: "free" | "pro", spans: number) {
  return t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", { name, ownerId: `owner-${name}`, planTier });
    await ctx.db.insert("agentRuns", { runId: `r-${name}`, status: "completed", spanCount: spans, totalCostUsd: 0, startedAt: new Date().toISOString(), createdAt: new Date().toISOString(), projectId });
    return projectId;
  });
}

test("only Free projects at 80% or more are due, and only once per month", async () => {
  const t = convexTest(schema, modules);
  const busy = await addProject(t, "busy", "free", 8_500);
  await addProject(t, "quiet", "free", 100);
  await addProject(t, "paid", "pro", 9_000);
  const first = await t.query(internal.usageNotices.pageToCheck, { cursor: null });
  expect(first.due.map((item) => item.name)).toEqual(["busy"]);
  expect(await t.mutation(internal.usageNotices.markWarned, { projectId: busy, month: first.month })).toBe(true);
  expect(await t.mutation(internal.usageNotices.markWarned, { projectId: busy, month: first.month })).toBe(false);
  const second = await t.query(internal.usageNotices.pageToCheck, { cursor: null });
  expect(second.due).toEqual([]);
});
