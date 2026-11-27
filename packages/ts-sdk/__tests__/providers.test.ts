import { describe, expect, it, vi } from "vitest";
import { UncoilClient } from "../src/index";
import { isInsideWrapped, traced, wrapAnthropic, wrapOpenAI } from "../src/integrations/providers";

function telemetry() {
  const sent: any[] = [];
  const client = new UncoilClient({ apiKey: "test-key" });
  client.ingest = vi.fn(async (data: any) => {
    sent.push({ ...data });
  }) as any;
  return { sent, client };
}

describe("traced", () => {
  it("adds include_usage for streaming openai chat calls only", () => {
    const { client } = telemetry();
    const call = vi.fn(() => ({ choices: [] }));
    traced("openai", "chat.completions.create", call, { model: "m", stream: true }, { client });
    expect(call.mock.calls[0][0].stream_options).toEqual({ include_usage: true });
    const other = vi.fn(() => ({}));
    traced("openai", "responses.create", other, { model: "m", stream: true }, { client });
    expect(other.mock.calls[0][0].stream_options).toBeUndefined();
    const explicit = vi.fn(() => ({}));
    traced("openai", "chat.completions.create", explicit, { stream: true, stream_options: { include_usage: false } }, { client });
    expect(explicit.mock.calls[0][0].stream_options.include_usage).toBe(false);
  });

  it("records an error and rethrows when the call throws, restoring the wrapped flag", () => {
    const { sent, client } = telemetry();
    expect(() =>
      traced("openai", "chat.completions.create", () => { throw new RangeError("bad"); }, { model: "m" }, { client }),
    ).toThrow("bad");
    expect(sent[0].errorType).toBe("RangeError");
    expect(isInsideWrapped()).toBe(false);
  });

  it("marks the call as wrapped while it runs", () => {
    const { client } = telemetry();
    let inside = false;
    traced("openai", "chat.completions.create", () => { inside = isInsideWrapped(); return {}; }, {}, { client });
    expect(inside).toBe(true);
    traced("openai", "chat.completions.create", () => { inside = isInsideWrapped(); return {}; }, {}, { client }, false);
    expect(inside).toBe(false);
  });

  it("builds anthropic system prompts into the captured input", () => {
    const { sent, client } = telemetry();
    traced("anthropic", "messages.create", () => ({}), { model: "c", system: "be brief", messages: [{ role: "user", content: "hi" }] }, { client });
    expect(sent[0].input).toEqual([
      { role: "system", content: "be brief" },
      { role: "user", content: "hi" },
    ]);
  });
});

describe("wrap clients", () => {
  it("records structured-output parse() calls like create()", async () => {
    const { sent, client } = telemetry();
    const result = { model: "real-model", choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 4, completion_tokens: 1 } };
    const wrapped = wrapOpenAI({ chat: { completions: { parse: vi.fn(async () => result) } }, responses: { parse: vi.fn(async () => result) } }, { client });
    await wrapped.chat.completions.parse({ model: "m", messages: [] });
    await wrapped.responses.parse({ model: "m", input: "hi" });
    const calls = sent.filter((span) => span.spanType === "llm_call");
    expect(calls).toHaveLength(2);
    expect(calls.map((span) => span.inputTokens)).toEqual([4, 4]);
  });

  it("records usage and output from a resolved promise result", async () => {
    const { sent, client } = telemetry();
    const create = vi.fn(async () => ({
      model: "real-model",
      choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
    }));
    const wrapped = wrapOpenAI({ chat: { completions: { create } } }, { client });
    await wrapped.chat.completions.create({ model: "m", messages: [] });
    expect(sent[0].modelId).toBe("real-model");
    expect(sent[0].inputTokens).toBe(3);
    expect(sent[0].outputTokens).toBe(2);
    expect(sent[0].metadata.finishReason).toBe("stop");
  });

  it("does not double wrap the same client and leaves other methods untouched", () => {
    const { client } = telemetry();
    const raw = { models: { list: () => "list" }, messages: { create: async () => ({}) } };
    const once = wrapAnthropic(raw, { client });
    expect(wrapAnthropic(once, { client })).toBe(once);
    expect(once.models.list()).toBe("list");
  });

  it("records an error when the wrapped call rejects", async () => {
    const { sent, client } = telemetry();
    const wrapped = wrapAnthropic(
      { messages: { create: async () => { throw new Error("rate limited"); } } },
      { client },
    );
    await expect(wrapped.messages.create({ model: "c", messages: [] })).rejects.toThrow("rate limited");
    expect(sent[0].errorMessage).toContain("rate limited");
  });

  it("collects text and usage from an async stream", async () => {
    const { sent, client } = telemetry();
    async function* events() {
      yield { type: "message_start", message: { model: "c", usage: { input_tokens: 5 } } };
      yield { type: "content_block_delta", delta: { text: "Hel" } };
      yield { type: "content_block_delta", delta: { text: "lo" } };
      yield { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 4 } };
    }
    const wrapped = wrapAnthropic({ messages: { create: async () => events() } }, { client });
    const stream: any = await wrapped.messages.create({ model: "c", messages: [], stream: true });
    for await (const _ of stream) void _;
    expect(sent[0].output).toBe("Hello");
    expect(sent[0].inputTokens).toBe(5);
    expect(sent[0].outputTokens).toBe(4);
    expect(sent[0].metadata.finishReason).toBe("end_turn");
    expect(sent[0].ttftMs).toBeGreaterThanOrEqual(0);
  });
});
