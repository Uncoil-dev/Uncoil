/** Which runs a bulk action touches, and the guard rails around it. Pure, so it is easy to test. */

export type BatchFilter = {
  status?: "running" | "completed" | "failed" | "cancelled";
  environment?: string;
  modelContains?: string;
  olderThanHours?: number;
};
export type BatchAction = "cancel_stuck" | "queue_review" | "add_score";

export const BATCH_SCAN_LIMIT = 2000;
export const BATCH_RUN_LIMIT = 300;
export const BATCH_ACTIONS: Record<BatchAction, { title: string; needsStatus?: "running"; needsAge?: boolean }> = {
  cancel_stuck: { title: "Close stuck runs", needsStatus: "running", needsAge: true },
  queue_review: { title: "Send to the review queue" },
  add_score: { title: "Add a score" },
};

export type RunLike = { runId: string; status: string; startedAt: string; lastSpanAt?: string; environment?: string; primaryModel?: string };

export function checkFilter(action: BatchAction, filter: BatchFilter): string | null {
  const rule = BATCH_ACTIONS[action];
  if (!rule) return "Pick an action.";
  if (rule.needsStatus && filter.status !== rule.needsStatus) return "Only runs that are still running can be closed.";
  if (rule.needsAge && !(filter.olderThanHours !== undefined && filter.olderThanHours >= 1)) return "Closing stuck runs needs an age of at least 1 hour, so a live run is never cut off.";
  if (filter.olderThanHours !== undefined && (!Number.isFinite(filter.olderThanHours) || filter.olderThanHours < 0 || filter.olderThanHours > 24 * 365)) return "Age must be between 0 and 8,760 hours.";
  if ((filter.modelContains?.length ?? 0) > 80 || (filter.environment?.length ?? 0) > 80) return "Filters can be at most 80 characters.";
  return null;
}

/** A run's age counts from its last activity, so a run that is still sending steps is never old. */
export function matchesRun(run: RunLike, filter: BatchFilter, now: number): boolean {
  if (filter.status && run.status !== filter.status) return false;
  if (filter.environment?.trim() && (run.environment ?? "") !== filter.environment.trim()) return false;
  const needle = filter.modelContains?.trim().toLowerCase();
  if (needle && !(run.primaryModel ?? "").toLowerCase().includes(needle)) return false;
  if (filter.olderThanHours !== undefined) {
    const last = Date.parse(run.lastSpanAt ?? run.startedAt);
    if (!Number.isFinite(last) || now - last < filter.olderThanHours * 3_600_000) return false;
  }
  return true;
}
