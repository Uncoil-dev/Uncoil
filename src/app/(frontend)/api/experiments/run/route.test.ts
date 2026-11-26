import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthedConvexClient = vi.fn();
vi.mock("@/lib/convex-server", () => ({ getAuthedConvexClient: () => getAuthedConvexClient() }));

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(new NextRequest("http://localhost/api/experiments/run", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
}

describe("POST /api/experiments/run", () => {
  it("names a projectId with the wrong type", async () => {
    const response = await post({ projectId: 7, experimentId: "x1" });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "projectId must be a non-empty string" });
    expect(getAuthedConvexClient).not.toHaveBeenCalled();
  });

  it("names a missing or non-string experimentId", async () => {
    for (const experimentId of [undefined, "", ["x1"]]) {
      const response = await post({ projectId: "p1", experimentId });
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "experimentId must be a non-empty string" });
    }
    expect(getAuthedConvexClient).not.toHaveBeenCalled();
  });
});
