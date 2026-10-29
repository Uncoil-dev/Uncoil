import { describe, it, expect, vi } from "vitest";
import {
  UncoilClient,
  RuntimePolicy,
  UNCOIL_REGION_HOSTS,
} from "../src/index";

// ─── Helpers ──────────────────────────────────────────────────────
function makePolicy(overrides: Partial<RuntimePolicy> = {}): RuntimePolicy {
  return {
    enforcementMode: "observe",
    fallbackChain: ["gpt-4o", "claude-sonnet-4-20250514"],
    retryPolicy: {
      maxAttempts: 1,
      backoffMs: 0,
      backoffMultiplier: 2,
      retryableErrors: ["rate_limit", "timeout", "5xx"],
    },
    ...overrides,
  };
}

function makeClient(): UncoilClient {
  const client = new UncoilClient({
    apiKey: "test-key",
    host: "http://localhost:9999",
  });
  vi.spyOn(client, "ingest").mockResolvedValue(undefined);
  return client;
}

describe("regional cloud configuration", () => {
  it("selects the requested regional host", () => {
    const client = new UncoilClient({ apiKey: "test-key", region: "us" });
    expect((client as any).host).toBe(UNCOIL_REGION_HOSTS.us);
  });

  it("rejects a regional key configured for the wrong cloud", () => {
    expect(() => new UncoilClient({ apiKey: "uncoil_sk_live_eu_example", region: "us" }))
      .toThrow("belongs to EU");
  });

  it("assigns pre-region keys to the EU cloud", () => {
    expect(() => new UncoilClient({ apiKey: "uncoil_sk_live_legacy", region: "us" }))
      .toThrow("belongs to EU");
  });
});

function mockFetchForCostCheck(...responses: Array<{ ok: boolean; status?: number; body?: any }>) {
  let callIdx = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn().mockImplementation(() => {
    const resp = responses[Math.min(callIdx++, responses.length - 1)];
    return Promise.resolve({
      ok: resp.ok,
      status: resp.status ?? 200,
      json: () => Promise.resolve(resp.body ?? {}),
    });
  }) as any;
  return () => { globalThis.fetch = originalFetch; };
}

// ─── RuntimePolicy type tests ─────────────────────────────────────
describe("RuntimePolicy type structure", () => {
  it("has required fields", () => {
    const policy: RuntimePolicy = makePolicy();
    expect(policy.enforcementMode).toBe("observe");
    expect(Array.isArray(policy.fallbackChain)).toBe(true);
    expect(policy.retryPolicy).toBeDefined();
    expect(typeof policy.retryPolicy.maxAttempts).toBe("number");
    expect(typeof policy.retryPolicy.backoffMs).toBe("number");
    expect(typeof policy.retryPolicy.backoffMultiplier).toBe("number");
    expect(Array.isArray(policy.retryPolicy.retryableErrors)).toBe(true);
  });

  it("optional cost ceiling fields are undefined by default", () => {
    const policy: RuntimePolicy = makePolicy();
    expect(policy.maxCostPerRun).toBeUndefined();
    expect(policy.maxCostPerDay).toBeUndefined();
    expect(policy.latencyBudgetMs).toBeUndefined();
  });

  it("can set cost ceilings", () => {
    const policy: RuntimePolicy = makePolicy({
      maxCostPerRun: 0.1,
      maxCostPerDay: 5.0,
    });
    expect(policy.maxCostPerRun).toBe(0.1);
    expect(policy.maxCostPerDay).toBe(5.0);
  });

  it("can set latency budget", () => {
    const policy: RuntimePolicy = makePolicy({ latencyBudgetMs: 10000 });
    expect(policy.latencyBudgetMs).toBe(10000);
  });
});

