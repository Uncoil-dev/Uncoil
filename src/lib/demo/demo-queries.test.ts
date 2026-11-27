import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

// Resolve hook for "@/" and extensionless relative imports.
const srcUrl = pathToFileURL(process.cwd() + "/src/").href;
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(${JSON.stringify(srcUrl)} + specifier.slice(2) + ".ts", context);
    }
    if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const queries = await import("./demo-queries.ts");
const { groupReleases, releaseFieldsFromRow } = await import("../error-group-release.ts");

const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const DAY = 86_400_000;
const WEEK = { fromMs: NOW - 7 * DAY, toMs: NOW };
const EMPTY = { fromMs: 0, toMs: 1 };

test("demoFilter limits runs to the time window and is empty for an empty window", () => {
  const runs = queries.demoFilter(WEEK, undefined, NOW);
  assert.ok(runs.length > 0);
  for (const run of runs) assert.ok(run.startMs >= WEEK.fromMs && run.startMs <= WEEK.toMs);
  assert.deepEqual(queries.demoFilter(EMPTY, undefined, NOW), []);
});

test("demoFilter status filters partition the runs", () => {
  const all = queries.demoFilter(WEEK, undefined, NOW).length;
  const failed = queries.demoFilter({ ...WEEK, status: "error" }, undefined, NOW);
  const healthy = queries.demoFilter({ ...WEEK, status: "healthy" }, undefined, NOW);
  assert.ok(failed.every((run) => run.errorCount > 0));
  assert.ok(healthy.every((run) => run.errorCount === 0));
  assert.equal(failed.length + healthy.length, all);
});

test("demoFilter applies facet, query and numeric filters", () => {
  const [first] = queries.demoFilter(WEEK, undefined, NOW);
  assert.ok(first);
  const byName = queries.demoFilter({ ...WEEK, facets: { traceName: [first.traceName] } }, undefined, NOW);
  assert.ok(byName.length > 0 && byName.every((run) => run.traceName === first.traceName));
  const excluded = queries.demoFilter({ ...WEEK, excludeFacets: { traceName: [first.traceName] } }, undefined, NOW);
  assert.ok(excluded.every((run) => run.traceName !== first.traceName));
  assert.deepEqual(queries.demoFilter({ ...WEEK, query: first.runId.toUpperCase() }, undefined, NOW).map((run) => run.runId), [first.runId]);
  assert.deepEqual(queries.demoFilter({ ...WEEK, query: "no-such-text-zzz" }, undefined, NOW), []);
  const slow = queries.demoFilter({ ...WEEK, minLatencyMs: 5000, maxCostUsd: 1 }, undefined, NOW);
  assert.ok(slow.every((run) => run.durationMs >= 5000 && run.totalCostUsd <= 1));
});

test("demoFilter ownFacet leaves that facet out of the filtering", () => {
  const [first] = queries.demoFilter(WEEK, undefined, NOW);
  assert.ok(first);
  const filters = { ...WEEK, facets: { environment: ["__none__"] } };
  assert.deepEqual(queries.demoFilter(filters, undefined, NOW), []);
  assert.ok(queries.demoFilter(filters, "environment", NOW).length > 0);
});

test("demoList sorts, pages and clamps page size", () => {
  const runs = queries.demoFilter(WEEK, undefined, NOW);
  const list = queries.demoList(runs, { ...WEEK, sort: "latency", direction: "asc", pageSize: 1, page: 0 });
  assert.equal(list.total, runs.length);
  assert.equal(list.pageSize, 10);
  assert.equal(list.rows.length, Math.min(10, runs.length));
  const durations = list.rows.map((row) => Number(row.durationMs));
  assert.deepEqual(durations, [...durations].sort((a, b) => a - b));
  const huge = queries.demoList(runs, { ...WEEK, pageSize: 9999, page: -3 });
  assert.equal(huge.pageSize, 200);
  assert.equal(huge.page, 0);
  const withExtras = queries.demoList(runs, WEEK, { extras: ["llmCalls", "rootType"], meta: ["missing"] });
  assert.equal(withExtras.rows[0]?.rootType, "agent");
  assert.deepEqual(withExtras.rows[0]?.meta, { missing: "" });
});

