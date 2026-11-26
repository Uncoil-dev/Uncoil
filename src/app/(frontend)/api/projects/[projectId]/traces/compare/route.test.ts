import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/project-route-access", () => ({ denyProjectAccess: async () => null }));
vi.mock("@/lib/tinybird", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tinybird")>()),
  resolveTraceFlowFilters: async () => ({ fromMs: 1, toMs: 2 }),
  traceGroupComparison: vi.fn(async () => []),
}));

const { GET } = await import("./route");
const { traceGroupComparison } = await import("@/lib/tinybird");

const compare = (by: string) =>
  GET(new NextRequest(`https://uncoil.test/api/projects/p1/traces/compare?by=${by}`), { params: Promise.resolve({ projectId: "p1" }) });

beforeEach(() => vi.mocked(traceGroupComparison).mockClear());

test("inherited object names are rejected as compare dimensions", async () => {
  for (const by of ["toString", "constructor"]) {
    const response = await compare(by);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "by must be model or release" });
  }
  expect(traceGroupComparison).not.toHaveBeenCalled();
});

test("model and release still return grouped runs", async () => {
  for (const by of ["model", "release"]) {
    const response = await compare(by);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ by, groups: [], range: { from: 1, to: 2 } });
  }
});