// ─── UncoilClient construction ─────────────────────────────────
describe("UncoilClient", () => {
  it("constructs with API key", () => {
    const client = makeClient();
    expect(client).toBeInstanceOf(UncoilClient);
  });

  it("constructs with env fallback", () => {
    process.env.UNCOIL_API_KEY = "env-key";
    const client = new UncoilClient({ host: "http://localhost:9999" });
    expect(client).toBeInstanceOf(UncoilClient);
    delete process.env.UNCOIL_API_KEY;
  });

  it("copies release context onto ingested observations", async () => {
    const client = new UncoilClient({
      apiKey: "test-key",
      host: "http://localhost:9999",
      release: "release-42",
      environment: "production",
      sessionId: "session-1",
      tags: ["checkout"],
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    await client.ingest({ spanType: "llm_call", input: "hello" });
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(body.release).toBe("release-42");
    expect(body.environment).toBe("production");
    expect(body.sessionId).toBe("session-1");
    expect(body.tags).toEqual(["checkout"]);
    fetchSpy.mockRestore();
  });
});

// ─── orchestrate — success on primary model ───────────────────────
describe("orchestrate: success on primary model", () => {
  it("calls the primary model and returns result", async () => {
    const client = makeClient();
    const callFn = vi.fn().mockResolvedValue("primary-result");

    const result = await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy(),
      call: callFn,
    });

    expect(result).toBe("primary-result");
    expect(callFn).toHaveBeenCalledOnce();
    expect(callFn).toHaveBeenCalledWith("gpt-4o", expect.any(AbortSignal));
  });

  it("ingests span with correct metadata", async () => {
    const client = makeClient();
    const ingestSpy = vi.spyOn(client, "ingest");

    await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy(),
      call: vi.fn().mockResolvedValue("ok"),
      input: "test input",
      runId: "run-123",
    });

    expect(ingestSpy).toHaveBeenCalledOnce();
    const span = ingestSpy.mock.calls[0][0];
    expect(span.spanType).toBe("llm_call");
    expect(span.modelId).toBe("gpt-4o");
    expect(span.runId).toBe("run-123");
    expect(span.metadata!.orchestrationAttempt).toBe(1);
    expect(span.metadata!.orchestrationIsFallback).toBe(false);
    expect(span.metadata!.orchestrationFinal).toBe(true);
    expect(span.metadata!.orchestrationFailOpen).toBe(false);
  });
});

// ─── orchestrate — fallback on error ──────────────────────────────
describe("orchestrate: fallback on error", () => {
  it("falls back to second model when primary throws retryable error", async () => {
    const client = makeClient();
    const callFn = vi.fn()
      .mockRejectedValueOnce(new Error("rate limit exceeded"))
      .mockRejectedValueOnce(new Error("rate limit exceeded"))
      .mockResolvedValueOnce("fallback-result");

    const result = await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({ enforcementMode: "enforce" }),
      call: callFn,
    });

    expect(result).toBe("fallback-result");
    expect(callFn).toHaveBeenCalledTimes(3);
    expect(callFn.mock.calls[0][0]).toBe("gpt-4o");
    expect(callFn.mock.calls[1][0]).toBe("gpt-4o");
    expect(callFn.mock.calls[2][0]).toBe("claude-sonnet-4-20250514");
  });

  it("does NOT retry on non-retryable errors", async () => {
    const client = makeClient();
    const callFn = vi.fn()
      .mockRejectedValueOnce(new Error("invalid_api_key"))
      .mockResolvedValueOnce("fallback-result");

    const result = await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({ enforcementMode: "enforce" }),
      call: callFn,
    });

    expect(result).toBe("fallback-result");
    expect(callFn).toHaveBeenCalledTimes(2);
  });

  it("falls back to next model on AbortError (latency abort)", async () => {
    const client = makeClient();
    const ingestSpy = vi.spyOn(client, "ingest");
    const abortError = new DOMException("The operation was aborted", "AbortError");
    const callFn = vi.fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce("fallback-result");

    const result = await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "enforce",
        latencyBudgetMs: 1,
      }),
      call: callFn,
    });

    expect(result).toBe("fallback-result");

    const errorSpan = ingestSpy.mock.calls[0]?.[0];
    expect(errorSpan?.metadata?.orchestrationFallbackReason).toBeNull();

    const fallbackSpan = ingestSpy.mock.calls.find(
      (c: any) => c[0].metadata?.orchestrationIsFallback === true
    );
    expect(fallbackSpan?.[0]?.metadata?.orchestrationFallbackReason).toBe("latency_budget");
  });

  it("ingests fallback reason as provider_error for non-latency errors", async () => {
    const client = makeClient();
    const ingestSpy = vi.spyOn(client, "ingest");

    await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({ enforcementMode: "enforce" }),
      call: vi.fn()
        .mockRejectedValueOnce(new Error("5xx server error"))
        .mockResolvedValueOnce("ok"),
    });

    const fallbackSpan = ingestSpy.mock.calls.find(
      (c: any) => c[0].metadata?.orchestrationIsFallback === true
    );
    expect(fallbackSpan?.[0]?.metadata?.orchestrationFallbackReason).toBe("provider_error");
  });
});

