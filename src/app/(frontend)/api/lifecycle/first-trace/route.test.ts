import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// The email provider is external; capture what would be sent.
const sent: Array<{ text: string; html: string }> = [];
vi.mock("@/lib/transactional-email", () => ({
  sendTransactionalEmail: async (message: { text: string; html: string }) => void sent.push(message),
}));

const { POST } = await import("./route");

afterEach(() => {
  sent.length = 0;
  vi.unstubAllEnvs();
});

describe("POST /api/lifecycle/first-trace", () => {
  it("links to the trace on this deployment's region host", async () => {
    vi.stubEnv("NEXT_PUBLIC_UNCOIL_REGION", "us");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.uncoil.dev");
    const request = new NextRequest("https://us.cloud.uncoil.dev/api/lifecycle/first-trace", {
      method: "POST",
      body: JSON.stringify({ email: "dev@example.com", projectId: "p1", runId: "run 1" }),
    });
    expect((await POST(request)).status).toBe(200);
    expect(sent[0].text).toContain("https://us.cloud.uncoil.dev/dashboard/p1/tracing/run%201");
    expect(sent[0].html).toContain('href="https://us.cloud.uncoil.dev/dashboard/p1/tracing/run%201"');
  });
});
