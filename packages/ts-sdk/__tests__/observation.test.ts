import { describe, expect, it, vi } from "vitest";
import { UncoilClient } from "../src/index";
import { observation } from "../src/integrations/observation";

function setup(options: Record<string, any> = {}) {
  const sent: any[] = [];
  const client = new UncoilClient({ apiKey: "test-key" });
  client.ingest = vi.fn(async (data: any) => {
    sent.push({ ...data });
  }) as any;
  return { sent, obs: observation("openai", "m1", "hi", { client, ...options }) };
}

describe("observation", () => {
  it("creates an implicit root span and sends both on finish", () => {
    const { sent, obs } = setup();
    obs.finish("done");
    expect(sent).toHaveLength(2);
    expect(sent[0].spanType).toBe("llm_call");
    expect(sent[1].spanType).toBe("run_end");
    expect(sent[0].parentSpanId).toBe(sent[1].spanId);
    expect(sent[0].toolName).toBe("openai.m1");
  });

  it("only finishes once", () => {
    const { sent, obs } = setup();
    obs.finish("a");
    obs.finish("b");
    expect(sent).toHaveLength(2);
    expect(sent[0].output).toBe("a");
  });

  it("records errors and cancellation", () => {
    const failed = setup();
    failed.obs.finish(undefined, new TypeError("boom"));
    expect(failed.sent[0].errorType).toBe("TypeError");
    expect(failed.sent[0].errorMessage).toContain("boom");
    expect(failed.sent[1].spanType).toBe("error");
    const aborted = setup();
    aborted.obs.finish("partial", undefined, true);
    expect(aborted.sent[0].errorType).toBe("AbortError");
    expect(aborted.sent[0].metadata.cancelled).toBe(true);
  });

  it("honors captureInput and captureOutput false", () => {
    const { sent, obs } = setup({ captureInput: false, captureOutput: false });
    obs.finish("secret");
    expect(sent[0].input).toBe("[not captured]");
    expect(sent[0].output).toBe("[not captured]");
  });

  it("sums anthropic cache tokens but not openai", () => {
    const client = new UncoilClient({ apiKey: "k" });
    const raw = { input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 5, cache_creation_input_tokens: 3 };
    const a = observation("anthropic", "c", "x", { client });
    a.usage(raw);
    expect(a.data.inputTokens).toBe(18);
    const o = observation("openai", "g", "x", { client });
    o.usage({ prompt_tokens: 7, completion_tokens: 1 });
    expect(o.data.inputTokens).toBe(7);
    expect(o.data.outputTokens).toBe(1);
  });

  it("applies calculateCost and ignores invalid or throwing results", () => {
    const ok = setup({ calculateCost: () => 0.25 });
    ok.obs.usage({ input_tokens: 1, output_tokens: 1 });
    expect(ok.obs.data.costUsd).toBe(0.25);
    expect(ok.obs.data.metadata!.costKnown).toBe(true);
    const neg = setup({ calculateCost: () => -1 });
    neg.obs.usage({});
    expect(neg.obs.data.costUsd).toBeUndefined();
    const bad = setup({ calculateCost: () => { throw new Error("x"); } });
    bad.obs.usage({});
    expect(bad.obs.data.metadata!.costKnown).toBe(false);
  });

  it("records first token latency once", () => {
    const { obs } = setup();
    obs.token();
    const first = obs.data.ttftMs;
    expect(first).toBeGreaterThanOrEqual(0);
    obs.token();
    expect(obs.data.ttftMs).toBe(first);
  });

  it("does not throw when ingest throws synchronously", () => {
    const client = new UncoilClient({ apiKey: "k" });
    client.ingest = (() => { throw new Error("down"); }) as any;
    const o = observation("openai", "m", "i", { client });
    expect(() => o.finish("x")).not.toThrow();
  });

  it("warns about a missing key once across calls made without a client", async () => {
    vi.resetModules();
    vi.stubEnv("UNCOIL_API_KEY", "");
    vi.stubEnv("TRACIFY_API_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fresh = await import("../src/integrations/observation");
      for (let i = 0; i < 3; i++) fresh.observation("openai", "m", "hi", {}).finish("ok");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain("No Uncoil API key");
    } finally {
      warn.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
