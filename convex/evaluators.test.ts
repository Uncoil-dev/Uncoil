import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const [projectId, otherProjectId] = await t.run(async (ctx) => [
    await ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner" }),
    await ctx.db.insert("projects", { name: "Other", clerkOrgId: "org-two", clerkUserId: "someone" }),
  ]);
  return {
    t,
    projectId,
    otherProjectId,
    owner: t.withIdentity({ subject: "owner", orgId: "org" }),
    otherOwner: t.withIdentity({ subject: "someone", orgId: "org-two" }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "elsewhere" }),
  };
}

const draft = { name: "Answers cite sources", type: "llm_judge" as const, criteria: "Every claim cites a source" };

test("a created evaluator is active and listed only for its own project", async () => {
  const { owner, otherOwner, projectId, otherProjectId } = await setup();
  const id = await owner.mutation(api.evaluators.create, { projectId, ...draft, name: "  Answers cite sources  ", criteria: " Every claim cites a source " });
  await otherOwner.mutation(api.evaluators.create, { projectId: otherProjectId, ...draft, name: "Other project check" });

  const rows = await owner.query(api.evaluators.list, { projectId });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ _id: id, projectId, name: "Answers cite sources", criteria: "Every claim cites a source", type: "llm_judge", active: true, createdBy: "owner" });
  expect((await otherOwner.query(api.evaluators.list, { projectId: otherProjectId })).map((row) => row.name)).toEqual(["Other project check"]);
});

test("create rejects blank fields and duplicate names within a project", async () => {
  const { owner, otherOwner, projectId, otherProjectId } = await setup();
  await expect(owner.mutation(api.evaluators.create, { projectId, ...draft, name: "   " })).rejects.toThrow("name and criteria are required");
  await expect(owner.mutation(api.evaluators.create, { projectId, ...draft, criteria: "" })).rejects.toThrow("name and criteria are required");
  await owner.mutation(api.evaluators.create, { projectId, ...draft });
  await expect(owner.mutation(api.evaluators.create, { projectId, ...draft })).rejects.toThrow("already exists");
  await expect(otherOwner.mutation(api.evaluators.create, { projectId: otherProjectId, ...draft })).resolves.toBeTruthy();
});

test("setActive(false) switches the evaluator off and get stops returning it", async () => {
  const { owner, projectId } = await setup();
  const id = await owner.mutation(api.evaluators.create, { projectId, ...draft });
  expect(await owner.query(api.evaluators.get, { projectId, evaluatorId: id })).toMatchObject({ _id: id, active: true });

  await owner.mutation(api.evaluators.setActive, { projectId, evaluatorId: id, active: false });
  expect((await owner.query(api.evaluators.list, { projectId }))[0]).toMatchObject({ _id: id, active: false });
  expect(await owner.query(api.evaluators.get, { projectId, evaluatorId: id })).toBeNull();

  await owner.mutation(api.evaluators.setActive, { projectId, evaluatorId: id, active: true });
  expect(await owner.query(api.evaluators.get, { projectId, evaluatorId: id })).toMatchObject({ _id: id, active: true });
});

test("callers outside the project cannot read or change an evaluator", async () => {
  const { t, owner, outsider, otherOwner, projectId, otherProjectId } = await setup();
  const id = await owner.mutation(api.evaluators.create, { projectId, ...draft });

  for (const user of [t, outsider]) {
    expect(await user.query(api.evaluators.list, { projectId })).toEqual([]);
    expect(await user.query(api.evaluators.get, { projectId, evaluatorId: id })).toBeNull();
  }
  await expect(t.mutation(api.evaluators.create, { projectId, ...draft, name: "Anonymous" })).rejects.toThrow("Unauthorized");
  await expect(outsider.mutation(api.evaluators.create, { projectId, ...draft, name: "Intruder" })).rejects.toThrow("Project not found or access denied");
  await expect(outsider.mutation(api.evaluators.setActive, { projectId, evaluatorId: id, active: false })).rejects.toThrow("Project not found or access denied");

  // An owner of another project cannot reach it by pairing their own project id with this evaluator id.
  expect(await otherOwner.query(api.evaluators.get, { projectId: otherProjectId, evaluatorId: id })).toBeNull();
  await expect(otherOwner.mutation(api.evaluators.setActive, { projectId: otherProjectId, evaluatorId: id, active: false })).rejects.toThrow("Evaluator not found");
  expect(await owner.query(api.evaluators.get, { projectId, evaluatorId: id })).toMatchObject({ active: true });
});
