import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "LLM Observability: Metrics That Actually Matter",
  keyword: "LLM observability metrics",
  thesis: "The right metrics expose quality, speed, cost, and failure risk in a form that changes an operating decision.",
  audience: "engineers and leaders selecting metrics for production language-model workflows",
  framework: "Outcome, Context, Threshold, Owner, Review",
  outcome: "a useful model-assisted result within the right quality, latency, and spend boundaries",
  uncoilLink: "/product/cost-dashboard",
  related: ["ai-agent-observability-complete-guide", "reduce-llm-costs-without-hurting-quality"],
  topics: ["Separate leading from lagging metrics", "Measure task success before token volume", "Interpret latency by workflow", "Connect cost to outcomes", "Review metric quality itself"],
  signals: ["completion rate and correction rate", "outcome acceptance and escalation", "p50, p95, and dependency timing", "cost per successful task", "false-positive and false-negative review"],
  failure: "a dashboard reports healthy usage while users quietly abandon the workflow",
  example: "a research assistant that summarizes source material and produces a cited recommendation for an internal analyst",
  decision: "which metric deserves an alert, a weekly review, or no operational attention",
}, mediaIdBySlug["llm-observability-metrics-that-matter"]);
