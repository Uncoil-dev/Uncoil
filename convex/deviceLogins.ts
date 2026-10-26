import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { canAccessProject, canAdminProject, insertProjectWithKey, rotateProjectKey } from "./projects";

/** How long a terminal sign-in request stays valid. */
export const DEVICE_LOGIN_TTL_MS = 10 * 60 * 1000;
/** Most open requests at once, so nobody can fill the table by calling start in a loop. */
const MAX_OPEN_REQUESTS = 500;
// No vowels or look-alike characters, so a code read aloud or typed by hand is not misread.
const CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
const MAX_PROJECT_NAME = 80;

function newUserCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const letters = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

export function normalizeUserCode(code: string) {
  const letters = code.toUpperCase().replace(/[^A-Z]/g, "");
  return letters.length === 8 ? `${letters.slice(0, 4)}-${letters.slice(4)}` : "";
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function importPublicKey(spkiBase64: string) {
  return crypto.subtle.importKey("spki", fromBase64(spkiBase64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
}

/** Only the holder of the matching private key (the terminal that asked) can read the result. */
async function encryptFor(spkiBase64: string, text: string) {
  const key = await importPublicKey(spkiBase64);
  const cipher = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, new TextEncoder().encode(text));
  return toBase64(new Uint8Array(cipher));
}

/** The terminal asks for a sign-in. Returns the short code the person confirms in the browser. */
export const start = mutation({
  args: {
    deviceCodeHash: v.string(),
    publicKey: v.string(),
    newProjectName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!/^[0-9a-f]{64}$/.test(args.deviceCodeHash)) throw new Error("Invalid request");
    if (args.publicKey.length < 300 || args.publicKey.length > 1000) throw new Error("Invalid public key");
    try {
      await importPublicKey(args.publicKey);
    } catch {
      throw new Error("Invalid public key");
    }
    const newProjectName = args.newProjectName?.trim().slice(0, MAX_PROJECT_NAME) || undefined;

    const now = Date.now();
    const open = await ctx.db.query("deviceLogins").withIndex("by_expiresAt", (q) => q.gt("expiresAt", now)).take(MAX_OPEN_REQUESTS + 1);
    if (open.length > MAX_OPEN_REQUESTS) throw new Error("Too many sign-in requests right now. Try again in a few minutes.");

    let userCode = newUserCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await ctx.db.query("deviceLogins").withIndex("by_userCode", (q) => q.eq("userCode", userCode)).first();
      if (!clash || clash.expiresAt <= now) break;
      userCode = newUserCode();
    }

    const expiresAt = now + DEVICE_LOGIN_TTL_MS;
    await ctx.db.insert("deviceLogins", {
      deviceCodeHash: args.deviceCodeHash,
      userCode,
      publicKey: args.publicKey,
      status: "pending",
      createdAt: now,
      expiresAt,
      newProjectName,
    });
    return { userCode, expiresAt };
  },
});

/** The terminal asks whether the person has confirmed yet. The encrypted key is handed over once, then erased. */
export const poll = mutation({
  args: { deviceCodeHash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("deviceLogins").withIndex("by_deviceCodeHash", (q) => q.eq("deviceCodeHash", args.deviceCodeHash)).unique();
    if (!row || row.status === "consumed") return { status: "expired" as const };
    if (row.expiresAt <= Date.now()) return { status: "expired" as const };
    if (row.status === "pending") return { status: "pending" as const };
    if (row.status === "denied") return { status: "denied" as const };
    const { encryptedKey, projectId, projectName } = row;
    await ctx.db.patch(row._id, { status: "consumed", encryptedKey: undefined });
    if (!encryptedKey || !projectId) return { status: "expired" as const };
    return { status: "approved" as const, encryptedKey, projectId: String(projectId), projectName: projectName ?? "" };
  },
});

/** What the browser page shows before the person confirms. */
export const lookup = query({
  args: { userCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userCode = normalizeUserCode(args.userCode);
    if (!userCode) return { state: "invalid" as const };
    const row = await ctx.db.query("deviceLogins").withIndex("by_userCode", (q) => q.eq("userCode", userCode)).order("desc").first();
    if (!row) return { state: "invalid" as const };
    if (row.expiresAt <= Date.now()) return { state: "expired" as const };
    if (row.status !== "pending") return { state: "done" as const };
    return { state: "pending" as const, userCode, newProjectName: row.newProjectName ?? null, expiresAt: row.expiresAt };
  },
});

/** The signed-in person confirms: pick a project (its key is replaced) or make a new one. */
export const approve = mutation({
  args: {
    userCode: v.string(),
    projectId: v.optional(v.id("projects")),
    newProjectName: v.optional(v.string()),
    /** Required when the chosen project already has a key that has sent data, since replacing it stops that app. */
    confirmReplace: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userCode = normalizeUserCode(args.userCode);
    const row = userCode ? await ctx.db.query("deviceLogins").withIndex("by_userCode", (q) => q.eq("userCode", userCode)).order("desc").first() : null;
    if (!row || row.expiresAt <= Date.now()) throw new Error("This code has expired. Run the command again.");
    if (row.status !== "pending") throw new Error("This code was already used.");

    let result: { projectId: string; plaintextApiKey: string; name: string };
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || !canAccessProject(project, identity)) throw new Error("Project not found or access denied");
      if (!canAdminProject(project, identity)) throw new Error("Admin access required");
      if (project.apiKeyStatus === "active" && project.apiKeyLastUsedAt && !args.confirmReplace) {
        throw new Error("REPLACE_CONFIRM_REQUIRED");
      }
      const rotated = await rotateProjectKey(ctx, project, identity, "Project API key replaced by terminal sign-in");
      result = { projectId: String(project._id), plaintextApiKey: rotated.plaintextApiKey, name: project.name };
    } else {
      const name = (args.newProjectName ?? row.newProjectName ?? "").trim().slice(0, MAX_PROJECT_NAME) || "My first project";
      const created = await insertProjectWithKey(ctx, identity, name);
      result = { projectId: String(created.projectId), plaintextApiKey: created.plaintextApiKey, name };
    }

    await ctx.db.patch(row._id, {
      status: "approved",
      // Give the terminal time to collect the key even if the person confirmed at the last minute.
      expiresAt: Math.max(row.expiresAt, Date.now() + 2 * 60 * 1000),
      approvedBy: identity.subject,
      projectId: result.projectId as typeof row.projectId,
      projectName: result.name,
      encryptedKey: await encryptFor(row.publicKey, result.plaintextApiKey),
    });
    return { projectId: result.projectId, projectName: result.name };
  },
});

export const deny = mutation({
  args: { userCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userCode = normalizeUserCode(args.userCode);
    const row = userCode ? await ctx.db.query("deviceLogins").withIndex("by_userCode", (q) => q.eq("userCode", userCode)).order("desc").first() : null;
    if (row && row.status === "pending") await ctx.db.patch(row._id, { status: "denied" });
    return null;
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db.query("deviceLogins").withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now() - 60_000)).take(200);
    for (const row of old) await ctx.db.delete(row._id);
    return old.length;
  },
});
