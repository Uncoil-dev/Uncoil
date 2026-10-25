import { planRetentionDays } from "../src/lib/retention";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

type DeploymentRegion = "eu" | "us";

function deploymentRegion(): DeploymentRegion {
  const value = process.env.TRACIFY_REGION?.trim().toLowerCase();
  if (value === "us") return "us";
  return "eu";
}

function apiKeyPrefix() {
  return `tracify_sk_live_${deploymentRegion()}_`;
}

function getHmacSecret() {
  const secret = process.env.TRACIFY_API_KEY_HASH_SECRET;
  if (!secret) {
    throw new Error(
      "TRACIFY_API_KEY_HASH_SECRET is not set. Set it in Convex before creating API keys.",
    );
  }
  return secret;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getHmacSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(signature);
}

function randomHex(bytes = 16) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return toHex(values.buffer);
}

function slugify(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "project";
}

function getOrgId(identity: unknown) {
  const orgId = (identity as { orgId?: unknown; org_id?: unknown }).orgId ??
    (identity as { org_id?: unknown }).org_id;
  return typeof orgId === "string" && orgId.length > 0
    ? orgId
    : undefined;
}

function getOrgRole(identity: unknown) {
  const role = (identity as { orgRole?: unknown; org_role?: unknown }).orgRole ??
    (identity as { org_role?: unknown }).org_role;
  return typeof role === "string" ? role : undefined;
}

function isAdmin(identity: { subject: string; tokenIdentifier: string }) {
  const adminIds = (process.env.TRACIFY_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return adminIds.includes(identity.subject);
}

export function canAccessProject(
  project: Doc<"projects">,
  identity: { subject: string; tokenIdentifier: string },
) {
  const clerkOrgId = getOrgId(identity);
  if (clerkOrgId && project.clerkOrgId === clerkOrgId) return true;
  return project.clerkUserId === identity.subject;
}

export function canAdminProject(
  project: Doc<"projects">,
  identity: { subject: string; tokenIdentifier: string },
) {
  if (isAdmin(identity)) return true;
  if (project.clerkUserId === identity.subject) return true;

  const clerkOrgId = getOrgId(identity);
  const orgRole = getOrgRole(identity);
  return (
    Boolean(clerkOrgId && project.clerkOrgId === clerkOrgId) &&
    (orgRole === "owner" || orgRole === "admin" || orgRole === "org:admin")
  );
}

function validateSlackWebhookUrl(value: string | undefined) {
  if (!value) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Slack webhook must be a valid Slack webhook URL");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "hooks.slack.com" ||
    !parsed.pathname.startsWith("/services/")
  ) {
    throw new Error("Slack webhook must be a valid Slack webhook URL");
  }

  return value;
}

function validateTeamsWebhookUrl(value: string | undefined) {
  if (!value) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Teams webhook must be a valid Microsoft Teams webhook URL");
  }

  const isTeamsConnector = parsed.hostname.endsWith(".webhook.office.com");
  const isPowerAutomate = parsed.hostname.endsWith(".logic.azure.com");
  if (parsed.protocol !== "https:" || !(isTeamsConnector || isPowerAutomate)) {
    throw new Error("Teams webhook must be a valid Microsoft Teams webhook URL");
  }

  return value;
}

