import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

function getOrgId(identity: unknown) {
  const value = (identity as { orgId?: unknown; org_id?: unknown }).orgId ??
    (identity as { org_id?: unknown }).org_id;
  return typeof value === "string" && value ? value : undefined;
}

function canAccessProject(project: Doc<"projects">, identity: { subject: string; tokenIdentifier: string }) {
  const orgId = getOrgId(identity);
  return (Boolean(orgId && project.clerkOrgId === orgId) || project.clerkUserId === identity.subject);
}

// Convex's generated context types are shared with the legacy prompt functions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireProject(ctx: any, projectId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const project = await ctx.db.get(projectId);
  if (!project || !canAccessProject(project, identity)) throw new Error("Project not found or access denied");
  return { identity, project };
}

const LABEL_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
const MAX_LABELS = 10;
const MAX_CONTENT_LENGTH = 100_000;
const MAX_NOTE_LENGTH = 200;
const VERSIONS_SHOWN = 20;

/** Trims, de-duplicates and checks labels; a label that cannot be typed in a URL or SDK call is refused. */
function cleanLabels(labels: string[]) {
  const cleaned = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (cleaned.length > MAX_LABELS) throw new Error(`A version can have at most ${MAX_LABELS} labels`);
  const bad = cleaned.find((label) => !LABEL_PATTERN.test(label));
  if (bad) throw new Error(`"${bad.slice(0, 40)}" is not a valid label. Use letters, numbers, dots, dashes and underscores, up to 40 characters.`);
  return cleaned;
}

/**
 * Labels are pointers: each label names one version of a prompt. Giving a label to a version takes it away from
 * the prompt's other versions, so an SDK asking for "staging" always gets exactly one answer.
 */
async function moveLabels(ctx: MutationCtx, promptId: Id<"prompts">, keepVersionId: Id<"promptVersions"> | null, labels: string[]) {
  if (!labels.length) return;
  const versions = await ctx.db.query("promptVersions").withIndex("by_promptId", (q) => q.eq("promptId", promptId)).order("desc").take(200);
  for (const version of versions) {
    if (version._id === keepVersionId || !version.labels.some((label) => labels.includes(label))) continue;
    await ctx.db.patch(version._id, { labels: version.labels.filter((label) => !labels.includes(label)) });
  }
}

function variablesFromContent(content: string) {
  return [...new Set(Array.from(content.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g), (match) => match[1]))];
}

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return [];
    const prompts = await ctx.db.query("prompts").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(200);
    return Promise.all(prompts.map(async (prompt) => ({
      ...prompt,
      versions: await ctx.db.query("promptVersions").withIndex("by_promptId", (q) => q.eq("promptId", prompt._id)).order("desc").take(VERSIONS_SHOWN),
    })));
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("chat")),
    content: v.string(),
    model: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const name = args.name.trim();
    const content = args.content.trim();
    if (!name || !content) throw new Error("Prompt name and content are required");
    if (name.length > 100) throw new Error("A prompt name can be at most 100 characters");
    if (content.length > MAX_CONTENT_LENGTH) throw new Error("The prompt is too long");
    const duplicate = await ctx.db.query("prompts").withIndex("by_projectId_and_name", (q) => q.eq("projectId", args.projectId).eq("name", name)).first();
    if (duplicate) throw new Error("A prompt with this name already exists");
    const labels = cleanLabels(args.labels ?? []);
    if (labels.includes("production")) throw new Error("Production promotion requires a passed evaluation release gate");
    const now = Date.now();
    const promptId = await ctx.db.insert("prompts", { projectId: args.projectId, name, description: args.description?.trim() || undefined, type: args.type, createdBy: identity.subject, createdAt: now, updatedAt: now });
    await ctx.db.insert("promptVersions", { promptId, projectId: args.projectId, version: 1, content, variables: variablesFromContent(content), labels: [...new Set(["latest", ...labels])], model: args.model?.trim() || undefined, createdBy: identity.subject, createdAt: now });
    return promptId;
  },
});

export const createVersion = mutation({
  args: { projectId: v.id("projects"), promptId: v.id("prompts"), content: v.string(), model: v.optional(v.string()), labels: v.optional(v.array(v.string())), commitMessage: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.projectId !== args.projectId) throw new Error("Prompt not found");
    const latest = await ctx.db.query("promptVersions").withIndex("by_promptId", (q) => q.eq("promptId", args.promptId)).order("desc").first();
    const version = (latest?.version ?? 0) + 1;
    const content = args.content.trim();
    if (!content) throw new Error("Prompt content is required");
    if (content.length > MAX_CONTENT_LENGTH) throw new Error("The prompt is too long");
    const labels = cleanLabels(args.labels ?? ["latest"]);
    if (labels.includes("production")) {
      throw new Error("Production promotion requires a passed evaluation release gate");
    }
    const note = args.commitMessage?.trim().slice(0, MAX_NOTE_LENGTH) || undefined;
    const now = Date.now();
    // "latest" always points at the newest version, so it leaves the one before it.
    await moveLabels(ctx, args.promptId, null, ["latest", ...labels]);
    await ctx.db.insert("promptVersions", { promptId: args.promptId, projectId: args.projectId, version, content, variables: variablesFromContent(content), labels: [...new Set(["latest", ...labels])], model: args.model?.trim() || undefined, commitMessage: note, createdBy: identity.subject, createdAt: now });
    await ctx.db.patch(args.promptId, { updatedAt: now });
    return version;
  },
});

