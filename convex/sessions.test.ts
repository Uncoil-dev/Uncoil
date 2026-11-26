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
    member: t.withIdentity({ subject: "member", orgId: "org" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}

function span(projectId: Id<"projects">, overrides: Record<string, unknown> = {}) {
  return {
    projectId,
    sessionId: "s1",
    tags: [] as string[],
    createdAt: "2026-01-01T00:00:00.000Z",
    costUsd: 0.5,
    status: "running" as const,
    isNewTrace: true,
    ...overrides,
  };
}

test("first span creates a session with one trace, one span and its cost", async () => {
  const { t, member, projectId } = await setup();
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { tags: ["a", "a"] }));
  const session = await member.query(api.sessions.getBySessionId, {
    projectId,
    sessionId: "s1",
  });
  expect(session).toMatchObject({
    traceCount: 1,
    spanCount: 1,
    totalCostUsd: 0.5,
    latestStatus: "running",
    tags: ["a"],
    firstSeenAt: "2026-01-01T00:00:00.000Z",
  });
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId: "s2", isNewTrace: false }));
  const other = await member.query(api.sessions.getBySessionId, {
    projectId,
    sessionId: "s2",
  });
  expect(other?.traceCount).toBe(0);
});

test("later spans accumulate counts and cost and merge tags up to 50", async () => {
  const { t, member, projectId } = await setup();
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { tags: ["a", "b"] }));
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, {
      tags: ["b", "c"],
      costUsd: 0.25,
      isNewTrace: false,
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
  );
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { costUsd: 0.25 }));
  const session = await member.query(api.sessions.getBySessionId, {
    projectId,
    sessionId: "s1",
  });
  expect(session).toMatchObject({
    traceCount: 2,
    spanCount: 3,
    totalCostUsd: 1,
    tags: ["a", "b", "c"],
    firstSeenAt: "2026-01-01T00:00:00.000Z",
  });
  const many = Array.from({ length: 60 }, (_, i) => `t${i}`);
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { tags: many }));
  const capped = await member.query(api.sessions.getBySessionId, {
    projectId,
    sessionId: "s1",
  });
  expect(capped?.tags).toHaveLength(50);
  expect(capped?.tags.slice(0, 3)).toEqual(["a", "b", "c"]);
});

test.each(["completed", "failed", "cancelled"] as const)(
  "a %s session ignores later running spans",
  async (status) => {
    const { t, member, projectId } = await setup();
    await t.mutation(api.sessions.upsertFromSpan, span(projectId, { status }));
    await t.mutation(api.sessions.upsertFromSpan, span(projectId, { status: "running" }));
    const session = await member.query(api.sessions.getBySessionId, {
      projectId,
      sessionId: "s1",
    });
    expect(session?.latestStatus).toBe(status);
    expect(session?.spanCount).toBe(2);
  },
);

test("running sessions take the newest status and first-seen fields are kept", async () => {
  const { t, member, projectId } = await setup();
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, { endUserId: "u1", environment: "prod", release: "1", traceName: "first" }),
  );
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, {
      endUserId: "u2",
      environment: "dev",
      release: "2",
      traceName: "second",
      status: "failed",
    }),
  );
  const session = await member.query(api.sessions.getBySessionId, {
    projectId,
    sessionId: "s1",
  });
  expect(session).toMatchObject({
    endUserId: "u1",
    environment: "prod",
    release: "1",
    traceName: "first",
    latestStatus: "failed",
  });
});

test("members see sessions newest first; outsiders and anonymous callers get nothing", async () => {
  const { t, member, outsider, projectId } = await setup();
  await t.mutation(api.sessions.upsertFromSpan, span(projectId, { sessionId: "old" }));
  await t.mutation(
    api.sessions.upsertFromSpan,
    span(projectId, { sessionId: "new", createdAt: "2026-02-01T00:00:00.000Z" }),
  );
  const rows = await member.query(api.sessions.listByProject, { projectId });
  expect(rows.map((r) => r.sessionId)).toEqual(["new", "old"]);
  expect(await member.query(api.sessions.listByProject, { projectId, limit: 1 })).toHaveLength(1);
  for (const user of [outsider, t]) {
    expect(await user.query(api.sessions.listByProject, { projectId })).toEqual([]);
    expect(
      await user.query(api.sessions.getBySessionId, { projectId, sessionId: "new" }),
    ).toBeNull();
  }
});
