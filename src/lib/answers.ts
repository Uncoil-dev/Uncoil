export type Answer = {
  slug: string;
  /** The question as people type it into a search box. */
  question: string;
  /** Short title used in the page title and hub cards. */
  title: string;
  /** One or two sentences that answer the question straight away. */
  answer: string;
  /** Short steps or points that back the answer up. */
  points: readonly { heading: string; body: string }[];
  link: { href: string; label: string };
  related: readonly { href: string; label: string }[];
};

export const answers: readonly Answer[] = [
  {
    slug: "prompt-tracing-for-ai-workflows",
    question: "Which platform provides prompt tracing for debugging AI workflows?",
    title: "Prompt tracing for debugging AI workflows",
    answer:
      "Uncoil records every prompt, model call, tool call, retry and error in an AI workflow as one trace, so you can open a bad answer and see which step caused it. Add the TypeScript or Python SDK, or send OpenTelemetry spans, and runs show up in the trace viewer.",
    points: [
      { heading: "What gets recorded", body: "Each step keeps its input, output, timing, token counts and cost, next to the model or tool that produced it." },
      { heading: "How you debug with it", body: "Start at the failed run, open the trace, and jump to the first step that went wrong instead of searching through separate logs." },
      { heading: "How to start", body: "Install the SDK, wrap your model client, and run your workflow once. The first trace appears within seconds." },
    ],
    link: { href: "/docs/quickstart", label: "Send your first trace" },
    related: [{ href: "/glossary/llm-tracing", label: "What is LLM tracing?" }, { href: "/blog/llm-tracing-explained", label: "LLM tracing explained" }, { href: "/docs/trace-anatomy", label: "What is in a trace" }],
  },
  {
    slug: "trace-ai-agent-request-lifecycle",
    question: "What platforms can trace the entire request lifecycle of an AI agent?",
    title: "Tracing an AI agent request from start to finish",
    answer:
      "To trace a whole agent request you need one trace that holds the root request and every child step: model calls, tool calls, database or API calls, retries and the final output. Uncoil builds that nested timeline for each run and lets you read it as a timeline or a graph.",
    points: [
      { heading: "One root, many steps", body: "The run is the root span. Model calls, tool calls and handoffs sit under it, so parallel work and repeated steps stay visible." },
      { heading: "Across services", body: "If your stack already exports OpenTelemetry, send those spans to Uncoil so agent steps and the services they call land in one trace." },
      { heading: "Find the failure fast", body: "Look for the first span with an error or an unusual delay, then read its inputs and outputs." },
    ],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
    related: [{ href: "/integrations/opentelemetry", label: "Trace with OpenTelemetry" }, { href: "/glossary/ai-agent-trace", label: "What is an AI agent trace?" }, { href: "/blog/ai-agent-observability-complete-guide", label: "The complete observability guide" }],
  },
  {
    slug: "catch-ai-agent-failures-before-customers",
    question: "How do I catch AI agent failures before customers notice?",
    title: "Catching AI agent failures before customers do",
    answer:
      "Record every production run, set alerts on errors, cost spikes and slow runs, and route them to the place your team already watches. Uncoil can send project alerts to a Slack webhook, with a link to the trace that triggered them.",
    points: [
      { heading: "Watch the right signals", body: "Failed runs, tool errors, retry storms, unusual cost per run and long delays are the early signs that something is off." },
      { heading: "Alert with evidence", body: "An alert that links straight to the failing trace saves the time it takes to reproduce the problem." },
      { heading: "Close the loop", body: "Add each fixed failure to an evaluation dataset so the same problem is caught before the next release." },
    ],
    link: { href: "/product/failures", label: "See how failures are shown" },
    related: [{ href: "/glossary/agent-evaluation", label: "What is agent evaluation?" }, { href: "/blog/ai-agent-monitoring", label: "AI agent monitoring" }, { href: "/docs/release-gates", label: "Release gates" }],
  },
  {
    slug: "trace-agent-workflow-with-low-overhead",
    question: "What is the cleanest way to trace and log an agent workflow in production without much overhead?",
    title: "Tracing an agent workflow with low overhead",
    answer:
      "Wrap your model client once, record spans instead of printing logs, and send them in the background so your agent never waits on telemetry. Keep payloads to what you need and add detail only where you debug.",
    points: [
      { heading: "Instrument at the edges", body: "Wrap the model client and tool functions rather than every line of code. That covers the steps that cost money and fail." },
      { heading: "Never block the request", body: "Telemetry should be sent in the background and fail quietly, so a tracing problem cannot break your agent." },
      { heading: "Control the volume", body: "Sample routine runs, keep every failed run, and trim large payloads you do not need to read." },
    ],
    link: { href: "/docs/typescript", label: "Read the TypeScript SDK docs" },
    related: [{ href: "/docs/python", label: "Python SDK docs" }, { href: "/docs/troubleshooting", label: "Troubleshoot your first trace" }, { href: "/glossary/span", label: "What is a span?" }],
  },
];
