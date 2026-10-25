import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { getConvexClient } from "@/lib/convex";
import { effectiveRetentionDays, groupProjectsByRetention } from "@/lib/retention";
import { purgeExpiredAnalytics } from "@/lib/tinybird";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ROUNDS_PER_PROJECT = 20;

/**
 * Daily clean-up: removes data older than each project's plan allows from ClickHouse (spans, scores)
 * and from the Convex run summaries, sessions and span caches that mirror it.
 */
export async function runRetention(jobSecret: string, now = Date.now()) {
  const convex = getConvexClient();
  const projects: { projectId: string; planTier?: string; retentionDays?: number }[] = [];
  let cursor: string | null = null;
  do {
    const page: { projects: typeof projects; continueCursor: string | null } = await convex.query(api.retention.listProjectsForRetention, { jobSecret, cursor });
    projects.push(...page.projects);
    cursor = page.continueCursor;
  } while (cursor);

  // Analytics first: one delete per retention length, covering every project on it.
  const groups = groupProjectsByRetention(projects);
  for (const [days, ids] of groups) await purgeExpiredAnalytics(ids, days);

  let deleted = 0;
  let hasMore = false;
  for (const project of projects) {
    const days = effectiveRetentionDays(project.planTier, project.retentionDays);
    if (days === null) continue;
    for (let round = 0; round < MAX_ROUNDS_PER_PROJECT; round++) {
      const result: { deleted: number; hasMore: boolean } = await convex.mutation(api.retention.purgeProjectData, {
        projectId: project.projectId as Id<"projects">,
        olderThan: now - days * DAY_MS,
        jobSecret,
      });
      deleted += result.deleted;
      if (!result.hasMore) break;
      if (round === MAX_ROUNDS_PER_PROJECT - 1) hasMore = true;
    }
  }
  return { projects: projects.length, analyticsGroups: groups.size, deleted, hasMore };
}
