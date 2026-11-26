import { describe, expect, it } from "vitest";
import { buildFixPrompt, FIX_PROMPT_MAX_CHARS, type FixPromptSpan } from "./fix-prompt";

const span = (over: Partial<FixPromptSpan>): FixPromptSpan => ({
  spanId: "s", spanType: "llm_call", input: "", output: "", modelId: "", toolName: "", parentSpanId: "root",
  errorType: "", errorMessage: "", createdAt: "2026-01-01T00:00:00.000Z", ...over,
});

const run = [
  span({ spanId: "root", parentSpanId: "", spanType: "agent", input: "Summarise the refund policy for jane@example.com", createdAt: "2026-01-01T00:00:00.000Z" }),
  span({ spanId: "llm", modelId: "gpt-5-mini", input: "plan", createdAt: "2026-01-01T00:00:01.000Z" }),
  span({ spanId: "late", spanType: "tool_call", toolName: "send_email", errorType: "Timeout", errorMessage: "later failure", createdAt: "2026-01-01T00:00:03.000Z" }),
  span({ spanId: "tool", spanType: "tool_call", toolName: "search_docs", input: '{"query":"refunds","apiKey":"sk_live_abcdef123456"}',
    errorType: "HTTPError", errorMessage: "404 Not Found for /v1/docs/refunds", createdAt: "2026-01-01T00:00:02.000Z" }),
];

describe("buildFixPrompt", () => {
  it("names the first failing step, its error and input, with models and tools", () => {
    const prompt = buildFixPrompt(run)!;
    expect(prompt).toContain("## First failing step\nsearch_docs (tool_call)");
    expect(prompt).toContain("HTTPError: 404 Not Found for /v1/docs/refunds");
    expect(prompt).toContain('"query":"refunds"');
    expect(prompt).toContain("## Models used\ngpt-5-mini");
    expect(prompt).toContain("## Tools used\nsearch_docs, send_email");
    expect(prompt).not.toContain("later failure");
  });

  it("keeps secrets and personal data redacted", () => {
    const prompt = buildFixPrompt(run)!;
    expect(prompt).not.toContain("sk_live_abcdef123456");
    expect(prompt).not.toContain("jane@example.com");
    expect(prompt).toContain("[REDACTED_API_KEY]");
    expect(prompt).toContain("Summarise the refund policy for [REDACTED_EMAIL]");
  });

  it("stays under the paste size limit with huge payloads", () => {
    const huge = "x".repeat(50_000);
    const prompt = buildFixPrompt([span({ parentSpanId: "", input: huge, errorType: "Boom", errorMessage: huge, stackTrace: huge })])!;
    expect(prompt.length).toBeLessThanOrEqual(FIX_PROMPT_MAX_CHARS + 60);
    expect(prompt).toContain("## Error\nBoom: x");
    expect(prompt).toContain("[cut, 48806 more characters]");
  });

  it("returns null when nothing failed", () => {
    expect(buildFixPrompt(run.filter((s) => !s.errorType))).toBeNull();
  });
});
