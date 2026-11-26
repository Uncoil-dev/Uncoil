import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

const mutation = vi.fn(async () => "score1");
vi.mock("@/lib/convex-server", () => ({ getAuthedConvexClient: async () => ({ mutation }) }));
vi.mock("@/lib/convex", () => ({ getConvexClient: () => ({}) }));

const { POST } = await import("./route");

const send = (body: unknown) =>
  POST(new NextRequest("https://uncoil.test/api/feedback", { method: "POST", body: JSON.stringify(body) }));
const valid = { projectId: "p1", traceId: "t1", value: 1 };

beforeEach(() => mutation.mockClear());

test("a missing required field is named in the error", async () => {
  for (const field of ["projectId", "traceId", "value"] as const) {
    const response = await send({ ...valid, [field]: undefined });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: `${field} is required` });
  }
  expect(mutation).not.toHaveBeenCalled();
});

test("objects, arrays and null are rejected as feedback values", async () => {
  for (const value of [{ score: 1 }, [1], null]) {
    const response = await send({ ...valid, value });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "value must be a number, true/false, or text" });
  }
  expect(mutation).not.toHaveBeenCalled();
});

test("number, boolean and text values are still recorded for a signed-in user", async () => {
  for (const value of [4, true, "great"]) {
    const response = await send({ ...valid, value });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, scoreId: "score1" });
  }
  expect(mutation).toHaveBeenCalledTimes(3);
});
