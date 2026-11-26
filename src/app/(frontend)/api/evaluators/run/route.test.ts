import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthedConvexClient = vi.fn();
vi.mock("@/lib/convex-server", () => ({ getAuthedConvexClient: () => getAuthedConvexClient() }));

const { POST } = await import("./route");

const valid = { projectId: "p1", evaluatorId: "e1", traceId: "t1", output: "hello" };

function post(body: unknown) {
  return POST(new NextRequest("http://localhost/api/evaluators/run", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
}

describe("POST /api/evaluators/run", () => {
  it("names a missing field", async () => {
    const response = await post({ ...valid, traceId: undefined });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "traceId must be a non-empty string" });
    expect(getAuthedConvexClient).not.toHaveBeenCalled();
  });

  it("names a field with the wrong type", async () => {
    const response = await post({ ...valid, output: 42 });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "output must be a non-empty string" });
    expect(getAuthedConvexClient).not.toHaveBeenCalled();
  });
});
