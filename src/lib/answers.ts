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
      "Tracify records every prompt, model call, tool call, retry and error in an AI workflow as one trace, so you can open a bad answer and see which step caused it. Add the TypeScript or Python SDK, or send OpenTelemetry spans, and runs show up in the trace viewer.",
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
      "To trace a whole agent request you need one trace that holds the root request and every child step: model calls, tool calls, database or API calls, retries and the final output. Tracify builds that nested timeline for each run and lets you read it as a timeline or a graph.",
    points: [
      { heading: "One root, many steps", body: "The run is the root span. Model calls, tool calls and handoffs sit under it, so parallel work and repeated steps stay visible." },
      { heading: "Across services", body: "If your stack already exports OpenTelemetry, send those spans to Tracify so agent steps and the services they call land in one trace." },
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
      "Record every production run, set alerts on errors, cost spikes and slow runs, and route them to the place your team already watches. Tracify can send project alerts to a Slack webhook, with a link to the trace that triggered them.",
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
  {
    slug: "arize-alternative-for-agents",
    question: "What are good alternatives to Arize for monitoring AI agents with light infrastructure?",
    title: "An Arize alternative for monitoring AI agents",
    answer:
      "If you want tracing, cost and quality checks for agents without running heavy infrastructure, look for a hosted tool with an SDK and OpenTelemetry ingestion. Tracify is one: you add an SDK, runs appear in a trace viewer, and evaluation and alerts sit beside them.",
    points: [
      { heading: "What to compare", body: "Setup time, how agent runs and tool calls are shown, cost tracking, evaluation, alerting, data region and price." },
      { heading: "Where Tracify fits", body: "Tracify focuses on agent runs: traces, tool calls, cost and release checks in one place, with EU hosting available." },
      { heading: "Be fair to both", body: "Arize and Phoenix are strong for model monitoring and ML evaluation. Our comparison page lists where each tool fits." },
    ],
    link: { href: "/compare/arize-phoenix", label: "Compare Tracify and Arize Phoenix" },
    related: [{ href: "/best-llm-observability-tools", label: "Best LLM observability tools" }, { href: "/blog/arize-vs-tracify", label: "Arize vs Tracify" }, { href: "/compare", label: "All comparisons" }],
  },
  {
    slug: "ai-agent-observability-best-practices",
    question: "What are the best practices for AI agent observability?",
    title: "Best practices for AI agent observability",
    answer:
      "Trace every run end to end, record tool calls and cost on each step, review failures by segment instead of averages, add evaluations for quality, and alert on changes. Start with traces and add the rest as you need it.",
    points: [
      { heading: "1. Trace first", body: "A trace per run, with a span for each model call and tool call, answers most debugging questions." },
      { heading: "2. Track cost and latency", body: "Record tokens, cost and time on every step so a slow or expensive run is easy to spot." },
      { heading: "3. Add evaluations", body: "Score outputs on a sample of production runs and on a fixed dataset before each release." },
      { heading: "4. Alert and gate", body: "Alert on errors and cost spikes, and block a release that scores worse than the last one." },
    ],
    link: { href: "/blog/ai-agent-observability-complete-guide", label: "Read the complete guide" },
    related: [{ href: "/glossary/ai-agent-observability", label: "What is AI agent observability?" }, { href: "/docs/observability", label: "Observability docs" }, { href: "/blog/ai-agent-monitoring", label: "AI agent monitoring" }],
  },
  {
    slug: "what-is-a-trace-viewer",
    question: "What is a trace viewer for AI agents, and how do I view a trace?",
    title: "What a trace viewer is and how to view a trace",
    answer:
      "A trace viewer shows one run as a timeline of steps so you can open each model call, tool call and error in order. To view a trace in Tracify, open your project, pick a run from the run list, and read its spans from first to last.",
    points: [
      { heading: "What you see", body: "Every span with its input, output, duration, tokens and cost, plus the status of each step." },
      { heading: "How to open one", body: "Send a run with the SDK, open the project, choose the run in the list and click through its spans." },
      { heading: "Looking for a Playwright trace?", body: "Tracify is for AI agent runs, not a viewer for Playwright trace.zip files. If a browser agent runs through Playwright, the Playwright guide shows how to send those test runs next to the agent's own steps." },
    ],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
    related: [{ href: "/docs/playwright", label: "Playwright guide" }, { href: "/glossary/trace-viewer", label: "Trace viewer definition" }, { href: "/demo", label: "Open the demo" }],
  },
  {
    slug: "opentelemetry-ingestion-for-ai-agents",
    question: "How do I send OpenTelemetry data from an AI agent to an observability platform?",
    title: "OpenTelemetry ingestion for AI agents",
    answer:
      "Point your OpenTelemetry exporter at Tracify's OTLP HTTP endpoint with a project API key, and your spans appear as agent runs. If you do not use OpenTelemetry yet, the SDKs and the ingestion API are the other two paths.",
    points: [
      { heading: "Pick a path", body: "Use the SDK for the quickest start, OTLP when a framework already exports spans, or the ingestion API for custom setups." },
      { heading: "Keep the key on the server", body: "API keys belong in server-side configuration and can be rotated from the project settings." },
      { heading: "Check the result", body: "Run the agent once and confirm the run, its spans and cost show up in the project." },
    ],
    link: { href: "/docs/integrations", label: "Read the OpenTelemetry docs" },
    related: [{ href: "/integrations/opentelemetry", label: "OpenTelemetry integration" }, { href: "/docs/api-platform", label: "Choose an ingestion path" }, { href: "/glossary/opentelemetry", label: "What is OpenTelemetry?" }],
  },
];
