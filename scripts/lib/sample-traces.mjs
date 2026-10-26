// Shared generator for realistic sample support-agent runs (used by the seed scripts).
export function createRunBuilder({ days = 7, seedValue = 20261025, environment = "staging" } = {}) {
let seed = seedValue;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => Math.round(min + rand() * (max - min));
const hex = (n) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join("");

const questions = [
  ["Where is my order?", "order_lookup"],
  ["I was charged twice this month", "billing_lookup"],
  ["How do I reset my password?", "kb_search"],
  ["Can I change my plan to annual?", "billing_lookup"],
  ["My export is stuck at 90%", "job_status"],
  ["Do you support SSO?", "kb_search"],
  ["Cancel my subscription please", "billing_lookup"],
  ["The API returns 429 all the time", "kb_search"],
];
const models = [["gpt-4o-mini", 0.00015], ["gpt-4o", 0.0025], ["claude-sonnet-4", 0.003]];
const failures = [
  ["tool_timeout", "order_lookup timed out after 8000ms"],
  ["rate_limit", "429 Too Many Requests from the model provider"],
  ["bad_tool_arguments", "billing_lookup received customer_id=null"],
  ["context_overflow", "Prompt exceeded the model context window"],
];

const buildRun = function () {
  const runId = `seed_${Date.now().toString(36)}_${hex(6)}`;
  const sessionId = `sess_${hex(8)}`;
  const [question, tool] = pick(questions);
  const [modelId, rate] = pick(models);
  const startedAt = Date.now() - rand() * days * 86_400_000;
  const failed = rand() < 0.14;
  const [errorType, errorMessage] = pick(failures);
  const common = { runId, sessionId, endUserId: `user_${between(1, 25)}`, environment, release: "v1.4.2", traceName: "support-agent", tags: ["sample-data"] };
  const spans = [];
  let clock = startedAt;
  const add = (span) => {
    spans.push({ ...common, spanId: `${runId}_${spans.length + 1}`, createdAt: new Date(clock).toISOString(), ...span });
    clock += span.latencyMs + between(5, 40);
  };

  add({ spanType: "llm_call", modelId, input: question, output: `I'll look that up with ${tool}.`, latencyMs: between(500, 1400), inputTokens: between(300, 700), outputTokens: between(20, 80), costUsd: rate / 5 });
  const retries = rand() < 0.2 ? 1 : 0;
  const toolFails = failed && (errorType === "tool_timeout" || errorType === "bad_tool_arguments");
  add({
    spanType: "tool_call", toolName: tool, parentSpanId: spans[0].spanId, input: { question }, retryCount: retries,
    output: toolFails ? undefined : { found: true, summary: "Record found" },
    latencyMs: toolFails && errorType === "tool_timeout" ? 8000 : between(120, 900),
    ...(toolFails ? { errorType, errorMessage, timedOut: errorType === "tool_timeout", timeoutMs: errorType === "tool_timeout" ? 8000 : undefined } : {}),
  });
  if (!toolFails) {
    add({
      spanType: "llm_call", modelId, input: "Write the final answer from the tool result.", output: failed ? undefined : "Here is what I found. Is there anything else I can help with?",
      latencyMs: between(700, 2400), inputTokens: between(500, 1500), outputTokens: between(60, 260), costUsd: rate,
      ...(failed ? { errorType, errorMessage } : {}),
    });
  }
  return spans;
}
return buildRun;
}