function validateProjectSettings(args: {
  name?: string;
  clientName?: string;
  reportNotes?: string;
  costThresholdUsd?: number;
  maxDurationSeconds?: number;
  maxStallMinutes?: number;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
  redactionEnabled?: boolean;
  redactionRules?: string[];
  retentionDays?: number;
  runtimePolicy?: {
    enforcementMode?: "observe" | "enforce";
    maxCostPerRun?: number;
    maxCostPerDay?: number;
    fallbackChain?: string[];
    retryPolicy?: {
      maxAttempts: number;
      backoffMs: number;
      backoffMultiplier: number;
      retryableErrors: string[];
    };
    latencyBudgetMs?: number;
  };
}) {
  if (args.name !== undefined && args.name.trim().length === 0) {
    throw new Error("Project name is required");
  }
  if (
    args.costThresholdUsd !== undefined &&
    (!Number.isFinite(args.costThresholdUsd) || args.costThresholdUsd < 0)
  ) {
    throw new Error("Cost threshold must be a non-negative number");
  }
  if (args.retentionDays !== undefined && (!Number.isInteger(args.retentionDays) || args.retentionDays < 1 || args.retentionDays > 3650)) {
    throw new Error("Retention must be between 1 and 3650 days");
  }
  if (
    args.maxDurationSeconds !== undefined &&
    (!Number.isInteger(args.maxDurationSeconds) || args.maxDurationSeconds <= 0)
  ) {
    throw new Error("Duration threshold must be a positive integer");
  }
  if (
    args.maxStallMinutes !== undefined &&
    (!Number.isInteger(args.maxStallMinutes) || args.maxStallMinutes <= 0)
  ) {
    throw new Error("Stall threshold must be a positive integer");
  }

  return {
    name: args.name?.trim(),
    clientName: args.clientName?.trim() || undefined,
    reportNotes: args.reportNotes?.trim() || undefined,
    costThresholdUsd: args.costThresholdUsd,
    maxDurationSeconds: args.maxDurationSeconds,
    maxStallMinutes: args.maxStallMinutes,
    slackWebhookUrl: validateSlackWebhookUrl(args.slackWebhookUrl),
    teamsWebhookUrl: validateTeamsWebhookUrl(args.teamsWebhookUrl),
    redactionEnabled: args.redactionEnabled,
    redactionRules: args.redactionRules?.slice(0, 20),
    retentionDays: args.retentionDays,
    runtimePolicy: args.runtimePolicy ? validateRuntimePolicy(args.runtimePolicy) : undefined,
  };
}

function validateRuntimePolicy(policy: {
  enforcementMode?: "observe" | "enforce";
  maxCostPerRun?: number;
  maxCostPerDay?: number;
  fallbackChain?: string[];
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
  };
  latencyBudgetMs?: number;
}) {
  const enforcementMode = policy.enforcementMode ?? "observe";

  if (policy.maxCostPerRun !== undefined) {
    if (!Number.isFinite(policy.maxCostPerRun) || policy.maxCostPerRun <= 0) {
      throw new Error("maxCostPerRun must be a positive number");
    }
  }
  if (policy.maxCostPerDay !== undefined) {
    if (!Number.isFinite(policy.maxCostPerDay) || policy.maxCostPerDay <= 0) {
      throw new Error("maxCostPerDay must be a positive number");
    }
  }
  if (policy.latencyBudgetMs !== undefined) {
    if (!Number.isInteger(policy.latencyBudgetMs) || policy.latencyBudgetMs <= 0) {
      throw new Error("latencyBudgetMs must be a positive integer");
    }
  }
  if (policy.fallbackChain) {
    if (!Array.isArray(policy.fallbackChain) || policy.fallbackChain.length === 0) {
      throw new Error("fallbackChain must be a non-empty array of model IDs");
    }
    for (const model of policy.fallbackChain) {
      if (typeof model !== "string" || model.trim().length === 0) {
        throw new Error("Each model in fallbackChain must be a non-empty string");
      }
    }
  }
  if (policy.retryPolicy) {
    const rp = policy.retryPolicy;
    if (!Number.isInteger(rp.maxAttempts) || rp.maxAttempts < 0 || rp.maxAttempts > 10) {
      throw new Error("retryPolicy.maxAttempts must be an integer between 0 and 10");
    }
    if (!Number.isFinite(rp.backoffMs) || rp.backoffMs < 0) {
      throw new Error("retryPolicy.backoffMs must be a non-negative number");
    }
    if (!Number.isFinite(rp.backoffMultiplier) || rp.backoffMultiplier < 1) {
      throw new Error("retryPolicy.backoffMultiplier must be >= 1");
    }
    if (!Array.isArray(rp.retryableErrors)) {
      throw new Error("retryPolicy.retryableErrors must be an array");
    }
  }

  return {
    enforcementMode,
    maxCostPerRun: policy.maxCostPerRun,
    maxCostPerDay: policy.maxCostPerDay,
    fallbackChain: policy.fallbackChain ?? [],
    retryPolicy: policy.retryPolicy ?? {
      maxAttempts: 0,
      backoffMs: 1000,
      backoffMultiplier: 2,
      retryableErrors: ["timeout", "5xx"],
    },
    latencyBudgetMs: policy.latencyBudgetMs,
  };
}

