import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkPrices } from "./modelPricing";
import { readProject, recordAudit, requireMember } from "./settingsAccess";

const priceValidator = v.object({ pattern: v.string(), inputPerM: v.number(), outputPerM: v.number(), note: v.optional(v.string()) });

/** The project's saved prices, plus the models its recent runs used, so unpriced ones are easy to spot. */
export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const found = await readProject(ctx, projectId);
    if (!found) return null;
    const runs = await ctx.db.query("agentRuns").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(500);
    const seen = new Map<string, { model: string; runs: number; costUsd: number }>();
    for (const run of runs) {
      const model = run.primaryModel?.trim();
      if (!model) continue;
      const entry = seen.get(model) ?? { model, runs: 0, costUsd: 0 };
      entry.runs += 1;
      entry.costUsd += run.totalCostUsd;
      seen.set(model, entry);
    }
    return { prices: found.project.modelPrices ?? [], seen: [...seen.values()].sort((a, b) => b.runs - a.runs).slice(0, 30), scannedRuns: runs.length };
  },
});

export const save = mutation({
  args: { projectId: v.id("projects"), prices: v.array(priceValidator) },
  handler: async (ctx, { projectId, prices }) => {
    const { identity } = await requireMember(ctx, projectId);
    const cleaned = prices.map((price) => ({ pattern: price.pattern.trim(), inputPerM: price.inputPerM, outputPerM: price.outputPerM, note: price.note?.trim() || undefined }));
    const problem = checkPrices(cleaned);
    if (problem) throw new Error(problem);
    await ctx.db.patch(projectId, { modelPrices: cleaned, updatedAt: Date.now() });
    await recordAudit(ctx, projectId, identity, "model_prices.updated", "model_prices", `Saved ${cleaned.length} model price${cleaned.length === 1 ? "" : "s"}`);
    return { saved: cleaned.length };
  },
});
