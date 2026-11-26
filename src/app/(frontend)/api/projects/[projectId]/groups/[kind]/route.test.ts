import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

vi.mock("@/lib/project-route-access", () => ({ denyProjectAccess: async () => null }));
vi.mock("@/lib/tinybird-groups", () => ({
  groupDetail: async () => ({ id: "g1" }),
  listGroups: async () => ({ groups: [] }),
}));

const { GET } = await import("./route");

const groups = (kind: string) =>
  GET(new NextRequest(`https://uncoil.test/api/projects/p1/groups/${kind}`), { params: Promise.resolve({ projectId: "p1", kind }) });

test("an unknown group kind names the kinds a caller can use", async () => {
  const response = await groups("team");
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Unknown group kind. Use session or user." });
});

test("session and user kinds still return their list", async () => {
  for (const kind of ["session", "user"]) {
    const response = await groups(kind);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ groups: [] });
  }
});
