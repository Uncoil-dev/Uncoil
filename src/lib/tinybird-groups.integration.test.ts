// @vitest-environment node
// Runs the session and user queries against a real ClickHouse. Skipped unless CLICKHOUSE_URL is set:
//   CLICKHOUSE_URL=http://127.0.0.1:8123 npx vitest run src/lib/tinybird-groups.integration.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { groupDetail, listGroups } from "./tinybird-groups";
import { parseGroupFilters } from "./group-filters";

const url = process.env.CLICKHOUSE_URL;
const NOW = Date.now();
const P = "proj_groups_test";

async function run(sql: string) {
  const res = await fetch(`${url}/?database=${process.env.CLICKHOUSE_DATABASE ?? "tracify"}`, { method: "POST", body: sql });
  if (!res.ok) throw new Error(await res.text());
}
const ts = (minutesAgo: number) => `toDateTime(${Math.floor((NOW - minutesAgo * 60_000) / 1000)})`;
const esc = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

type Step = { run: string; session: string; user: string; env?: string; type?: string; cost: number; model?: string; at: number; err?: string; tin?: number; tout?: number };
async function insert(steps: Step[], project = P) {
  const values = steps.map((s, i) => `('${esc(`${s.run}-${i}`)}','${esc(s.run)}','${project}','${s.type ?? "llm"}','in','out',100,${s.cost},'${s.model ?? "gpt-x"}','','','${esc(s.session)}','${esc(s.user)}','${s.env ?? "prod"}','',[],'agent','{}',${s.tin ?? 10},${s.tout ?? 5},'${s.err ? "Boom" : ""}',${ts(s.at)})`).join(",");
  await run(`INSERT INTO spans (spanId,runId,projectId,spanType,input,output,latencyMs,costUsd,modelId,toolName,parentSpanId,sessionId,endUserId,environment,release,tags,traceName,metadata,inputTokens,outputTokens,errorType,createdAt) VALUES ${values}`);
}

describe.skipIf(!url)("sessions and users against ClickHouse", () => {
  beforeAll(async () => {
    await run(`ALTER TABLE spans DELETE WHERE projectId IN ('${P}','other_project') SETTINGS mutations_sync = 2`);
    await insert([
      { run: "r1", session: "s1", user: "anna", cost: 0.5, at: 50 },
      { run: "r1", session: "s1", user: "anna", cost: 0.25, at: 49 },
      { run: "r2", session: "s1", user: "anna", cost: 0.25, at: 40, err: "x" },
      { run: "r3", session: "s2", user: "anna", cost: 1, at: 30, env: "staging" },
      { run: "r4", session: "s3", user: "bo", cost: 2, at: 20, model: "claude-x" },
      { run: "r5", session: "s4,odd'id", user: "bo", cost: 0.1, at: 10, err: "x" },
      { run: "r6", session: "", user: "cy", cost: 9, at: 5 },
      { run: "r7", session: "s9", user: "", cost: 9, at: 5 },
      { run: "r8", session: "s1", user: "anna", cost: 3, at: 60 * 24 * 40 },
    ]);
    await insert([{ run: "x1", session: "s1", user: "anna", cost: 100, at: 5 }], "other_project");
  });
  const filters = (extra: Record<string, string> = {}) => parseGroupFilters(new URLSearchParams({ from: String(NOW - 90 * 86_400_000), to: String(NOW), ...extra }), NOW);

  it("groups steps into sessions, ignoring steps with no session id and other projects", async () => {
    const { rows, total, stats } = await listGroups(P, "session", filters({ sort: "id", dir: "asc" }));
    expect(rows.map((r) => r.id)).toEqual(["s1", "s2", "s3", "s4,odd'id", "s9"]);
    expect(total).toBe(5);
    const s1 = rows[0]!;
    expect(s1).toMatchObject({ runs: 3, spanCount: 4, failedRuns: 1, others: 1, other: "anna" });
    expect(s1.totalCostUsd).toBeCloseTo(4, 5);
    expect(s1.inputTokens).toBe(40);
    expect(stats).toMatchObject({ groups: 5, runs: 7, failedRuns: 2, groupsWithErrors: 2 });
    expect(stats.totalCostUsd).toBeCloseTo(4 + 1 + 2 + 0.1 + 9, 5);
  });

  it("groups steps into users and counts their sessions", async () => {
    const { rows } = await listGroups(P, "user", filters({ sort: "totalCostUsd", dir: "desc" }));
    expect(rows.map((r) => r.id)).toEqual(["cy", "anna", "bo"]);
    expect(rows[0]).toMatchObject({ id: "cy", others: 0, other: "" });
    expect(rows[1]).toMatchObject({ id: "anna", others: 2, runs: 4 });
    expect(rows[2]).toMatchObject({ id: "bo", others: 2, topModel: "claude-x" });
  });

  it("the time range limits what is counted", async () => {
    const recent = await listGroups(P, "session", parseGroupFilters(new URLSearchParams({ from: String(NOW - 120 * 60_000), to: String(NOW) }), NOW));
    expect(recent.rows.find((r) => r.id === "s1")).toMatchObject({ runs: 2, spanCount: 3 });
  });

  it("status, environment and search filters apply to the list, the totals and the environments list together", async () => {
    const failing = await listGroups(P, "session", filters({ status: "error" }));
    expect(failing.rows.map((r) => r.id).sort()).toEqual(["s1", "s4,odd'id"]);
    expect(failing.stats.groups).toBe(2);
    const healthy = await listGroups(P, "session", filters({ status: "healthy" }));
    expect(healthy.rows.map((r) => r.id).sort()).toEqual(["s2", "s3", "s9"]);
    const staging = await listGroups(P, "session", filters({ environment: "staging" }));
    expect(staging.rows.map((r) => r.id)).toEqual(["s2"]);
    expect(staging.environments.map((e) => e.value).sort()).toEqual(["prod", "staging"]);
    const byUser = await listGroups(P, "session", filters({ q: "BO" }));
    expect(byUser.rows.map((r) => r.id).sort()).toEqual(["s3", "s4,odd'id"]);
  });

  it("paging and sorting are stable", async () => {
    const first = await listGroups(P, "session", filters({ sort: "totalCostUsd", dir: "desc", pageSize: "10" }));
    expect(first.rows.map((r) => r.id)).toEqual(["s9", "s1", "s3", "s2", "s4,odd'id"]);
    const paged = await listGroups(P, "session", { ...filters({ sort: "id", dir: "asc" }), pageSize: 2, page: 1 });
    expect(paged.rows.map((r) => r.id)).toEqual(["s3", "s4,odd'id"]);
    expect(paged.total).toBe(5);
  });

  it("quotes in ids and search text cannot break the query", async () => {
    const odd = await listGroups(P, "session", filters({ q: "x' OR 1=1 --" }));
    expect(odd.rows).toEqual([]);
    const detail = await groupDetail(P, "session", "s4,odd'id", NOW);
    expect(detail.row?.runs).toBe(1);
  });

  it("detail returns one group over 90 days plus its siblings", async () => {
    const user = await groupDetail(P, "user", "anna", NOW);
    expect(user.row).toMatchObject({ id: "anna", runs: 4, others: 2 });
    expect(user.siblings.map((s) => s.id)).toEqual(["s2", "s1"]);
    const missing = await groupDetail(P, "user", "nobody", NOW);
    expect(missing.row).toBeNull();
    expect(missing.siblings).toEqual([]);
  });
});
