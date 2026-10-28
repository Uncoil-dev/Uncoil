import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

type Identity = { subject: string; tokenIdentifier: string };

function organizationId(identity: Identity) {
  const value = identity as Identity & { orgId?: unknown; org_id?: unknown };
  return typeof value.orgId === "string" ? value.orgId : typeof value.org_id === "string" ? value.org_id : undefined;
}

function canAccess(project: Doc<"projects">, identity: Identity) {
  const orgId = organizationId(identity);
  return Boolean((orgId && project.clerkOrgId === orgId) || project.clerkUserId === identity.subject);
}

type FailureMode = "success" | "timeout" | "429" | "500" | "cost_overrun";
type FailureMix = Record<FailureMode, number>;

const DEFAULT_FAILURE_MIX: FailureMix = {
  success: 0.4,
  timeout: 0.15,
  "429": 0.15,
  "500": 0.15,
  cost_overrun: 0.15,
};

const DEFAULT_RETRY_POLICY = {
  maxAttempts: 2,
  backoffMs: 500,
  backoffMultiplier: 2,
  retryableErrors: ["429", "5xx", "rate_limit", "timeout"],
};

type PolicySnapshot = {
  enforcementMode: "observe" | "enforce";
  fallbackChain: string[];
  maxCostPerRun?: number;
  maxCostPerDay?: number;
  latencyBudgetMs?: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
  };
};

type IterationRecord = {
  iteration: number;
  model: string;
  failureMode: FailureMode;
  success: boolean;
  latencyMs: number;
  attempts: number;
  blocked?: boolean;
  fallbackReason?: string;
  failOpen?: boolean;
  error?: string;
};

function pickFailureMode(mix: FailureMix): FailureMode {
  const entries = Object.entries(mix) as [FailureMode, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0) || 1;
  let r = Math.random() * total;
  for (const [mode, weight] of entries) {
    r -= Math.max(0, weight);
    if (r <= 0) return mode;
  }
  return entries[entries.length - 1][0];
}

function isRetryable(mode: FailureMode, retryableErrors: string[]) {
  if (mode === "timeout") return retryableErrors.includes("timeout");
  if (mode === "429") return retryableErrors.includes("429") || retryableErrors.includes("rate_limit");
  if (mode === "500") return retryableErrors.includes("5xx");
  return false;
}

function simulatedLatency(mode: FailureMode, latencyBudgetMs: number) {
  switch (mode) {
    case "success":
      return 200 + Math.random() * 600;
    case "timeout":
      return latencyBudgetMs + 500 + Math.random() * 1500;
    case "cost_overrun":
      return 200 + Math.random() * 400;
    default:
      return 50 + Math.random() * 150;
  }
}

/**
 * Replays the fallback-chain/retry/cost-ceiling semantics of
 * UncoilClient.orchestrate() (packages/ts-sdk/src/index.ts) against a
 * synthetic failure mode, with no real network calls or provider cost.
 */
