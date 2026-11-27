import { afterEach, describe, expect, it, vi } from "vitest";
import { UncoilClient, UncoilError, buildRedactor, sampleBucket, uncoilMiddleware, traceTools, traceAgent, flush as flushAll } from "../src/index";

const KEY = "uncoil_sk_live_eu_abcdefghijklmnop";
let sent: any[] = [];
function mockFetch(status = 200) {
  sent = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: any) => {
    sent.push(JSON.parse(init.body));
    return new Response("{}", { status });
  }));
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 5));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("clear errors", () => {
  it("explains a missing key and how to fix it", () => {
    const seen: UncoilError[] = [];
    delete process.env.UNCOIL_API_KEY;
    new UncoilClient({ onError: (e) => seen.push(e) });
    expect(seen[0].code).toBe("missing_key");
    expect(seen[0].message).toContain("UNCOIL_API_KEY");
  });
  it("flags a key that is not an Uncoil key", () => {
    const seen: UncoilError[] = [];
    new UncoilClient({ apiKey: "sk-openai-123", onError: (e) => seen.push(e) });
    expect(seen[0].code).toBe("odd_key");
  });
  it("rejects a bad sample rate and bad host", () => {
    expect(() => new UncoilClient({ apiKey: KEY, sampleRate: 2 })).toThrow(/0 to 1/);
    expect(() => new UncoilClient({ apiKey: KEY, host: "not a url" })).toThrow(/valid web address/);
  });
  it("tells the app once when the key is rejected", async () => {
    mockFetch(401);
    const seen: UncoilError[] = [];
    const client = new UncoilClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    expect(seen).toHaveLength(1);
    expect(seen[0].code).toBe("bad_key");
    expect(seen[0].status).toBe(401);
  });
  it("explains a paused key and how to replace it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "This API key was paused.", code: "key_paused" }, { status: 403 })));
    const seen: UncoilError[] = [];
    const client = new UncoilClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    expect(seen[0].code).toBe("key_paused");
    expect(seen[0].hint).toContain("API keys page");
  });
  it("includes the server's reason when a span is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "latencyMs must be a non-negative number" }, { status: 422 })));
    const seen: UncoilError[] = [];
    const client = new UncoilClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    expect(seen[0].code).toBe("rejected");
    expect(seen[0].message).toContain("latencyMs must be a non-negative number");
  });
  it("explains a reached plan limit with the reset time and upgrade link", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-20T12:00:00Z"), toFake: ["Date"] });
    const body = { error: "This project has used its 10,000 free spans for the month.", code: "plan_limit_reached", limit: 10000, retryAfterSeconds: 86400, upgradeUrl: "https://www.uncoil.dev/pricing" };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 429 })));
    const seen: UncoilError[] = [];
    const client = new UncoilClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    vi.useRealTimers();
    expect(seen[0].code).toBe("plan_limit_reached");
    expect(seen[0].message).toContain("10,000 spans");
    expect(seen[0].hint).toContain("2026-11-21 12:00 UTC");
    expect(seen[0].hint).toContain("https://www.uncoil.dev/pricing");
    expect(seen[0].hint).not.toContain("sampleRate");
  });
  it("reports an unreachable network without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const seen: UncoilError[] = [];
    const client = new UncoilClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    expect(seen[0].code).toBe("network");
  });
  it("gives up on a hung request and reports it as a network problem", async () => {
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => AbortSignal.abort(new DOMException("timed out", "TimeoutError")));
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      if (init.signal?.aborted) reject(init.signal.reason);
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })));
    const seen: UncoilError[] = [];
    const client = new UncoilClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    expect(seen[0]?.code).toBe("network");
  });
});

