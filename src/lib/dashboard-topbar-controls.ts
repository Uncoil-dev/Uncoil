const DATA_SECTIONS = new Set([
  "tracing",
  "runs",
  "search",
  "costs",
  "sessions",
  "users",
  "steps",
  "traces",
  "scores",
  "operations",
]);

/** Which top bar controls apply to a dashboard path; setup and settings pages have no time range. */
export function topbarControlsFor(pathname: string): { range: boolean; environment: boolean; filters: boolean } {
  const segments = pathname.split("/").filter(Boolean);
  const isOverview = segments[0] === "dashboard" && segments.length === 2;
  const section = segments[2];
  const showData = isOverview || (section !== undefined && DATA_SECTIONS.has(section));
  return { range: showData, environment: showData, filters: isOverview };
}
