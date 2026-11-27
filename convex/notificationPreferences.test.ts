/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

const issuer = "https://example.convex.site";

afterEach(() => vi.unstubAllEnvs());

test("the server reads a user's saved preferences by user id", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
  const t = convexTest(schema, modules);
  await t.run((ctx) => ctx.db.insert("notificationPreferences", { userKey: "https://example.convex.site|user-1", operational: false, product: true, updatedAt: 1 }));
  expect(await t.query(internal.notificationPreferences.forUser, { userId: "user-1" })).toEqual({ operational: false, product: true });
});

test("a user who never saved preferences gets the defaults", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
  const t = convexTest(schema, modules);
  expect(await t.query(internal.notificationPreferences.forUser, { userId: "user-2" })).toEqual({ operational: true, product: false });
});

test("get is null when signed out or nothing is saved", async () => {
  const t = convexTest(schema, modules);
  const ada = t.withIdentity({ subject: "ada", issuer });
  expect(await t.query(api.notificationPreferences.get, {})).toBeNull();
  expect(await ada.query(api.notificationPreferences.get, {})).toBeNull();
});

test("set stores both choices and later saves update the same row", async () => {
  const t = convexTest(schema, modules);
  const ada = t.withIdentity({ subject: "ada", issuer });
  await ada.mutation(api.notificationPreferences.set, { operational: true, product: false });
  expect(await ada.query(api.notificationPreferences.get, {})).toMatchObject({
    operational: true,
    product: false,
  });
  await ada.mutation(api.notificationPreferences.set, { operational: false, product: true });
  expect(await ada.query(api.notificationPreferences.get, {})).toMatchObject({
    operational: false,
    product: true,
  });
  const rows = await t.run((ctx) => ctx.db.query("notificationPreferences").collect());
  expect(rows).toHaveLength(1);
});

test("preferences are per person and saving requires sign-in", async () => {
  const t = convexTest(schema, modules);
  const ada = t.withIdentity({ subject: "ada", issuer });
  const grace = t.withIdentity({ subject: "grace", issuer });
  await ada.mutation(api.notificationPreferences.set, { operational: false, product: true });
  expect(await grace.query(api.notificationPreferences.get, {})).toBeNull();
  await grace.mutation(api.notificationPreferences.set, { operational: true, product: false });
  expect(await ada.query(api.notificationPreferences.get, {})).toMatchObject({
    operational: false,
    product: true,
  });
  await expect(
    t.mutation(api.notificationPreferences.set, { operational: true, product: true }),
  ).rejects.toThrow("Authentication required");
});
