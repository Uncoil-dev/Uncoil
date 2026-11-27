import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { UncoilClient, span, llmCall, toolCall, traceTools, wrapOpenAI } from "../src/index";

const KEY = "uncoil_sk_live_eu_abcdefghijklmnop";
const SECRET = "zebra-secret-text";

type Sent = { url: string; body: Record<string, unknown> };
let sent: Sent[] = [];
const spansSent = () => sent.filter((r) => r.url.endsWith("/api/ingest")).map((r) => r.body);

beforeEach(() => {
  sent = [];
  delete process.env.UNCOIL_CAPTURE_CONTENT;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string }) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return new Response("{}", { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.UNCOIL_CAPTURE_CONTENT; });

const make = (config: Record<string, unknown> = {}) => new UncoilClient({ apiKey: KEY, projectId: "proj_1", ...config });

const completion = {
  id: "chat-1", object: "chat.completion", created: 1, model: "test-model",
  choices: [{ index: 0, message: { role: "assistant", content: "hello" }, finish_reason: "stop" }],
  usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const eventStream = (events: unknown[]) =>
  new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });

describe("UNCOIL_CAPTURE_CONTENT", () => {
  it("sends no content for any step kind while keeping the measurements", async () => {
    process.env.UNCOIL_CAPTURE_CONTENT = "Off";
    const client = make();
    await expect(span("agent", async () => {
      await span("lookup", async (step) => { step.setOutput?.(SECRET); return SECRET; }, { input: SECRET, client });
      llmCall({ input: SECRET, output: SECRET, modelId: "model-a", costUsd: 0.02, latencyMs: 40, inputTokens: 11, outputTokens: 7, toolName: "chat" });
      toolCall({ toolName: "search", input: SECRET, output: SECRET, latencyMs: 5 });
      await expect(span("broken", () => { throw new TypeError(SECRET); }, { client })).rejects.toThrow();
      const tools = traceTools({ fail: () => { throw new RangeError(SECRET); } }, { client });
      expect(() => tools.fail(SECRET)).toThrow();
      throw new Error(SECRET);
    }, { root: true, client })).rejects.toThrow();
    await client.flush();
    const spans = spansSent();
    expect(spans.length).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(spans)).not.toContain(SECRET);
    for (const s of spans) {
      expect(s.input).toBe("");
      expect(s.output).toBe("");
      expect(s).not.toHaveProperty("errorMessage");
      expect(s.metadata.contentRecorded).toBe(false);
    }
    const byName = Object.fromEntries(spans.map((s) => [s.toolName, s]));
    expect(byName.broken.errorType).toBe("TypeError");
    expect(byName.fail.errorType).toBe("RangeError");
    expect(byName.agent).toMatchObject({ spanType: "error", errorType: "Error" });
    expect(typeof byName.agent.latencyMs).toBe("number");
  });

  it.each([false, true])("sends no provider content when streaming is %s", async (stream) => {
    process.env.UNCOIL_CAPTURE_CONTENT = "0";
    const client = make();
    const chunks = [
      { ...completion, object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: "hello" }, finish_reason: null }], usage: null },
      { ...completion, choices: [] },
    ];
    const ok = wrapOpenAI(new OpenAI({ apiKey: "fake", fetch: async () => (stream ? eventStream(chunks) : json(completion)) }), { client });
    const result = await ok.chat.completions.create({ model: "test-model", messages: [{ role: "user", content: SECRET }], stream } as never);
    if (stream) for await (const chunk of result as unknown as AsyncIterable<unknown>) void chunk;
    const failing = wrapOpenAI(new OpenAI({ apiKey: "fake", maxRetries: 0, fetch: async () => json({ error: { message: SECRET, type: "invalid_request_error" } }, 400) }), { client });
    await expect(failing.chat.completions.create({ model: "test-model", messages: [{ role: "user", content: SECRET }] })).rejects.toThrow();
    await client.flush();
    const spans = spansSent();
    expect(JSON.stringify(spans)).not.toContain(SECRET);
    expect(JSON.stringify(spans)).not.toContain("hello");
    const llm = spans.find((s) => s.spanType === "llm_call" && !s.errorType);
    expect(llm).toMatchObject({ inputTokens: 8, outputTokens: 3 });
    expect(spans.some((s) => s.spanType === "llm_call" && s.errorType === "Error")).toBe(true);
  });

  it("sends no feedback or score text", async () => {
    const client = make({ captureContent: false });
    client.feedback("t1", SECRET, { comment: SECRET, reason: SECRET });
    client.score("t1", "accuracy", 0.9, { comment: SECRET });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const bodies = sent.filter((r) => r.url.endsWith("/api/feedback")).map((r) => r.body);
    expect(bodies).toHaveLength(2);
    expect(JSON.stringify(bodies)).not.toContain(SECRET);
    expect(bodies[1]).toMatchObject({ name: "accuracy", value: 0.9 });
  });

  it.each([undefined, "", "true", "1", "yes", "on", "maybe"])("keeps capturing for %s", async (value) => {
    if (value !== undefined) process.env.UNCOIL_CAPTURE_CONTENT = value;
    const client = make();
    await client.ingest({ spanType: "llm_call", input: SECRET, output: "answer", latencyMs: 1 });
    const [first] = spansSent();
    expect(first.input).toContain(SECRET);
    expect(first.metadata).not.toHaveProperty("contentRecorded");
  });

  it("reads the variable at client creation and lets the option override it", async () => {
    process.env.UNCOIL_CAPTURE_CONTENT = "false";
    const kept = make({ captureContent: true });
    process.env.UNCOIL_CAPTURE_CONTENT = "no";
    const dropped = make();
    process.env.UNCOIL_CAPTURE_CONTENT = "true";
    await kept.ingest({ spanType: "llm_call", input: SECRET, output: "a", latencyMs: 1 });
    await dropped.ingest({ spanType: "llm_call", input: SECRET, output: "a", latencyMs: 1 });
    await Promise.all([kept.flush(), dropped.flush()]);
    const [first, second] = spansSent();
    expect(first.input).toContain(SECRET);
    expect(second.input).toBe("");
  });
});