function publicProject(project: Doc<"projects">) {
  return {
    _id: project._id,
    name: project.name,
    slug: project.slug,
    clerkUserId: project.clerkUserId,
    clerkOrgId: project.clerkOrgId ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    planTier: project.planTier,
    stripeCustomerId: project.stripeCustomerId ?? null,
    stripeSubscriptionId: project.stripeSubscriptionId ?? null,
    stripeSubscriptionStatus: project.stripeSubscriptionStatus ?? null,
    stripePriceId: project.stripePriceId ?? null,
    subscriptionCurrentPeriodEnd: project.subscriptionCurrentPeriodEnd ?? null,
    cancelAtPeriodEnd: project.cancelAtPeriodEnd ?? false,
    clientName: project.clientName ?? null,
    reportNotes: project.reportNotes ?? null,
    apiKeyPrefix: project.apiKeyPrefix,
    apiKeyLast4: project.apiKeyLast4,
    apiKeyStatus: project.apiKeyStatus,
    apiKeyCreatedAt: project.apiKeyCreatedAt,
    apiKeyLastUsedAt: project.apiKeyLastUsedAt ?? null,
    onboardingStep: project.onboardingStep ?? null,
    onboardingDismissedAt: project.onboardingDismissedAt ?? null,
    onboardingSdk: project.onboardingSdk ?? null,
    costThresholdUsd: project.costThresholdUsd,
    maxDurationSeconds: project.maxDurationSeconds,
    maxStallMinutes: project.maxStallMinutes,
    slackWebhookUrl: project.slackWebhookUrl ?? null,
    teamsWebhookUrl: project.teamsWebhookUrl ?? null,
    runtimePolicy: project.runtimePolicy ?? null,
    redactionEnabled: project.redactionEnabled ?? true,
    redactionRules: project.redactionRules ?? [],
    retentionDays: project.retentionDays ?? 365,
  };
}

export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args): Promise<{
    projectId: Id<"projects">;
    name: string;
    slug: string;
    plaintextApiKey: string;
    apiKey: string;
    apiKeyPrefix: string;
    apiKeyLast4: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const name = args.name.trim();
    if (!name) {
      throw new Error("Project name is required");
    }

    const clerkOrgId = getOrgId(identity);
    const slug = `${slugify(name)}-${randomHex(3)}`;
    const prefix = apiKeyPrefix();
    const plaintextApiKey = `${prefix}${randomHex(16)}`;
    const apiKeyHash = await hmacSha256(plaintextApiKey);
    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      name,
      slug,
      clerkUserId: identity.subject,
      ownerId: identity.subject,
      clerkOrgId,
      createdAt: now,
      updatedAt: now,
      planTier: "free",
      apiKeyPrefix: prefix,
      apiKeyLast4: plaintextApiKey.slice(-4),
      apiKeyHash,
      apiKeyStatus: "active",
      apiKeyCreatedAt: now,
      costThresholdUsd: 1,
      maxDurationSeconds: 300,
      maxStallMinutes: 5,
      onboardingStep: "api-key",
    });

    return {
      projectId,
      name,
      slug,
      plaintextApiKey,
      apiKey: plaintextApiKey,
      apiKeyPrefix: prefix,
      apiKeyLast4: plaintextApiKey.slice(-4),
    };
  },
});

