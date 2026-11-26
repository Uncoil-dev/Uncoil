import { describe, expect, test } from "vitest";
import { isRetryable, normalizeFailureMix } from "./resilience";

const MIX_ERROR = "failureMix must contain exactly success, timeout, 429, 500, and cost_overrun";
const validMix = { success: 0.4, timeout: 0.15, "429": 0.15, "500": 0.15, cost_overrun: 0.15 };

describe("normalizeFailureMix", () => {
  test("returns the five modes unchanged", () => {
    expect(normalizeFailureMix(validMix)).toEqual(validMix);
  });

  test("rejects a missing mode", () => {
    const rest: Record<string, number> = { ...validMix };
    delete rest.cost_overrun;
    expect(() => normalizeFailureMix(rest)).toThrow(MIX_ERROR);
  });

  test("rejects an extra mode", () => {
    expect(() => normalizeFailureMix({ ...validMix, extra: 0.1 })).toThrow(MIX_ERROR);
  });

  test("rejects a renamed mode even when the key count matches", () => {
    const renamed: Record<string, number> = { ...validMix, slow: 0.15 };
    delete renamed.timeout;
    expect(() => normalizeFailureMix(renamed)).toThrow(MIX_ERROR);
  });

  test.each([NaN, Infinity, -Infinity])("rejects a non-finite weight (%s)", (bad) => {
    expect(() => normalizeFailureMix({ ...validMix, "429": bad })).toThrow("failureMix.429 must be a finite number");
  });
});

describe("isRetryable", () => {
  test("timeout is retryable only when timeout is listed", () => {
    expect(isRetryable("timeout", ["timeout"])).toBe(true);
    expect(isRetryable("timeout", ["429", "5xx"])).toBe(false);
  });

  test("429 is retryable via 429 or rate_limit", () => {
    expect(isRetryable("429", ["429"])).toBe(true);
    expect(isRetryable("429", ["rate_limit"])).toBe(true);
    expect(isRetryable("429", ["timeout", "5xx"])).toBe(false);
  });

  test("500 is retryable only via 5xx", () => {
    expect(isRetryable("500", ["5xx"])).toBe(true);
    expect(isRetryable("500", ["500", "429", "timeout"])).toBe(false);
  });

  test("success and cost_overrun are never retryable", () => {
    const all = ["429", "5xx", "rate_limit", "timeout", "success", "cost_overrun"];
    expect(isRetryable("success", all)).toBe(false);
    expect(isRetryable("cost_overrun", all)).toBe(false);
  });
});
