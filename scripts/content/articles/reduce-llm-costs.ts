import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "How to Reduce LLM Costs Without Hurting Quality",
  keyword: "reduce LLM costs",
  thesis: "Cost control is durable only when every optimization is paired with a quality check and an observed user outcome.",
  audience: "engineering teams and leaders responsible for language-model spend and service quality",
  framework: "Attribute, Prioritize, Experiment, Safeguard, Standardize",
  outcome: "lower cost per successful task without a hidden quality or reliability regression",
  uncoilLink: "/product/cost-dashboard",
  related: ["llm-observability-metrics-that-matter", "prompt-versioning-and-prompt-management"],
  topics: ["Attribute spend to a task", "Find cost concentration", "Test routing and context changes", "Protect quality with evaluation", "Make savings observable"],
  signals: ["cost per completed task", "model, tool, and input-class contribution", "experiment cohort comparison", "quality, correction, and escalation rates", "sustained spend after rollout"],
  failure: "a token-reduction change lowers the invoice while increasing customer corrections and escalations",
  example: "a document-analysis agent that chooses a model, retrieves relevant passages, and creates a structured extraction for finance operations",
  decision: "which cost optimization can be retained because it preserves the intended outcome",
}, mediaIdBySlug["reduce-llm-costs-without-hurting-quality"]);
