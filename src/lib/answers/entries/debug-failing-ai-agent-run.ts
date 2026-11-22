import type { Answer } from "../types";

export const debugFailingAgentRun: Answer = {
  slug: "debug-failing-ai-agent-run",
  question: "How do I debug a failing AI agent run?",
  title: "Debugging a failing AI agent run",
  answer:
    "Open the trace of the failed run, find the first step that went wrong, and read its input and output. Then compare that step with the same step in a run that passed, to see what changed.",
  steps: [
    { heading: "Find the first failing step", body: "Open the run, follow the waterfall to the first span with an error or an unexpected output. Later failures are often caused by it." },
    { heading: "Inspect the tool inputs", body: "Read the arguments the model passed to the tool and what the tool returned. A bad argument points at the prompt or model; a bad result points at the tool." },
    { heading: "Read the error type", body: "Each failed span keeps its error type and message, so you can tell a provider failure from a wrong decision by the model." },
    { heading: "Compare with a passing run", body: "Open a similar run that worked and compare the prompt version, model and tool arguments with the failed one." },
    { heading: "Fix it and check again", body: "Change the prompt, tool or model, run the same input again, and confirm the trace now follows the passing path." },
  ],
  points: [
    { heading: "Why traces beat logs here", body: "Spans are linked to the step that started them, so you can see which step called which instead of matching log lines by hand." },
    { heading: "Record the right things", body: "Wrap tools with observe and set the model and token counts on model spans, so the trace has the detail you need next time." },
  ],
  link: { href: "/docs/trace-anatomy", label: "Read what is in a trace" },
  related: [
    { href: "/docs/observability", label: "Trace and inspect agent runs" },
    { href: "/docs/tool-calls", label: "Instrument tool calls" },
    { href: "/glossary/llm-tracing", label: "What is LLM tracing?" },
  ],
};
