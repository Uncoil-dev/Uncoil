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
  /** How to apply the term when running an agent: what to record, check or avoid. */
  inPractice?: string;
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
      "A good trace viewer shows inputs, outputs, timing, tokens and cost for every step, and lets you jump from a bad answer to the first step that went wrong. Uncoil's trace viewer does this for every run sent through the SDK or OpenTelemetry.",
    related: ["ai-agent-trace", "span", "agent-run"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
    inPractice:
      "Open a failed run and read it from the first step, not the last. The last step shows the symptom, and the first step where reality and expectation differ shows the cause. Compare it with a good run of the same task to see what changed.",
  },
  {
    slug: "tool-call-tracking",
    term: "Tool call tracking",
    definition:
      "Tool call tracking is recording every tool an AI agent calls, with its arguments, result, duration and errors, so you can see which tools are slow, fail often or are called with the wrong inputs.",
    expansion:
      "Agents often fail at the tool step: a wrong argument, a timeout or a stale result. Tracking tool calls as spans inside the run links each call to the model decision that triggered it and to the cost of the run.",
    related: ["tool-call", "span", "ai-agent-trace"],
    inPractice:
      "Record the tool name, arguments, result, duration and error for every call. Then you can tell a wrong choice from a broken tool. Watch for tools that return empty results, since the agent often carries on as if they worked.",
  },
  {
    slug: "ai-pipeline-tracing",
    term: "AI pipeline tracing",
    definition:
      "AI pipeline tracing is following a request through every stage of an AI workflow, such as retrieval, prompt building, model calls, tools and post-processing, as one connected trace.",
    expansion:
      "Pipelines fail between stages as often as inside them. A single trace shows where time and cost go, which stage returned bad data, and how an early mistake carried into the final answer.",
    related: ["llm-tracing", "ai-agent-trace", "span"],
    inPractice:
      "Give each stage its own span: retrieval, prompt building, model call and post-processing. When an answer is wrong, walk the stages in order and stop at the first one whose output is already wrong. That is where the fix belongs.",
  },
  {
    slug: "llm-observability",
    term: "LLM observability",
    definition:
      "LLM observability is the practice of recording traces, model calls, tool calls, cost, latency, and errors for LLM-powered applications so their behavior can be inspected and debugged in production.",
    expansion:
      "Unlike traditional application logging, LLM observability keeps prompts, model outputs, token usage, and quality evidence attached to the run that produced them, since a single user-visible answer can depend on several chained model and tool calls.",
    related: ["ai-agent-trace", "llm-tracing", "tool-call"],
    inPractice:
      "Start with one workflow. Record each model call with tokens, cost, latency and errors, then add outcomes and scores. Observability is working when a new teammate can open a run and explain what happened without asking you.",
  },
  {
    slug: "ai-agent-trace",
    term: "AI agent trace",
    definition:
      "An AI agent trace is the complete recorded execution path of a single agent run, from the initial request through every model call, tool call, and retry, down to the final output.",
    expansion:
      "A trace is made of spans: individual operations such as one model generation or one tool call, each with its own timing, inputs, outputs, and status. Traces let engineers move from a bad final answer to the exact operation that produced it.",
    related: ["llm-observability", "span", "tool-call"],
    inPractice:
      "A good trace has one parent for the run and a child for each model call, tool call and retrieval. Keep inputs and outputs trimmed, remove secrets, and tag the release so you can compare traces before and after a change.",
  },
  {
    slug: "span",
    term: "Span",
    definition:
      "A span is a single recorded operation inside a trace, such as one model call, one tool call, or one retrieval step, with its own start time, duration, inputs, outputs, and status.",
    expansion:
      "Spans nest inside a parent trace, forming a timeline or graph. Parallel work, handoffs between agents, and repeated operations all show up as sibling or child spans under the same run.",
    related: ["ai-agent-trace", "llm-tracing"],
    example:
      "A support agent answers a refund question. The run has one parent trace and four spans: a retrieval span (180 ms), a model span (2.1 s, 1,400 input tokens), a refund-policy tool span (90 ms) and a second model span that writes the reply. The slow part is the first model span, so that is where you look first.",
    inPractice:
      "Keep a span small and meaningful: one model call, one tool call or one retrieval step. Give it a type, an input, an output, a duration and an error. Too many tiny spans hide the story, and too few leave you unable to tell which step failed.",
  },
  {
    slug: "tool-call",
    term: "Tool call",
    definition:
      "A tool call is an action an AI agent takes outside the language model itself, such as a search, database query, browser action, or API request, recorded with its arguments, result, latency, and failure state.",
    expansion:
      "Tool calls are attached to the reasoning span that selected them, which makes it possible to tell whether a bad outcome came from the agent choosing the wrong tool or from the tool itself failing.",
    related: ["ai-agent-trace", "agent-evaluation"],
    example:
      "An agent asked \"what is order 4417's status?\" calls get_order with {\"id\": 4417}. The tool returns an empty result in 40 ms, and the model then invents a delivery date. The trace shows the tool call succeeded but returned nothing, so the fix is in the tool, not the prompt.",
    inPractice:
      "Record the tool name, arguments, result, duration and error on every call. Then you can tell a wrong choice (the agent picked the wrong tool) from a broken tool (the right tool failed). Alert on tools that fail or return empty results more often than usual.",
  },
  {
    slug: "llm-tracing",
    term: "LLM tracing",
    definition:
      "LLM tracing is the technique of recording the sequence of model and tool calls behind a single AI agent response so it can be replayed and inspected step by step.",
    expansion:
      "LLM tracing typically builds on distributed tracing concepts (spans, parent-child relationships) extended with AI-specific fields: tokens, cost, model identity, prompt and completion payloads, and time to first token.",
    related: ["llm-observability", "ai-agent-trace", "time-to-first-token"],
    example:
      "A chat agent answers slowly on Tuesday afternoons. The trace of one slow run shows three model calls in a row instead of one, because a tool error triggered two retries. Without the trace, you would only see one long request.",
    inPractice:
      "Trace one workflow end to end before you add detail elsewhere. A useful trace lets another person open a run and explain what happened without asking you. Remove secrets from inputs before they are stored, and keep the release on every trace.",
  },
  {
    slug: "agent-evaluation",
    term: "Agent evaluation",
    definition:
      "Agent evaluation is the practice of scoring AI agent behavior against versioned datasets using deterministic or model-based evaluators, instead of relying on manual spot checks.",
    expansion:
      "Evaluations can run offline, over a fixed dataset before a release, or online, scoring live production traces continuously. Both modes attach a repeatable score to a specific version of the agent, prompt, or model being tested.",
    related: ["tool-call", "ai-engineering-lifecycle"],
    inPractice:
      "Score agents on a fixed set of real cases, and read the worst failures, not only the average. Check the final answer and also the path, such as the tools used and the number of steps. Re-run the set on every change.",
  },
  {
    slug: "time-to-first-token",
    term: "Time to first token (TTFT)",
    definition:
      "Time to first token is the delay between sending a request to a language model and receiving the first streamed token of its response.",
    expansion:
      "TTFT is tracked separately from total call latency because it drives perceived responsiveness in streaming interfaces, even when total generation time is unchanged.",
    related: ["llm-tracing"],
    inPractice:
      "Measure it separately from total time. Users of streaming answers judge speed by the first words. A rising time to first token usually points to a longer prompt, a slow retrieval step before the model call, or provider queueing.",
  },
  {
    slug: "ai-engineering-lifecycle",
    term: "AI engineering lifecycle",
    definition:
      "The AI engineering lifecycle is the loop from observing production agent behavior, to curating datasets from that behavior, to running experiments, to releasing and monitoring the result.",
    expansion:
      "The lifecycle closes the gap between production evidence and the next release: a trace or user signal becomes a dataset case, the case evaluates a candidate change, and the release is then monitored against the same evaluation criteria.",
    related: ["agent-evaluation", "llm-observability"],
    inPractice:
      "Close the loop: watch production, save bad runs as test cases, change the agent, run the tests and release. Each turn of the loop should add at least one case, so the same failure cannot return unnoticed.",
  },
  {
    slug: "ai-agent-observability",
    term: "AI agent observability",
    definition:
      "AI agent observability is the ability to see what an AI agent did and why, by recording every model call, tool call, decision, cost and error of each run so failures can be found and fixed.",
    expansion:
      "It extends LLM observability to multi-step agents: a run can loop, branch, call tools and hand work to other agents, so the useful unit is the whole trace, not a single request. Some teams call the monitoring side of this AI agent tracking: which runs happen, what each step costs, which runs fail, and how behavior changes between releases.",
    related: ["llm-observability", "ai-agent-trace", "span", "llm-cost-tracking"],
    link: { href: "/blog/ai-agent-observability-complete-guide", label: "Read the complete guide" },
    inPractice:
      "Match the signal to the symptom. Wrong answers start in retrieval and tool spans, slow runs in the longest child span, and cost spikes in the number of model calls per run. Open that one signal first instead of browsing.",
  },
  {
    slug: "llm-cost-tracking",
    term: "LLM cost tracking",
    definition:
      "LLM cost tracking is measuring what each model call and each agent run costs, from input and output tokens multiplied by the model's price, and attributing it to a project, user, feature or release.",
    expansion:
      "Cost per run and cost per task matter more than the monthly bill alone, because a retry loop or an oversized prompt shows up as one expensive run long before it moves the total.",
    related: ["token-usage", "ai-agent-trace"],
    example:
      "A feature costs $0.02 per run on average, but one customer's runs cost $0.40. Cost tracking by customer shows their prompts include a 30,000-token document on every call. You trim the document, and the cost drops by 90 percent for that customer.",
    inPractice:
      "Track cost per successful task, not just per call, because a cheap model that retries three times can cost more than a larger one. Attribute cost to release, feature and customer, and set a per-run budget so a loop cannot run up a bill unnoticed.",
  },
  {
    slug: "token-usage",
    term: "Token usage",
    definition:
      "Token usage is the number of input (prompt) and output (completion) tokens a language model processes for a call, which determines both its cost and how much of the context window it uses.",
    expansion:
      "Cached input tokens are usually billed at a lower rate, so good tracking records input, cached and output tokens separately.",
    related: ["llm-cost-tracking", "context-window"],
    inPractice:
      "Track input and output tokens per run, not just per month. A sudden rise in input tokens per run usually means a prompt or a retrieved document grew. Set a per-run limit so one bad loop cannot spend a whole day's budget.",
  },
  {
    slug: "context-window",
    term: "Context window",
    definition:
      "The context window is the maximum amount of text, measured in tokens, that a language model can read and write in a single call, including the prompt, the conversation history, tool results and the reply.",
    expansion:
      "Agents that keep appending tool output can fill the window, which raises cost and latency and can push important instructions out of the model's attention.",
    related: ["token-usage", "llm-tracing"],
    inPractice:
      "Know the limit of your model and measure how close each run gets. Long runs fill the window with old turns and tool output. Summarize or drop what is no longer needed before the limit, since truncation is silent.",
  },
  {
    slug: "llm-as-a-judge",
    term: "LLM-as-a-judge",
    definition:
      "LLM-as-a-judge is an evaluation method where one language model scores another model's or agent's output against a rubric, such as correctness, helpfulness or safety.",
    expansion:
      "It scales far beyond manual review, but judges have biases, so teams validate them against a human-labeled sample before trusting the scores.",
    related: ["agent-evaluation", "evaluation-dataset"],
    inPractice:
      "Write a clear rubric, and check the judge against a sample scored by a person before you trust it. Judges favor long and confident answers, so compare scores across versions rather than reading one number alone.",
  },
  {
    slug: "evaluation-dataset",
    term: "Evaluation dataset",
    definition:
      "An evaluation dataset is a versioned set of inputs, and often expected outputs, used to test an AI agent before a release, usually built from real production traces and known failures.",
    expansion:
      "Turning a bad production trace into a dataset case means that failure is checked on every future change.",
    related: ["agent-evaluation", "llm-as-a-judge", "regression-testing"],
    example:
      "After a refund bug reaches a customer, the team saves that conversation as a case with the expected answer \"refund not allowed after 30 days\". The next prompt change is run against 60 such cases, and one new change fails this one before release.",
    inPractice:
      "Build the set from real traces, and label what the right behavior is, not only the right text. Version it and freeze it while you compare two changes. Refresh it on a schedule so it matches what users ask now.",
  },
  {
    slug: "regression-testing",
    term: "Agent regression testing",
    definition:
      "Agent regression testing is re-running a fixed set of cases after a prompt, model or tool change to confirm that behavior that used to work still works.",
    expansion:
      "Because agent output varies run to run, regression tests compare scores and pass rates across many cases rather than exact strings.",
    related: ["evaluation-dataset", "agent-evaluation"],
    example:
      "A team swaps its model for a cheaper one and runs the same 80 cases. Pass rate drops from 94 percent to 87 percent, and the failures cluster in date handling. They keep the old model for that step and ship the cheaper one everywhere else.",
    inPractice:
      "Run the same cases before and after every prompt, model or tool change. Look at the pass rate and read the worst failures, not only the average. Add every real production failure to the set so it cannot return unnoticed.",
  },
  {
    slug: "hallucination",
    term: "Hallucination",
    definition:
      "A hallucination is a confident answer from a language model that is not supported by its input or by reality, such as an invented fact, citation or tool result.",
    expansion:
      "In agents, hallucinations often appear as made-up tool arguments or claims that a step succeeded when it did not, which traces make visible.",
    related: ["agent-evaluation", "tool-call"],
    inPractice:
      "Check whether the answer is supported by the retrieved text. If the right source was missing, fix retrieval. If it was there and ignored, tighten the prompt or ask for citations. Save confirmed cases as test cases.",
  },
  {
    slug: "prompt-injection",
    term: "Prompt injection",
    definition:
      "Prompt injection is an attack where text in a user message, web page or document tricks a language model into ignoring its instructions or taking an unintended action.",
    expansion:
      "Agents with tools are most at risk, since a successful injection can trigger real actions. Tracing which input led to which tool call helps investigate incidents.",
    related: ["tool-call", "ai-agent-trace"],
    inPractice:
      "Treat all text from users, web pages and documents as data, never as instructions. Limit what tools an agent may call, require approval for risky actions, and log tool arguments so an injected action can be found afterwards.",
  },
  {
    slug: "opentelemetry",
    term: "OpenTelemetry (OTel)",
    definition:
      "OpenTelemetry is an open standard for producing and sending traces, metrics and logs, and it is widely used to send LLM and agent traces to an observability backend over the OTLP protocol.",
    expansion:
      "Using OpenTelemetry means instrumentation is not tied to one vendor, so a team can change backends without rewriting its code.",
    related: ["span", "llm-tracing"],
    example:
      "A team already uses OpenTelemetry for its web service. It adds LLM instrumentation, sets the OTLP endpoint to its observability backend and gets model and tool spans in the same trace as the HTTP request, with no vendor-specific code.",
    inPractice:
      "Start with the standard attributes and add your own only where you need them, such as release, customer tier or prompt version. Send spans over OTLP to any backend. If you later change tools, the instrumentation stays the same.",
  },
  {
    slug: "agent-run",
    term: "Agent run",
    definition:
      "An agent run is one complete execution of an AI agent from a single trigger, such as a user request, to its final result, made up of all the spans recorded along the way.",
    expansion:
      "Runs are the rows of a tracing table: each has a status, duration, token count and cost that roll up from its spans.",
    related: ["ai-agent-trace", "span"],
    inPractice:
      "Give every run a clear start, a terminal status and a trace ID. A run that simply stops is a finding in itself. Segment outcomes by release and workflow, so you see which change made runs fail more often.",
  },
  {
    slug: "multi-agent-system",
    term: "Multi-agent system",
    definition:
      "A multi-agent system is an application where several AI agents, each with its own role and tools, cooperate by passing tasks and results to each other.",
    expansion:
      "Failures can hide in the handoffs between agents, so observability needs to follow work across agents inside one trace.",
    related: ["ai-agent-trace", "tool-call"],
    example:
      "A planner agent hands a research task to a search agent, and the search agent hands results to a writer agent. The final answer is wrong. The trace shows the search agent returned the right sources, but the planner dropped half of them in the handoff.",
    inPractice:
      "Give each agent its own span under one parent trace, and record what is handed over at each step. Most multi-agent bugs are lost or changed information at a handoff, so compare what one agent sent with what the next one received.",
  },
  {
    slug: "model-context-protocol",
    term: "Model Context Protocol (MCP)",
    definition:
      "The Model Context Protocol is an open standard that lets AI applications connect to external tools and data sources through a common interface of servers and clients.",
    expansion:
      "Each MCP tool invocation is a tool call, so tracing MCP servers shows which tools an agent used and how they behaved.",
    related: ["tool-call", "ai-agent-trace"],
    inPractice:
      "Record each MCP tool call as a span with its arguments and result, just like any other tool. Servers can be slow or return surprising data, so watch their latency and error rate separately from the model's.",
  },
  {
    slug: "agent-drift",
    term: "Agent drift",
    definition:
      "Agent drift is a gradual change in an AI agent's behavior or quality over time, caused by model updates, prompt edits, changing data or shifting user inputs.",
    expansion:
      "Drift is caught by tracking scores, cost and failure rates over time and alerting when they move away from a baseline.",
    related: ["agent-evaluation", "llm-observability"],
    inPractice:
      "Compare scores on a frozen set of cases every week, and tag traces with the model version and release. When scores slip without a code change, the cause is often a provider model update or a change in your data.",
  },
];

export const glossaryTerms: readonly Term[] = [...coreTerms, ...tracingTerms, ...modelTerms, ...agentTerms, ...opsTerms];
