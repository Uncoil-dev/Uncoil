import { describe, it, expect, afterEach, vi } from "vitest";
import { span, traceAgent } from "../src/index";

const apiKey = "uncoil_sk_live_eu_test";

afterEach(() => { vi.unstubAllGlobals(); });

/** Capture every span the SDK POSTs; traceAgent builds its own client, so fetch is the seam. */
function recordFetch() {
  const sent: Array<Record<string, unknown>> = [];
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => { sent.push(JSON.parse(init.body)); return new Response("{}"); });
  return sent;
}

describe("traceAgent", () => {
  it("gives each call a new run that its steps share and hang from", async () => {
    const sent = recordFetch();
    const agent = traceAgent(async function answer() {
      await span("search", () => "doc", { type: "tool" });
      await span("chat", () => "reply", { type: "llm" });
    }, { apiKey });
    await agent();
    await agent();

    const roots = sent.filter((s) => s.toolName === "answer");
    expect(roots).toHaveLength(2);
    expect(roots[0]!.runId).not.toBe(roots[1]!.runId);
    for (const root of roots) {
      const steps = sent.filter((s) => s.runId === root.runId && s !== root);
      expect(steps.map((s) => s.toolName).sort()).toEqual(["chat", "search"]);
      for (const step of steps) expect(step.parentSpanId).toBe(root.spanId);
    }
  });

  it("sends the root as run_end with the agent step type when the call resolves", async () => {
    const sent = recordFetch();
    await expect(traceAgent(async () => "done", { apiKey, name: "helper" })()).resolves.toBe("done");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ toolName: "helper", spanType: "run_end", output: "done", metadata: { stepType: "agent" } });
    expect(sent[0]!.parentSpanId).toBeUndefined();
  });

  it("sends the root as error with the error name and message and rethrows", async () => {
    const sent = recordFetch();
    const error = new TypeError("bad input");
    await expect(traceAgent(async () => { throw error; }, { apiKey, name: "helper" })()).rejects.toBe(error);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ toolName: "helper", spanType: "error", errorType: "TypeError", errorMessage: "bad input", metadata: { stepType: "agent" } });
  });

  it("names the root from config.name, then the function name, then agent", async () => {
    const sent = recordFetch();
    await traceAgent(async function research() {}, { apiKey, name: "custom" })();
    await traceAgent(async function research() {}, { apiKey })();
    await traceAgent(async () => {}, { apiKey })();
    expect(sent.map((s) => s.toolName)).toEqual(["custom", "research", "agent"]);
  });
});
