import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

const saved = { retention: process.env.UNCOIL_RETENTION_SECRET, legacy: process.env.TRACIFY_RETENTION_SECRET };
beforeEach(() => {
  process.env.UNCOIL_RETENTION_SECRET = "right-secret";
});
afterEach(() => {
  for (const [key, value] of [["UNCOIL_RETENTION_SECRET", saved.retention], ["TRACIFY_RETENTION_SECRET", saved.legacy]] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) => ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" }));
  await t.run((ctx) => ctx.db.insert("llmConnections", { projectId, label: "main", provider: "openai", baseUrl: "https://api.openai.com/v1", ciphertext: "sealed", keyLast4: "1234", isDefault: true, createdBy: "owner", createdAt: 1 }));
  return { t, projectId };
}
const map = { filters: {}, facets: ["intent"], sampleRate: 1, status: "ready" as const, builtAt: 1 };

test("job functions refuse a missing or wrong secret", async () => {
  const { t, projectId } = await setup();
  await expect(t.query(api.topics.jobGetConnection, { jobSecret: "", projectId })).rejects.toThrow("Topic job unauthorized");
  await expect(t.query(api.topics.jobGetConnection, { jobSecret: "right-secreT", projectId })).rejects.toThrow("Topic job unauthorized");
  await expect(t.mutation(api.topics.jobSaveMap, { jobSecret: "wrong", projectId, ...map })).rejects.toThrow("Topic job unauthorized");
  delete process.env.UNCOIL_RETENTION_SECRET;
  await expect(t.query(api.topics.jobGetConnection, { jobSecret: "right-secret", projectId })).rejects.toThrow("Topic job unauthorized");
});

test("job functions work with the right secret", async () => {
  const { t, projectId } = await setup();
  const connection = await t.query(api.topics.jobGetConnection, { jobSecret: "right-secret", projectId });
  expect(connection).toMatchObject({ ciphertext: "sealed", provider: "openai" });
  await t.mutation(api.topics.jobSaveMap, { jobSecret: "right-secret", projectId, ...map, live: true });
  expect(await t.query(api.topics.jobGetMap, { jobSecret: "right-secret", projectId })).toMatchObject({ status: "ready", live: true });
  expect(await t.query(api.topics.jobListLiveMaps, { jobSecret: "right-secret" })).toHaveLength(1);
});

test("only administrators can refresh", async () => {
  const { t, projectId } = await setup();
  expect(await t.withIdentity({ subject: "owner", orgId: "org" }).query(api.topics.canRefresh, { projectId })).toBe(true);
  expect(await t.withIdentity({ subject: "other", orgId: "elsewhere" }).query(api.topics.canRefresh, { projectId })).toBe(false);
});
