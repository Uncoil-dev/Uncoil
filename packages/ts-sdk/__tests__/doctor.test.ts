import { afterEach, describe, expect, it, vi } from "vitest";
import { formatReport, maskKey, runDoctor } from "../src/index";

const KEY = "uncoil_sk_live_eu_abcdefghijklmnop";
let calls: Array<{ url: string; init?: any }> = [];
function mockFetch(ingestStatus = 200, reach: "ok" | "down" = "ok") {
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
    calls.push({ url, init });
    if (url.endsWith("/api/ingest")) return new Response("{}", { status: ingestStatus });
    if (reach === "down") throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    return new Response("<html>", { status: 200 });
  }));
}
const status = (report: Awaited<ReturnType<typeof runDoctor>>, id: string) => report.checks.find((c) => c.id === id)?.status;
afterEach(() => { vi.unstubAllGlobals(); delete process.env.UNCOIL_API_KEY; delete process.env.UNCOIL_REGION; delete process.env.UNCOIL_HOST; });

describe("setup checker", () => {
  it("passes and sends one tagged test trace", async () => {
    mockFetch();
    const report = await runDoctor({ apiKey: KEY });
    expect(report.ok).toBe(true);
    expect(report.runId).toMatch(/^doctor_/);
    const ingest = calls.filter((c) => c.url.endsWith("/api/ingest"));
    expect(ingest).toHaveLength(1);
    expect(ingest[0].init.headers.Authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(ingest[0].init.body);
    expect(body).toMatchObject({ spanType: "llm_call", tags: ["uncoil-doctor"], traceName: "Uncoil setup check" });
    expect(typeof body.latencyMs).toBe("number");
    expect(formatReport(report)).toContain("All good");
  });
  it("reads the key from the environment", async () => {
    mockFetch();
    process.env.UNCOIL_API_KEY = KEY;
    expect((await runDoctor()).ok).toBe(true);
  });
  it("fails clearly on a missing or wrong-shaped key without any network call", async () => {
    mockFetch();
    expect(status(await runDoctor({}), "key")).toBe("fail");
    const odd = await runDoctor({ apiKey: "sk-openai-1234567890123" });
    expect(odd.checks.find((c) => c.id === "key")?.hint).toContain("API keys page");
    expect(calls).toHaveLength(0);
  });
  it("catches a key and region that disagree", async () => {
    mockFetch();
    const report = await runDoctor({ apiKey: KEY, region: "us" });
    expect(status(report, "region")).toBe("fail");
    expect(calls).toHaveLength(0);
  });
  it("reports an unreachable host and skips the trace", async () => {
    mockFetch(200, "down");
    const report = await runDoctor({ apiKey: KEY });
    expect(status(report, "network")).toBe("fail");
    expect(report.checks.find((c) => c.id === "network")?.message).toContain("ENOTFOUND");
    expect(report.checks.find((c) => c.id === "trace")).toBeUndefined();
  });
  it.each([[401, "revoked"], [403, "disabled"], [429, "limit"], [503, "status page"], [422, "latest version"]])("explains HTTP %i", async (code, word) => {
    mockFetch(code);
    const report = await runDoctor({ apiKey: KEY });
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === "trace")?.hint).toContain(word);
  });
  it("sends nothing with send: false", async () => {
    mockFetch();
    const report = await runDoctor({ apiKey: KEY, send: false });
    expect(status(report, "trace")).toBe("skip");
    expect(calls.some((c) => c.url.endsWith("/api/ingest"))).toBe(false);
  });
  it("never prints the whole key", async () => {
    mockFetch();
    const text = formatReport(await runDoctor({ apiKey: KEY }));
    expect(text).not.toContain(KEY);
    expect(maskKey(KEY)).toContain("mnop");
  });
});
