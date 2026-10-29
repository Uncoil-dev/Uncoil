import { beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { DynamicTool } from "@langchain/core/tools";
import {
  wrapOpenAI,
  wrapAnthropic,
  UncoilClient,
  UncoilLangGraphHandler,
  span,
} from "../src/index";
const records: any[] = [];
const telemetry = new UncoilClient({ apiKey: "test-key" });
telemetry.ingest = vi.fn(async (data: any) => {
  records.push({ ...data });
});
beforeEach(() => records.splice(0));
const json = (body: any) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "x-request-id": "request-id",
    },
  });
const completion = {
  id: "chat-1",
  object: "chat.completion",
  created: 1,
  model: "test-model",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "ok" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
};
const eventStream = (events: any[], anthropic = false) =>
  new Response(
    events
      .map(
        (e) =>
          `${anthropic ? `event: ${e.type}\n` : ""}data: ${JSON.stringify(e)}\n\n`,
      )
      .join("") + (anthropic ? "" : "data: [DONE]\n\n"),
    { headers: { "content-type": "text/event-stream" } },
  );
describe("standalone span integration",()=>{it("keeps provider calls in their manually opened root",async()=>{const ai=wrapOpenAI(new OpenAI({apiKey:"fake",fetch:async()=>json(completion)}),{client:telemetry});await span("manual",()=>ai.chat.completions.create({model:"test-model",messages:[]}),{root:true,client:telemetry});expect(records).toHaveLength(2);expect(records[0].runId).toBe(records[1].runId);expect(records[0].parentSpanId).toBe(records[1].spanId);expect(records[0].runId).not.toBe("unknown");});});
describe("official SDK provider wrappers", () => {
  it("preserves OpenAI response helpers and records measured usage once", async () => {
    const original = new OpenAI({
      apiKey: "fake-provider-key",
      fetch: vi.fn(async () => json(completion)),
    });
    const ai = wrapOpenAI(original, {
      client: telemetry,
      calculateCost: () => 0.002,
    });
    const full = await ai.chat.completions
      .create({ model: "test-model", messages: [] })
      .withResponse();
    expect(full.data).toMatchObject(completion);
    expect(full.response.headers.get("x-request-id")).toBe("request-id");
    expect(records).toHaveLength(2);
    expect(records.find((r) => r.spanType === "llm_call")).toMatchObject({
      inputTokens: 12,
      outputTokens: 4,
      costUsd: 0.002,
    });
    expect(records[0].runId).not.toBe("unknown");
  });
  it("does not consume raw responses before the caller", async () => {
    const ai = wrapOpenAI(
      new OpenAI({ apiKey: "fake", fetch: async () => json(completion) }),
      { client: telemetry },
    );
    const response = await ai.chat.completions
      .create({ model: "test-model", messages: [] })
      .asResponse();
    expect(await response.json()).toMatchObject(completion);
  });
  it("records streaming usage and TTFT without changing chunks or mutating options", async () => {
    const chunks = [
      {
        ...completion,
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { content: "ok" }, finish_reason: null }],
        usage: null,
      },
      { ...completion, choices: [] },
    ];
    const fetcher = vi.fn(async () => eventStream(chunks));
    const ai = wrapOpenAI(new OpenAI({ apiKey: "fake", fetch: fetcher }), {
      client: telemetry,
    });
    const params = { model: "test-model", messages: [], stream: true as const };
    const stream = await ai.chat.completions.create(params);
    const seen = [];
    for await (const chunk of stream) seen.push(chunk);
    expect(seen).toEqual(chunks);
    expect(params).not.toHaveProperty("stream_options");
    expect(records[0]).toMatchObject({ inputTokens: 12, outputTokens: 4 });
    expect(records[0].ttftMs).toBeGreaterThanOrEqual(0);
  });
  it("marks early iterator cancellation once and preserves errors", async () => {
    const ai = wrapOpenAI(
      new OpenAI({
        apiKey: "fake",
        fetch: async () =>
          eventStream([
            { ...completion, choices: [{ index: 0, delta: { content: "a" } }] },
            { ...completion, choices: [{ index: 0, delta: { content: "b" } }] },
          ]),
      }),
      { client: telemetry },
    );
    for await (const chunk of await ai.chat.completions.create({
      model: "test-model",
      messages: [],
      stream: true,
    })) {
      expect(chunk).toBeDefined();
      break;
    }
    expect(records[0]).toMatchObject({
      errorType: "AbortError",
      metadata: { cancelled: true },
    });
    expect(records).toHaveLength(2);
  });
  it("rethrows the exact provider error and records failure without secrets", async () => {
    const error = new Error("bad sk-proj-abcdefghijklmnopqrstuvwxyz123456");
    const original = {
      chat: { completions: { create: () => Promise.reject(error) } },
    };
    const ai = wrapOpenAI(original, { client: telemetry });
    await expect(ai.chat.completions.create()).rejects.toBe(error);
    expect(records[0].errorMessage).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
  it("supports OpenAI Responses and concurrent parent contexts", async () => {
    const ai = wrapOpenAI(
      new OpenAI({
        apiKey: "fake",
        fetch: async () =>
          json({
            id: "resp",
            object: "response",
            model: "test-model",
            output: [],
            usage: { input_tokens: 8, output_tokens: 3 },
          }),
      }),
      { client: telemetry },
    );
    await Promise.all(
      ["a", "b"].map((runId) =>
        span(
          "agent",
          async () => ai.responses.create({ model: "test-model", input: "x" }),
          { client: telemetry, runId, root: true },
        ),
      ),
    );
    const children = records.filter((r) => r.spanType === "llm_call");
    expect(children).toHaveLength(2);
    for (const child of children)
      expect(
        records.some(
          (r) => r.spanId === child.parentSpanId && r.runId === child.runId,
        ),
      ).toBe(true);
  });
  it("preserves Anthropic helper streaming and finalMessage", async () => {
    const events = [
      {
        type: "message_start",
        message: {
          id: "msg",
          type: "message",
          role: "assistant",
          model: "test-model",
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 20, output_tokens: 0, cache_creation_input_tokens: 10, cache_read_input_tokens: 30 },
        },
      },
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "ok" },
      },
      { type: "content_block_stop", index: 0 },
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn", stop_sequence: null },
        usage: { input_tokens: null, cache_creation_input_tokens: null, cache_read_input_tokens: null, output_tokens: 5 },
      },
      { type: "message_stop" },
    ];
    const ai = wrapAnthropic(
      new Anthropic({
        apiKey: "fake",
        fetch: async () => eventStream(events, true),
      }),
      { client: telemetry },
    );
    const stream = ai.messages.stream({
      model: "test-model",
      max_tokens: 10,
      messages: [{ role: "user", content: "x" }],
    });
    const message = await stream.finalMessage();
    await stream.done();
    expect(message.content).toEqual([{ type: "text", text: "ok" }]);
    expect(records[0]).toMatchObject({ inputTokens: 60, outputTokens: 5 });
  });
  it("is idempotent and telemetry failures never affect the provider", async () => {
    const bad = new UncoilClient();
    bad.ingest = () => {
      throw Error("telemetry offline");
    };
    const original = {
      chat: { completions: { create: async () => completion } },
    };
    const ai = wrapOpenAI(original, { client: bad });
    expect(wrapOpenAI(ai)).toBe(ai);
    expect(await ai.chat.completions.create()).toEqual(completion);
  });
});
describe("real LangGraph callbacks", () => {
  it("records real graph/node/tool parentage without mandatory framework imports", async () => {
    const handler = new UncoilLangGraphHandler({
      client: telemetry,
      name: "graph-test",
    });
    const tool = new DynamicTool({
      name: "lookup",
      description: "lookup",
      func: async (input) => `found ${input}`,
    });
    const State = Annotation.Root({ value: Annotation<string> });
    const graph = new StateGraph(State)
      .addNode("search", async (state, config) => ({
        value: await tool.invoke(state.value, config),
      }))
      .addEdge("__start__", "search")
      .addEdge("search", "__end__")
      .compile();
    const result = await graph.invoke({ value: "x" }, { callbacks: [handler] });
    expect(result.value).toBe("found x");
    expect(records.some((r) => r.spanType === "run_end")).toBe(true);
    const child = records.find((r) => r.toolName === "lookup");
    expect(child).toBeTruthy();
    expect(
      records.some(
        (r) => r.spanId === child.parentSpanId && r.runId === child.runId,
      ),
    ).toBe(true);
  });
});

describe("LangGraph inside a manual root",()=>{it("inherits the enclosing run and parent",async()=>{const handler=new UncoilLangGraphHandler({client:telemetry});await span("outer",()=>{handler.handleChainStart({}, {}, "graph-id");handler.handleChainEnd({},"graph-id");},{client:telemetry,root:true});expect(records).toHaveLength(2);expect(records[0].runId).toBe(records[1].runId);expect(records[0].parentSpanId).toBe(records[1].spanId);expect(records[0].spanType).toBe("agent");});});

describe("Anthropic cache token accounting",()=>{it("includes cache reads/writes in total input while preserving raw usage",async()=>{const usage={input_tokens:8,output_tokens:3,cache_creation_input_tokens:20,cache_read_input_tokens:30};const client=wrapAnthropic(new Anthropic({apiKey:"fake",fetch:async()=>json({id:"msg",type:"message",role:"assistant",model:"test-model",content:[{type:"text",text:"ok"}],stop_reason:"end_turn",stop_sequence:null,usage})}),{client:telemetry});await client.messages.create({model:"test-model",max_tokens:20,messages:[]});expect(records[0].inputTokens).toBe(58);expect(records[0].metadata.usage).toMatchObject(usage);});});
