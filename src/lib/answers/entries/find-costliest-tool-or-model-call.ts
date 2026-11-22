import type { Answer } from "../types";

export const findCostliestCall: Answer = {
  slug: "find-costliest-tool-or-model-call",
  question: "How do I find which tool call or model call costs the most in an agent?",
  title: "Finding the costliest call in an agent",
  answer:
    "Record input tokens, output tokens and cost on every model call, then rank the spans of a run by cost. A tool call has no token price of its own, so judge it by how often it runs and how much text it adds to later model calls.",
  steps: [
    { heading: "Record tokens on each model call", body: "Set the model, input tokens and output tokens on every model span, and pass the cost from your own rate card." },
    { heading: "Rank spans in one run", body: "Open an expensive run and sort its spans by cost to see the biggest single call." },
    { heading: "Count repeated calls", body: "A cheap call that runs in a loop can cost more than one large call. Check how many times each step ran." },
    { heading: "Check what tools add", body: "A tool that returns a long result raises the input tokens of the next model call. Compare those input counts." },
  ],
  table: {
    caption: "Worked example with illustrative numbers (not real prices)",
    columns: ["Step", "Tokens (in / out)", "Cost at 1 per 1,000 in and 4 per 1,000 out"],
    rows: [
      ["Plan call", "2,000 / 500", "2 + 2 = 4"],
      ["Search tool, then answer call", "10,000 / 500", "10 + 2 = 12"],
      ["Retry of answer call", "10,000 / 500", "10 + 2 = 12"],
    ],
  },
  points: [
    { heading: "Reading the example", body: "The search result made the answer call large, and the retry paid for it twice. Trimming the result would cut both costs." },
    { heading: "Your own prices", body: "Uncoil never guesses a price. Use your provider's current rates when you record cost." },
  ],
  link: { href: "/docs/costs", label: "Read the cost docs" },
  related: [
    { href: "/tools/token-counter", label: "Token counter" },
    { href: "/tools/ai-cost-estimator", label: "Cost estimator" },
    { href: "/answers/track-ai-agent-costs", label: "Tracking AI agent costs" },
  ],
};
