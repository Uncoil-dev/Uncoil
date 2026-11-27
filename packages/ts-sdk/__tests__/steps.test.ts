import { describe, it, expect, vi, afterEach } from "vitest";
import { UncoilClient, span, observe, traceAgent, llmCall, currentRunId, currentSpanId, type SpanData } from "../src/index";

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
  it("sends llmCall inside traceAgent with the agent's API key", async () => {
    vi.stubEnv("UNCOIL_API_KEY", "uncoil_sk_live_eu_fromenv");
    const requests: Array<{ auth: string; body: Record<string, any> }> = [];
    vi.stubGlobal("fetch", async (_url: string, init: { headers: Record<string, string>; body: string }) => {
      requests.push({ auth: init.headers.Authorization, body: JSON.parse(init.body) });
      return new Response("{}");
    });
    try {
      const agent = traceAgent(async () => {
        await llmCall({ modelId: "m1", input: "q", output: "a" });
      }, { apiKey: "uncoil_sk_live_eu_explicit" });
      await agent();
      const call = requests.find((r) => r.body.spanType === "llm_call");
      expect(call?.auth).toBe("Bearer uncoil_sk_live_eu_explicit");
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

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

  describe("outside a step", () => {
    const keys = ["UNCOIL_CURRENT_RUN_ID"] as const;
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    afterEach(() => {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    });
    const clear = () => { for (const k of keys) delete process.env[k]; };

    it("uses the run id passed down from a parent process", () => {
      clear();
      process.env.UNCOIL_CURRENT_RUN_ID = "parent-run";
      expect(currentRunId()).toBe("parent-run");
    });

    it("reports an unknown run when nothing is set", () => {
      clear();
      expect(currentRunId()).toBe("unknown");
    });

    it("has no current span", () => {
      expect(currentSpanId()).toBeUndefined();
    });
  });
});

describe("failed run link", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  const agent = (config: Record<string, unknown>, fail: boolean) => traceAgent(async () => {
    await span("search_docs", () => { if (fail) throw new Error("404"); }, { type: "tool" });
    return "ok";
  }, { apiKey: "uncoil_sk_live_eu_test", projectId: "proj_1", name: "answer", ...config });
  let bodies: Array<Record<string, unknown>> = [];
  const lines = async (config: Record<string, unknown>, fail = true) => {
    bodies = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => { bodies.push(JSON.parse(init.body)); return new Response("{}"); }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await agent(config, fail)().catch(() => {});
    return warn.mock.calls.map((c) => String(c[0]));
  };

  it("prints one line naming the failing step with a link to the run", async () => {
    const printed = await lines({});
    expect(printed).toHaveLength(1);
    const runId = bodies.find((b) => b.spanType === "error")?.runId;
    expect(printed[0]).toBe(`Uncoil: run failed at step "search_docs" -> https://eu.cloud.uncoil.dev/dashboard/proj_1/tracing/${runId}`);
  });

  it("prints nothing for a passing run, in production, or when switched off", async () => {
    expect(await lines({}, false)).toEqual([]);
    expect(await lines({ failureLinks: false })).toEqual([]);
    expect(await lines({ environment: "production" })).toEqual([]);
    vi.stubEnv("NODE_ENV", "production");
    expect(await lines({})).toEqual([]);
  });
});
