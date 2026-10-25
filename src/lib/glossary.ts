import { tracingTerms } from "./glossary-data/tracing";
import { modelTerms } from "./glossary-data/models";
import { agentTerms } from "./glossary-data/agents";
import { opsTerms } from "./glossary-data/ops";

export type Term = {
  slug: string;
  term: string;
  definition: string;
  expansion: string;
  related: readonly string[];
  /** Short topic label shown above the term, e.g. "Tracing basics". */
  group?: string;
  /** A concrete, realistic example in plain prose. */
  example?: string;
  /** Where to go next in the product or docs. */
  link?: { href: string; label: string };
};

const coreTerms: readonly Term[] = [
  {
    slug: "trace-viewer",
    term: "Trace viewer",
    definition:
      "A trace viewer is a tool that shows one AI agent run as a timeline of spans, so you can open each model call, tool call, retry and error in order and see what the agent did and why it failed.",
    expansion:
      "A good trace viewer shows inputs, outputs, timing, tokens and cost for every step, and lets you jump from a bad answer to the first step that went wrong. Tracify's trace viewer does this for every run sent through the SDK or OpenTelemetry.",
    related: ["ai-agent-trace", "span", "agent-run"],
    link: { href: "/answers/what-is-a-trace-viewer", label: "How to view a trace" },
  },
  {
    slug: "tool-call-tracking",
    term: "Tool call tracking",
    definition:
      "Tool call tracking is recording every tool an AI agent calls, with its arguments, result, duration and errors, so you can see which tools are slow, fail often or are called with the wrong inputs.",
    expansion:
      "Agents often fail at the tool step: a wrong argument, a timeout or a stale result. Tracking tool calls as spans inside the run links each call to the model decision that triggered it and to the cost of the run.",
    related: ["tool-call", "span", "ai-agent-trace"],
  },
  {
    slug: "ai-pipeline-tracing",
    term: "AI pipeline tracing",
    definition:
      "AI pipeline tracing is following a request through every stage of an AI workflow, such as retrieval, prompt building, model calls, tools and post-processing, as one connected trace.",
    expansion:
      "Pipelines fail between stages as often as inside them. A single trace shows where time and cost go, which stage returned bad data, and how an early mistake carried into the final answer.",
    related: ["llm-tracing", "ai-agent-trace", "span"],
  },
  {
    slug: "ai-agent-tracking",
    term: "AI agent tracking",
    definition:
      "AI agent tracking is monitoring what your agents do in production: which runs happen, what each step costs, which runs fail, and how behavior changes between releases.",
    expansion:
      "Tracking covers runs, tool calls, tokens, cost and quality scores over time. It is the monitoring side of AI agent observability, while traces give the detail needed to debug a single run.",
    related: ["ai-agent-observability", "agent-run", "llm-cost-tracking"],
  },
  {
    slug: "llm-observability",
    term: "LLM observability",
    definition:
      "LLM observability is the practice of recording traces, model calls, tool calls, cost, latency, and errors for LLM-powered applications so their behavior can be inspected and debugged in production.",
    expansion:
      "Unlike traditional application logging, LLM observability keeps prompts, model outputs, token usage, and quality evidence attached to the run that produced them, since a single user-visible answer can depend on several chained model and tool calls.",
    related: ["ai-agent-trace", "llm-tracing", "tool-call"],
  },
  {
    slug: "ai-agent-trace",
    term: "AI agent trace",
    definition:
      "An AI agent trace is the complete recorded execution path of a single agent run, from the initial request through every model call, tool call, and retry, down to the final output.",
    expansion:
      "A trace is made of spans: individual operations such as one model generation or one tool call, each with its own timing, inputs, outputs, and status. Traces let engineers move from a bad final answer to the exact operation that produced it.",
    related: ["llm-observability", "span", "tool-call"],
  },
  {
    slug: "span",
    term: "Span",
    definition:
      "A span is a single recorded operation inside a trace, such as one model call, one tool call, or one retrieval step, with its own start time, duration, inputs, outputs, and status.",
    expansion:
      "Spans nest inside a parent trace, forming a timeline or graph. Parallel work, handoffs between agents, and repeated operations all show up as sibling or child spans under the same run.",
    related: ["ai-agent-trace", "llm-tracing"],
  },
  {
    slug: "tool-call",
    term: "Tool call",
    definition:
      "A tool call is an action an AI agent takes outside the language model itself, such as a search, database query, browser action, or API request, recorded with its arguments, result, latency, and failure state.",
    expansion:
      "Tool calls are attached to the reasoning span that selected them, which makes it possible to tell whether a bad outcome came from the agent choosing the wrong tool or from the tool itself failing.",
    related: ["ai-agent-trace", "agent-evaluation"],
  },
  {
    slug: "llm-tracing",
    term: "LLM tracing",
    definition:
      "LLM tracing is the technique of recording the sequence of model and tool calls behind a single AI agent response so it can be replayed and inspected step by step.",
    expansion:
      "LLM tracing typically builds on distributed tracing concepts (spans, parent-child relationships) extended with AI-specific fields: tokens, cost, model identity, prompt and completion payloads, and time to first token.",
    related: ["llm-observability", "ai-agent-trace", "time-to-first-token"],
  },
  {
    slug: "agent-evaluation",
    term: "Agent evaluation",
    definition:
      "Agent evaluation is the practice of scoring AI agent behavior against versioned datasets using deterministic or model-based evaluators, instead of relying on manual spot checks.",
    expansion:
      "Evaluations can run offline, over a fixed dataset before a release, or online, scoring live production traces continuously. Both modes attach a repeatable score to a specific version of the agent, prompt, or model being tested.",
    related: ["tool-call", "ai-engineering-lifecycle"],
  },
  {
    slug: "time-to-first-token",
    term: "Time to first token (TTFT)",
    definition:
      "Time to first token is the delay between sending a request to a language model and receiving the first streamed token of its response.",
    expansion:
      "TTFT is tracked separately from total call latency because it drives perceived responsiveness in streaming interfaces, even when total generation time is unchanged.",
    related: ["llm-tracing"],
  },
  {
    slug: "ai-engineering-lifecycle",
    term: "AI engineering lifecycle",
    definition:
      "The AI engineering lifecycle is the loop from observing production agent behavior, to curating datasets from that behavior, to running experiments, to releasing and monitoring the result.",
    expansion:
      "The lifecycle closes the gap between production evidence and the next release: a trace or user signal becomes a dataset case, the case evaluates a candidate change, and the release is then monitored against the same evaluation criteria.",
    related: ["agent-evaluation", "llm-observability"],
  },
  {
    slug: "ai-agent-observability",
    term: "AI agent observability",
    definition:
      "AI agent observability is the ability to see what an AI agent did and why, by recording every model call, tool call, decision, cost and error of each run so failures can be found and fixed.",
    expansion:
      "It extends LLM observability to multi-step agents: a run can loop, branch, call tools and hand work to other agents, so the useful unit is the whole trace, not a single request.",
    related: ["llm-observability", "ai-agent-trace", "span"],
  },
  {
    slug: "llm-cost-tracking",
    term: "LLM cost tracking",
    definition:
      "LLM cost tracking is measuring what each model call and each agent run costs, from input and output tokens multiplied by the model's price, and attributing it to a project, user, feature or release.",
    expansion:
      "Cost per run and cost per task matter more than the monthly bill alone, because a retry loop or an oversized prompt shows up as one expensive run long before it moves the total.",
    related: ["token-usage", "ai-agent-trace"],
  },
  {
    slug: "token-usage",
    term: "Token usage",
    definition:
      "Token usage is the number of input (prompt) and output (completion) tokens a language model processes for a call, which determines both its cost and how much of the context window it uses.",
    expansion:
      "Cached input tokens are usually billed at a lower rate, so good tracking records input, cached and output tokens separately.",
    related: ["llm-cost-tracking", "context-window"],
  },
  {
    slug: "context-window",
    term: "Context window",
    definition:
      "The context window is the maximum amount of text, measured in tokens, that a language model can read and write in a single call, including the prompt, the conversation history, tool results and the reply.",
    expansion:
      "Agents that keep appending tool output can fill the window, which raises cost and latency and can push important instructions out of the model's attention.",
    related: ["token-usage", "llm-tracing"],
  },
  {
    slug: "llm-as-a-judge",
    term: "LLM-as-a-judge",
    definition:
      "LLM-as-a-judge is an evaluation method where one language model scores another model's or agent's output against a rubric, such as correctness, helpfulness or safety.",
    expansion:
      "It scales far beyond manual review, but judges have biases, so teams validate them against a human-labeled sample before trusting the scores.",
    related: ["agent-evaluation", "evaluation-dataset"],
  },
  {
    slug: "evaluation-dataset",
    term: "Evaluation dataset",
    definition:
      "An evaluation dataset is a versioned set of inputs, and often expected outputs, used to test an AI agent before a release, usually built from real production traces and known failures.",
    expansion:
      "Turning a bad production trace into a dataset case means that failure is checked on every future change.",
    related: ["agent-evaluation", "llm-as-a-judge", "regression-testing"],
  },
  {
    slug: "regression-testing",
    term: "Agent regression testing",
    definition:
      "Agent regression testing is re-running a fixed set of cases after a prompt, model or tool change to confirm that behavior that used to work still works.",
    expansion:
      "Because agent output varies run to run, regression tests compare scores and pass rates across many cases rather than exact strings.",
    related: ["evaluation-dataset", "agent-evaluation"],
  },
  {
    slug: "hallucination",
    term: "Hallucination",
    definition:
      "A hallucination is a confident answer from a language model that is not supported by its input or by reality, such as an invented fact, citation or tool result.",
    expansion:
      "In agents, hallucinations often appear as made-up tool arguments or claims that a step succeeded when it did not, which traces make visible.",
    related: ["agent-evaluation", "tool-call"],
  },
  {
    slug: "prompt-injection",
    term: "Prompt injection",
    definition:
      "Prompt injection is an attack where text in a user message, web page or document tricks a language model into ignoring its instructions or taking an unintended action.",
    expansion:
      "Agents with tools are most at risk, since a successful injection can trigger real actions. Tracing which input led to which tool call helps investigate incidents.",
    related: ["tool-call", "ai-agent-trace"],
  },
  {
    slug: "opentelemetry",
    term: "OpenTelemetry (OTel)",
    definition:
      "OpenTelemetry is an open standard for producing and sending traces, metrics and logs, and it is widely used to send LLM and agent traces to an observability backend over the OTLP protocol.",
    expansion:
      "Using OpenTelemetry means instrumentation is not tied to one vendor, so a team can change backends without rewriting its code.",
    related: ["span", "llm-tracing"],
  },
  {
    slug: "agent-run",
    term: "Agent run",
    definition:
      "An agent run is one complete execution of an AI agent from a single trigger, such as a user request, to its final result, made up of all the spans recorded along the way.",
    expansion:
      "Runs are the rows of a tracing table: each has a status, duration, token count and cost that roll up from its spans.",
    related: ["ai-agent-trace", "span"],
  },
  {
    slug: "multi-agent-system",
    term: "Multi-agent system",
    definition:
      "A multi-agent system is an application where several AI agents, each with its own role and tools, cooperate by passing tasks and results to each other.",
    expansion:
      "Failures can hide in the handoffs between agents, so observability needs to follow work across agents inside one trace.",
    related: ["ai-agent-trace", "tool-call"],
  },
  {
    slug: "model-context-protocol",
    term: "Model Context Protocol (MCP)",
    definition:
      "The Model Context Protocol is an open standard that lets AI applications connect to external tools and data sources through a common interface of servers and clients.",
    expansion:
      "Each MCP tool invocation is a tool call, so tracing MCP servers shows which tools an agent used and how they behaved.",
    related: ["tool-call", "ai-agent-trace"],
  },
  {
    slug: "agent-drift",
    term: "Agent drift",
    definition:
      "Agent drift is a gradual change in an AI agent's behavior or quality over time, caused by model updates, prompt edits, changing data or shifting user inputs.",
    expansion:
      "Drift is caught by tracking scores, cost and failure rates over time and alerting when they move away from a baseline.",
    related: ["agent-evaluation", "llm-observability"],
  },
];

export const glossaryTerms: readonly Term[] = [...coreTerms, ...tracingTerms, ...modelTerms, ...agentTerms, ...opsTerms];
