import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({
    subject: "user-" + Math.random().toString(36).slice(2),
    email: "Person@Example.com",
    name: "Person",
  });
  return { t, user };
}

const rows = (t: ReturnType<typeof setup>["t"]) =>
  t.run((ctx) => ctx.db.query("onboardingAnswers").collect());

test("signed-out callers are rejected", async () => {
  const { t } = setup();
  await expect(
    t.mutation(api.onboardingAnswers.submit, { answer: "Slow agents" }),
  ).rejects.toThrow("Sign in first");
  expect(await rows(t)).toEqual([]);
});

test("blank or whitespace answers return null and store nothing", async () => {
  const { t, user } = setup();
  expect(await user.mutation(api.onboardingAnswers.submit, { answer: "" })).toBeNull();
  expect(
    await user.mutation(api.onboardingAnswers.submit, { answer: " \n\t  " }),
  ).toBeNull();
  expect(await rows(t)).toEqual([]);
});

test("answers are trimmed and capped at 500 characters", async () => {
  const { t, user } = setup();
  await user.mutation(api.onboardingAnswers.submit, {
    answer: `  ${"a".repeat(600)}  `,
  });
  const [row] = await rows(t);
  expect(row.answer).toBe("a".repeat(500));
  expect(row.email).toBe("person@example.com");

  const second = setup();
  await second.user.mutation(api.onboardingAnswers.submit, {
    answer: "  Find slow tool calls \n",
  });
  expect((await rows(second.t))[0].answer).toBe("Find slow tool calls");
});

test("a second submit returns the first id and keeps the first answer", async () => {
  const { t, user } = setup();
  const first = await user.mutation(api.onboardingAnswers.submit, {
    answer: "First answer",
  });
  const second = await user.mutation(api.onboardingAnswers.submit, {
    answer: "Second answer",
  });
  expect(second).toBe(first);
  const all = await rows(t);
  expect(all).toHaveLength(1);
  expect(all[0].answer).toBe("First answer");
});
