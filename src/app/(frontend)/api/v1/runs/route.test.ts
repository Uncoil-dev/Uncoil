import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const listTraces = vi.fn();

vi.mock("@/lib/convex", () => ({ getConvexClient: () => ({ query }) }));
vi.mock("@/lib/tinybird", () => ({ listTraces: (...args: unknown[]) => listTraces(...args) }));
vi.mock("@/lib/crash-report", () => ({ reportHandledError: vi.fn() }));

process.env.UNCOIL_API_KEY_HASH_SECRET = "test-secret";
const { GET } = await import("./route");

const KEY = ["uncoil", "sk", "live", "abcdef0123456789"].join("_");

function get(search = "", headers: Record<string, string> = { authorization: `Bearer ${KEY}` }) {
  return GET(new Request(`http://localhost/api/v1/runs${search}`, { headers }));
}

const row = {
  runId: "run_1", traceName: "support-agent", startedAt: "2026-01-01T00:00:00.000Z", durationMs: 1200, spanCount: 4,
  errorCount: 1, totalCostUsd: 0.02, inputTokens: 100, outputTokens: 50, firstErrorMessage: "failed with sk-abcdefghijklmnopqrstuvwxyz123456",
};

beforeEach(() => {
  query.mockReset();
  listTraces.mockReset();
  query.mockImplementation(async (_fn: unknown, args: { apiKeyHash?: string }) => (args.apiKeyHash ? { _id: "proj_A" } : null));
  listTraces.mockResolvedValue({ rows: [row], total: 1, page: 0, pageSize: 10 });
});

describe("GET /api/v1/runs", () => {
  it("rejects a missing or malformed key without touching data", async () => {
    expect((await get("", {})).status).toBe(401);
    expect((await get("", { authorization: "Bearer nope" })).status).toBe(401);
    expect(listTraces).not.toHaveBeenCalled();
  });

  it("rejects an unknown or paused key with 401 and no key material", async () => {
    query.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(401);
    expect(JSON.stringify(await response.json())).not.toContain(KEY);
    expect(listTraces).not.toHaveBeenCalled();
  });

  it.each(["status=bogus", "limit=0", "limit=21", "limit=abc", "sinceMinutes=0", "sinceMinutes=10081"])("returns 400 for %s", async (search) => {
    expect((await get(`?${search}`)).status).toBe(400);
  });

  it("returns newest-first run summaries with redacted errors", async () => {
    const response = await get("?status=failed&agentName=support-agent&limit=5");
    expect(response.status).toBe(200);
    const { runs } = await response.json();
    expect(runs).toEqual([
      { runId: "run_1", name: "support-agent", status: "failed", startedAt: row.startedAt, durationMs: 1200, spanCount: 4, totalCostUsd: 0.02, totalTokens: 150, firstError: expect.any(String) },
    ]);
    expect(runs[0].firstError).not.toContain("sk-abcdefghijklmnopqrstuvwxyz123456");
    const [, filters] = listTraces.mock.calls[0];
    expect(filters).toMatchObject({ status: "error", sort: "startedAt", direction: "desc", pageSize: 10 });
    expect(filters.facets).toEqual({ traceName: ["support-agent"] });
  });

  it("only reads the project that owns the key", async () => {
    await get();
    expect(listTraces.mock.calls[0][0]).toBe("proj_A");
    query.mockImplementation(async (_fn: unknown, args: { apiKeyHash?: string }) => (args.apiKeyHash ? { _id: "proj_B" } : null));
    await get("?projectId=proj_A");
    expect(listTraces.mock.calls[1][0]).toBe("proj_B");
  });
});