export const updateOnboardingProgress = mutation({
  args: {
    projectId: v.id("projects"),
    step: v.optional(v.union(v.literal("project"), v.literal("api-key"), v.literal("install"), v.literal("waiting"), v.literal("success"))),
    dismissed: v.optional(v.boolean()),
    sdk: v.optional(v.union(v.literal("python"), v.literal("typescript"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAdminProject(project, identity)) throw new Error("Project not found or access denied");
    await ctx.db.patch(args.projectId, {
      ...(args.step ? { onboardingStep: args.step } : {}),
      ...(args.sdk ? { onboardingSdk: args.sdk } : {}),
      ...(args.dismissed !== undefined ? { onboardingDismissedAt: args.dismissed ? Date.now() : undefined } : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const createProjectForUser = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.string(),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    projectId: Id<"projects">;
    name: string;
    slug: string;
    plaintextApiKey: string;
    apiKey: string;
    apiKeyPrefix: string;
    apiKeyLast4: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isAdmin(identity)) {
      throw new Error("Admin access required");
    }

    const name = args.name.trim();
    if (!name) {
      throw new Error("Project name is required");
    }

    const slug = `${slugify(name)}-${randomHex(3)}`;
    const prefix = apiKeyPrefix();
    const plaintextApiKey = `${prefix}${randomHex(16)}`;
    const apiKeyHash = await hmacSha256(plaintextApiKey);
    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      name,
      slug,
      clerkUserId: args.clerkUserId,
      ownerId: args.clerkUserId,
      clerkOrgId: args.clerkOrgId,
      createdAt: now,
      updatedAt: now,
      planTier: "free",
      apiKeyPrefix: prefix,
      apiKeyLast4: plaintextApiKey.slice(-4),
      apiKeyHash,
      apiKeyStatus: "active",
      apiKeyCreatedAt: now,
      costThresholdUsd: 1,
      maxDurationSeconds: 300,
      maxStallMinutes: 5,
    });

    return {
      projectId,
      name,
      slug,
      plaintextApiKey,
      apiKey: plaintextApiKey,
      apiKeyPrefix: prefix,
      apiKeyLast4: plaintextApiKey.slice(-4),
    };
  },
});

export const getProjectByApiKey = query({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, { apiKeyHash }) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", apiKeyHash))
      .unique();

    if (!project || project.apiKeyStatus !== "active") {
      return null;
    }

    return {
      _id: project._id,
      name: project.name,
      apiKeyPrefix: project.apiKeyPrefix,
      apiKeyLast4: project.apiKeyLast4,
      redactionEnabled: project.redactionEnabled ?? true,
      redactionRules: project.redactionRules ?? [],
      retentionDays: project.retentionDays ?? 365,
      planTier: project.planTier ?? "free",
    };
  },
});

export const markApiKeyUsed = mutation({
  args: { projectId: v.id("projects"), apiKeyHash: v.string(), lastUsedAt: v.number() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", args.apiKeyHash))
      .unique();
    if (!project || project._id !== args.projectId || project.apiKeyStatus !== "active") {
      throw new Error("Invalid API key");
    }
    await ctx.db.patch(args.projectId, {
      apiKeyLastUsedAt: args.lastUsedAt,
      updatedAt: args.lastUsedAt,
    });
    return null;
  },
});

export const getProjectsByUserOrOrg = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const clerkOrgId = getOrgId(identity);
    const projects = clerkOrgId
      ? await ctx.db
        .query("projects")
        .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
        .order("desc")
        .take(50)
      : await ctx.db
        .query("projects")
        .withIndex("by_clerkUserId", (q) =>
          q.eq("clerkUserId", identity.subject),
        )
        .order("desc")
        .take(50);

    return projects.map(publicProject);
  },
});

export const getProjectById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;

    return publicProject(project);
  },
});

export const getProjectForAdmin = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;
    if (!canAdminProject(project, identity)) return null;

    return publicProject(project);
  },
});

export const getProjectRouteState = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { status: "unauthenticated" as const, projectId: null };
    }

    const normalizedProjectId = ctx.db.normalizeId("projects", projectId);
    const existingProjects = await getProjectsForIdentity(ctx, identity);

    if (!normalizedProjectId) {
      return {
        status: existingProjects.length
          ? ("not_found" as const)
          : ("no_projects" as const),
        projectId: null,
      };
    }

    const project = await ctx.db.get(normalizedProjectId);
    if (!project || !canAccessProject(project, identity)) {
      return {
        status: existingProjects.length
          ? ("not_found" as const)
          : ("no_projects" as const),
        projectId: null,
      };
    }

    return {
      status: "ready" as const,
      projectId: project._id,
      projectName: project.name,
    };
  },
});

export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(id);
    if (!project || !canAccessProject(project, identity)) return null;

    return publicProject(project);
  },
});

export const getProjectsByOrg = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const projects = await getProjectsForIdentity(ctx, identity);
    return projects.map(publicProject);
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccessProject(project, identity)) return null;

    return publicProject(project);
  },
});