function simulateOrchestration(mode: FailureMode, policy: PolicySnapshot, iteration: number): IterationRecord {
  const allModels = policy.fallbackChain.length ? policy.fallbackChain : ["primary-model"];
  let totalLatency = 0;
  let attempts = 0;
  let blocked = false;
  let fallbackReason: string | undefined;
  let failOpen = false;
  let currentModel = allModels[0];

  for (let modelIndex = 0; modelIndex < allModels.length; modelIndex++) {
    currentModel = allModels[modelIndex];
    const isFallback = modelIndex > 0;
    const maxAttempts = isFallback ? 1 : policy.retryPolicy.maxAttempts + 1;
    let movedToNextModel = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts++;

      if (mode === "cost_overrun" && policy.maxCostPerRun !== undefined) {
        if (policy.enforcementMode === "enforce") {
          blocked = true;
          totalLatency += 50;
          if (modelIndex < allModels.length - 1) {
            fallbackReason = "cost_ceiling";
            movedToNextModel = true;
            break;
          }
          return { iteration, model: currentModel, failureMode: mode, success: false, latencyMs: totalLatency, attempts, blocked: true, fallbackReason, failOpen, error: "Cost ceiling reached" };
        }
        failOpen = true;
      }

      const latency = simulatedLatency(mode, policy.latencyBudgetMs ?? 5000);
      totalLatency += latency;

      if (mode === "success" || mode === "cost_overrun") {
        return { iteration, model: currentModel, failureMode: mode, success: true, latencyMs: totalLatency, attempts, blocked, fallbackReason, failOpen };
      }

      const retryable = isRetryable(mode, policy.retryPolicy.retryableErrors);
      const isLastAttempt = attempt === maxAttempts;
      if (retryable && !isLastAttempt) continue;
      fallbackReason = mode === "timeout" ? "latency_budget" : "provider_error";
      movedToNextModel = true;
      break;
    }

    if (!movedToNextModel) break;
  }

  return {
    iteration,
    model: currentModel,
    failureMode: mode,
    success: false,
    latencyMs: totalLatency,
    attempts,
    blocked,
    fallbackReason,
    failOpen,
    error: `All fallback models exhausted (${mode})`,
  };
}

export const listRuns = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(projectId);
    if (!project || !canAccess(project, identity)) return [];
    return ctx.db.query("resilienceRuns").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(50);
  },
});

export const getRun = query({
  args: { projectId: v.id("projects"), runId: v.id("resilienceRuns") },
  handler: async (ctx, { projectId, runId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(projectId);
    if (!project || !canAccess(project, identity)) return null;
    const run = await ctx.db.get(runId);
    if (!run || run.projectId !== projectId) return null;
    const iterations = await ctx.db.query("resilienceIterations").withIndex("by_runId", (q) => q.eq("runId", runId)).order("asc").take(500);
    return { run, iterations };
  },
});

const failureMixValidator = v.record(
  v.string(),
  v.number(),
);

function normalizeFailureMix(value: Record<string, number>): FailureMix {
  const modes: FailureMode[] = ["success", "timeout", "429", "500", "cost_overrun"];
  const keys = Object.keys(value);
  if (keys.length !== modes.length || keys.some((key) => !modes.includes(key as FailureMode))) {
    throw new Error("failureMix must contain exactly success, timeout, 429, 500, and cost_overrun");
  }
  for (const mode of modes) {
    if (!Number.isFinite(value[mode])) throw new Error(`failureMix.${mode} must be a finite number`);
  }
  return {
    success: value.success,
    timeout: value.timeout,
    "429": value["429"],
    "500": value["500"],
    cost_overrun: value.cost_overrun,
  };
}

const policySnapshotValidator = v.object({
  enforcementMode: v.union(v.literal("observe"), v.literal("enforce")),
  fallbackChain: v.array(v.string()),
  maxCostPerRun: v.optional(v.number()),
  maxCostPerDay: v.optional(v.number()),
  latencyBudgetMs: v.optional(v.number()),
  retryPolicy: v.object({
    maxAttempts: v.number(),
    backoffMs: v.number(),
    backoffMultiplier: v.number(),
    retryableErrors: v.array(v.string()),
  }),
});

export const createRun = mutation({
  args: { projectId: v.id("projects"), iterations: v.number(), failureMix: failureMixValidator, policySnapshot: policySnapshotValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccess(project, identity)) throw new Error("Project not found or access denied");
    if (!Number.isInteger(args.iterations) || args.iterations < 1 || args.iterations > 200) throw new Error("Iterations must be between 1 and 200");
    const failureMix = normalizeFailureMix(args.failureMix);
    const now = Date.now();
    return ctx.db.insert("resilienceRuns", {
      projectId: args.projectId,
      status: "running",
      iterations: args.iterations,
      failureMix,
      policySnapshot: args.policySnapshot,
      successCount: 0,
      failOpenCount: 0,
      blockedCount: 0,
      createdBy: identity.subject,
      createdAt: now,
    });
  },
});

