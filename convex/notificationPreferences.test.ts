/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

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
