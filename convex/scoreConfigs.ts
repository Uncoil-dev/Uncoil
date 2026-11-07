import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkConfig, summarize } from "./scoreConfigRules";
import { readProject, recordAudit, requireMember } from "./settingsAccess";

const dataType = v.union(v.literal("numeric"), v.literal("boolean"), v.literal("categorical"));
const fields = {
  name: v.string(),
  dataType,
  description: v.optional(v.string()),
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  categories: v.optional(v.array(v.string())),
  passThreshold: v.optional(v.number()),
  passCategories: v.optional(v.array(v.string())),
};
const MAX_CONFIGS = 50;

function clean(args: { name: string; dataType: "numeric" | "boolean" | "categorical"; description?: string; min?: number; max?: number; categories?: string[]; passThreshold?: number; passCategories?: string[] }) {
  const categories = args.dataType === "categorical" ? (args.categories ?? []).map((item) => item.trim()) : undefined;
  return {
    name: args.name.trim(),
    dataType: args.dataType,
    description: args.description?.trim() || undefined,
    min: args.dataType === "numeric" ? args.min : undefined,
    max: args.dataType === "numeric" ? args.max : undefined,
    categories,
    passThreshold: args.dataType === "numeric" ? args.passThreshold : undefined,
    passCategories: args.dataType === "categorical" && args.passCategories?.length ? args.passCategories.map((item) => item.trim()) : undefined,
  };
}

/** Every score type with how its recent scores are doing, plus score names used in traces that have no definition yet. */
export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const found = await readProject(ctx, projectId);
    if (!found) return null;
    const configs = await ctx.db.query("scoreConfigs").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(MAX_CONFIGS);
    const scores = await ctx.db.query("scores").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(1000);
    const byName = new Map<string, typeof scores>();
    for (const score of scores) byName.set(score.name, [...(byName.get(score.name) ?? []), score]);
    const known = new Set(configs.map((config) => config.name));
    return {
      configs: configs.map((config) => ({ ...config, stats: summarize(config, byName.get(config.name) ?? []) })).sort((a, b) => a.name.localeCompare(b.name)),
      undefinedNames: [...byName.entries()].filter(([name]) => !known.has(name)).map(([name, rows]) => ({ name, count: rows.length, dataType: rows[0].dataType })).sort((a, b) => b.count - a.count).slice(0, 20),
      scannedScores: scores.length,
    };
  },
});

export const create = mutation({
  args: { projectId: v.id("projects"), ...fields },
  handler: async (ctx, { projectId, ...rest }) => {
    const { identity } = await requireMember(ctx, projectId);
    const config = clean(rest);
    const problem = checkConfig(config);
    if (problem) throw new Error(problem);
    const existing = await ctx.db.query("scoreConfigs").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(MAX_CONFIGS + 1);
    if (existing.length >= MAX_CONFIGS) throw new Error(`A project can define at most ${MAX_CONFIGS} score types.`);
    if (existing.some((item) => item.name === config.name)) throw new Error(`A score called "${config.name}" already exists.`);
    const now = Date.now();
    const id = await ctx.db.insert("scoreConfigs", { projectId, ...config, createdBy: identity.subject, createdAt: now, updatedAt: now });
    await recordAudit(ctx, projectId, identity, "score_config.created", "score_config", `Defined score "${config.name}"`);
    return id;
  },
});

/** The name and type stay fixed, so scores already saved keep their meaning. */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    configId: v.id("scoreConfigs"),
    description: v.optional(v.string()),
    min: v.optional(v.number()),
    max: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
    passThreshold: v.optional(v.number()),
    passCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { projectId, configId, ...rest }) => {
    const { identity } = await requireMember(ctx, projectId);
    const current = await ctx.db.get(configId);
    if (!current || current.projectId !== projectId) throw new Error("Score not found");
    const next = clean({ name: current.name, dataType: current.dataType, ...rest });
    const problem = checkConfig(next);
    if (problem) throw new Error(problem);
    await ctx.db.replace(configId, { projectId, ...next, createdBy: current.createdBy, createdAt: current.createdAt, updatedAt: Date.now() });
    await recordAudit(ctx, projectId, identity, "score_config.updated", "score_config", `Changed score "${current.name}"`);
  },
});

/** Removes the definition only. Scores already saved stay where they are. */
export const remove = mutation({
  args: { projectId: v.id("projects"), configId: v.id("scoreConfigs") },
  handler: async (ctx, { projectId, configId }) => {
    const { identity } = await requireMember(ctx, projectId);
    const current = await ctx.db.get(configId);
    if (!current || current.projectId !== projectId) throw new Error("Score not found");
    await ctx.db.delete(configId);
    await recordAudit(ctx, projectId, identity, "score_config.deleted", "score_config", `Removed score "${current.name}"`);
  },
});