describe("sampling", () => {
  it("is stable per run and roughly matches the rate", () => {
    expect(sampleBucket("run-a")).toBe(sampleBucket("run-a"));
    let kept = 0;
    for (let i = 0; i < 2000; i++) if (sampleBucket(`run-${i}`) < 0.25) kept++;
    expect(kept / 2000).toBeGreaterThan(0.2);
    expect(kept / 2000).toBeLessThan(0.3);
  });
  it("drops whole runs but keeps errors", async () => {
    mockFetch();
    const dropped = Array.from({ length: 50 }, (_, i) => `run-${i}`).find((r) => sampleBucket(r) >= 0.5)!;
    const client = new UncoilClient({ apiKey: KEY, sampleRate: 0.5 });
    await client.ingest({ spanType: "llm_call", runId: dropped });
    await client.ingest({ spanType: "llm_call", runId: dropped });
    await client.ingest({ spanType: "error", runId: dropped, errorType: "Boom" });
    expect(sent.map((s) => s.spanType)).toEqual(["error"]);
  });
  it("sampleRate 0 sends nothing and 1 sends everything", async () => {
    mockFetch();
    await new UncoilClient({ apiKey: KEY, sampleRate: 0 }).ingest({ spanType: "llm_call", runId: "x" });
    expect(sent).toHaveLength(0);
    await new UncoilClient({ apiKey: KEY }).ingest({ spanType: "llm_call", runId: "x" });
    expect(sent).toHaveLength(1);
  });
});

describe("redaction", () => {
  it("masks emails, phone numbers and card numbers", () => {
    const redact = buildRedactor({ pii: true })!;
    const out = redact("Mail jane.doe@example.com or call +44 20 7946 0958, card 4242 4242 4242 4242.");
    expect(out).not.toContain("jane.doe");
    expect(out).not.toContain("4242");
    expect(out).not.toContain("7946");
  });
  it("supports custom patterns, plain text and a custom function", () => {
    const redact = buildRedactor({ patterns: [/ACME-\d+/, "secret.word"], fn: (t) => t.toUpperCase(), replacement: "X" })!;
    expect(redact("ACME-99 and secret.word")).toBe("X AND X");
  });
  it("is applied to what is actually sent", async () => {
    mockFetch();
    const client = new UncoilClient({ apiKey: KEY, redact: { pii: true } });
    await client.ingest({ spanType: "llm_call", runId: "r", input: "hi from bob@example.com", output: { to: "bob@example.com" } });
    expect(sent[0].input).toBe("hi from [redacted]");
    expect(sent[0].output).not.toContain("bob@");
  });
  it("masks emails, phones and cards by default", async () => {
    mockFetch();
    await new UncoilClient({ apiKey: KEY }).ingest({ spanType: "llm_call", runId: "r", input: "bob@example.com paid with 4242 4242 4242 4242" });
    expect(sent[0].input).toBe("[redacted] paid with [redacted]");
  });
  it("leaves long numbers that are not cards alone", () => {
    expect(buildRedactor()!("order 1761400000000 shipped")).toBe("order 1761400000000 shipped");
  });
  it("can be turned off with pii: false", async () => {
    expect(buildRedactor({ pii: false })).toBeUndefined();
    mockFetch();
    await new UncoilClient({ apiKey: KEY, redact: { pii: false } }).ingest({ spanType: "llm_call", runId: "r", input: "bob@example.com" });
    expect(sent[0].input).toBe("bob@example.com");
  });
  it("keeps masking when only custom patterns are given", () => {
    expect(buildRedactor({ patterns: ["X1"] })!("X1 bob@example.com")).toBe("[redacted] [redacted]");
  });
});

