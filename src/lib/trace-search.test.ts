import { describe, expect, it } from "vitest";
import { comparisonBound, fieldFor, parseCost, parseLatency, parseSearch, parseTokens, replaceToken, splitToken, tokenAt, tokenize } from "./trace-search";

describe("tokenize", () => {
  it("splits on whitespace and keeps quoted runs together", () => {
    expect(tokenize('model:gpt-5 name:"my agent" timeout').map((token) => token.raw)).toEqual(["model:gpt-5", 'name:"my agent"', "timeout"]);
  });
  it("reports positions and handles an unclosed quote", () => {
    const [first, second] = tokenize('a  name:"my ag');
    expect([first!.start, first!.end]).toEqual([0, 1]);
    expect(second!.raw).toBe('name:"my ag');
  });
});

describe("fieldFor", () => {
  it("resolves every field from each of its aliases", () => {
    const expected: Record<string, string> = {
      name: "traceName", trace: "traceName", type: "spanType", step: "spanType", tool: "toolName", model: "modelId",
      error: "errorType", errortype: "errorType", env: "environment", environment: "environment", release: "release",
      version: "release", user: "endUserId", userid: "endUserId", session: "sessionId", tag: "tag", status: "status",
      latency: "minLatencyMs", duration: "minLatencyMs", cost: "minCostUsd", tokens: "minTokens",
    };
    for (const [alias, key] of Object.entries(expected)) expect(fieldFor(alias)?.key, alias).toBe(key);
  });
  it("ignores case", () => {
    expect(fieldFor("MODEL")?.key).toBe("modelId");
    expect(fieldFor("ErrorType")?.key).toBe("errorType");
    expect(fieldFor("Duration")?.token).toBe("latency");
  });
  it("returns undefined for unknown names", () => {
    expect(fieldFor("foo")).toBeUndefined();
    expect(fieldFor("")).toBeUndefined();
    expect(fieldFor("model ")).toBeUndefined();
  });
});

describe("splitToken", () => {
  it("knows fields and aliases, case-insensitively, and unquotes values", () => {
    expect(splitToken('Model:"gpt 5"')).toMatchObject({ field: { key: "modelId" }, value: "gpt 5" });
    expect(splitToken("environment:prod")).toMatchObject({ field: { key: "environment" }, value: "prod" });
  });
  it("ignores unknown fields, urls and bare words", () => {
    expect(splitToken("https://example.com")).toBeNull();
    expect(splitToken("foo:bar")).toBeNull();
    expect(splitToken("timeout")).toBeNull();
  });
});

describe("parseSearch", () => {
  it("turns known tokens into filters and keeps the rest as text", () => {
    const parsed = parseSearch("model:gpt-5 status:error latency:>2s upstream timeout");
    expect(parsed.errors).toEqual([]);
    expect(parsed.text).toBe("upstream timeout");
    expect(parsed.filters.map((filter) => [filter.field.key, filter.value])).toEqual([["modelId", "gpt-5"], ["status", "error"], ["minLatencyMs", 2000]]);
  });
  it("keeps an incomplete token and an unknown field as text", () => {
    expect(parseSearch("name: foo:bar").text).toBe("name: foo:bar");
  });
  it("reads a leading minus as an exclusion", () => {
    const parsed = parseSearch('-env:dev -model:"gpt 4" tool:search');
    expect(parsed.filters.map((filter) => [filter.field.key, filter.kind === "facet" ? filter.negate : null, filter.value])).toEqual([["environment", true, "dev"], ["modelId", true, "gpt 4"], ["toolName", false, "search"]]);
  });
  it("turns an excluded status into the opposite status and rejects excluded numbers", () => {
    expect(parseSearch("-status:error").filters).toMatchObject([{ kind: "status", value: "healthy" }]);
    expect(parseSearch("-status:healthy").filters).toMatchObject([{ kind: "status", value: "error" }]);
    expect(parseSearch("-status:all").errors).toHaveLength(1);
    expect(parseSearch("-latency:>2s").errors).toHaveLength(1);
  });
  it("keeps a hyphenated word and an unknown excluded field as text", () => {
    expect(parseSearch("-1 well-known -foo:bar").text).toBe("-1 well-known -foo:bar");
  });
  it("reads minimums, maximums and exact values for latency, cost and tokens", () => {
    const parsed = parseSearch("latency:<2s latency:>=500ms cost:<=0.5 cost:0.01 tokens:<5k tokens:=200");
    expect(parsed.errors).toEqual([]);
    expect(parsed.filters.map((filter) => filter.kind === "facet" || filter.kind === "status" ? null : [filter.kind, filter.bound, filter.value])).toEqual([
      ["latency", "max", 2000], ["latency", "min", 500], ["cost", "max", 0.5], ["cost", "min", 0.01], ["tokens", "max", 5000], ["tokens", "exact", 200],
    ]);
  });
  it("reports unusable values and applies nothing for them", () => {
    const parsed = parseSearch("latency:fast status:maybe cost:free");
    expect(parsed.filters).toEqual([]);
    expect(parsed.errors).toHaveLength(3);
  });
});

describe("numbers", () => {
  it("reads latency with units", () => {
    expect([">2s", ">=500ms", "1.5s", "250", "2m"].map(parseLatency)).toEqual([2000, 500, 1500, 250, 120000]);
    expect(parseLatency("fast")).toBeNull();
  });
  it("reads tokens with k and m suffixes", () => {
    expect([">5k", "<=1200", "1.5m", "=7"].map(parseTokens)).toEqual([5000, 1200, 1_500_000, 7]);
    expect(parseTokens("lots")).toBeNull();
  });
  it("tells the comparison direction", () => {
    expect(["<2s", "<=2s", ">2s", ">=2s", "2s", "=2s"].map(comparisonBound)).toEqual(["max", "max", "min", "min", "min", "exact"]);
  });
  it("reads cost with or without a dollar sign", () => {
    expect([">0.01", "$0.5", "2"].map(parseCost)).toEqual([0.01, 0.5, 2]);
    expect(parseCost("free")).toBeNull();
  });
});

describe("editing", () => {
  it("finds the token the caret is in or just after", () => {
    expect(tokenAt("model:g status", 7)?.raw).toBe("model:g");
    expect(tokenAt("model:g status", 8)?.raw).toBe("status");
    expect(tokenAt("a ", 2)).toBeNull();
  });
  it("replaces a token and places the caret after the replacement", () => {
    const token = tokenAt("hello mod", 9)!;
    expect(replaceToken("hello mod", token, "model:", 9)).toEqual({ text: "hello model:", caret: 12 });
    expect(replaceToken("model:gpt timeout", tokenAt("model:gpt timeout", 3)!, "", 3)).toEqual({ text: "timeout", caret: 0 });
  });
});