test("demoList handles empty input", () => {
  assert.deepEqual(queries.demoList([], EMPTY), { rows: [], total: 0, page: 0, pageSize: 50 });
});

test("demoStats totals runs and returns zeros when empty", () => {
  const runs = queries.demoFilter(WEEK, undefined, NOW);
  const stats = queries.demoStats(runs);
  assert.equal(stats.traces, runs.length);
  assert.equal(stats.errors, runs.filter((run) => run.errorCount > 0).length);
  assert.ok(stats.p95DurationMs >= stats.p50DurationMs);
  assert.deepEqual(queries.demoStats([]), {
    traces: 0, runningTraces: 0, errors: 0, p50DurationMs: 0, p95DurationMs: 0, totalCostUsd: 0, inputTokens: 0, outputTokens: 0,
  });
});

test("demoHistogram buckets every run in ascending order", () => {
  const runs = queries.demoFilter(WEEK, undefined, NOW);
  const { bucketSeconds, buckets } = queries.demoHistogram(runs, WEEK);
  assert.ok(bucketSeconds >= 60);
  assert.equal(buckets.reduce((sum, bucket) => sum + bucket.traces, 0), runs.length);
  assert.deepEqual(buckets.map((bucket) => bucket.bucket), buckets.map((bucket) => bucket.bucket).sort());
  assert.deepEqual(queries.demoHistogram([], EMPTY), { bucketSeconds: 60, buckets: [] });
});

test("demoFacets counts values and omits facets with no values", () => {
  const facets = queries.demoFacets(WEEK, NOW);
  const names = facets.traceName ?? [];
  assert.ok(names.length > 0);
  assert.equal(names.reduce((sum, item) => sum + item.traces, 0), queries.demoFilter(WEEK, undefined, NOW).length);
  assert.deepEqual(queries.demoFacets(EMPTY, NOW), {});
});

test("demoErrorGroups groups errors by id, most frequent first", () => {
  const runs = queries.demoFilter(WEEK, undefined, NOW);
  const { total, groups } = queries.demoErrorGroups(runs);
  assert.ok(total >= groups.length);
  for (let i = 1; i < groups.length; i++) assert.ok(groups[i - 1]!.count >= groups[i]!.count);
  const errorTotal = runs.reduce((sum, run) => sum + run.errors.length, 0);
  assert.ok(groups.reduce((sum, group) => sum + group.count, 0) <= errorTotal);
  assert.deepEqual(queries.demoErrorGroups([]), { total: 0, groups: [] });
});

test("groupReleases reports the first and latest release of a group seen across two releases", () => {
  assert.deepEqual(
    groupReleases([
      { release: "v1.14.0", at: "2026-06-10 09:00:00" },
      { release: "v1.13.2", at: "2026-06-08 09:00:00" },
      { release: "", at: "2026-06-12 09:00:00" },
    ]),
    { firstRelease: "v1.13.2", lastRelease: "v1.14.0" },
  );
  assert.deepEqual(groupReleases([{ release: "", at: "2026-06-08 09:00:00" }]), {});
  assert.deepEqual(releaseFieldsFromRow({ firstRelease: "", lastRelease: null }), {});
});

test("demoErrorGroups adds releases only for runs that carry one", () => {
  const base = queries.demoFilter(WEEK, undefined, NOW).find((run) => run.errors.length > 0)!;
  const error = base.errors[0]!;
  const run = (runId: string, startMs: number, release: string) => ({ ...base, runId, startMs, release, errors: [error] });
  const [two] = queries.demoErrorGroups([run("a", NOW - 3 * DAY, "v1.13.2"), run("b", NOW - DAY, "v1.14.0")]).groups;
  assert.equal(two!.firstRelease, "v1.13.2");
  assert.equal(two!.lastRelease, "v1.14.0");
  const [none] = queries.demoErrorGroups([run("c", NOW - DAY, "")]).groups;
  assert.ok(!("firstRelease" in none!) && !("lastRelease" in none!));
});