const iterationInputValidator = v.object({
  iteration: v.number(),
  model: v.string(),
  failureMode: v.union(v.literal("success"), v.literal("timeout"), v.literal("429"), v.literal("500"), v.literal("cost_overrun")),
  success: v.boolean(),
  latencyMs: v.number(),
  attempts: v.number(),
  blocked: v.optional(v.boolean()),
  fallbackReason: v.optional(v.string()),
  failOpen: v.optional(v.boolean()),
  error: v.optional(v.string()),
});

export const recordIterations = mutation({
  args: { projectId: v.id("projects"), runId: v.id("resilienceRuns"), iterations: v.array(iterationInputValidator) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccess(project, identity)) throw new Error("Project not found or access denied");
    const run = await ctx.db.get(args.runId);
    if (!run || run.projectId !== args.projectId) throw new Error("Resilience run not found");
    const now = Date.now();
    let successCount = 0;
    let failOpenCount = 0;
    let blockedCount = 0;
    for (const item of args.iterations) {
      await ctx.db.insert("resilienceIterations", { projectId: args.projectId, runId: args.runId, ...item, createdAt: now });
      if (item.success) successCount += 1;
      if (item.failOpen) failOpenCount += 1;
      if (item.blocked) blockedCount += 1;
    }
    await ctx.db.patch(args.runId, {
      successCount: run.successCount + successCount,
      failOpenCount: run.failOpenCount + failOpenCount,
      blockedCount: run.blockedCount + blockedCount,
    });
  },
});

export const completeRun = mutation({
  args: { projectId: v.id("projects"), runId: v.id("resilienceRuns"), status: v.union(v.literal("completed"), v.literal("failed")), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccess(project, identity)) throw new Error("Project not found or access denied");
    const run = await ctx.db.get(args.runId);
    if (!run || run.projectId !== args.projectId) throw new Error("Resilience run not found");
    await ctx.db.patch(args.runId, { status: args.status, error: args.error?.slice(0, 2000), completedAt: Date.now() });
  },
});

export const runResilienceTest = action({
  args: { projectId: v.id("projects"), iterations: v.number(), failureMix: v.optional(failureMixValidator) },
  handler: async (ctx, args): Promise<Id<"resilienceRuns">> => {
    const project = await ctx.runQuery(api.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found or access denied");

    const iterations = Math.max(1, Math.min(200, Math.floor(args.iterations)));
    const failureMix = normalizeFailureMix(args.failureMix ?? DEFAULT_FAILURE_MIX);
    const runtimePolicy = project.runtimePolicy;
    const policySnapshot: PolicySnapshot = {
      enforcementMode: runtimePolicy?.enforcementMode ?? "observe",
      fallbackChain: runtimePolicy?.fallbackChain?.length ? runtimePolicy.fallbackChain : ["primary-model"],
      maxCostPerRun: runtimePolicy?.maxCostPerRun,
      maxCostPerDay: runtimePolicy?.maxCostPerDay,
      latencyBudgetMs: runtimePolicy?.latencyBudgetMs,
      retryPolicy: runtimePolicy?.retryPolicy ?? DEFAULT_RETRY_POLICY,
    };

    const runId: Id<"resilienceRuns"> = await ctx.runMutation(api.resilience.createRun, {
      projectId: args.projectId,
      iterations,
      failureMix,
      policySnapshot,
    });

    try {
      const results: IterationRecord[] = [];
      for (let i = 0; i < iterations; i++) {
        const mode = pickFailureMode(failureMix);
        results.push(simulateOrchestration(mode, policySnapshot, i));
      }

      await ctx.runMutation(api.resilience.recordIterations, {
        projectId: args.projectId,
        runId,
        iterations: results,
      });

      await ctx.runMutation(api.resilience.completeRun, {
        projectId: args.projectId,
        runId,
        status: "completed",
      });
    } catch (error) {
      await ctx.runMutation(api.resilience.completeRun, {
        projectId: args.projectId,
        runId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return runId;
  },
});