export const update = mutation({
  args: { projectId: v.id("projects"), promptId: v.id("prompts"), name: v.optional(v.string()), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.projectId !== args.projectId) throw new Error("Prompt not found");
    const name = args.name?.trim();
    if (name && name !== prompt.name) {
      const duplicate = await ctx.db.query("prompts").withIndex("by_projectId_and_name", (q) => q.eq("projectId", args.projectId).eq("name", name)).first();
      if (duplicate) throw new Error("A prompt with this name already exists");
    }
    if (name && name.length > 100) throw new Error("A prompt name can be at most 100 characters");
    // An empty description clears it; leaving the argument out keeps it.
    const description = args.description === undefined ? prompt.description : args.description.trim().slice(0, 500) || undefined;
    await ctx.db.patch(args.promptId, { name: name || prompt.name, description, updatedAt: Date.now() });
  },
});

export const updateLabels = mutation({
  args: { projectId: v.id("projects"), versionId: v.id("promptVersions"), labels: v.array(v.string()) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const version = await ctx.db.get(args.versionId);
    if (!version || version.projectId !== args.projectId) throw new Error("Prompt version not found");
    const requested = cleanLabels(args.labels);
    // A version that already holds production may keep it (or give it up to roll back); nobody can hand it out here.
    if (requested.includes("production") && !version.labels.includes("production")) throw new Error("Production promotion requires a passed evaluation release gate");
    // "latest" is managed by Uncoil: it stays exactly where it is.
    const labels = [...requested.filter((label) => label !== "latest"), ...(version.labels.includes("latest") ? ["latest"] : [])];
    await moveLabels(ctx, version.promptId, version._id, labels.filter((label) => label !== "latest"));
    await ctx.db.patch(args.versionId, { labels });
  },
});

/** How many traces each version of a prompt has been linked to (counted up to 500) and when it was last used. */
export const versionUsage = query({
  args: { projectId: v.id("projects"), promptId: v.id("prompts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccessProject(project, identity)) return [];
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.projectId !== args.projectId) return [];
    const versions = await ctx.db.query("promptVersions").withIndex("by_promptId", (q) => q.eq("promptId", args.promptId)).order("desc").take(VERSIONS_SHOWN);
    return Promise.all(versions.map(async (version) => {
      const links = await ctx.db.query("promptTraceLinks").withIndex("by_promptVersionId", (q) => q.eq("promptVersionId", version._id)).order("desc").take(501);
      return { versionId: version._id, links: Math.min(links.length, 500), more: links.length > 500, lastLinkedAt: links[0]?.createdAt ?? null };
    }));
  },
});

export const linkTrace = mutation({
  args: { projectId: v.id("projects"), promptVersionId: v.id("promptVersions"), traceId: v.string(), spanId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const version = await ctx.db.get(args.promptVersionId);
    if (!version || version.projectId !== args.projectId) throw new Error("Prompt version not found");
    const existing = await ctx.db.query("promptTraceLinks").withIndex("by_traceId", (q) => q.eq("projectId", args.projectId).eq("traceId", args.traceId)).filter((q) => q.eq(q.field("promptVersionId"), args.promptVersionId)).first();
    if (existing) return existing._id;
    return ctx.db.insert("promptTraceLinks", { projectId: args.projectId, promptId: version.promptId, promptVersionId: args.promptVersionId, traceId: args.traceId, spanId: args.spanId, createdAt: Date.now() });
  },
});

export const linkTraceFromApiKey = mutation({
  args: { projectId: v.id("projects"), apiKeyHash: v.string(), promptVersionId: v.id("promptVersions"), traceId: v.string(), spanId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.apiKeyHash !== args.apiKeyHash) throw new Error("Invalid API key");
    const version = await ctx.db.get(args.promptVersionId);
    if (!version || version.projectId !== args.projectId) throw new Error("Prompt version not found");
    return ctx.db.insert("promptTraceLinks", { projectId: args.projectId, promptId: version.promptId, promptVersionId: args.promptVersionId, traceId: args.traceId, spanId: args.spanId, createdAt: Date.now() });
  },
});

export const listTraceLinks = query({
  args: { projectId: v.id("projects"), promptVersionId: v.optional(v.id("promptVersions")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccessProject(project, identity)) return [];
    const links = await ctx.db.query("promptTraceLinks").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).order("desc").take(200);
    return args.promptVersionId ? links.filter((link) => link.promptVersionId === args.promptVersionId) : links;
  },
});

export const resolveByApiKey = query({
  args: { apiKeyHash: v.string(), name: v.string(), environment: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.query("projects").withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", args.apiKeyHash)).first();
    if (!project || project.apiKeyStatus === "revoked") return null;
    const prompt = await ctx.db.query("prompts").withIndex("by_projectId_and_name", (q) => q.eq("projectId", project._id).eq("name", args.name.trim())).first();
    if (!prompt) return null;
    const versions = await ctx.db.query("promptVersions").withIndex("by_promptId", (q) => q.eq("promptId", prompt._id)).order("desc").collect();
    const version = versions.find((candidate) => candidate.labels.includes(args.environment.trim())) ?? null;
    if (!version) return null;
    return { prompt: { id: prompt._id, name: prompt.name, description: prompt.description, type: prompt.type }, version: { id: version._id, version: version.version ?? 1, content: version.content, variables: version.variables, labels: version.labels, model: version.model, createdAt: version.createdAt } };
  },
});