test("demoActivity returns sorted days that add up, and survives a bad time zone", () => {
  const days = queries.demoActivity({ fromMs: 0, toMs: NOW }, "UTC", NOW);
  assert.ok(days.length > 0);
  assert.deepEqual(days.map((day) => day.day), days.map((day) => day.day).sort());
  const bad = queries.demoActivity({ fromMs: 0, toMs: NOW }, "Not/AZone", NOW);
  assert.equal(bad.reduce((sum, day) => sum + day.traces, 0), days.reduce((sum, day) => sum + day.traces, 0));
});

test("demoMetadataKeys counts keys and is empty for an empty window", () => {
  const keys = queries.demoMetadataKeys(WEEK, NOW);
  for (let i = 1; i < keys.length; i++) assert.ok(keys[i - 1]!.traces >= keys[i]!.traces);
  assert.deepEqual(queries.demoMetadataKeys(EMPTY, NOW), []);
});

test("demoSummary compares the current period with the previous one", () => {
  const summary = queries.demoSummary(7, NOW);
  assert.equal(summary.days, 7);
  assert.equal(summary.stats.traces, queries.demoFilter(WEEK, undefined, NOW).length);
  assert.deepEqual(summary.range, { from: WEEK.fromMs, to: WEEK.toMs });
  assert.ok(summary.users.length <= 8);
  assert.ok(summary.failed.length <= 6);
  assert.equal(summary.daily.reduce((sum, day) => sum + day.traces, 0), summary.stats.traces);
});

test("demoGroups and demoGroupDetail cover sessions and users", () => {
  const filters = { ...WEEK, status: "all" as const, sort: "runs" as const, direction: "desc" as const, page: 0, pageSize: 5 };
  for (const kind of ["session", "user"] as const) {
    const result = queries.demoGroups(kind, filters, NOW);
    assert.ok(result.total > 0);
    assert.ok(result.rows.length <= 5);
    assert.equal(result.stats.groups, result.total);
    const [top] = result.rows;
    const detail = queries.demoGroupDetail(kind, top!.id, NOW);
    assert.equal(detail.row?.id, top!.id);
    assert.equal(queries.demoGroupDetail(kind, "missing-id", NOW).row, null);
  }
  const none = queries.demoGroups("session", { ...filters, ...EMPTY }, NOW);
  assert.deepEqual([none.rows, none.total, none.environments], [[], 0, []]);
});

test("demoCostStats returns ordered breakdowns and empty ones for zero days", () => {
  const stats = queries.demoCostStats(7, NOW);
  assert.ok(stats.dailyCosts.length > 0);
  assert.ok(stats.modelCosts.length <= 10);
  for (let i = 1; i < stats.userCosts.length; i++) assert.ok(stats.userCosts[i - 1]!.totalCostUsd >= stats.userCosts[i]!.totalCostUsd);
  assert.deepEqual(queries.demoCostStats(0, NOW), { dailyCosts: [], modelCosts: [], toolCosts: [], userCosts: [] });
});

test("demoTopics groups the filtered demo runs and is empty without runs", () => {
  const runs = queries.demoFilter(WEEK, undefined, NOW);
  const { total, sampled, topics } = queries.demoTopics(runs);
  assert.equal(sampled, runs.length > 2000);
  assert.ok(total > 0 && topics.length > 0);
  assert.ok(topics.reduce((sum, topic) => sum + topic.count, 0) <= runs.length);
  assert.deepEqual(queries.demoTopics([]), { total: 0, topics: [], sampled: false });
});

test("demoFilter with a topic keeps only that topic's runs", () => {
  const runs = queries.demoFilter(WEEK, undefined, NOW);
  const topic = queries.demoTopics(runs).topics[0]!;
  const filtered = queries.demoFilter({ ...WEEK, topic: topic.id }, undefined, NOW);
  assert.deepEqual(filtered.map((run) => run.runId).sort(), [...topic.runIds].sort());
  assert.ok(filtered.length < runs.length);
  assert.deepEqual(queries.demoFilter({ ...WEEK, topic: "deadbeef" }, undefined, NOW), []);
});
