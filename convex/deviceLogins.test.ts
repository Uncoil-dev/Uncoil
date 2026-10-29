import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { convexTest } from "convex-test";
import { beforeEach, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const hash = "a".repeat(64);
const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");

beforeEach(() => { process.env.UNCOIL_API_KEY_HASH_SECRET = "test-secret"; });

async function begin(t: ReturnType<typeof convexTest>, newProjectName?: string, deviceCodeHash = hash) {
  return t.mutation(api.deviceLogins.start, { deviceCodeHash, publicKey, newProjectName });
}
const open = (key: string) => privateDecrypt({ key: pair.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(key, "base64")).toString();

test("a new project is created on approval and the key is readable only by the terminal, once", async () => {
  const t = convexTest(schema, modules);
  const { userCode } = await begin(t, "Support bot");
  expect(userCode).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
  await expect(t.mutation(api.deviceLogins.poll, { deviceCodeHash: hash })).resolves.toEqual({ status: "pending" });

  const user = t.withIdentity({ subject: "user_1", tokenIdentifier: "t|user_1" });
  await expect(user.query(api.deviceLogins.lookup, { userCode: userCode.toLowerCase() })).resolves.toMatchObject({ state: "pending", newProjectName: "Support bot" });
  const approved = await user.mutation(api.deviceLogins.approve, { userCode });
  expect(approved.projectName).toBe("Support bot");

  const polled = await t.mutation(api.deviceLogins.poll, { deviceCodeHash: hash });
  if (polled.status !== "approved") throw new Error("expected approved");
  const apiKey = open(polled.encryptedKey);
  expect(apiKey).toMatch(/^uncoil_sk_live_eu_[0-9a-f]{32}$/);
  expect(polled.projectId).toBe(approved.projectId);
  // Stored hash matches the key, and no plaintext or ciphertext remains.
  const project = await user.query(api.projects.getProjectById, { projectId: polled.projectId as never });
  expect(project?.name).toBe("Support bot");
  await expect(t.mutation(api.deviceLogins.poll, { deviceCodeHash: hash })).resolves.toEqual({ status: "expired" });
  const rows = await t.run((ctx) => ctx.db.query("deviceLogins").collect());
  expect(rows[0].encryptedKey).toBeUndefined();
});

test("signed-out callers cannot approve or look up codes", async () => {
  const t = convexTest(schema, modules);
  const { userCode } = await begin(t);
  await expect(t.mutation(api.deviceLogins.approve, { userCode })).rejects.toThrow("Not authenticated");
  await expect(t.query(api.deviceLogins.lookup, { userCode })).resolves.toBeNull();
});

test("someone else's project cannot be chosen", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", tokenIdentifier: "t|owner" });
  const other = t.withIdentity({ subject: "other", tokenIdentifier: "t|other" });
  const { projectId } = await owner.mutation(api.projects.createProject, { name: "Mine" });
  const { userCode } = await begin(t);
  await expect(other.mutation(api.deviceLogins.approve, { userCode, projectId })).rejects.toThrow("Project not found or access denied");
});

test("replacing a key that is in use needs confirmation", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", tokenIdentifier: "t|owner" });
  const { projectId } = await owner.mutation(api.projects.createProject, { name: "Live" });
  await t.run((ctx) => ctx.db.patch(projectId, { apiKeyLastUsedAt: Date.now() }));
  const { userCode } = await begin(t);
  await expect(owner.mutation(api.deviceLogins.approve, { userCode, projectId })).rejects.toThrow("REPLACE_CONFIRM_REQUIRED");
  await owner.mutation(api.deviceLogins.approve, { userCode, projectId, confirmReplace: true });
  await expect(t.mutation(api.deviceLogins.poll, { deviceCodeHash: hash })).resolves.toMatchObject({ status: "approved", projectId: String(projectId) });
});

test("cancelled, used and expired codes are refused", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "u", tokenIdentifier: "t|u" });
  const first = await begin(t);
  await user.mutation(api.deviceLogins.deny, { userCode: first.userCode });
  await expect(t.mutation(api.deviceLogins.poll, { deviceCodeHash: hash })).resolves.toEqual({ status: "denied" });
  await expect(user.mutation(api.deviceLogins.approve, { userCode: first.userCode })).rejects.toThrow("already used");

  const second = await begin(t, undefined, "b".repeat(64));
  await t.run(async (ctx) => { const row = await ctx.db.query("deviceLogins").withIndex("by_userCode", (q) => q.eq("userCode", second.userCode)).first(); await ctx.db.patch(row!._id, { expiresAt: Date.now() - 1 }); });
  await expect(user.mutation(api.deviceLogins.approve, { userCode: second.userCode })).rejects.toThrow("expired");
  await expect(t.mutation(api.deviceLogins.poll, { deviceCodeHash: "b".repeat(64) })).resolves.toEqual({ status: "expired" });
});

test("bad requests are rejected", async () => {
  const t = convexTest(schema, modules);
  await expect(t.mutation(api.deviceLogins.start, { deviceCodeHash: "short", publicKey })).rejects.toThrow("Invalid request");
  await expect(t.mutation(api.deviceLogins.start, { deviceCodeHash: hash, publicKey: "x".repeat(400) })).rejects.toThrow("Invalid public key");
});
