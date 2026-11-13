import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { isAllowedAdminEmail } from "./adminAccess";

const modules = import.meta.glob("./**/*.ts");

test("only @uncoil.dev and the owner's Gmail pass the admin rule", () => {
  for (const ok of ["a@uncoil.dev", "Admin@Uncoil.dev", "kristoffer.bon@gmail.com", "kristofferbon@gmail.com"]) {
    expect(isAllowedAdminEmail(ok), ok).toBe(true);
  }
  for (const no of [
    "someone@gmail.com", "x@uncoil.dev.evil.com", "x@evil-uncoil.dev", "x@sub.uncoil.dev",
    "uncoil.dev@gmail.com", "a@b@uncoil.dev", "kristoffer.bon@gmail.com.evil.com", "kristofferbon@gmail.co",
    "", null, undefined,
  ]) {
    expect(isAllowedAdminEmail(no), String(no)).toBe(false);
  }
});

test("admin data rejects signed-out and non-admin accounts", async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.admin.overview, {})).rejects.toThrow("Admin access required");
  const stranger = t.withIdentity({ subject: "u1", email: "stranger@gmail.com" });
  await expect(stranger.query(api.admin.access, {})).resolves.toEqual({ authenticated: true, allowed: false });
  await expect(stranger.query(api.admin.overview, {})).rejects.toThrow("Admin access required");
  const lookalike = t.withIdentity({ subject: "u2", email: "me@uncoil.dev.evil.com" });
  await expect(lookalike.query(api.admin.overview, {})).rejects.toThrow("Admin access required");
});
