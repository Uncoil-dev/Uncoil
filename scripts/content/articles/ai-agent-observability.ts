import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "AI Agent Observability: The Complete Guide",
  keyword: "AI agent observability",
  thesis: "It connects the decisions an agent makes with the evidence needed to operate that system responsibly.",
  audience: "AI engineers, platform operators, and engineering leaders responsible for customer-facing agent workflows",
  framework: "Frame, Follow, Assess, Respond, Learn",
  outcome: "a dependable, explainable task outcome for the user",
  uncoilLink: "/product/trace-viewer",
  related: ["llm-observability-metrics-that-matter", "llm-tracing-explained"],
  topics: ["Map the real task boundary", "Connect traces to user outcomes", "Choose signals that support action", "Protect sensitive context", "Build an evidence-review habit"],
  signals: ["task completion and abandonment", "run and session correlation", "quality labels and user feedback", "access and retention decisions", "review coverage and time-to-decision"],
  failure: "a customer cannot explain why the agent took an unexpected action",
  example: "a support-routing agent that retrieves account context, proposes a resolution, and opens a service ticket when it cannot safely answer",
  decision: "whether the agent can continue without human intervention",
}, mediaIdBySlug["ai-agent-observability-complete-guide"]);
