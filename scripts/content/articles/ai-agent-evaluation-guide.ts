import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "AI Agent Evaluation: A Practical Guide",
  keyword: "AI agent evaluation",
  thesis: "Reliable evaluation joins representative tasks, explicit criteria, and release decisions instead of producing an isolated score.",
  audience: "AI engineers, product owners, and engineering leaders designing quality evidence for agent releases",
  framework: "Represent, Specify, Score, Review, Gate",
  outcome: "a release decision supported by representative quality evidence and known limitations",
  uncoilLink: "/product/failures",
  related: ["ai-agent-testing-unit-tests-production-evals", "llm-observability-metrics-that-matter"],
  topics: ["Define the decision before the score", "Build a representative evaluation set", "Write observable quality criteria", "Combine automated and human review", "Use results as a release gate"],
  signals: ["decision confidence and coverage", "input-class distribution and edge cases", "criterion-level pass and failure reasons", "reviewer agreement and disagreement", "regression rate across releases"],
  failure: "a high aggregate score masks a recurring error in a high-impact customer segment",
  example: "an account-management agent that drafts renewal guidance using CRM facts, policy constraints, and a required human approval step",
  decision: "whether a proposed version is ready for a limited or broad release",
}, mediaIdBySlug["ai-agent-evaluation-practical-guide"]);
