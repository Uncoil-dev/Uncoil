import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal, api } from "./_generated/api";
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
const map = {
  filters: { range: "7d" },
  facets: ["intent", "outcome"],
  sampleRate: 0.5,
  status: "ready" as const,
  builtAt: 1000,
};
const topic = (name: string) => ({
  facet: "intent",
  name,
  description: `${name} requests`,
  count: 4,
  share: 0.4,
  sampleRunIds: ["run_1", "run_2"],
});
const summary = (runId: string, intent: string) => ({
  runId,
  intent,
  sentiment: "neutral",
  outcome: "resolved",
  issues: [],
});

test("members read the stored map and topics; outsiders and signed-out get nothing", async () => {
  const { t, member, outsider, projectId } = await setup();
  await t.mutation(internal.topics.saveMap, { projectId, ...map });
  await t.mutation(internal.topics.replaceTopics, {
    projectId,
    topics: [topic("Refunds"), topic("Billing")],
  });
  expect((await member.query(api.topics.getMap, { projectId }))?.status).toBe(
    "ready",
  );
  expect(await member.query(api.topics.listTopics, { projectId })).toHaveLength(
    2,
  );
  for (const user of [t, outsider]) {
    expect(await user.query(api.topics.getMap, { projectId })).toBeNull();
    expect(await user.query(api.topics.listTopics, { projectId })).toEqual([]);
    expect(
      await user.query(api.topics.getSummaries, { projectId, runIds: ["run_1"] }),
    ).toEqual([]);
  }
});

test("summaries upsert without duplicates and survive a topic rebuild", async () => {
  const { t, member, projectId } = await setup();
  await t.mutation(internal.topics.upsertSummaries, {
    projectId,
    summaries: [summary("run_1", "refund"), summary("run_2", "login")],
  });
  await t.mutation(internal.topics.upsertSummaries, {
    projectId,
    summaries: [summary("run_1", "cancel")],
  });
  await t.mutation(internal.topics.replaceTopics, {
    projectId,
    topics: [topic("Refunds")],
  });
  await t.mutation(internal.topics.replaceTopics, { projectId, topics: [] });
  const rows = await member.query(api.topics.getSummaries, {
    projectId,
    runIds: ["run_1", "run_2", "run_3"],
  });
  expect(rows.map((r) => [r.runId, r.intent]).sort()).toEqual([
    ["run_1", "cancel"],
    ["run_2", "login"],
  ]);
  expect(
    await t.query(internal.topics.missingRunIds, {
      projectId,
      runIds: ["run_1", "run_3"],
    }),
  ).toEqual(["run_3"]);
});
