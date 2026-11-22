import type { Answer } from "../types";

export const trackAgentCosts: Answer = {
  slug: "track-ai-agent-costs",
  question: "What is the best way to track AI agent costs?",
  title: "Tracking AI agent costs",
  answer:
    "Record the token counts and price of every model call and tool call as part of the run's trace, then add them up per run, per model and per day. Cost tracked this way can be traced back to the step that caused it, which a monthly provider invoice cannot do.",
  steps: [
    { heading: "Record cost on every call", body: "Wrap your model client with the SDK so each call keeps its input tokens, output tokens, model and cost on the span." },
    { heading: "Group spend by run", body: "Add up the spans in a trace to get the cost of one run, so you can compare a typical run with an expensive one." },
    { heading: "Break it down by model and tool", body: "Rank models and tools by total spend to see which default model or repeated call drives the bill." },
    { heading: "Separate retry cost", body: "Split spend on retries and fallbacks from the intended path, so you know what recovery behavior costs." },
    { heading: "Check against a plan", body: "Compare measured cost per run with an estimate from the cost estimator, and investigate runs that differ." },
  ],
  table: {
    caption: "Cost signals to record",
    columns: ["Signal", "What to record", "What it tells you"],
    rows: [
      ["Tokens", "Input and output tokens per model call", "Which prompts and history grow, and which calls are large"],
      ["Retries", "Count and cost of repeated or fallback calls", "How much spend comes from recovery, not the first attempt"],
      ["Tool calls", "How often each tool runs, and its cost where it has one", "Whether a tool is called more than the workflow needs"],
    ],
  },
  points: [
    { heading: "Why not rely on the invoice", body: "A provider invoice shows totals by model or key. It cannot show which run, prompt or tool call produced the spend." },
    { heading: "Read cost next to the trace", body: "Open the traces behind an expensive change to confirm whether the work was needed, duplicated or caused by policy." },
  ],
  link: { href: "/docs/costs", label: "Read the cost docs" },
  related: [
    { href: "/tools/ai-cost-estimator", label: "Cost estimator" },
    { href: "/product/cost-dashboard", label: "Cost dashboard" },
    { href: "/blog/how-to-track-llm-token-usage", label: "Track token usage per request" },
  ],
};
