import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { readProject, recordAudit, requireAdmin } from "./settingsAccess";

const MAX_CONNECTIONS = 10;

/** What the settings page shows. The encrypted key is never part of this. */
export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const found = await readProject(ctx, projectId);
    if (!found) return null;
    const rows = await ctx.db.query("llmConnections").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(MAX_CONNECTIONS);
    return rows.map((row) => ({ _id: row._id, label: row.label, provider: row.provider, baseUrl: row.baseUrl, defaultModel: row.defaultModel, keyLast4: row.keyLast4, isDefault: row.isDefault, lastTestedAt: row.lastTestedAt, lastTestOk: row.lastTestOk, lastTestMessage: row.lastTestMessage, createdAt: row.createdAt }));
  },
});

/**
 * The encrypted default key for the web server to open. Members can run evaluations, so they can fetch it;
 * the envelope is useless without the web server's own key, which Convex never sees.
 */
export const getDefaultSecret = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const found = await readProject(ctx, projectId);
    if (!found) return null;
    const rows = await ctx.db.query("llmConnections").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(MAX_CONNECTIONS);
    const chosen = rows.find((row) => row.isDefault) ?? rows[0];
    return chosen ? { id: chosen._id, ciphertext: chosen.ciphertext, baseUrl: chosen.baseUrl, defaultModel: chosen.defaultModel ?? null, provider: chosen.provider } : null;
  },
});

export const getSecret = query({
  args: { projectId: v.id("projects"), connectionId: v.id("llmConnections") },
  handler: async (ctx, { projectId, connectionId }) => {
    const found = await readProject(ctx, projectId);
    if (!found) return null;
    const row = await ctx.db.get(connectionId);
    return row && row.projectId === projectId ? { ciphertext: row.ciphertext, baseUrl: row.baseUrl, provider: row.provider } : null;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    label: v.string(),
    provider: v.string(),
    baseUrl: v.string(),
    defaultModel: v.optional(v.string()),
    ciphertext: v.string(),
    keyLast4: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx, args.projectId);
    if (!args.ciphertext.startsWith("v1.")) throw new Error("The key must be encrypted before it is stored.");
    const label = args.label.trim();
    if (!label || label.length > 60) throw new Error("Give the connection a name of up to 60 characters.");
    const rows = await ctx.db.query("llmConnections").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).take(MAX_CONNECTIONS + 1);
    if (rows.length >= MAX_CONNECTIONS) throw new Error(`A project can have at most ${MAX_CONNECTIONS} connections.`);
    const id = await ctx.db.insert("llmConnections", {
      projectId: args.projectId,
      label,
      provider: args.provider,
      baseUrl: args.baseUrl,
      defaultModel: args.defaultModel?.trim() || undefined,
      ciphertext: args.ciphertext,
      keyLast4: args.keyLast4.slice(-4),
      isDefault: rows.length === 0,
      createdBy: identity.subject,
      createdAt: Date.now(),
    });
    await recordAudit(ctx, args.projectId, identity, "llm_connection.created", "llm_connection", `Added model connection "${label}" (${args.provider})`);
    return id;
  },
});

export const setDefault = mutation({
  args: { projectId: v.id("projects"), connectionId: v.id("llmConnections") },
  handler: async (ctx, { projectId, connectionId }) => {
    const { identity } = await requireAdmin(ctx, projectId);
    const rows = await ctx.db.query("llmConnections").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(MAX_CONNECTIONS);
    const target = rows.find((row) => row._id === connectionId);
    if (!target) throw new Error("Connection not found");
    for (const row of rows) if (row.isDefault !== (row._id === connectionId)) await ctx.db.patch(row._id, { isDefault: row._id === connectionId });
    await recordAudit(ctx, projectId, identity, "llm_connection.default", "llm_connection", `"${target.label}" is now the default model connection`);
  },
});

export const recordTest = mutation({
  args: { projectId: v.id("projects"), connectionId: v.id("llmConnections"), ok: v.boolean(), message: v.string() },
  handler: async (ctx, { projectId, connectionId, ok, message }) => {
    await requireAdmin(ctx, projectId);
    const row = await ctx.db.get(connectionId);
    if (!row || row.projectId !== projectId) throw new Error("Connection not found");
    await ctx.db.patch(connectionId, { lastTestedAt: Date.now(), lastTestOk: ok, lastTestMessage: message.slice(0, 300) });
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects"), connectionId: v.id("llmConnections") },
  handler: async (ctx, { projectId, connectionId }) => {
    const { identity } = await requireAdmin(ctx, projectId);
    const row = await ctx.db.get(connectionId);
    if (!row || row.projectId !== projectId) throw new Error("Connection not found");
    await ctx.db.delete(connectionId);
    if (row.isDefault) {
      const next = await ctx.db.query("llmConnections").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).first();
      if (next) await ctx.db.patch(next._id, { isDefault: true });
    }
    await recordAudit(ctx, projectId, identity, "llm_connection.deleted", "llm_connection", `Removed model connection "${row.label}"`);
  },
});
