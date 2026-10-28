import { buildLongformArticle } from "./article-builder.ts";

export const buildArticle = (mediaIdBySlug: Record<string, number>) => buildLongformArticle({
  title: "Prompt Versioning and Prompt Management",
  keyword: "prompt versioning",
  thesis: "Prompt changes are production changes when they alter behavior, so they need review, provenance, measurement, and rollback.",
  audience: "teams maintaining prompts and policies that influence production LLM behavior",
  framework: "Name, Review, Compare, Release, Revert",
  outcome: "a prompt change that can be explained, measured, and safely reversed",
  uncoilLink: "/product/llm-calls",
  related: ["ai-agent-testing-unit-tests-production-evals", "reduce-llm-costs-without-hurting-quality"],
  topics: ["Give prompts stable identities", "Review intent and scope", "Compare versions with representative tasks", "Release with attribution", "Make rollback routine"],
  signals: ["prompt and policy revision identifiers", "review intent and approval record", "scenario-level comparison", "release cohort and outcome changes", "rollback trigger and restoration time"],
  failure: "a small wording edit changes tool use in production but the team cannot identify when or why it happened",
  example: "a knowledge assistant whose response policy changes from summarizing internal guidance to asking a clarification before recommending an irreversible action",
  decision: "whether a prompt or policy revision should advance, remain experimental, or be reverted",
}, mediaIdBySlug["prompt-versioning-and-prompt-management"]);
