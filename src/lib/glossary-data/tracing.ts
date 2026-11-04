import type { Term } from "../glossary";

const group = "Tracing basics";

export const tracingTerms: readonly Term[] = [
  {
    slug: "trace-id",
    term: "Trace ID",
    group,
    definition:
      "A trace ID is the unique identifier shared by every span in one trace, so a backend can gather all the steps of a single run back together. It is usually a random 128-bit value written as 32 hexadecimal characters.",
    expansion:
      "Each span carries the trace ID of the run it belongs to, plus its own span ID. When spans arrive out of order, or from different services, the trace ID is what lets them be grouped into one timeline. Putting the trace ID in your application logs and error reports is the quickest way to jump from a user complaint to the exact run.",
    example:
      "A support agent replies with a wrong refund amount. The reply handler logs trace ID 4bf92f3577b34da6a3ce929d0e0e4736. Searching that ID in the trace viewer opens the whole run, including the tool call that returned the wrong order total.",
    related: ["span", "agent-run", "trace-context-propagation", "ai-agent-trace"],
    link: { href: "/docs/trace-anatomy", label: "Read about trace anatomy" },
  },
  {
    slug: "parent-span",
    term: "Parent span",
    group,
    definition:
      "A parent span is a span that contains other spans, called its children, because the work it measures started them. The parent-child links are what turn a flat list of spans into a tree you can read from top to bottom.",
    expansion:
      "In an agent run the root span usually covers the whole request. Its children are model calls and tool calls, and a tool call can have its own children, such as a database query. A parent's duration covers its children, so a slow parent with fast children points to time spent in the parent's own code.",
    example:
      "The root span \"answer-question\" has children \"retrieve-documents\" and \"call-model\". The retrieval span has a child \"vector-search\". If vector-search takes 900 ms of a 1 s retrieval, you know where to look.",
    related: ["span", "trace-waterfall", "ai-agent-trace", "trace-id"],
    link: { href: "/docs/trace-anatomy", label: "Read about trace anatomy" },
  },
  {
    slug: "span-attributes",
    term: "Span attributes",
    group,
    definition:
      "Span attributes are key-value pairs attached to a span that describe what happened, such as the model name, token counts, tool name or user plan. They are what you filter, group and chart by once traces are stored.",
    expansion:
      "Good attributes are specific and low in variety, like model, environment and release. Avoid putting whole prompts or personal data in attributes that are used for filtering; keep large payloads as span input and output instead. OpenTelemetry defines standard attribute names for generative AI so different tools agree on what they mean.",
    example:
      "A model-call span carries model=\"gpt-5\", inputTokens=1840, outputTokens=212 and environment=\"production\". Filtering on environment and grouping by model shows which model drives your cost.",
    related: ["span", "opentelemetry", "token-usage", "llm-cost-tracking"],
    link: { href: "/docs/typescript", label: "See how to set attributes in the SDK" },
  },
  {
    slug: "span-event",
    term: "Span event",
    group,
    definition:
      "A span event is a timestamped note recorded inside a span, marking something that happened at a moment in time rather than over a duration. Typical examples are an exception, a retry, or the arrival of the first streamed token.",
    expansion:
      "Events keep a span readable. Instead of creating a tiny span for every small moment, you add an event to the span that was running. Exceptions are the most useful case, since the error message and stack trace stay attached to the exact step that failed.",
    example:
      "A tool-call span for a payments API records an event \"retry\" at 2.1 s and a second event \"retry\" at 4.3 s, then ends with status error. You can see the agent tried three times before giving up.",
    related: ["span", "retry-with-backoff", "ai-agent-trace", "error-rate"],
    link: { href: "/docs/trace-anatomy", label: "Read about trace anatomy" },
  },
  {
    slug: "trace-sampling",
    term: "Trace sampling",
    group,
    definition:
      "Trace sampling is recording only a share of all traces, chosen by a rule, to keep storage and cost down. Head sampling decides when a trace starts; tail sampling decides after it finishes, so it can keep every failure.",
    expansion:
      "Sampling is a trade-off between cost and visibility. A fixed percentage is simple but can drop the one run that failed. Teams often keep all errors and all slow runs and sample the healthy rest. Whatever you choose, record the sampling rate so counts and totals can be scaled back up honestly.",
    example:
      "An agent handles 2 million requests a month. You keep 100% of runs with errors, 100% of runs slower than 20 seconds, and 5% of everything else.",
    related: ["distributed-tracing", "data-retention", "error-rate", "opentelemetry"],
    link: { href: "/pricing", label: "See plans and span limits" },
  },
  {
    slug: "distributed-tracing",
    term: "Distributed tracing",
    group,
    definition:
      "Distributed tracing follows one request across several services, processes or machines and joins the steps into a single trace. It works by passing a trace ID and parent span ID along with each call.",
    expansion:
      "AI systems are distributed more often than they look: a web app calls an agent service, which calls a vector database, a model provider and several tools. Without distributed tracing you get a separate fragment from each service. With it, one timeline shows the full path and where the delay or failure began.",
    example:
      "A Next.js route starts a trace, calls a Python agent over HTTP, and the agent calls a search API. All three services report spans with the same trace ID, so the viewer shows one tree.",
    related: ["trace-context-propagation", "opentelemetry", "trace-id", "ai-pipeline-tracing"],
    link: { href: "/docs/observability", label: "Read the observability guide" },
  },
  {
    slug: "trace-context-propagation",
    term: "Trace context propagation",
    group,
    definition:
      "Trace context propagation is passing the trace ID and current span ID from one service to the next, usually in an HTTP header, so the next service can continue the same trace instead of starting a new one.",
    expansion:
      "The common standard is the W3C traceparent header. The caller writes it on the outgoing request and the receiver reads it before starting its first span. If a hop drops the header, the trace splits in two, which is the most frequent reason a distributed trace looks incomplete. Queues and background jobs need the context stored in the message.",
    example:
      "A web server sends traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01 to the agent service. The agent's first span uses that trace ID and names the web span as its parent.",
    related: ["distributed-tracing", "trace-id", "parent-span", "opentelemetry"],
    link: { href: "/docs/observability", label: "Read the observability guide" },
  },
  {
    slug: "session-tracing",
    term: "Session tracing",
    group,
    definition:
      "Session tracing groups the traces of one conversation or user session together, so you can follow a multi-turn exchange instead of looking at each message in isolation.",
    expansion:
      "A chat agent often fails because of something said three turns earlier. Tagging every run with a session ID lets you open the whole conversation in order, see how context grew, and find the turn where the agent went wrong. It also lets you measure things per conversation, such as total cost or number of turns to resolve.",
    example:
      "A user asks four questions in one chat. Four runs share session ID s_8841. The third answer is wrong because the second turn's tool result was truncated, which you only see by reading both runs together.",
    related: ["agent-run", "context-window", "agent-memory", "ai-agent-observability"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
  {
    slug: "instrumentation",
    term: "Instrumentation",
    group,
    definition:
      "Instrumentation is the code that records spans, attributes and errors from your application so they can be sent to an observability tool. Without it, nothing is traced.",
    expansion:
      "You can instrument manually, by wrapping a step in a span, or automatically, by letting a library patch your model and framework clients. Manual spans give you control over names and attributes; automatic ones give wide coverage quickly. Most teams start automatic and add manual spans around their own business logic.",
    example:
      "You wrap your retrieval function in a span called \"retrieve-documents\" and set the number of results as an attribute. Now every run shows how many documents were found.",
    related: ["auto-instrumentation", "span", "opentelemetry", "llm-tracing"],
    link: { href: "/docs/quickstart", label: "Follow the quickstart" },
  },
  {
    slug: "auto-instrumentation",
    term: "Auto-instrumentation",
    group,
    definition:
      "Auto-instrumentation is tracing that is switched on by a library or an import instead of by writing span code yourself. It patches known clients, such as model provider SDKs, and records their calls for you.",
    expansion:
      "It is the fastest way to get a first trace, and it captures details such as model, tokens and latency without extra code. The limit is that it only knows about libraries it supports, so your own functions and custom tools still need manual spans to show up with sensible names.",
    example:
      "You add one setup line at the top of your app. From then on, every call made through your model provider's SDK appears as a span with its model and token counts.",
    related: ["instrumentation", "llm-tracing", "opentelemetry", "span"],
    link: { href: "/docs/provider-integrations", label: "See supported providers" },
  },
  {
    slug: "trace-waterfall",
    term: "Trace waterfall",
    group,
    definition:
      "A trace waterfall is a chart that lays out the spans of one trace as horizontal bars on a shared time axis, indented by parent and child. It shows at a glance what ran in sequence, what ran in parallel and where the time went.",
    expansion:
      "Long bars are slow steps, gaps between bars are waiting or untraced work, and stacked bars that start together ran in parallel. Reading a waterfall is usually the first step when a run is slow, because it separates a slow model call from a slow tool, or from a chain of sequential calls that could run at the same time.",
    example:
      "Three tool calls run one after another, each taking 1.2 s. The waterfall shows them as a staircase. Running them in parallel would cut about 2.4 s from the run.",
    related: ["span", "parent-span", "latency", "trace-viewer"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
];
