import { beforeEach, describe, expect, it, vi } from "vitest";

// The route runs unchanged with its real key check, filter parsing and topic grouping. Only the
// external services (Convex, ClickHouse, rate limiter) are stubbed.
type State = { limited: string; limits: string[]; project: unknown; fail: boolean; lookups: string[]; calls: string[]; inputs: unknown };
const state = vi.hoisted(() => ({ current: {} as State }));

vi.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }) },
}));
vi.mock("convex/_generated/api", () => ({ api: { projects: { getProjectByApiKey: "getProjectByApiKey" } } }));
vi.mock("@/lib/api-keys", () => ({
  isUncoilApiKey: (key: string) => /^uncoil_sk_live_/.test(key),
  getWrongRegionApiKeyResponse: () => null,
  hashApiKey: (key: string) => "hash:" + key,
}));
vi.mock("@/lib/cli-login", () => ({
  overLimit: async (key: string) => {
    state.current.limits.push(key);
    return state.current.limited === key.split(":")[0];
  },
  requestIp: () => "1.1.1.1",
}));
vi.mock("@/lib/convex", () => ({
  getConvexClient: () => ({
    query: async (_fn: unknown, args: { apiKeyHash: string }) => {
      state.current.lookups.push(args.apiKeyHash);
      return state.current.project;
    },
  }),
}));
vi.mock("@/lib/crash-report", () => ({ reportHandledError: async () => undefined }));
vi.mock("@/lib/tinybird", () => ({
  FACET_KEYS: ["traceName"],
  resolveTraceFlowFilters: async (_id: string, filters: unknown) => filters,
  traceTopicInputs: async (projectId: string) => {
    state.current.calls.push(projectId);
    if (state.current.fail) throw new Error("down");
    return state.current.inputs;
  },
}));

const { GET } = await import("./route");

const refunds = Array.from({ length: 4 }, (_, i) => ({ runId: `r${i}`, input: "Refund my order please", hasError: i === 0 }));
const call = (key?: string) =>
  GET({
    headers: { get: () => (key ? `Bearer ${key}` : null) },
    nextUrl: new URL("http://localhost/api/sdk/topics"),
  } as never) as unknown as Promise<{ body: Record<string, unknown>; status: number }>;

describe("GET /api/sdk/topics", () => {
  beforeEach(() => {
    state.current = { limited: "", limits: [], project: { _id: "p1" }, fail: false, lookups: [], calls: [], inputs: { total: 4, traces: refunds } };
  });

  it("rejects a missing or malformed key before any lookup", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("nope")).status).toBe(401);
    expect(state.current.lookups).toHaveLength(0);
  });

  it("rejects a key that matches no project without reading traces", async () => {
    state.current.project = null;
    expect((await call("uncoil_sk_live_x")).status).toBe(401);
    expect(state.current.calls).toHaveLength(0);
  });

  it("returns the topics of the key's own project", async () => {
    const { body, status } = await call("uncoil_sk_live_x");
    expect(status).toBe(200);
    expect(state.current.lookups[0]).toBe("hash:uncoil_sk_live_x");
    expect(state.current.calls).toEqual(["p1"]);
    // The caller is limited by IP before the key lookup, then by project only, never by key or forwarded IP.
    expect(state.current.limits).toEqual(["sdk-topics-ip:1.1.1.1", "sdk-topics-project:p1"]);
    expect(body.sampled).toBe(false);
    const topics = body.topics as Array<{ count: number; sampleRunIds: string[] }>;
    expect(topics).toHaveLength(1);
    expect(topics[0].count).toBe(4);
    expect(topics[0].sampleRunIds.length).toBeGreaterThan(0);
  });

  it("answers 429 when rate limited and 503 when the trace store fails", async () => {
    state.current.limited = "sdk-topics-ip";
    expect((await call("uncoil_sk_live_x")).status).toBe(429);
    expect(state.current.lookups).toHaveLength(0);
    state.current.limited = "sdk-topics-project";
    expect((await call("uncoil_sk_live_y")).status).toBe(429);
    expect(state.current.calls).toHaveLength(0);
    state.current.limited = "";
    state.current.fail = true;
    expect((await call("uncoil_sk_live_x")).status).toBe(503);
  });
});
