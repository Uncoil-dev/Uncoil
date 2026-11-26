import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UncoilClient, uncoilMiddleware } from "../src/index";

const KEY = "uncoil_sk_live_eu_abcdefghijklmnop";
const model = { provider: "openai.chat", modelId: "gpt-test" };
type Sent = Record<string, unknown>;
let sent: Sent[] = [];

beforeEach(() => {
  sent = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return new Response("{}", { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const flush = () => new Promise((resolve) => setTimeout(resolve, 5));
const llmSpans = () => sent.filter((s) => s.spanType === "llm_call");
const middleware = () => uncoilMiddleware({ client: new UncoilClient({ apiKey: KEY }) });

function streamOf(parts: unknown[]) {
  return async () => ({ stream: new ReadableStream({ start(c) { parts.forEach((p) => c.enqueue(p)); c.close(); } }) });
}

async function drain(stream: ReadableStream) {
  const reader = stream.getReader();
  while (!(await reader.read()).done);
}

describe("uncoilMiddleware wrapStream", () => {
  it("joins delta and older textDelta parts into the recorded output", async () => {
    const parts = [
      { type: "text-delta", delta: "Hel" },
      { type: "text-delta", textDelta: "lo" },
      { type: "text-delta", delta: "!" },
    ];
    const streamed = await middleware().wrapStream({ model, params: {}, doStream: streamOf(parts) });
    await drain(streamed.stream);
    await flush();
    expect(llmSpans()).toHaveLength(1);
    expect(llmSpans()[0].output).toBe("Hello!");
    expect(llmSpans()[0].errorType).toBeUndefined();
  });

  it("records usage from a finish part with older field names", async () => {
    const parts = [
      { type: "text-delta", delta: "ok" },
      { type: "finish", usage: { promptTokens: 11, completionTokens: 7 } },
    ];
    const streamed = await middleware().wrapStream({ model, params: {}, doStream: streamOf(parts) });
    await drain(streamed.stream);
    await flush();
    expect(llmSpans()[0]).toMatchObject({ output: "ok", inputTokens: 11, outputTokens: 7 });
  });

  it("records the step as failed when an error part arrives", async () => {
    const parts = [
      { type: "text-delta", delta: "part" },
      { type: "error", error: new Error("upstream broke") },
    ];
    const streamed = await middleware().wrapStream({ model, params: {}, doStream: streamOf(parts) });
    await drain(streamed.stream);
    await flush();
    expect(llmSpans()).toHaveLength(1);
    expect(llmSpans()[0]).toMatchObject({ output: "part", errorType: "Error", errorMessage: "upstream broke" });
  });

  it("records a cancelled stream as aborted", async () => {
    const source = new ReadableStream({ start(c) { c.enqueue({ type: "text-delta", delta: "half" }); } });
    const streamed = await middleware().wrapStream({ model, params: {}, doStream: async () => ({ stream: source }) });
    const reader = streamed.stream.getReader();
    await reader.read();
    await reader.cancel();
    await flush();
    expect(llmSpans()[0]).toMatchObject({ output: "half", errorType: "AbortError" });
    expect(llmSpans()[0].metadata).toMatchObject({ cancelled: true });
  });
});

describe("uncoilMiddleware wrapGenerate", () => {
  it("maps promptTokens and completionTokens to input and output tokens", async () => {
    await middleware().wrapGenerate({
      model,
      params: {},
      doGenerate: async () => ({ text: "hi", usage: { promptTokens: 9, completionTokens: 3 } }),
    });
    await flush();
    expect(llmSpans()[0]).toMatchObject({ output: "hi", inputTokens: 9, outputTokens: 3 });
  });

  it("joins only the text parts of a content array", async () => {
    await middleware().wrapGenerate({
      model,
      params: {},
      doGenerate: async () => ({
        content: [
          { type: "text", text: "one " },
          { type: "tool-call", toolName: "search" },
          { type: "text", text: "two" },
        ],
      }),
    });
    await flush();
    expect(llmSpans()[0].output).toBe("one two");
  });
});
