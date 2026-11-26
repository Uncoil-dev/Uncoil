import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UncoilClient, span } from "../src/index";

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

const client = () => new UncoilClient({ apiKey: "uncoil_sk_live_eu_abcdefghijklmnop" });
const flush = () => new Promise((resolve) => setTimeout(resolve, 5));
const sentStep = (name: string) => sent.find((s) => s.toolName === name)!;

describe("Step.set", () => {
  it("sends model, tokens and cost as span fields and the rest as metadata", async () => {
    await span("chat", (step) => {
      step.set({ model: "claude-test", inputTokens: 12, outputTokens: 4, costUsd: 0.25, foo: "bar" });
    }, { type: "llm", client: client() });
    await flush();
    const s = sentStep("chat");
    expect(s).toMatchObject({ modelId: "claude-test", inputTokens: 12, outputTokens: 4, costUsd: 0.25 });
    expect(s.metadata).toMatchObject({ foo: "bar" });
    expect(s.metadata).not.toHaveProperty("model");
    expect(s.metadata).not.toHaveProperty("inputTokens");
    expect(s.metadata).not.toHaveProperty("outputTokens");
    expect(s.metadata).not.toHaveProperty("costUsd");
  });

  it("keeps earlier values when a later call passes undefined", async () => {
    await span("chat", (step) => {
      step.set({ model: "claude-test", inputTokens: 12, outputTokens: 4, costUsd: 0.25 });
      step.set({ model: undefined, inputTokens: undefined, outputTokens: undefined, costUsd: undefined, foo: "later" });
    }, { type: "llm", client: client() });
    await flush();
    const s = sentStep("chat");
    expect(s).toMatchObject({ modelId: "claude-test", inputTokens: 12, outputTokens: 4, costUsd: 0.25 });
    expect(s.metadata).toMatchObject({ foo: "later" });
  });

  it("merges metadata from the step options with metadata set later", async () => {
    await span("chat", (step) => { step.set({ foo: "bar" }); }, { metadata: { team: "search" }, client: client() });
    await flush();
    expect(sentStep("chat").metadata).toMatchObject({ team: "search", foo: "bar" });
  });
});

describe("Step.setOutput", () => {
  it("wins over the callback's return value", async () => {
    const result = await span("search", (step) => {
      step.setOutput("chosen output");
      return "returned value";
    }, { type: "tool", client: client() });
    await flush();
    expect(result).toBe("returned value");
    expect(sentStep("search").output).toBe("chosen output");
  });

  it("falls back to the return value when no output was set", async () => {
    await span("search", () => "returned value", { type: "tool", client: client() });
    await flush();
    expect(sentStep("search").output).toBe("returned value");
  });
});
