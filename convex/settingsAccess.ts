import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canAccessProject, canAdminProject } from "./projects";

/** Project members can read and use settings; only administrators change secrets. Returns null for reads when access is missing. */
export async function readProject(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const project = await ctx.db.get(projectId);
  if (!project || !canAccessProject(project, identity)) return null;
  return { identity, project };
}

export async function requireMember(ctx: MutationCtx, projectId: Id<"projects">) {
  const found = await readProject(ctx, projectId);
  if (!found) throw new Error("Project not found or access denied");
  return found;
}

export async function requireAdmin(ctx: MutationCtx, projectId: Id<"projects">) {
  const found = await requireMember(ctx, projectId);
  if (!canAdminProject(found.project, found.identity)) throw new Error("Project administrator access required");
  return found;
}

export async function recordAudit(ctx: MutationCtx, projectId: Id<"projects">, identity: { subject: string; email?: string }, action: string, resource: string, summary: string, metadata?: Record<string, string>) {
  await ctx.db.insert("auditLogs", { projectId, actorId: identity.subject, actorEmail: identity.email, action, resource, summary, metadata, createdAt: Date.now() });
}
