import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "How to Debug AI Agents in Production",
  keyword: "debug AI agents in production",
  thesis: "Incident response improves when investigators reconstruct one connected run before proposing a fix.",
  audience: "on-call engineers, workflow owners, and technical leaders handling production AI incidents",
  framework: "Stabilize, Reconstruct, Compare, Correct, Verify",
  outcome: "a safe restoration of the affected workflow and a verified prevention step",
  uncoilLink: "/docs/troubleshooting",
  related: ["llm-tracing-explained", "ai-agent-reliability-failures-retries-guardrails"],
  topics: ["Stabilize users before diagnosis", "Reconstruct the execution timeline", "Compare a failing run with a healthy run", "Classify the failure mechanism", "Verify the fix in production"],
  signals: ["user impact and fallback activation", "span chronology and correlated identifiers", "version and input-class differences", "tool, retrieval, model, and policy outcomes", "recurrence rate and post-release samples"],
  failure: "an incident channel fills with theories before anyone has reconstructed the affected run",
  example: "a procurement agent that submits an incomplete vendor request after a downstream lookup returns an unexpected shape",
  decision: "whether to pause, repair, roll back, or continue the workflow under a temporary boundary",
}, mediaIdBySlug["debug-ai-agents-in-production"]);
