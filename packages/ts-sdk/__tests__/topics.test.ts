import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCommand } from "../src/cli";
import { fetchTopics, formatTopics } from "../src/topics";

afterEach(() => vi.unstubAllGlobals());

describe("topics command", () => {
  it("is picked from the first argument", () => {
    expect(parseCommand(["topics", "--json"])).toEqual({ command: "topics", args: ["--json"] });
  });

  it("calls the topics endpoint on the key's region with a Bearer key", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ total: 4, sampled: false, topics: [] })));
    vi.stubGlobal("fetch", fetchMock);
    await fetchTopics({ apiKey: "uncoil_sk_live_us_abc" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/[^/]+\/api\/sdk\/topics$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer uncoil_sk_live_us_abc");
  });

  it("surfaces the server's error message", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "Invalid API key" }), { status: 401 }));
    await expect(fetchTopics({ apiKey: "uncoil_sk_live_x" })).rejects.toThrow("Invalid API key");
  });

  it("prints one line per topic with its error rate and sample traces", () => {
    const text = formatTopics({ total: 4, sampled: true, topics: [{ id: "t1", name: "refund order", count: 4, errorRate: 0.25, sampleRunIds: ["r0", "r1"] }] });
    expect(text).toContain("refund order");
    expect(text).toContain("25% errors, e.g. r0, r1");
    expect(text).toContain("newest traces");
  });
});
