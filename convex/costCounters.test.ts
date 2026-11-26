import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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
  return { t, projectId };
}

type Harness = Awaited<ReturnType<typeof setup>>["t"];

function readCounters(t: Harness, projectId: Id<"projects">) {
  return t.run((ctx) =>
    ctx.db
      .query("costCounters")
      .withIndex("by_projectId_and_period", (q) => q.eq("projectId", projectId))
      .collect(),
  );
}

test("first increment creates the counter and returns the new total", async () => {
  const { t, projectId } = await setup();
  const period = "day:2025-01-15";

  const result = await t.mutation(api.costCounters.checkAndIncrementCost, {
    projectId,
    period,
    incrementUsd: 0.25,
    maxCost: 1,
  });

  expect(result).toEqual({ allowed: true, currentCost: 0.25 });
  const rows = await readCounters(t, projectId);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ period, costUsd: 0.25 });
});

test("later increments accumulate on the same counter", async () => {
  const { t, projectId } = await setup();
  const args = { projectId, period: "day:2025-01-15", maxCost: 1 };

  await t.mutation(api.costCounters.checkAndIncrementCost, {
    ...args,
    incrementUsd: 0.25,
  });
  const result = await t.mutation(api.costCounters.checkAndIncrementCost, {
    ...args,
    incrementUsd: 0.5,
  });

  expect(result).toEqual({ allowed: true, currentCost: 0.75 });
  expect(await readCounters(t, projectId)).toHaveLength(1);
});

test("an increment that would exceed maxCost is rejected without writing", async () => {
  const { t, projectId } = await setup();
  const period = "day:2025-01-15";
  await t.mutation(api.costCounters.checkAndIncrementCost, {
    projectId,
    period,
    incrementUsd: 0.75,
    maxCost: 1,
  });
  const before = await readCounters(t, projectId);

  const result = await t.mutation(api.costCounters.checkAndIncrementCost, {
    projectId,
    period,
    incrementUsd: 0.5,
    maxCost: 1,
  });

  expect(result).toEqual({ allowed: false, currentCost: 0.75 });
  expect(await readCounters(t, projectId)).toEqual(before);
});

test("a rejected first increment does not create a counter", async () => {
  const { t, projectId } = await setup();

  const result = await t.mutation(api.costCounters.checkAndIncrementCost, {
    projectId,
    period: "day:2025-01-15",
    incrementUsd: 2,
    maxCost: 1,
  });

  expect(result).toEqual({ allowed: false, currentCost: 0 });
  expect(await readCounters(t, projectId)).toEqual([]);
});

test("an increment that lands exactly on maxCost is allowed", async () => {
  const { t, projectId } = await setup();

  const result = await t.mutation(api.costCounters.checkAndIncrementCost, {
    projectId,
    period: "day:2025-01-15",
    incrementUsd: 1,
    maxCost: 1,
  });

  expect(result).toEqual({ allowed: true, currentCost: 1 });
});

test("getCostCounter returns 0 for an unknown period and the total for a known one", async () => {
  const { t, projectId } = await setup();
  await t.mutation(api.costCounters.checkAndIncrementCost, {
    projectId,
    period: "day:2025-01-15",
    incrementUsd: 0.4,
    maxCost: 1,
  });

  expect(
    await t.query(api.costCounters.getCostCounter, {
      projectId,
      period: "day:2030-12-31",
    }),
  ).toBe(0);
  expect(
    await t.query(api.costCounters.getCostCounter, {
      projectId,
      period: "day:2025-01-15",
    }),
  ).toBe(0.4);
});

test("resetDailyCostCounter zeroes only the matching day counter", async () => {
  const { t, projectId } = await setup();
  for (const period of ["day:2025-01-15", "day:2025-01-16"]) {
    await t.mutation(api.costCounters.checkAndIncrementCost, {
      projectId,
      period,
      incrementUsd: 0.6,
      maxCost: 1,
    });
  }

  await t.mutation(api.costCounters.resetDailyCostCounter, {
    projectId,
    day: "2025-01-15",
  });

  const read = (period: string) =>
    t.query(api.costCounters.getCostCounter, { projectId, period });
  expect(await read("day:2025-01-15")).toBe(0);
  expect(await read("day:2025-01-16")).toBe(0.6);
});

test("resetDailyCostCounter is a no-op when no counter exists", async () => {
  const { t, projectId } = await setup();

  await t.mutation(api.costCounters.resetDailyCostCounter, {
    projectId,
    day: "2025-01-15",
  });

  expect(await readCounters(t, projectId)).toEqual([]);
});