// ─── orchestrate — terminal failure ───────────────────────────────
describe("orchestrate: terminal failure", () => {
  it("throws the last Error when all fallback models exhausted", async () => {
    const client = makeClient();
    const callFn = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(
      client.orchestrate({
        model: "gpt-4o",
        policy: makePolicy({ enforcementMode: "enforce" }),
        call: callFn,
      })
    ).rejects.toThrow("fail");

    expect(callFn).toHaveBeenCalledTimes(2);
  });

  it("wraps non-Error throws", async () => {
    const client = makeClient();
    const callFn = vi.fn().mockRejectedValue("string error");

    await expect(
      client.orchestrate({
        model: "gpt-4o",
        policy: makePolicy({ enforcementMode: "enforce" }),
        call: callFn,
      })
    ).rejects.toThrow("All fallback models exhausted");
  });
});

// ─── orchestrate — retry with backoff ─────────────────────────────
describe("orchestrate: retry with backoff", () => {
  it("retries up to maxAttempts on primary model before falling back", async () => {
    const client = makeClient();
    const callFn = vi.fn()
      .mockRejectedValueOnce(new Error("rate limit exceeded"))
      .mockRejectedValueOnce(new Error("rate limit exceeded"))
      .mockResolvedValueOnce("ok-after-retry");

    const result = await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "enforce",
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 0,
          backoffMultiplier: 2,
          retryableErrors: ["rate_limit"],
        },
      }),
      call: callFn,
    });

    expect(result).toBe("ok-after-retry");
    expect(callFn).toHaveBeenCalledTimes(3);
  });

  it("does not retry on AbortError", async () => {
    const client = makeClient();
    const abortError = new DOMException("aborted", "AbortError");
    const callFn = vi.fn()
      .mockRejectedValue(abortError);

    await expect(
      client.orchestrate({
        model: "gpt-4o",
        policy: makePolicy({
          enforcementMode: "enforce",
          latencyBudgetMs: 1,
          retryPolicy: {
            maxAttempts: 3,
            backoffMs: 0,
            backoffMultiplier: 2,
            retryableErrors: ["timeout"],
          },
        }),
        call: callFn,
      })
    ).rejects.toThrow();

    expect(callFn).toHaveBeenCalledTimes(2);
  });
});

// ─── orchestrate — cost ceiling ───────────────────────────────────
describe("orchestrate: cost ceiling enforcement", () => {
  it("blocks when server says maxCostPerRun exceeded", async () => {
    const client = makeClient();
    const restore = mockFetchForCostCheck(
      { ok: true, body: { allowed: false, reason: "maxCostPerRun", currentCost: 0.15, ceiling: 0.1 } }
    );

    await expect(
      client.orchestrate({
        model: "gpt-4o",
        policy: makePolicy({
          enforcementMode: "enforce",
          maxCostPerRun: 0.1,
        }),
        call: vi.fn(),
      })
    ).rejects.toThrow("Cost ceiling reached");

    restore();
  });

  it("blocks when server says maxCostPerDay exceeded", async () => {
    const client = makeClient();
    const restore = mockFetchForCostCheck(
      { ok: true, body: { allowed: false, reason: "maxCostPerDay", currentCost: 6.0, ceiling: 5.0 } }
    );

    await expect(
      client.orchestrate({
        model: "gpt-4o",
        policy: makePolicy({
          enforcementMode: "enforce",
          maxCostPerDay: 5.0,
        }),
        call: vi.fn(),
      })
    ).rejects.toThrow("Daily cost ceiling reached");

    restore();
  });

  it("records cost ceiling block in span metadata", async () => {
    const client = makeClient();
    const ingestSpy = vi.spyOn(client, "ingest");
    const restore = mockFetchForCostCheck(
      { ok: true, body: { allowed: false, reason: "maxCostPerRun", currentCost: 0.15, ceiling: 0.1 } }
    );

    await expect(
      client.orchestrate({
        model: "gpt-4o",
        policy: makePolicy({
          enforcementMode: "enforce",
          maxCostPerRun: 0.1,
        }),
        call: vi.fn(),
      })
    ).rejects.toThrow();

    const blockedSpan = ingestSpy.mock.calls.find(
      (c: any) => c[0].metadata?.orchestrationBlocked === true
    );
    expect(blockedSpan).toBeDefined();
    expect(blockedSpan![0].metadata!.orchestrationReason).toBe("cost_ceiling");

    restore();
  });
});

