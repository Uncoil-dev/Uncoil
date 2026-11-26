import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { llmCall, toolCall, decision } from "../src/index";

// The helpers use the shared default client, which reads its key from the environment on first use.
beforeAll(() => { process.env.UNCOIL_API_KEY = "uncoil_sk_live_eu_test"; });
afterEach(() => { vi.unstubAllGlobals(); });

function recordFetch() {
  const sent: Array<Record<string, unknown>> = [];
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => { sent.push(JSON.parse(init.body)); return new Response("{}"); });
  return sent;
}

const fields = {
  runId: "run-1",
  spanId: "span-1",
  modelId: "claude",
  toolName: "search",
  input: "question",
  output: "answer",
  latencyMs: 42,
  costUsd: 0.25,
  inputTokens: 10,
  outputTokens: 3,
  metadata: { source: "test" },
};

describe("span helpers", () => {
  it.each([
    ["llmCall", llmCall, "llm_call"],
    ["toolCall", toolCall, "tool_call"],
    ["decision", decision, "decision"],
  ] as const)("%s sends one span of type %s with the given fields", async (_name, helper, spanType) => {
    const sent = recordFetch();
    await helper(fields);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ ...fields, spanType });
  });
});
