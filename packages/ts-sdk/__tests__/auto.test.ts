import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { init, uninit, wrapOpenAI, TracifyClient } from "../src/index";

// init() patches the package's CommonJS build (the one `require` gets), so load that build here.
const cjs = createRequire(import.meta.url);
const OpenAI = cjs("openai").OpenAI as typeof import("openai").default;
const Anthropic = cjs("@anthropic-ai/sdk").Anthropic as typeof import("@anthropic-ai/sdk").default;
const records: any[] = [];
const telemetry = new TracifyClient({ apiKey: "test-key" });
telemetry.ingest = vi.fn(async (data: any) => { records.push({ ...data }); });
const json = (body: any) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const completion = {
  id: "chat-1", object: "chat.completion", created: 1, model: "test-model",
  choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
  usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
};
const message = {
  id: "msg-1", type: "message", role: "assistant", model: "test-model", content: [{ type: "text", text: "ok" }],
  stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 8, output_tokens: 3 },
};
const llms = () => records.filter((r) => r.spanType === "llm_call");

beforeEach(() => records.splice(0));
afterEach(() => uninit());

describe("init()", () => {
  it("traces OpenAI and Anthropic calls without wrapping the client", async () => {
    await init({ client: telemetry }).ready;
    const response = await new OpenAI({ apiKey: "fake", fetch: async () => json(completion) }).chat.completions.create({ model: "test-model", messages: [] });
    expect(response.choices[0].message.content).toBe("ok");
    await new Anthropic({ apiKey: "fake", fetch: async () => json(message) }).messages.create({ model: "test-model", max_tokens: 5, messages: [] });
    expect(llms()).toHaveLength(2);
    expect(llms()[0]).toMatchObject({ inputTokens: 12, outputTokens: 4 });
    expect(llms()[1]).toMatchObject({ inputTokens: 8, outputTokens: 3 });
  });
  it("does not record a call twice when the client is also wrapped", async () => {
    await init({ client: telemetry }).ready;
    const ai = wrapOpenAI(new OpenAI({ apiKey: "fake", fetch: async () => json(completion) }), { client: telemetry });
    await ai.chat.completions.create({ model: "test-model", messages: [] });
    expect(llms()).toHaveLength(1);
  });
  it("records provider errors and rethrows them", async () => {
    await init({ client: telemetry }).ready;
    const ai = new OpenAI({ apiKey: "fake", maxRetries: 0, fetch: async () => new Response(JSON.stringify({ error: { message: "bad" } }), { status: 400, headers: { "content-type": "application/json" } }) });
    await expect(ai.chat.completions.create({ model: "test-model", messages: [] })).rejects.toThrow();
    expect(llms()[0].errorMessage).toBeTruthy();
  });
  it("stops tracing after uninit()", async () => {
    init({ client: telemetry });
    uninit();
    await new OpenAI({ apiKey: "fake", fetch: async () => json(completion) }).chat.completions.create({ model: "test-model", messages: [] });
    expect(records).toHaveLength(0);
  });
});
