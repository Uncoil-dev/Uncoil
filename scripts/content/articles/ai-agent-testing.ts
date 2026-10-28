import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "AI Agent Testing: From Unit Tests to Production Evals",
  keyword: "AI agent testing",
  thesis: "A layered test strategy makes probabilistic behavior safer by putting the right evidence at each boundary from code to production.",
  audience: "AI engineers and quality-minded leaders building repeatable release practices",
  framework: "Isolate, Simulate, Evaluate, Observe, Improve",
  outcome: "a safer release process that catches deterministic defects and behavior regressions",
  uncoilLink: "/product/tool-calls",
  related: ["ai-agent-evaluation-practical-guide", "debug-ai-agents-in-production"],
  topics: ["Unit test deterministic boundaries", "Simulate tools and dependencies", "Evaluate realistic task behavior", "Observe production feedback", "Turn incidents into tests"],
  signals: ["unit pass rate and contract coverage", "simulated tool error handling", "scenario quality and criterion outcomes", "production correction and escalation patterns", "regression recurrence after a fix"],
  failure: "a workflow passes its unit tests but fails when a realistic tool response is incomplete or delayed",
  example: "a compliance assistant that classifies requests, retrieves policy sections, and prepares a review packet for a human approver",
  decision: "which evidence is sufficient to release a workflow change at the intended level of exposure",
}, mediaIdBySlug["ai-agent-testing-unit-tests-production-evals"]);
