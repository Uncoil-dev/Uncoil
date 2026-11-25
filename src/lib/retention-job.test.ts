import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// retention-job.ts imports path-aliased modules that plain Node cannot resolve, so a resolve
// hook swaps Convex and ClickHouse for stubs that record calls on globalThis and maps
// @/lib/retention to the real file.
const root = new URL("../", import.meta.url).pathname;
const stubs: Record<string, string> = {
  "convex/_generated/api": `
    export const api = {
      retention: { listProjectsForRetention: "retention.list", purgeProjectData: "retention.purge" },
    };`,
  "@/lib/convex": `
    export const getConvexClient = () => ({
      query: async (name, args) => {
        globalThis.__calls.push(["query", name, args]);
        return globalThis.__pages[args.cursor ?? "start"];
      },
      mutation: async (name, args) => {
        globalThis.__calls.push(["mutation", name, args]);
        return globalThis.__purge(args);
      },
    });`,
  "@/lib/tinybird": `
    export const purgeExpiredAnalytics = async (ids, days) => { globalThis.__calls.push(["analytics", ids, days]); };`,
};
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) {
      return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    if (specifier === "@/lib/retention") return next("file://${root}lib/retention.ts", context);
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

type Project = { projectId: string; planTier?: string; retentionDays?: number };
type Page = { projects: Project[]; continueCursor: string | null };
const g = globalThis as unknown as {
  __calls: unknown[][];
  __pages: Record<string, Page>;
  __purge: (args: { projectId: string; olderThan: number }) => { deleted: number; hasMore: boolean };
};
const { runRetention } = await import("./retention-job.ts");

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 31);

beforeEach(() => {
  g.__calls = [];
  g.__pages = { start: { projects: [], continueCursor: null } };
  g.__purge = () => ({ deleted: 0, hasMore: false });
});

const callsOf = (kind: string) => g.__calls.filter((c) => c[0] === kind);

test("pages through every project and purges analytics once per retention length", async () => {
  g.__pages = {
    start: { projects: [{ projectId: "a", planTier: "free" }, { projectId: "b", planTier: "pro" }], continueCursor: "next" },
    next: { projects: [{ projectId: "c", planTier: "free" }, { projectId: "d", planTier: "enterprise" }], continueCursor: null },
  };
  const result = await runRetention("secret", NOW);

  assert.deepEqual(callsOf("query").map((c) => c[2]), [{ jobSecret: "secret", cursor: null }, { jobSecret: "secret", cursor: "next" }]);
  assert.deepEqual(callsOf("analytics").map((c) => c.slice(1)), [[["a", "c"], 7], [["b"], 30]]);
  assert.deepEqual(result, { projects: 4, analyticsGroups: 2, deleted: 0, hasMore: false });
});

test("purges Convex data older than each project's limit and skips unlimited projects", async () => {
  g.__pages = {
    start: {
      projects: [{ projectId: "a", planTier: "free" }, { projectId: "b", planTier: "team", retentionDays: 14 }, { projectId: "d", planTier: "enterprise" }],
      continueCursor: null,
    },
  };
  g.__purge = () => ({ deleted: 3, hasMore: false });
  const result = await runRetention("secret", NOW);

  assert.deepEqual(callsOf("mutation").map((c) => [c[1], c[2]]), [
    ["retention.purge", { projectId: "a", olderThan: NOW - 7 * DAY_MS, jobSecret: "secret" }],
    ["retention.purge", { projectId: "b", olderThan: NOW - 14 * DAY_MS, jobSecret: "secret" }],
  ]);
  assert.equal(result.deleted, 6);
  assert.equal(result.hasMore, false);
});

test("keeps purging while a project has more data and stops after 20 rounds", async () => {
  g.__pages = { start: { projects: [{ projectId: "a", planTier: "free" }, { projectId: "b", planTier: "pro" }], continueCursor: null } };
  let roundsForA = 0;
  g.__purge = ({ projectId }) => {
    if (projectId === "a") return { deleted: 1, hasMore: ++roundsForA < 3 };
    return { deleted: 2, hasMore: true };
  };
  const result = await runRetention("secret", NOW);

  const perProject = (id: string) => callsOf("mutation").filter((c) => (c[2] as { projectId: string }).projectId === id).length;
  assert.equal(perProject("a"), 3);
  assert.equal(perProject("b"), 20);
  assert.equal(result.deleted, 3 + 40);
  assert.equal(result.hasMore, true);
});

test("does nothing when there are no projects", async () => {
  const result = await runRetention("secret", NOW);
  assert.equal(callsOf("analytics").length + callsOf("mutation").length, 0);
  assert.deepEqual(result, { projects: 0, analyticsGroups: 0, deleted: 0, hasMore: false });
});
