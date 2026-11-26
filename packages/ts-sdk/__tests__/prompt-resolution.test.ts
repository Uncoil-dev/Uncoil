import { afterEach, describe, expect, it, vi } from "vitest";
import { UncoilClient } from "../src/index";

const KEY = "uncoil_sk_live_eu_abcdefghijklmnop";
const HOST = "https://prompts.example.test";
const PROMPT = { name: "support agent", version: 3, template: "Hello {{name}}" };

function mockFetch(status: number, body: unknown) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify(body), { status });
  }));
  return calls;
}

const client = () => new UncoilClient({ apiKey: KEY, host: HOST });

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("getPrompt", () => {
  it("needs an API key", async () => {
    const saved = [process.env.UNCOIL_API_KEY, process.env.TRACIFY_API_KEY];
    delete process.env.UNCOIL_API_KEY;
    delete process.env.TRACIFY_API_KEY;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const calls = mockFetch(200, PROMPT);
    try {
      await expect(new UncoilClient().getPrompt("support")).rejects.toThrow(/An Uncoil API key is required to resolve prompts/);
      expect(calls).toHaveLength(0);
    } finally {
      if (saved[0] !== undefined) process.env.UNCOIL_API_KEY = saved[0];
      if (saved[1] !== undefined) process.env.TRACIFY_API_KEY = saved[1];
    }
  });

  it("serves a second call inside the cache window without fetching again", async () => {
    const calls = mockFetch(200, PROMPT);
    const uncoil = client();
    expect(await uncoil.getPrompt("support", "production", { cacheTtlMs: 60_000 })).toEqual(PROMPT);
    expect(await uncoil.getPrompt("support", "production", { cacheTtlMs: 60_000 })).toEqual(PROMPT);
    expect(calls).toHaveLength(1);
    await uncoil.getPrompt("support", "staging");
    expect(calls).toHaveLength(2);
  });

  it("fetches again once the cache window has passed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const calls = mockFetch(200, PROMPT);
      const uncoil = client();
      await uncoil.getPrompt("support", "production", { cacheTtlMs: 1_000 });
      vi.setSystemTime(Date.now() + 1_001);
      await uncoil.getPrompt("support", "production", { cacheTtlMs: 1_000 });
      expect(calls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("URL-encodes the prompt name and environment", async () => {
    const calls = mockFetch(200, PROMPT);
    await client().getPrompt("support agent/v2", "eu prod&beta");
    expect(calls[0]).toBe(`${HOST}/api/prompts/support%20agent%2Fv2?environment=eu%20prod%26beta`);
  });

  it("uses the fallback when the request fails", async () => {
    mockFetch(500, { error: "Prompt store unavailable" });
    const fallback = { ...PROMPT, version: 0 };
    expect(await client().getPrompt("support", "production", { fallback })).toEqual(fallback);
  });

  it("throws the server's error text when there is no fallback", async () => {
    mockFetch(500, { error: "Prompt store unavailable" });
    await expect(client().getPrompt("support")).rejects.toThrow(/Prompt store unavailable/);
  });
});
