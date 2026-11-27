import { redactString } from "./redaction.ts";

export type ExplainSpan = {
  spanId: string;
  spanType: string;
  createdAt: string;
  latencyMs?: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  modelId?: string;
  toolName?: string;
  traceName?: string;
  label?: string;
  input?: string | null;
  output?: string | null;
  errorType?: string;
  errorMessage?: string;
  timedOut?: boolean;
};

export type FailureExplanation = {
  stepId: string;
  stepIndex: number;
  totalSteps: number;
  stepName: string;
  sentence1: string;
  burnedUsd: number;
  burnedTokens: number;
  afterUsd: number;
  afterTokens: number;
};

const KIND_ALIASES: Record<string, string> = {
  llm_call: "llm", generation: "llm", chat: "llm", model: "llm", tool_call: "tool", function: "tool",
};

function kind(span: ExplainSpan) {
  const lower = (span.spanType || "").toLowerCase();
  return KIND_ALIASES[lower] ?? lower;
}

function startMs(span: ExplainSpan) {
  const t = Date.parse(span.createdAt);
  return Number.isFinite(t) ? t : 0;
}

function isFailed(span: ExplainSpan) {
  return Boolean(span.errorMessage) || span.spanType === "error" || Boolean(span.errorType);
}

function nameOf(span: ExplainSpan) {
  return span.toolName || span.modelId || span.label || span.traceName || span.spanType || "span";
}

function modelOf(span: ExplainSpan) {
  return span.modelId || span.label || span.traceName || "the model";
}

function duration(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function money(value: number) {
  return `$${value.toFixed(value !== 0 && Math.abs(value) < 0.01 ? 4 : 2)}`;
}

function isEmptyOutput(output: string | null | undefined) {
  const text = (output ?? "").trim();
  return text === "" || text === "null" || text === "[]";
}

function tokens(span: ExplainSpan) {
  return (span.inputTokens ?? 0) + (span.outputTokens ?? 0);
}

export function explainFailure(spans: ExplainSpan[], run?: { totalCostUsd?: number }): FailureExplanation | null {
  const ordered = spans
    .map((span, i) => ({ span, i }))
    .sort((a, b) => startMs(a.span) - startMs(b.span) || a.i - b.i)
    .map(({ span }) => span);
  const index = ordered.findIndex(isFailed);
  if (index < 0) return null;

  const failed = ordered[index];
  const n = index + 1;
  const name = nameOf(failed);
  const error = failed.errorMessage || failed.errorType || "";
  const endMs = startMs(failed) + (failed.latencyMs ?? 0);
  const after = ordered.filter((s) => startMs(s) > endMs);
  const afterUsd = after.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
  const burnedUsd = ordered.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
  const burnedTokens = ordered.reduce((sum, s) => sum + tokens(s), 0);
  const afterTokens = after.reduce((sum, s) => sum + tokens(s), 0);

  const isTool = kind(failed) === "tool";
  const isModel = kind(failed) === "llm";
  const next = ordered[index + 1];
  const laterModel = ordered.slice(index + 1).some((s) => kind(s) === "llm");
  const earlierModel = [...ordered.slice(0, index)].reverse().find((s) => kind(s) === "llm");

  let sentence1: string;
  if (isTool && (failed.timedOut || /timed?[\s_-]?out|ETIMEDOUT/i.test(error))) {
    const nextName = next ? nameOf(next) : "the next step";
    sentence1 = `\`${name}\` timed out after ${duration(failed.latencyMs ?? 0)}, so the agent never got the data it needed and ${nextName} ran blind.`;
  } else if (isTool && isEmptyOutput(failed.output) && laterModel) {
    sentence1 = `\`${name}\` returned nothing, and the model carried on as if it had an answer, which is where the run went wrong.`;
  } else if (isModel && /\b(401|403)\b|unauthorized|forbidden|invalid api key/i.test(error)) {
    sentence1 = `The call to ${modelOf(failed)} was rejected because the API key is missing or invalid, so the agent stopped at step ${n}.`;
  } else if (isModel && /\b429\b|rate[\s_-]?limit|too many requests/i.test(error)) {
    sentence1 = `${modelOf(failed)} rate-limited the agent at step ${n}; the retries that followed cost ${money(afterUsd)} and still failed.`;
  } else if (earlierModel && /json|schema|parse|unexpected token/i.test(error)) {
    sentence1 = `${modelOf(earlierModel)} returned text your code couldn't parse, so \`${name}\` crashed on its output.`;
  } else if (isTool && loopCount(ordered, failed) >= 5) {
    sentence1 = `The agent looped on \`${name}\` ${loopCount(ordered, failed)} times with the same input, and never got past step ${n}.`;
  } else if (/max(imum)?[\s_-]?(steps|iterations)|step limit|iteration limit/i.test(error)) {
    sentence1 = "The agent hit its step limit without finishing.";
  } else {
    // Cut before redacting: the patterns are slow on very long text, and only 80 characters are shown.
    const text = redactString((error || "unknown error").slice(0, 400)).slice(0, 80);
    sentence1 = `Step ${n} (\`${name}\`) failed with "${text}", and every step after it depended on it.`;
  }

  return {
    stepId: failed.spanId,
    stepIndex: n,
    totalSteps: ordered.length,
    stepName: name,
    sentence1,
    burnedUsd: run?.totalCostUsd ?? burnedUsd,
    burnedTokens,
    afterUsd,
    afterTokens,
  };
}

function loopCount(spans: ExplainSpan[], failed: ExplainSpan) {
  const key = nameOf(failed);
  return spans.filter((s) => kind(s) === "tool" && nameOf(s) === key && (s.input ?? "") === (failed.input ?? "")).length;
}
