import { explainFailure } from "./explain-failure.ts";
import { redactString } from "./redaction";
import { isFailed, stepName } from "./trace-diff";
import type { SpanRow } from "./tinybird";

export type FixPromptSpan = Pick<SpanRow, "spanId" | "spanType" | "input" | "output" | "modelId" | "toolName" | "parentSpanId" | "errorType" | "errorMessage" | "createdAt"> &
  Partial<Pick<SpanRow, "traceName" | "stackTrace">>;

/** Longest prompt we produce, so it pastes cleanly into a coding agent's chat box. */
export const FIX_PROMPT_MAX_CHARS = 6000;
const FIELD_MAX_CHARS = 1200;

const clip = (text: string, max = FIELD_MAX_CHARS) => (text.length > max ? `${text.slice(0, max)}… [cut, ${text.length - max} more characters]` : text);
// Redaction regexes are slow on very long strings, so cut first. The extra margin means a secret
// that straddles the first cut is still redacted or falls past the final cut.
const clean = (text: string | undefined, max = FIELD_MAX_CHARS) => {
  const value = (text ?? "").trim();
  const redacted = redactString(value.slice(0, max + 200));
  return redacted.length > max || value.length > max + 200 ? `${redacted.slice(0, max)}… [cut, ${value.length - max} more characters]` : redacted;
};
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

/**
 * Builds a ready-to-paste prompt asking a coding agent to find and fix the cause of a failed run.
 * Every value taken from the run passes through the same redaction rules as stored payloads,
 * and each field is cut short so the whole prompt stays under FIX_PROMPT_MAX_CHARS.
 * Returns null when the run has no failing step.
 */
export function buildFixPrompt(spans: FixPromptSpan[]): string | null {
  const ordered = [...spans].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const failing = ordered.find(isFailed);
  if (!failing) return null;

  const root = ordered.find((s) => !s.parentSpanId) ?? ordered[0];
  const task = clean(root.input) || clean(root.traceName) || "(not recorded)";
  const models = unique(ordered.map((s) => s.modelId));
  const tools = unique(ordered.map((s) => s.toolName));
  const error = [failing.errorType, failing.errorMessage].filter(Boolean).join(": ") || "The step was marked as an error without a message.";

  const whatBroke = explainFailure(ordered)?.sentence1;

  const sections = [
    "An AI agent run failed. Find the cause in this codebase and fix it.",
    whatBroke ? `What broke: ${clean(whatBroke)}` : "",
    `## What the agent was asked\n${task}`,
    `## First failing step\n${stepName(failing)} (${failing.spanType})`,
    `## Error\n${clean(error)}`,
    failing.input?.trim() ? `## Input to the failing step\n${clean(failing.input)}` : "",
    failing.stackTrace?.trim() ? `## Stack trace\n${clean(failing.stackTrace, 800)}` : "",
    `## Models used\n${models.join(", ") || "none recorded"}`,
    `## Tools used\n${tools.join(", ") || "none recorded"}`,
    "## What to do\nLocate the code that runs this step, explain the root cause in one or two sentences, then make the smallest fix and add a test that would have caught it. Values shown as [REDACTED_…] were hidden on purpose; do not try to recover them.",
  ].filter(Boolean);

  return clip(sections.join("\n\n"), FIX_PROMPT_MAX_CHARS);
}

/** The prompt to offer for a run: only failed runs with a failing step get one. */
export function fixPromptForRun(status: string, spans: FixPromptSpan[]): string | null {
  return status === "failed" ? buildFixPrompt(spans) : null;
}