export const getProjectManagementSummary = query({
  args: { projectId: v.id("projects"), environment: v.optional(v.string()), days: v.optional(v.number()), traceName: v.optional(v.string()), sessionId: v.optional(v.string()), endUserId: v.optional(v.string()), release: v.optional(v.string()), model: v.optional(v.string()) },
  handler: async (ctx, { projectId, environment, days, traceName, sessionId, endUserId, release, model }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;

    const allRuns = await ctx.db
      .query("agentRuns")
      .withIndex("by_projectId_createdAt", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(250);
    const sessions = traceName || endUserId
      ? await ctx.db.query("sessions").withIndex("by_projectId_and_lastSeenAt", (q) => q.eq("projectId", projectId)).take(500)
      : [];
    const matchingSessionIds = sessions.filter((session) =>
      (!traceName || session.traceName?.toLowerCase().includes(traceName.toLowerCase())) &&
      (!endUserId || session.endUserId?.toLowerCase().includes(endUserId.toLowerCase())),
    ).map((session) => session.sessionId);
    const cutoff = days && days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
    const runs = environment && environment !== "all"
      ? allRuns.filter((run) => run.environment === environment)
      : allRuns;
    const rangedRuns = cutoff === null
      ? runs
      : runs.filter((run) => Date.parse(run.createdAt ?? run.startedAt) >= cutoff);
    const filteredRuns = rangedRuns.filter((run) =>
      (!traceName || run.runId.toLowerCase().includes(traceName.toLowerCase()) || matchingSessionIds.includes(run.sessionId ?? "")) &&
      (!sessionId || run.sessionId?.toLowerCase().includes(sessionId.toLowerCase())) &&
      (!release || run.release?.toLowerCase().includes(release.toLowerCase())) &&
      (!model || model === "All models" || run.primaryModel?.toLowerCase().includes(model.toLowerCase())) &&
      (!endUserId || matchingSessionIds.includes(run.sessionId ?? "")),
    );

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .take(250);

    const totalRuns = filteredRuns.length;
    const activeRuns = filteredRuns.filter((run) => run.status === "running").length;
    const failedRuns = filteredRuns.filter((run) => run.status === "failed").length;
    const completedRuns = filteredRuns.filter((run) => run.status === "completed").length;
    const totalSpans = filteredRuns.reduce((sum, run) => sum + run.spanCount, 0);
    const totalCostUsd = filteredRuns.reduce((sum, run) => sum + run.totalCostUsd, 0);
    const lastRun = filteredRuns[0] ?? null;

    return {
      project: publicProject(project),
      environments: [...new Set(allRuns.map((run) => run.environment).filter((value): value is string => Boolean(value)))].sort(),
      models: [...new Set(allRuns.map((run) => run.primaryModel).filter((value): value is string => Boolean(value)))].sort(),
      totals: {
        totalRuns,
        activeRuns,
        completedRuns,
        failedRuns,
        totalSpans,
        totalCostUsd,
        alertCount: alerts.length,
      },
      latestActivityAt:
        lastRun?.lastSpanAt ?? lastRun?.createdAt ?? lastRun?.startedAt ?? null,
      recentRuns: filteredRuns.slice(0, 8).map((run) => ({
        _id: run._id,
        runId: run.runId,
        status: run.status,
        spanCount: run.spanCount,
        totalCostUsd: run.totalCostUsd,
        startedAt: run.startedAt,
        lastSpanAt: run.lastSpanAt ?? null,
        primaryModel: run.primaryModel ?? null,
      })),
    };
  },
});

export const listByOrg = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, { clerkOrgId }) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
      .order("desc")
      .take(50);

    return projects.map(publicProject);
  },
});

async function getProjectsForIdentity(
  ctx: QueryCtx,
  identity: { subject: string; tokenIdentifier: string },
) {
  const clerkOrgId = getOrgId(identity);
  return clerkOrgId
    ? await ctx.db
      .query("projects")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
      .order("desc")
      .take(50)
    : await ctx.db
      .query("projects")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .order("desc")
      .take(50);
}

export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    clientName: v.optional(v.string()),
    reportNotes: v.optional(v.string()),
    costThresholdUsd: v.optional(v.number()),
    maxDurationSeconds: v.optional(v.number()),
    maxStallMinutes: v.optional(v.number()),
    slackWebhookUrl: v.optional(v.string()),
    teamsWebhookUrl: v.optional(v.string()),
    redactionEnabled: v.optional(v.boolean()),
    redactionRules: v.optional(v.array(v.string())),
    retentionDays: v.optional(v.number()),
    runtimePolicy: v.optional(v.object({
      enforcementMode: v.union(v.literal("observe"), v.literal("enforce")),
      maxCostPerRun: v.optional(v.number()),
      maxCostPerDay: v.optional(v.number()),
      fallbackChain: v.array(v.string()),
      retryPolicy: v.object({
        maxAttempts: v.number(),
        backoffMs: v.number(),
        backoffMultiplier: v.number(),
        retryableErrors: v.array(v.string()),
      }),
      latencyBudgetMs: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccessProject(project, identity)) {
      throw new Error("Project not found or access denied");
    }
    if (!canAdminProject(project, identity)) {
      throw new Error("Admin access required");
    }

    const { projectId, ...rawUpdates } = args;
    const updates = validateProjectSettings(rawUpdates);
    const planDays = planRetentionDays(project.planTier);
    if (updates.retentionDays !== undefined && planDays !== null && updates.retentionDays > planDays) {
      throw new Error(`Your plan keeps data for ${planDays} days. Upgrade to keep it longer.`);
    }
    await ctx.db.patch(projectId, {
      ...updates,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      projectId,
      actorId: identity.subject,
      actorEmail: identity.email,
      action: "updated",
      resource: "project_settings",
      summary: "Project settings updated",
      metadata: { fields: Object.keys(updates).join(",") },
      createdAt: Date.now(),
    });
  },
});

