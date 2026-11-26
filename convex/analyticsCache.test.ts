import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const NOW = Date.parse("2030-01-15T12:00:00.000Z");
const DAY = "2030-01-15";
const RANGE_DAYS = 7;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) =>
    ctx.db.insert("projects", {
      name: "Test",
      clerkOrgId: "org",
      clerkUserId: "owner",
    }),
  );
  return { t, projectId, owner: t.withIdentity({ subject: "owner", orgId: "org" }) };
}

type Harness = Awaited<ReturnType<typeof setup>>;

function seedCache(
  { t, projectId }: Harness,
  ageMs: number,
  lastManualAgeMs?: number,
) {
  return t.run((ctx) =>
    ctx.db.insert("analyticsStatsCache", {
      projectId,
      rangeDays: RANGE_DAYS,
      dailyCosts: [],
      modelCosts: [],
      updatedAt: NOW - ageMs,
      source: "test",
      lastManualRefreshAt:
        lastManualAgeMs === undefined ? undefined : NOW - lastManualAgeMs,
    }),
  );
}

function seedReads({ t }: Harness, readCount: number) {
  return t.run((ctx) =>
    ctx.db.insert("tinybirdReadBudget", { day: DAY, readCount, updatedAt: NOW }),
  );
}

function reads({ t }: Harness) {
  return t.run(async (ctx) => {
    const row = await ctx.db
      .query("tinybirdReadBudget")
      .withIndex("by_day", (q) => q.eq("day", DAY))
      .unique();
    return row?.readCount ?? null;
  });
}

function reserve(h: Harness, refresh: "normal" | "manual") {
  return h.owner.mutation(api.analyticsCache.reserveStatsRefresh, {
    projectId: h.projectId as Id<"projects">,
    rangeDays: RANGE_DAYS,
    refresh,
  });
}

test("a fresh cache blocks a normal refresh without spending reads", async () => {
  const h = await setup();
  await seedCache(h, 60_000);
  const result = await reserve(h, "normal");
  expect(result.allowed).toBe(false);
  expect(result.reason).toBe("cache_fresh");
  expect(result.cache?.meta.cacheStatus).toBe("fresh");
  expect(await reads(h)).toBeNull();
});

test("a stale cache allows a normal refresh", async () => {
  const h = await setup();
  await seedCache(h, 11 * 60 * 1000);
  const result = await reserve(h, "normal");
  expect(result).toMatchObject({ allowed: true, reason: null });
  expect(result.cache?.meta.cacheStatus).toBe("stale");
});

test("a second manual refresh inside the cooldown is rate limited", async () => {
  const h = await setup();
  await seedCache(h, 60 * 60 * 1000);
  expect((await reserve(h, "manual")).allowed).toBe(true);
  vi.setSystemTime(NOW + 10_000);
  const second = await reserve(h, "manual");
  expect(second.allowed).toBe(false);
  expect(second.reason).toBe("rate_limited");
  expect(await reads(h)).toBe(3);
  vi.setSystemTime(NOW + 31_000);
  expect((await reserve(h, "manual")).allowed).toBe(true);
  expect(await reads(h)).toBe(6);
});

test("an allowed reservation adds three reads to the day's count", async () => {
  const h = await setup();
  expect((await reserve(h, "normal")).allowed).toBe(true);
  expect(await reads(h)).toBe(3);
  await seedCache(h, 60 * 60 * 1000);
  expect((await reserve(h, "normal")).allowed).toBe(true);
  expect(await reads(h)).toBe(6);
});

test("a manual refresh near the soft limit returns budget_low, a normal one still runs", async () => {
  const h = await setup();
  await seedReads(h, 847);
  const manual = await reserve(h, "manual");
  expect(manual.allowed).toBe(false);
  expect(manual.reason).toBe("budget_low");
  expect(await reads(h)).toBe(847);
  const normal = await reserve(h, "normal");
  expect(normal).toMatchObject({ allowed: true, reason: "budget_low" });
  expect(await reads(h)).toBe(850);
});

test("a manual refresh just below the soft limit is allowed without a warning", async () => {
  const h = await setup();
  await seedReads(h, 846);
  expect(await reserve(h, "manual")).toMatchObject({ allowed: true, reason: null });
  expect(await reads(h)).toBe(849);
});

test("any refresh at the hard limit returns budget_hard_limit", async () => {
  const h = await setup();
  await seedReads(h, 977);
  for (const refresh of ["normal", "manual"] as const) {
    const result = await reserve(h, refresh);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("budget_hard_limit");
  }
  expect(await reads(h)).toBe(977);
});

test("a normal refresh just below the hard limit is still allowed", async () => {
  const h = await setup();
  await seedReads(h, 976);
  expect(await reserve(h, "normal")).toMatchObject({
    allowed: true,
    reason: "budget_low",
  });
  expect(await reads(h)).toBe(979);
});
