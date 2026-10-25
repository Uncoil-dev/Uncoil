import { afterEach, describe, expect, it, vi } from "vitest";
import { TracifyClient, TracifyError, buildRedactor, sampleBucket, tracifyMiddleware, traceTools } from "../src/index";

const KEY = "tracify_sk_live_eu_abcdefghijklmnop";
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
    const seen: TracifyError[] = [];
    delete process.env.TRACIFY_API_KEY;
    new TracifyClient({ onError: (e) => seen.push(e) });
    expect(seen[0].code).toBe("missing_key");
    expect(seen[0].message).toContain("TRACIFY_API_KEY");
  });
  it("flags a key that is not a Tracify key", () => {
    const seen: TracifyError[] = [];
    new TracifyClient({ apiKey: "sk-openai-123", onError: (e) => seen.push(e) });
    expect(seen[0].code).toBe("odd_key");
  });
  it("rejects a bad sample rate and bad host", () => {
    expect(() => new TracifyClient({ apiKey: KEY, sampleRate: 2 })).toThrow(/0 to 1/);
    expect(() => new TracifyClient({ apiKey: KEY, host: "not a url" })).toThrow(/valid web address/);
  });
  it("tells the app once when the key is rejected", async () => {
    mockFetch(401);
    const seen: TracifyError[] = [];
    const client = new TracifyClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    expect(seen).toHaveLength(1);
    expect(seen[0].code).toBe("bad_key");
    expect(seen[0].status).toBe(401);
  });
  it("reports an unreachable network without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const seen: TracifyError[] = [];
    const client = new TracifyClient({ apiKey: KEY, onError: (e) => seen.push(e) });
    await client.ingest({ spanType: "llm_call", runId: "r1" });
    await flush();
    expect(seen[0].code).toBe("network");
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
    const client = new TracifyClient({ apiKey: KEY, sampleRate: 0.5 });
    await client.ingest({ spanType: "llm_call", runId: dropped });
    await client.ingest({ spanType: "llm_call", runId: dropped });
    await client.ingest({ spanType: "error", runId: dropped, errorType: "Boom" });
    expect(sent.map((s) => s.spanType)).toEqual(["error"]);
  });
  it("sampleRate 0 sends nothing and 1 sends everything", async () => {
    mockFetch();
    await new TracifyClient({ apiKey: KEY, sampleRate: 0 }).ingest({ spanType: "llm_call", runId: "x" });
    expect(sent).toHaveLength(0);
    await new TracifyClient({ apiKey: KEY }).ingest({ spanType: "llm_call", runId: "x" });
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
    const client = new TracifyClient({ apiKey: KEY, redact: { pii: true } });
    await client.ingest({ spanType: "llm_call", runId: "r", input: "hi from bob@example.com", output: { to: "bob@example.com" } });
    expect(sent[0].input).toBe("hi from [redacted]");
    expect(sent[0].output).not.toContain("bob@");
  });
  it("masks emails, phones and cards by default", async () => {
    mockFetch();
    await new TracifyClient({ apiKey: KEY }).ingest({ spanType: "llm_call", runId: "r", input: "bob@example.com paid with 4242 4242 4242 4242" });
    expect(sent[0].input).toBe("[redacted] paid with [redacted]");
  });
  it("leaves long numbers that are not cards alone", () => {
    expect(buildRedactor()!("order 1761400000000 shipped")).toBe("order 1761400000000 shipped");
  });
  it("can be turned off with pii: false", async () => {
    expect(buildRedactor({ pii: false })).toBeUndefined();
    mockFetch();
    await new TracifyClient({ apiKey: KEY, redact: { pii: false } }).ingest({ spanType: "llm_call", runId: "r", input: "bob@example.com" });
    expect(sent[0].input).toBe("bob@example.com");
  });
  it("keeps masking when only custom patterns are given", () => {
    expect(buildRedactor({ patterns: ["X1"] })!("X1 bob@example.com")).toBe("[redacted] [redacted]");
  });
});

describe("framework helpers", () => {
  it("traces plain and object tools, including failures", async () => {
    mockFetch();
    const client = new TracifyClient({ apiKey: KEY });
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
    const client = new TracifyClient({ apiKey: KEY });
    const mw = tracifyMiddleware({ client });
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
});