describe("framework helpers", () => {
  it("traces plain and object tools, including failures", async () => {
    mockFetch();
    const client = new UncoilClient({ apiKey: KEY });
    const tools = traceTools({
      add: (a: number, b: number) => a + b,
      lookup: { description: "d", execute: async (q: string) => `found ${q}` },
      broken: async () => { throw new Error("nope"); },
    }, { client });
    expect(tools.add(1, 2)).toBe(3);
    expect(await tools.lookup.execute("cats")).toBe("found cats");
    expect(tools.lookup.description).toBe("d");
    await expect(tools.broken()).rejects.toThrow("nope");
    await flush();
    const tool = sent.filter((s) => s.spanType === "tool_call" || (s.errorType && s.toolName !== "tool"));
    expect(tool.map((s) => s.toolName).sort()).toEqual(["add", "broken", "lookup"].sort());
    expect(sent.find((s) => s.toolName === "broken").errorMessage).toContain("nope");
  });
  it("traces Vercel AI SDK generate and stream calls", async () => {
    mockFetch();
    const client = new UncoilClient({ apiKey: KEY });
    const mw = uncoilMiddleware({ client });
    const model = { provider: "openai.chat", modelId: "gpt-test" };
    await mw.wrapGenerate({ model, params: { prompt: "hi" }, doGenerate: async () => ({ content: [{ type: "text", text: "hello" }], usage: { inputTokens: 5, outputTokens: 2 }, finishReason: "stop" }) });
    const parts = [{ type: "text-delta", delta: "a" }, { type: "text-delta", delta: "b" }, { type: "finish", usage: { inputTokens: 3, outputTokens: 4 } }];
    const streamed = await mw.wrapStream({ model, params: {}, doStream: async () => ({ stream: new ReadableStream({ start(c) { parts.forEach((p) => c.enqueue(p)); c.close(); } }) }) });
    const reader = streamed.stream.getReader();
    while (!(await reader.read()).done);
    await expect(mw.wrapGenerate({ model, params: {}, doGenerate: async () => { throw new Error("rate limit"); } })).rejects.toThrow("rate limit");
    await flush();
    const llm = sent.filter((s) => s.spanType === "llm_call" || s.errorType);
    expect(llm.find((s) => s.output === "hello")).toMatchObject({ modelId: "gpt-test", inputTokens: 5, outputTokens: 2 });
    expect(llm.find((s) => s.output === "ab")).toMatchObject({ inputTokens: 3, outputTokens: 4 });
    expect(llm.some((s) => s.errorMessage?.includes("rate limit"))).toBe(true);
  });
  it("reads token totals from AI SDK v6+ usage objects", async () => {
    mockFetch();
    const mw = uncoilMiddleware({ client: new UncoilClient({ apiKey: KEY }) });
    const model = { provider: "openai.responses", modelId: "gpt-test" };
    const usage = { inputTokens: { total: 8, noCache: 8, cacheRead: 0 }, outputTokens: { total: 3, text: 3, reasoning: 0 } };
    await mw.wrapGenerate({ model, params: {}, doGenerate: async () => ({ content: [{ type: "text", text: "nested" }], usage, finishReason: "stop" }) });
    const parts = [{ type: "text-delta", delta: "s" }, { type: "finish", usage }];
    const streamed = await mw.wrapStream({ model, params: {}, doStream: async () => ({ stream: new ReadableStream({ start(c) { parts.forEach((p) => c.enqueue(p)); c.close(); } }) }) });
    const reader = streamed.stream.getReader();
    while (!(await reader.read()).done);
    await flush();
    expect(sent.find((s) => s.output === "nested")).toMatchObject({ inputTokens: 8, outputTokens: 3 });
    expect(sent.find((s) => s.output === "s")).toMatchObject({ inputTokens: 8, outputTokens: 3 });
  });
});

describe("flush", () => {
  function slowFetch(ms: number) {
    const done: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      done.push(JSON.parse(String(init.body)).spanType);
      return new Response("{}", { status: 202 });
    }));
    return done;
  }
  it("waits for a delayed send to settle", async () => {
    const done = slowFetch(30);
    const client = new UncoilClient({ apiKey: KEY });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    expect(done).toEqual([]);
    await expect(client.flush()).resolves.toBe(true);
    expect(done).toEqual(["llm_call"]);
  });
  it("waits for spans sent by traceAgent from the top-level flush", async () => {
    const done = slowFetch(30);
    const run = traceAgent(async () => "ok", { apiKey: KEY, name: "short-job" });
    await expect(run()).resolves.toBe("ok");
    expect(done).toEqual([]);
    await flushAll();
    expect(done).toEqual(["run_end"]);
  });
  it("gives up after the timeout when a send hangs", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const client = new UncoilClient({ apiKey: KEY });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await expect(client.flush(20)).resolves.toBe(false);
  });
});
