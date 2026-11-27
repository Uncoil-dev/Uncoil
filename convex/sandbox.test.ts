import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  return { t, user: t.withIdentity({ subject: "sandbox-user" }) };
}

test("signed-out reads return null and saves are rejected", async () => {
  const { t } = setup();
  expect(await t.query(api.sandbox.getWorkspace, {})).toBeNull();
  await expect(
    t.mutation(api.sandbox.saveWorkspace, {
      scenarioId: "retry-loop",
      dismissedAlertIds: [],
    }),
  ).rejects.toThrow("Authentication required");
});

test("a save keeps at most 25 dismissed alert ids", async () => {
  const { user } = setup();
  const ids = Array.from({ length: 40 }, (_, i) => `alert-${i}`);
  const saved = await user.mutation(api.sandbox.saveWorkspace, {
    scenarioId: "retry-loop",
    dismissedAlertIds: ids,
  });
  expect(saved.dismissedAlertIds).toEqual(ids.slice(0, 25));
  const stored = await user.query(api.sandbox.getWorkspace, {});
  expect(stored?.dismissedAlertIds).toEqual(ids.slice(0, 25));
});

test("a save with a stale expectedUpdatedAt returns the existing workspace unchanged", async () => {
  const { user } = setup();
  const first = await user.mutation(api.sandbox.saveWorkspace, {
    scenarioId: "retry-loop",
    dismissedAlertIds: ["a"],
  });
  const result = await user.mutation(api.sandbox.saveWorkspace, {
    scenarioId: "cost-spike",
    dismissedAlertIds: ["b"],
    expectedUpdatedAt: first.updatedAt + 1,
  });
  expect(result.scenarioId).toBe("retry-loop");
  expect(result.updatedAt).toBe(first.updatedAt);
  const stored = await user.query(api.sandbox.getWorkspace, {});
  expect(stored).toMatchObject({
    scenarioId: "retry-loop",
    dismissedAlertIds: ["a"],
    updatedAt: first.updatedAt,
  });
});

test("a normal save replaces the stored workspace", async () => {
  const { t, user } = setup();
  const first = await user.mutation(api.sandbox.saveWorkspace, {
    scenarioId: "retry-loop",
    dismissedAlertIds: ["a"],
  });
  await user.mutation(api.sandbox.saveWorkspace, {
    scenarioId: "cost-spike",
    dismissedAlertIds: ["b", "c"],
    expectedUpdatedAt: first.updatedAt,
  });
  const stored = await user.query(api.sandbox.getWorkspace, {});
  expect(stored).toMatchObject({
    scenarioId: "cost-spike",
    dismissedAlertIds: ["b", "c"],
  });
  const rows = await t.run((ctx) => ctx.db.query("sandboxWorkspaces").collect());
  expect(rows).toHaveLength(1);
});
