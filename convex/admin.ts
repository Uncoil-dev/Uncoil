import { query, type QueryCtx } from "./_generated/server";
import { components } from "./_generated/api";

// Built-in owner account. More admins come from the same environment variables
// the lead inbox already uses (UNCOIL_LIBRARY_ADMIN_EMAILS, UNCOIL_ADMIN_USER_IDS).
const BUILT_IN_ADMIN_EMAILS = ["kristofferbon@gmail.com"];
// Every verified address on these domains is an admin.
const ADMIN_DOMAINS = ["uncoil.dev"];
const CAP = 500;

type AuthUser = { id?: string; _id?: string; name: string; email: string; emailVerified: boolean; createdAt: number };

function list(name: string) {
  return ((process.env[name] ?? process.env[name.replace("UNCOIL_", "TRACIFY_")]) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

/**
 * Admin access is enforced here, on the backend. The caller must be on the
 * allowlist AND have a verified email address on their account.
 */
async function adminEmail(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const email = identity.email?.toLowerCase();
  const emails = [...BUILT_IN_ADMIN_EMAILS, ...list("UNCOIL_LIBRARY_ADMIN_EMAILS").map((x) => x.toLowerCase())];
  const allowed = list("UNCOIL_ADMIN_USER_IDS").includes(identity.subject) || (!!email && (emails.includes(email) || ADMIN_DOMAINS.some((d) => email.endsWith("@" + d))));
  if (!allowed || !email) return null;
  const account = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "email", value: email }],
  })) as AuthUser | null;
  if (!account || account.emailVerified !== true) return null;
  return email;
}

async function requireAdmin(ctx: QueryCtx) {
  const email = await adminEmail(ctx);
  if (!email) throw new Error("Admin access required");
  return { email };
}

