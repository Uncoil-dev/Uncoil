import { describe, it, expect } from "vitest";
import { UncoilClient, span, observe, traceAgent, type SpanData } from "../src/index";

class Recorder extends UncoilClient {
  sent: Array<Record<string, any>> = [];
  constructor() { super({ apiKey: "uncoil_sk_live_eu_test" }); }
  async ingest(data: SpanData) {
    // Reuse the real span shaping, but capture instead of POSTing.
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: { body: string }) => { this.sent.push(JSON.parse(init.body)); return new Response("{}"); }) as any;
    try { await super.ingest(data); } finally { globalThis.fetch = original; }
  }
}

const byName = (spans: Array<Record<string, any>>) => Object.fromEntries(spans.map((s) => [s.toolName ?? s.modelId, s]));

describe("steps", () => {
  it("links nested steps to their parent and root", async () => {
    const client = new Recorder();
    const answer = traceAgent(async (question: string) => {
      await span("plan", async () => {
        await span("search", (step) => { step.setOutput(["doc"]); }, { type: "tool", input: question, client });
        await span("chat", (step) => { step.set({ model: "claude", inputTokens: 10, outputTokens: 3 }); return "reply"; }, { type: "llm", client });
      }, { type: "agent", client });
      return "done";
    }, { apiKey: "uncoil_sk_live_eu_test", name: "answer" });
    // traceAgent builds its own client, so record the root through the same fetch hook.
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: { body: string }) => { client.sent.push(JSON.parse(init.body)); return new Response("{}"); }) as any;
    try { expect(await answer("why?")).toBe("done"); } finally { globalThis.fetch = original; }
    const spans = byName(client.sent);
    expect(spans.answer.spanType).toBe("run_end");
    expect(spans.answer.parentSpanId).toBeUndefined();
    expect(spans.plan.parentSpanId).toBe(spans.answer.spanId);
    expect(spans.search.parentSpanId).toBe(spans.plan.spanId);
    expect(spans.chat.parentSpanId).toBe(spans.plan.spanId);
    expect(spans.chat).toMatchObject({ modelId: "claude", inputTokens: 10, outputTokens: 3, output: "reply" });
    expect(new Set(client.sent.map((s) => s.runId)).size).toBe(1);
  });

  it("marks failed steps", async () => {
    const client = new Recorder();
    await expect(span("lookup", () => { throw new TypeError("boom"); }, { type: "tool", client })).rejects.toThrow("boom");
    expect(client.sent[0]).toMatchObject({ toolName: "lookup", errorType: "TypeError", errorMessage: "boom" });
  });

  it("keeps concurrent runs apart", async () => {
    const client = new Recorder();
    const run = (tag: number) => span(`root-${tag}`, () => span(`child-${tag}`, () => new Promise((r) => setTimeout(r, 5 * (4 - tag))), { client }), { client, runId: `run-${tag}`, root: true });
    await Promise.all([0, 1, 2, 3].map(run));
    for (const s of client.sent.filter((s) => s.toolName.startsWith("child"))) {
      const tag = s.toolName.split("-")[1];
      expect(s.runId).toBe(`run-${tag}`);
      expect(client.sent.find((r) => r.spanId === s.parentSpanId)?.toolName).toBe(`root-${tag}`);
    }
  });

  it("observe records arguments and result", async () => {
    const client = new Recorder();
    const fetchDoc = observe(async function fetchDoc(url: string) { return { url }; }, { type: "tool", client });
    await fetchDoc("a");
    expect(client.sent[0]).toMatchObject({ toolName: "fetchDoc", spanType: "tool", input: '["a"]', output: '{"url":"a"}' });
  });

  it("redacts secrets and caps payloads", async () => {
    const client = new Recorder();
    const secret = "sk-ant-" + "a".repeat(30);
    await span("call", (step) => { step.setOutput("y".repeat(20_000)); }, { input: { api_key: "hunter2hunter2", auth: `Bearer ${"x".repeat(40)}`, k: secret }, client });
    const sent = client.sent[0]!;
    expect(sent.input).not.toContain("hunter2");
    expect(sent.input).not.toContain(secret);
    expect(sent.input).not.toContain("x".repeat(40));
    expect(sent.output.length).toBeLessThan(10_100);
    expect(sent.output).toContain("truncated");
  });
});
