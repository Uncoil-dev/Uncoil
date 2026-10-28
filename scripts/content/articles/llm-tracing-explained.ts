import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "LLM Tracing Explained",
  keyword: "LLM tracing",
  thesis: "A trace is useful when its spans preserve the context required to explain an end-to-end task, not when it simply lists API calls.",
  audience: "engineers implementing instrumentation for LLM and agent workflows",
  framework: "Boundary, Propagate, Annotate, Correlate, Inspect",
  outcome: "a connected execution narrative that makes a production diagnosis reproducible",
  uncoilLink: "/docs/typescript",
  related: ["debug-ai-agents-in-production", "ai-agent-observability-complete-guide"],
  topics: ["Choose meaningful trace boundaries", "Propagate context across asynchronous work", "Model spans around decisions", "Add attributes with purpose", "Inspect traces as narratives"],
  signals: ["root run duration and outcome", "parent-child context continuity", "model, retrieval, tool, and validation spans", "version identifiers and error classification", "cross-run comparison and root-cause confidence"],
  failure: "logs show individual requests but cannot establish why one task produced its final result",
  example: "a travel-planning agent that gathers preferences, searches inventory, checks policies, and requests confirmation before it finalizes an itinerary",
  decision: "whether the instrumentation supports a real investigation or needs a clearer semantic boundary",
}, mediaIdBySlug["llm-tracing-explained"]);
