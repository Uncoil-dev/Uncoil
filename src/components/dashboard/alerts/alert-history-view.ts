export type HistoryState = "active" | "resolved" | "muted";
export type HistoryFilter = "all" | "open" | "resolved" | "muted" | "held";

const BADGES: Record<HistoryState, { label: string; color: string }> = {
  active: { label: "OPEN", color: "#FF6B6B" },
  resolved: { label: "RESOLVED", color: "#5BE3A0" },
  muted: { label: "MUTED", color: "#8B93A1" },
};

export function historyBadge(state: HistoryState) {
  return BADGES[state] ?? BADGES.resolved;
}

export function matchesHistoryFilter(item: { state: HistoryState; silencedBy?: string }, filter: HistoryFilter) {
  if (filter === "all") return true;
  if (filter === "open") return item.state === "active";
  if (filter === "held") return Boolean(item.silencedBy);
  return item.state === filter;
}

// Rule, budget, evaluation monitor and hand-made alerts store a made-up id ("rule:<id>:<time>") instead of a run id.
const SYNTHETIC_RUN_ID = /^(rule|budget|eval-monitor[\w-]*|manual(-alert)?):/;

/** Where a history row leads: the run itself, or Tracing over the window the alert looked at. */
export function historyLink(projectId: string, item: { runId: string; ruleId?: string; type: string; triggeredAt: string; windowMinutes?: number }) {
  const base = `/dashboard/${projectId}/tracing`;
  if (!SYNTHETIC_RUN_ID.test(item.runId)) return { label: "Open trace", href: `${base}?trace=${encodeURIComponent(item.runId)}` };
  const to = Date.parse(item.triggeredAt);
  const from = to - (item.windowMinutes ?? 60) * 60_000;
  if (item.ruleId && item.type === "failed_runs") return { label: "See failing traces", href: `${base}?status=error&from=${from}&to=${to}` };
  return { label: "See traces from then", href: `${base}?from=${from}&to=${to}` };
}
