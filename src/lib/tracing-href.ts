/**
 * Builds a Tracing link for a window of whole days, using Tracing's own query keys.
 * Tracing has no "1d" range, so a one-day window uses its 24-hour range.
 */
export function tracingHref(projectId: string, days: number, filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ ...filters, range: days === 1 ? "24h" : `${days}d` });
  return `/dashboard/${projectId}/tracing?${params}`;
}
