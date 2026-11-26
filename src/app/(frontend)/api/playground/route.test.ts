import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/convex-server", () => ({ getAuthedConvexClient: vi.fn() }));

const { POST } = await import("./route");

function post(body: string) {
  return POST(new NextRequest("http://localhost/api/playground", { method: "POST", body, headers: { "content-type": "application/json" } }));
}

describe("POST /api/playground", () => {
  it("rejects a body that is not JSON", async () => {
    const response = await post("not json");
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("asks for a prompt when the JSON body has none", async () => {
    const response = await post(JSON.stringify({ projectId: "p1" }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "projectId and prompt are required" });
  });
});
