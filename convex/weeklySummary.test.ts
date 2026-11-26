import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
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
  const owner = t.withIdentity({ subject: "owner", orgId: "org" });
  const settings = async () =>
    t.run((ctx) =>
      ctx.db
        .query("weeklySummaries")
        .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
        .unique(),
    );
  return { t, projectId, owner, settings };
}

test("save lowercases, trims and dedupes emails and caps them at 10", async () => {
  const { owner, projectId, settings } = await setup();
  await owner.mutation(api.weeklySummary.save, {
    projectId,
    enabled: true,
    emailTo: ["  Ada@Example.com ", "ada@example.com", "", "   "],
  });
  expect((await settings())?.emailTo).toEqual(["ada@example.com"]);

  const many = Array.from({ length: 15 }, (_, i) => `person${i}@example.com`);
  await owner.mutation(api.weeklySummary.save, { projectId, enabled: true, emailTo: many });
  expect((await settings())?.emailTo).toEqual(many.slice(0, 10));
});

test("save rejects an invalid address and stores nothing", async () => {
  const { owner, projectId, settings } = await setup();
  await expect(
    owner.mutation(api.weeklySummary.save, {
      projectId,
      enabled: false,
      emailTo: ["ok@example.com", "not-an-email"],
    }),
  ).rejects.toThrow("One of the email addresses isn't valid");
  expect(await settings()).toBeNull();
});

test("enabling needs an email address or a Slack link", async () => {
  const { owner, projectId, settings } = await setup();
  await expect(
    owner.mutation(api.weeklySummary.save, { projectId, enabled: true, emailTo: [] }),
  ).rejects.toThrow("Add an email address or a Slack link first");
  expect(await settings()).toBeNull();

  await owner.mutation(api.weeklySummary.save, { projectId, enabled: false, emailTo: [] });
  expect((await settings())?.enabled).toBe(false);

  await owner.mutation(api.weeklySummary.save, {
    projectId,
    enabled: true,
    emailTo: [],
    slackUrl: "https://hooks.slack.com/services/T000/B000/placeholder",
  });
  expect((await settings())?.enabled).toBe(true);
});

test("claimWeek succeeds once per week key and never for a disabled summary", async () => {
  const { t, owner, projectId, settings } = await setup();
  await owner.mutation(api.weeklySummary.save, {
    projectId,
    enabled: true,
    emailTo: ["ada@example.com"],
  });
  const summaryId = (await settings())!._id;
  const claim = (weekKey: string) =>
    t.mutation(internal.weeklySummary.claimWeek, { summaryId, weekKey });

  expect(await claim("2026-11-23")).toBe(true);
  expect(await claim("2026-11-23")).toBe(false);
  expect((await settings())?.lastSentWeek).toBe("2026-11-23");
  expect(await claim("2026-11-30")).toBe(true);

  await owner.mutation(api.weeklySummary.save, {
    projectId,
    enabled: false,
    emailTo: ["ada@example.com"],
  });
  expect(await claim("2026-12-07")).toBe(false);
  expect((await settings())?.lastSentWeek).toBe("2026-11-30");
});
