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
  return {
    t,
    projectId,
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}

function span(projectId: Id<"projects">, overrides: Record<string, unknown> = {}) {
  return {
    projectId,
    sessionId: "s1",
    tags: [] as string[],
    createdAt: "2026-01-01T00:00:00.000Z",
    costUsd: 0.1,
    status: "running" as const,
    isNewTrace: true,
    ...overrides,
  };
}

test("first span creates a session with one trace, one span and its cost", async () => {
  const { t, owner, projectId } = await setup();
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { costUsd: 0.25 }));
  const session = await owner.query(api.sessions.getBySessionId, {
    projectId,
    sessionId: "s1",
  });
  expect(session).toMatchObject({ traceCount: 1, spanCount: 1, latestStatus: "running" });
  expect(session?.totalCostUsd).toBeCloseTo(0.25);

  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId: "s2", isNewTrace: false }));
  const second = await owner.query(api.sessions.getBySessionId, { projectId, sessionId: "s2" });
  expect(second).toMatchObject({ traceCount: 0, spanCount: 1 });
});

test("later spans accumulate counts and cost and merge tags without duplicates", async () => {
  const { t, owner, projectId } = await setup();
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { tags: ["a", "b", "a"] }));
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, { tags: ["b", "c"], costUsd: 0.2, isNewTrace: false, createdAt: "2026-01-01T00:01:00.000Z" }),
  );
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { costUsd: 0.3 }));
  const session = await owner.query(api.sessions.getBySessionId, { projectId, sessionId: "s1" });
  expect(session).toMatchObject({
    traceCount: 2,
    spanCount: 3,
    tags: ["a", "b", "c"],
    firstSeenAt: "2026-01-01T00:00:00.000Z",
  });
  expect(session?.totalCostUsd).toBeCloseTo(0.6);

  const many = Array.from({ length: 60 }, (_, i) => `t${i}`);
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { tags: many }));
  const capped = await owner.query(api.sessions.getBySessionId, { projectId, sessionId: "s1" });
  expect(capped?.tags).toHaveLength(50);
});

test("terminal status is sticky while running status updates", async () => {
  const { t, owner, projectId } = await setup();
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { status: "completed" }));
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { status: "running" }));
  const done = await owner.query(api.sessions.getBySessionId, { projectId, sessionId: "s1" });
  expect(done?.latestStatus).toBe("completed");

  for (const status of ["failed", "cancelled"] as const) {
    const sessionId = `x-${status}`;
    await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId, status }));
    await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId, status: "running" }));
    const row = await owner.query(api.sessions.getBySessionId, { projectId, sessionId });
    expect(row?.latestStatus).toBe(status);
  }

  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId: "live" }));
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId: "live", status: "failed" }));
  const live = await owner.query(api.sessions.getBySessionId, { projectId, sessionId: "live" });
  expect(live?.latestStatus).toBe("failed");
});

test("first-seen fields are not overwritten by later spans", async () => {
  const { t, owner, projectId } = await setup();
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, { endUserId: "u1", environment: "prod", release: "1.0", traceName: "first" }),
  );
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, { endUserId: "u2", environment: "dev", release: "2.0", traceName: "second" }),
  );
  const session = await owner.query(api.sessions.getBySessionId, { projectId, sessionId: "s1" });
  expect(session).toMatchObject({ endUserId: "u1", environment: "prod", release: "1.0", traceName: "first" });
});

test("queries are scoped to project members and ordered by last activity", async () => {
  const { t, owner, outsider, projectId } = await setup();
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId: "old" }));
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, { sessionId: "new", createdAt: "2026-02-01T00:00:00.000Z" }),
  );
  const list = await owner.query(api.sessions.listByProject, { projectId });
  expect(list.map((s) => s.sessionId)).toEqual(["new", "old"]);
  expect(await owner.query(api.sessions.listByProject, { projectId, limit: 1 })).toHaveLength(1);
  expect(await outsider.query(api.sessions.listByProject, { projectId })).toEqual([]);
  expect(await outsider.query(api.sessions.getBySessionId, { projectId, sessionId: "new" })).toBeNull();
  expect(await t.query(api.sessions.listByProject, { projectId })).toEqual([]);
});
