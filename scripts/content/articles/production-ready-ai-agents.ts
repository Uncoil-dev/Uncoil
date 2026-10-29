import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "Building Production-Ready AI Agents",
  keyword: "production-ready AI agents",
  thesis: "Production readiness is an operating capability: teams need measurable outcomes, controlled actions, and evidence-backed learning after launch.",
  audience: "engineering leaders and delivery teams moving agent prototypes into accountable production services",
  framework: "Purpose, Boundaries, Evidence, Readiness, Stewardship",
  outcome: "a measurable, reliable, and governable AI capability that can improve after release",
  uncoilLink: "/docs/typescript",
  related: ["ai-agent-observability-complete-guide", "ai-agent-reliability-failures-retries-guardrails"],
  topics: ["Define a production-worthy purpose", "Set action and data boundaries", "Build evidence into the delivery path", "Gate readiness with representative proof", "Steward the system after launch"],
  signals: ["user outcome and business consequence", "authorization, data handling, and approval events", "run-level observability and version attribution", "release criteria and exception coverage", "adoption, correction, reliability, and cost trends"],
  failure: "a prototype is promoted because the demo is convincing even though no one can own its exceptions or verify its outcomes",
  example: "a customer-success agent that prepares account briefs, suggests follow-ups, and routes account risks to a human manager under explicit approval rules",
  decision: "whether an agent is ready for broader exposure and who will operate it once it is live",
}, mediaIdBySlug["building-production-ready-ai-agents"]);
