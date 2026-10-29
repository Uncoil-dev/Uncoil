import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "AI Agent Reliability: Failures, Retries, and Guardrails",
  keyword: "AI agent reliability",
  thesis: "Reliability comes from explicit failure handling and recovery boundaries, not confidence in a single model response.",
  audience: "engineers and leaders designing agent workflows that must behave safely under uncertainty",
  framework: "Classify, Contain, Recover, Escalate, Learn",
  outcome: "a predictable response to expected failures without exposing users to uncontrolled actions",
  uncoilLink: "/product/failures",
  related: ["debug-ai-agents-in-production", "llm-tracing-explained"],
  topics: ["Build a useful failure taxonomy", "Bound retries by risk", "Design guardrails as workflow controls", "Escalate with the right context", "Learn from recovery paths"],
  signals: ["failure category and impact", "attempt count, backoff, and terminal state", "policy checks and blocked actions", "handoff completeness and resolution time", "repeat failures and recovery effectiveness"],
  failure: "a harmless transient error and a dangerous policy violation are both treated as generic retries",
  example: "an operations agent that reconciles shipment exceptions but must never alter a delivery commitment without a verified source and explicit approval",
  decision: "whether an agent should retry, fall back, request help, or stop",
}, mediaIdBySlug["ai-agent-reliability-failures-retries-guardrails"]);