export const deleteProject = mutation({
  args: {
    projectId: v.id("projects"),
    confirmationName: v.string(),
    confirmationWord: v.string(),
  },
  handler: async (ctx, { projectId, confirmationName, confirmationWord }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) {
      throw new Error("Project not found or access denied");
    }
    if (!canAdminProject(project, identity)) {
      throw new Error("Admin access required");
    }

    if (confirmationName !== project.name || confirmationWord !== "DELETE") {
      throw new Error("Project deletion confirmation did not match");
    }

    // Removing the project first stops ingestion at once (its API key no longer resolves).
    // The rest of its data is cleared in batches so large projects never hit a transaction limit.
    await ctx.db.delete(projectId);
    await ctx.scheduler.runAfter(0, internal.projectData.purgeBatch, { projectId });
  },
});

export const rotateApiKey = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{
    plaintextApiKey: string;
    apiKeyPrefix: string;
    apiKeyLast4: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccessProject(project, identity)) {
      throw new Error("Project not found or access denied");
    }
    if (!canAdminProject(project, identity)) {
      throw new Error("Admin access required");
    }

    const prefix = apiKeyPrefix();
    const plaintextApiKey = `${prefix}${randomHex(16)}`;
    const apiKeyHash = await hmacSha256(plaintextApiKey);
    const now = Date.now();

    await ctx.db.patch(args.projectId, {
      apiKeyHash,
      apiKeyPrefix: prefix,
      apiKeyLast4: plaintextApiKey.slice(-4),
      apiKeyStatus: "active",
      apiKeyCreatedAt: now,
      apiKeyLastUsedAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      projectId: args.projectId,
      actorId: identity.subject,
      actorEmail: identity.email,
      action: "rotated",
      resource: "api_key",
      summary: "Project API key rotated",
      createdAt: now,
    });

    return {
      plaintextApiKey,
      apiKeyPrefix: prefix,
      apiKeyLast4: plaintextApiKey.slice(-4),
    };
  },
});

export const getRuntimePolicy = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;

    return project.runtimePolicy ?? null;
  },
});

export const getRuntimePolicyByApiKey = query({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, { apiKeyHash }) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", apiKeyHash))
      .unique();

    if (!project || project.apiKeyStatus !== "active") return null;

    return project.runtimePolicy ?? null;
  },
});

export const sendTestAlert = action({
  args: {
    projectId: v.id("projects"),
    channel: v.optional(v.union(v.literal("slack"), v.literal("teams"))),
  },
  handler: async (ctx, { projectId, channel = "slack" }) => {
    const project = await ctx.runQuery(api.projects.getProjectForAdmin, {
      projectId,
    });

    if (!project) {
      throw new Error("Project not found or access denied");
    }

    if (channel === "teams") {
      if (!project.teamsWebhookUrl) {
        throw new Error("Add a Teams webhook URL before sending a test alert");
      }

      const response = await fetch(project.teamsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          summary: "tracify test alert",
          themeColor: "000000",
          title: "tracify test alert",
          text: `Project ${project.name} is connected to this Teams channel.`,
        }),
      });

      if (!response.ok) {
        console.error("Teams test alert failed", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error("Teams test alert failed");
      }

      return { ok: true };
    }

    if (!project.slackWebhookUrl) {
      throw new Error("Add a Slack webhook URL before sending a test alert");
    }

    const response = await fetch(project.slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "tracify test alert",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*tracify test alert*",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Project ${project.name} is connected to this Slack channel.`,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Slack test alert failed", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error("Slack test alert failed");
    }

    return { ok: true };
  },
});