// ─── orchestrate — fail-open monitoring ───────────────────────────
describe("orchestrate: fail-open monitoring", () => {
  it("sets _lastFailOpen when check-cost endpoint fails", async () => {
    const client = makeClient();
    const restore = mockFetchForCostCheck(
      { ok: false, status: 500 }
    );

    await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "enforce",
        maxCostPerRun: 0.1,
      }),
      call: vi.fn().mockResolvedValue("ok"),
    });

    expect((client as any)._lastFailOpen).toBe(true);

    restore();
  });

  it("resets _lastFailOpen when check-cost succeeds after a failure", async () => {
    const client = makeClient();
    const restore = mockFetchForCostCheck(
      { ok: false, status: 500 },
      { ok: false, status: 500 },
      { ok: true, body: { allowed: true } },
      { ok: true, body: { allowed: true } },
    );

    // First call: both check-cost calls fail
    await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "enforce",
        maxCostPerRun: 0.1,
        maxCostPerDay: 0.1,
      }),
      call: vi.fn().mockResolvedValue("ok"),
    });

    expect((client as any)._lastFailOpen).toBe(true);

    // Second call: both check-cost calls succeed (resets the flag)
    await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "enforce",
        maxCostPerRun: 0.1,
        maxCostPerDay: 0.1,
      }),
      call: vi.fn().mockResolvedValue("ok"),
    });

    expect((client as any)._lastFailOpen).toBe(false);

    restore();
  });

  it("includes fail-open flag in span metadata", async () => {
    const client = makeClient();
    const ingestSpy = vi.spyOn(client, "ingest");
    const restore = mockFetchForCostCheck(
      { ok: false, status: 500 }
    );

    await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "enforce",
        maxCostPerRun: 0.1,
      }),
      call: vi.fn().mockResolvedValue("ok"),
    });

    const finalSpan = ingestSpy.mock.calls.find(
      (c: any) => c[0].metadata?.orchestrationFinal === true
    );
    expect(finalSpan![0].metadata!.orchestrationFailOpen).toBe(true);

    restore();
  });
});

// ─── orchestrate — observe mode skips enforcement ─────────────────
describe("orchestrate: observe mode", () => {
  it("skips cost ceiling checks in observe mode", async () => {
    const client = makeClient();
    const callFn = vi.fn().mockResolvedValue("ok");
    const restore = mockFetchForCostCheck(
      { ok: true, body: { allowed: false, reason: "maxCostPerRun" } }
    );

    const result = await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "observe",
        maxCostPerRun: 0.1,
      }),
      call: callFn,
    });

    expect(result).toBe("ok");

    // fetch was NOT called for cost check — ingest fire-and-forget uses fetch too
    // so check that the call was NOT to the check-cost endpoint
    const fetchCalls = (globalThis.fetch as any).mock?.calls ?? [];
    const costCheckCalls = fetchCalls.filter((c: any[]) =>
      typeof c[0] === "string" && c[0].includes("check-cost")
    );
    expect(costCheckCalls).toHaveLength(0);

    restore();
  });

  it("skips latency abort in observe mode", async () => {
    const client = makeClient();
    const callFn = vi.fn().mockResolvedValue("ok");

    const result = await client.orchestrate({
      model: "gpt-4o",
      policy: makePolicy({
        enforcementMode: "observe",
        latencyBudgetMs: 1,
      }),
      call: callFn,
    });

    expect(result).toBe("ok");
  });
});
