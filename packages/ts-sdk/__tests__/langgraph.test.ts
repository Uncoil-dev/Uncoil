import { beforeEach, describe, expect, it, vi } from "vitest";
import { UncoilClient, UncoilLangGraphHandler } from "../src/index";

const records: any[] = [];
const telemetry = new UncoilClient({ apiKey: "test-key" });
telemetry.ingest = vi.fn(async (data: any) => {
  records.push({ ...data });
});
beforeEach(() => records.splice(0));
const make = () => new UncoilLangGraphHandler({ client: telemetry });

describe("UncoilLangGraphHandler", () => {
  it("links nested chain, tool and llm runs under one run id", () => {
    const h = make();
    h.handleChainStart({ name: "graph" }, { q: 1 }, "c1");
    h.handleToolStart({ name: "search" }, "x", "t1", "c1");
    h.handleToolEnd("hit", "t1");
    h.handleLLMStart({}, ["hi"], "l1", "c1", { invocation_params: { model: "m-1" } });
    h.handleLLMNewToken("a", 0, "l1");
    h.handleLLMEnd({ generations: [[{ text: "ok" }]], llmOutput: { tokenUsage: { promptTokens: 7, completionTokens: 2 } } }, "l1");
    h.handleChainEnd({ done: true }, "c1");
    expect(records.map((r) => r.spanId)).toEqual(["t1", "l1", "c1"]);
    expect(new Set(records.map((r) => r.runId))).toEqual(new Set(["c1"]));
    expect(records[0]).toMatchObject({ spanType: "tool_call", toolName: "search", parentSpanId: "c1", output: "hit" });
    expect(records[1]).toMatchObject({ spanType: "llm_call", modelId: "m-1", inputTokens: 7, outputTokens: 2 });
    expect(records[1].ttftMs).toBeGreaterThanOrEqual(0);
    expect(records[2]).toMatchObject({ spanType: "run_end", toolName: "graph" });
  });

  it("records retriever steps with the query and the documents found", () => {
    const h = make();
    h.handleChainStart({ name: "rag" }, {}, "c1");
    h.handleRetrieverStart({ id: ["langchain", "retrievers", "VectorStoreRetriever"] }, "refund policy", "r1", "c1");
    h.handleRetrieverEnd([{ pageContent: "Refunds within 30 days", metadata: {} }], "r1");
    h.handleRetrieverStart({}, "missing", "r2", "c1");
    h.handleRetrieverError(new Error("index offline"), "r2");
    h.handleChainEnd({}, "c1");
    expect(records[0]).toMatchObject({ spanType: "retrieval", toolName: "VectorStoreRetriever", input: "refund policy", parentSpanId: "c1" });
    expect(JSON.stringify(records[0].output)).toContain("Refunds within 30 days");
    expect(records[1]).toMatchObject({ spanType: "retrieval", errorMessage: "index offline" });
  });

  it("records errors with their type and message", () => {
    const h = make();
    h.handleChainStart({}, {}, "c1");
    h.handleToolStart({}, "x", "t1", "c1");
    h.handleToolError(new RangeError("tool failed"), "t1");
    h.handleChainError(new Error("chain failed"), "c1");
    expect(records[0]).toMatchObject({ errorType: "RangeError", errorMessage: "tool failed" });
    expect(records[1]).toMatchObject({ spanType: "error", errorType: "Error", errorMessage: "chain failed" });
  });

  it("ignores duplicate starts and unknown ids, and finishes a run once", () => {
    const h = make();
    h.handleChainStart({}, {}, "c1");
    h.handleChainStart({}, {}, "c1");
    h.handleChainEnd({}, "missing");
    h.handleLLMNewToken("a", 0, "missing");
    h.handleChainEnd({}, "c1");
    h.handleChainEnd({}, "c1");
    expect(records).toHaveLength(1);
  });

  it("falls back to default names and reads usage_metadata", () => {
    const h = make();
    h.handleChainStart({}, {}, "c1");
    h.handleChatModelStart({}, [], "l1", "c1");
    h.handleLLMEnd({ generations: [[{ message: { usage_metadata: { input_tokens: 3, output_tokens: 1 } } }]] }, "l1");
    h.handleChainEnd({}, "c1");
    expect(records[0]).toMatchObject({ toolName: "model", inputTokens: 3, outputTokens: 1 });
    expect(records[1].toolName).toBe("graph");
  });

  it("honors captureInput and captureOutput", () => {
    const h = new UncoilLangGraphHandler({ client: telemetry, captureInput: false, captureOutput: false });
    h.handleToolStart({ name: "t" }, "secret", "t1");
    h.handleToolEnd("secret", "t1");
    expect(records[0]).toMatchObject({ input: "[not captured]", output: "[not captured]" });
  });
});
