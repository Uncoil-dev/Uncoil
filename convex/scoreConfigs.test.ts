import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) =>
    ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" }),
  );
  return { t, projectId, owner: t.withIdentity({ subject: "owner", orgId: "org" }) };
}
const numeric = { name: "Quality", dataType: "numeric" as const, min: 0, max: 10 };

test("a config that fails validation is not stored and the mutation throws the rule message", async () => {
  const { t, owner, projectId } = await setup();
  await expect(
    owner.mutation(api.scoreConfigs.create, { projectId, ...numeric, min: 5, max: 5 }),
  ).rejects.toThrow("The smallest value must be lower than the largest.");
  await expect(
    owner.mutation(api.scoreConfigs.create, {
      projectId,
      name: "Tone",
      dataType: "categorical",
      categories: ["good"],
    }),
  ).rejects.toThrow("A category score needs at least two categories.");
  const stored = await t.run((ctx) => ctx.db.query("scoreConfigs").collect());
  expect(stored).toEqual([]);
});

test("a second config with the same name is rejected", async () => {
  const { t, owner, projectId } = await setup();
  await owner.mutation(api.scoreConfigs.create, { projectId, ...numeric });
  await expect(
    owner.mutation(api.scoreConfigs.create, { projectId, name: "  Quality ", dataType: "boolean" }),
  ).rejects.toThrow('A score called "Quality" already exists.');
  const stored = await t.run((ctx) => ctx.db.query("scoreConfigs").collect());
  expect(stored).toHaveLength(1);
});

test("names and categories are trimmed and min/max are dropped for non-numeric types", async () => {
  const { t, owner, projectId } = await setup();
  const boolId = await owner.mutation(api.scoreConfigs.create, {
    projectId,
    name: "  Helpful  ",
    dataType: "boolean",
    min: 0,
    max: 1,
    passThreshold: 1,
  });
  const catId = await owner.mutation(api.scoreConfigs.create, {
    projectId,
    name: " Tone ",
    dataType: "categorical",
    categories: [" warm ", "cold "],
    passCategories: [" warm"],
    min: 1,
    max: 2,
  });
  const bool = await t.run((ctx) => ctx.db.get(boolId));
  const cat = await t.run((ctx) => ctx.db.get(catId));
  expect(bool).toMatchObject({ name: "Helpful", dataType: "boolean" });
  expect(bool?.min).toBeUndefined();
  expect(bool?.max).toBeUndefined();
  expect(bool?.passThreshold).toBeUndefined();
  expect(cat).toMatchObject({ name: "Tone", categories: ["warm", "cold"], passCategories: ["warm"] });
  expect(cat?.min).toBeUndefined();
  expect(cat?.max).toBeUndefined();
});

test("update changes the description and list returns the updated config", async () => {
  const { owner, projectId } = await setup();
  const configId = await owner.mutation(api.scoreConfigs.create, {
    projectId,
    ...numeric,
    description: "Old",
  });
  await owner.mutation(api.scoreConfigs.update, {
    projectId,
    configId,
    description: " New description ",
    min: 0,
    max: 10,
  });
  const result = await owner.query(api.scoreConfigs.list, { projectId });
  expect(result?.configs).toHaveLength(1);
  expect(result?.configs[0]).toMatchObject({
    _id: configId,
    name: "Quality",
    dataType: "numeric",
    description: "New description",
    min: 0,
    max: 10,
  });
});
