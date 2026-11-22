import type { Answer } from "../types";

export const whatIsAgentObservability: Answer = {
  slug: "what-is-ai-agent-observability",
  question: "What is AI agent observability and why does it matter?",
  title: "What is AI agent observability?",
  answer:
    "AI agent observability is recording each run of an agent as a connected trace of its model calls, tool calls, retries and errors, with their cost and timing. It matters because an agent can fail or overspend in the middle of a run without anything crashing.",
  table: {
    caption: "Logging compared with observability",
    columns: ["Aspect", "Plain logging", "Agent observability"],
    rows: [
      ["Shape", "Separate lines of text", "One trace per run, made of linked steps"],
      ["Question it answers", "What was printed?", "Which step caused this result, and what did it cost?"],
      ["Finding a cause", "Search and match lines by hand", "Open the run and follow the steps"],
    ],
  },
  points: [
    { heading: "Traces", body: "The steps of a run, with each step's input, output and parent." },
    { heading: "Cost and latency", body: "Tokens and price per model call, and time per step, summed per run." },
    { heading: "Errors", body: "The error type and message on the step where a failure happened." },
    { heading: "Quality", body: "Feedback and scores attached to a run, so you can tell good answers from bad ones." },
  ],
  link: { href: "/docs/observability", label: "Read the observability guide" },
  related: [
    { href: "/glossary", label: "Glossary" },
    { href: "/blog/ai-agent-observability-complete-guide", label: "The complete guide" },
    { href: "/docs/trace-anatomy", label: "What is in a trace" },
  ],
};