/** Lets the app decide whether to show the Admin link and page. Never throws. */
export const access = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return { authenticated: !!identity, allowed: !!identity && !!(await adminEmail(ctx)) };
  },
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

    const userPage = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: CAP },
      sortBy: { field: "createdAt", direction: "desc" },
    })) as { page: AuthUser[]; isDone: boolean };
    const users = userPage.page.map((u) => ({
      id: String(u.id ?? u._id ?? u.email),
      name: u.name,
      email: u.email,
      verified: u.emailVerified,
      signedUpAt: u.createdAt,
    }));

    const projectDocs = await ctx.db.query("projects").order("desc").take(CAP);
    const userById = new Map(users.map((u) => [u.id, u]));
    const projectsByOwner = new Map<string, number>();
    for (const p of projectDocs) {
      const ownerId = p.ownerId ?? p.clerkUserId;
      if (ownerId) projectsByOwner.set(ownerId, (projectsByOwner.get(ownerId) ?? 0) + 1);
    }
    const usersWithProjects = users.map((u) => ({ ...u, projectCount: projectsByOwner.get(u.id) ?? 0 }));
    const projects = projectDocs.map((p) => ({
      id: p._id,
      name: p.name,
      plan: p.planTier ?? "free",
      subscription: p.stripeSubscriptionStatus ?? null,
      hasApiKey: p.apiKeyStatus === "active",
      lastKeyUseAt: p.apiKeyLastUsedAt ?? null,
      createdAt: p.createdAt ?? p._creationTime,
      periodEnd: p.subscriptionCurrentPeriodEnd ?? null,
      cancelling: p.cancelAtPeriodEnd ?? false,
      owner: p.ownerId ?? p.clerkUserId ?? p.clerkOrgId ?? null,
      ownerEmail: userById.get(p.ownerId ?? p.clerkUserId ?? "")?.email ?? null,
      ownerName: userById.get(p.ownerId ?? p.clerkUserId ?? "")?.name ?? null,
    }));
    const nameById = new Map(projectDocs.map((p) => [p._id as string, p.name]));

    const runDocs = await ctx.db.query("agentRuns").order("desc").take(CAP);
    const runs24h = runDocs.filter((r) => r.startedAt >= dayAgo);
    const runs7d = runDocs.filter((r) => r.startedAt >= weekAgo);
    const sum = (rows: typeof runDocs, f: (r: (typeof runDocs)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
    const usageByProject = new Map<string, { runs: number; spans: number; costUsd: number; failed: number }>();
    for (const r of runs7d) {
      const row = usageByProject.get(r.projectId) ?? { runs: 0, spans: 0, costUsd: 0, failed: 0 };
      row.runs += 1; row.spans += r.spanCount; row.costUsd += r.totalCostUsd; row.failed += r.status === "failed" ? 1 : 0;
      usageByProject.set(r.projectId, row);
    }
    const usage = [...usageByProject.entries()]
      .map(([projectId, u]) => ({ projectId, project: nameById.get(projectId) ?? "Deleted project", ...u }))
      .sort((a, b) => b.runs - a.runs).slice(0, 25);

    const alertDocs = await ctx.db.query("alerts").order("desc").take(100);
    const alerts = alertDocs.map((a) => ({
      id: a._id, type: a.type, message: a.message, state: a.state ?? "active",
      project: nameById.get(a.projectId) ?? "Deleted project", triggeredAt: a.triggeredAt,
    }));
    const ruleDocs = await ctx.db.query("alertRules").order("desc").take(CAP);

    const leadDocs = await ctx.db.query("leadSubmissions").withIndex("by_createdAt").order("desc").take(CAP);
    const leads = leadDocs.map((l) => ({
      id: l._id, name: l.name, email: l.email, company: l.company ?? null, intent: l.intent,
      status: l.status, source: l.sourcePath, createdAt: l.createdAt,
    }));
    const auditDocs = await ctx.db.query("auditLogs").order("desc").take(200);
    const audit = auditDocs.map((a) => ({
      id: a._id, actor: a.actorEmail ?? a.actorId, action: a.action, summary: a.summary,
      project: nameById.get(a.projectId) ?? "Deleted project", createdAt: a.createdAt,
    }));

    const planCounts: Record<string, number> = { free: 0, pro: 0, team: 0, enterprise: 0 };
    for (const p of projects) planCounts[p.plan] = (planCounts[p.plan] ?? 0) + 1;

    const recentRuns = runDocs.slice(0, 30).map((r) => ({
      id: r._id, runId: r.runId, status: r.status, project: nameById.get(r.projectId) ?? "Deleted project",
      model: r.primaryModel ?? null, spans: r.spanCount, costUsd: r.totalCostUsd, startedAt: r.startedAt,
    }));

    return {
      generatedAt: now,
      capped: { users: !userPage.isDone, projects: projectDocs.length >= CAP, runs: runDocs.length >= CAP },
      totals: {
        users: users.length,
        verifiedUsers: users.filter((u) => u.verified).length,
        signups7d: users.filter((u) => u.signedUpAt >= now - 7 * 24 * 3600 * 1000).length,
        projects: projects.length,
        projectsWithKey: projects.filter((p) => p.hasApiKey).length,
        paidProjects: projects.filter((p) => p.plan !== "free").length,
        runs24h: runs24h.length, runs7d: runs7d.length,
        spans7d: sum(runs7d, (r) => r.spanCount),
        cost24hUsd: sum(runs24h, (r) => r.totalCostUsd),
        cost7dUsd: sum(runs7d, (r) => r.totalCostUsd),
        failed7d: runs7d.filter((r) => r.status === "failed").length,
        activeAlerts: alertDocs.filter((a) => (a.state ?? "active") === "active").length,
        alertRules: ruleDocs.length,
      },
      planCounts,
      leads,
      newLeads: leads.filter((l) => l.status === "new").length,
      audit,
      users: usersWithProjects,
      projects,
      usage,
      alerts,
      recentRuns,
    };
  },
});

