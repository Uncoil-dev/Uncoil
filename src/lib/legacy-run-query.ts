type RawQuery = Record<string, string | string[] | undefined>;

/** Day counts the old Runs filters offered, mapped to the matching Tracing range. */
const DAY_RANGES: Record<string, string> = { "1": "24h", "2": "2d", "3": "3d", "7": "7d", "14": "14d", "30": "30d", "90": "90d" };

/**
 * Translates an old `/runs` query string into Tracing's own keys, so bookmarked
 * and shared Runs links keep their filters after the redirect.
 */
export function legacyRunQuery(raw: RawQuery): string {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string" || !value) continue;
    if (key === "status") {
      // Tracing filters only on errors or healthy traces.
      const status = value === "failed" ? "error" : value;
      if (status === "error" || status === "healthy") out.set("status", status);
    } else if (key === "days") {
      if (DAY_RANGES[value]) out.set("range", DAY_RANGES[value]);
    } else if (key === "sort" && value === "duration") {
      out.set("sort", "latency");
      out.set("dir", "desc");
    } else if (key === "model") {
      out.set("modelId", value);
    } else {
      out.set(key, value);
    }
  }
  return out.toString();
}
