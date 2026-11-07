import { integrationGuides } from "./integration-guides";
/**
 * Content for the /compare and /integrations/[slug] landing pages.
 * Competitor statements are deliberately high level and conservative; each page tells readers to check the other
 * product's own site for current details. Uncoil statements must match the docs and pricing pages.
 */

export type Faq = { q: string; a: string };

export type Comparison = {
  slug: string;
  name: string;
  /** Blog post with the long-form comparison, if one exists. */
  post?: string;
  oneLine: string;
  theirs: string;
  pickThem: readonly string[];
  pickUncoil: readonly string[];
  rows: readonly (readonly [string, string, string])[];
  faq: readonly Faq[];
  /** Verified plan facts, read from the vendor's public pages on `asOf`. */
  plans?: readonly { name: string; price: string; includes: string }[];
  /** Where the other product wins on the numbers, stated plainly. */
  theirEdge?: readonly string[];
  /** Differences in what a "unit" means, so prices are not compared blindly. */
  unitNote?: string;
  /** Short recent news about the vendor, only if read on an official page. */
  news?: string;
  /** Steps to move from this tool to Uncoil. */
  switching?: readonly string[];
  asOf?: string;
  sources?: readonly { label: string; href: string }[];
};

export const uncoilPlans = [
  { name: "Free", price: "$0", includes: "25k spans a month, 7 days of history, 1 member, 3 projects" },
  { name: "Pro", price: "$19 a month", includes: "500k spans a month, 30 days of history, 5 members, evaluations, Slack alerts" },
  { name: "Team", price: "$39 a month", includes: "2m spans a month, 90 days of history, 20 members, unlimited projects, release gates" },
] as const;

const uncoilRows = {
  tracing: "Traces for agent runs, model calls and tool calls, ingested over OpenTelemetry (OTLP) or the TypeScript and Python SDKs",
  cost: "Cost, tokens and latency per run, with alerts",
  eval: "Evaluation datasets, scores and release gates in the same product",
  region: "EU region available",
} as const;

export const comparisons: readonly Comparison[] = [
  {
    slug: "langfuse",
    name: "Langfuse",
    post: "langfuse-vs-uncoil",
    oneLine: "Langfuse is an MIT-licensed LLM engineering platform with a hosted cloud (US, EU, Japan and HIPAA regions) and a self-hosted edition. Uncoil is a managed agent observability platform with alerts and evaluation built in.",
    theirs: "Open-source tracing, prompt management, datasets and evaluation. You can use their hosted cloud, which has US, EU, Japan and HIPAA regions, or self-host it.",
    pickThem: ["You want to read, modify or self-host the source", "You want the large open-source community and ecosystem around it", "Prompt management is central to how your team works"],
    pickUncoil: ["You want runs, tool calls, cost and alerts managed for you, with no servers to operate", "You want to follow one agent run end to end, with its model and tool calls nested in order", "You want failures to turn into evaluation cases in the same product"],
    rows: [
      ["Tracing", "Traces, observations and sessions for LLM apps and agents", uncoilRows.tracing],
      ["Hosting", "Hosted cloud (US, EU, Japan, HIPAA regions) or self-hosting", "Managed cloud; EU region available"],
      ["Open source", "Yes (MIT)", "No; SDKs and docs are public"],
      ["Cost tracking", "Token and cost tracking per generation", uncoilRows.cost],
      ["Evaluation", "Datasets, scores and evaluators", uncoilRows.eval],
    ],
    faq: [
      { q: "Is Langfuse only for self-hosting?", a: "No. Langfuse also runs a hosted cloud with separate US, EU, Japan and HIPAA regions, and the open-source edition can be self-hosted. The two are the same product, so the choice is about who operates it." },
      { q: "Is Uncoil an alternative to Langfuse?", a: "Yes. Both trace LLM applications and agents and track cost and quality. Langfuse is open source; Uncoil is a managed platform with an EU region, alerts and evaluation built in." },
      { q: "Can I use OpenTelemetry with Uncoil instead of a proprietary SDK?", a: "Yes. Uncoil accepts spans over OTLP HTTP, so any OpenTelemetry-instrumented library can send traces. The TypeScript and Python SDKs are optional." },
      { q: "Who owns Langfuse now?", a: "Langfuse's site says it has joined ClickHouse, and its footer is marked ClickHouse, Inc. The product and the self-hosted edition are still published. We have not read the announcement, so check Langfuse's own blog for what it means for roadmap and pricing." },
      { q: "Which is cheaper, Langfuse or Uncoil?", a: "It depends on your volume and what you count. Langfuse bills in units from $29 a month (Core, 100k units, then $8 per extra 100k). Uncoil bills flat from $19 a month for 500k spans. A unit and a span are not the same thing, so run your real traffic through both before you decide." },
    ],
    plans: [
      { name: "Hobby", price: "Free", includes: "50k units a month, 30 days of data, 2 users, 2 alerts" },
      { name: "Core", price: "$29 a month", includes: "100k units a month, then $8 per 100k, 90 days of data, unlimited users" },
      { name: "Pro", price: "$199 a month", includes: "3 years of data, retention controls, SOC 2 and ISO 27001 reports, HIPAA-ready region" },
      { name: "Enterprise", price: "$2,499 a month", includes: "Audit logs, SCIM, custom rate limits, uptime SLA" },
    ],
    theirEdge: [
      "Longer history. Langfuse keeps 90 days on Core and 3 years on Pro. Uncoil keeps 7, 30 or 90 days.",
      "Open source and self-hostable (Docker Compose, Kubernetes, Terraform). Uncoil is managed only.",
      "Prompt management, human annotation queues, a larger set of regions (US, EU, Japan, HIPAA) and a bigger community.",
      "A new AI Gateway in public beta, announced on its changelog on 4 November 2026.",
    ],
    unitNote: "Langfuse bills in units. Uncoil bills in spans. They count different things, so a price per unit is not a price per span.",
    news: "Langfuse's site says it has joined ClickHouse. We have not read the announcement, so we make no claim about what changes.",
    switching: [
      "Create an Uncoil project and copy its API key.",
      "Point your OpenTelemetry exporter at Uncoil's OTLP endpoint. Langfuse also takes OTLP over HTTP, so most setups only change the URL and the key.",
      "Run both for a week on the same traffic and compare cost and latency numbers.",
      "Export what you need from Langfuse before you turn it off, since history does not move across.",
    ],
    asOf: "7 November 2026",
    sources: [
      { label: "Langfuse pricing", href: "https://langfuse.com/pricing" },
      { label: "Langfuse OpenTelemetry docs", href: "https://langfuse.com/integrations/native/opentelemetry" },
      { label: "Langfuse on GitHub", href: "https://github.com/langfuse/langfuse" },
    ],
  },
  {
    slug: "langsmith",
    name: "LangSmith",
    post: "langsmith-vs-uncoil",
    oneLine: "LangSmith is the observability and evaluation product from the LangChain team, hosted in the US, EU or APAC. Uncoil is framework-neutral and built around OpenTelemetry.",
    theirs: "Tracing, evaluation and prompt tooling from the LangChain team, with the tightest fit for LangChain and LangGraph. Self-hosting is an add-on to their Enterprise plan.",
    pickThem: ["Your stack is mostly LangChain or LangGraph", "You want tooling from the framework's own maintainers", "You need an enterprise self-hosted deployment from the LangChain team"],
    pickUncoil: ["You use several frameworks or call model providers directly", "You want one standard (OpenTelemetry) rather than a framework-specific integration", "You want alerts and evaluation in the same product, with an EU region"],
    rows: [
      ["Tracing", "Traces for LLM apps, strongest for LangChain and LangGraph", uncoilRows.tracing],
      ["Framework fit", "Built by the LangChain team", "Framework-neutral; works with LangGraph, CrewAI, OpenAI, Anthropic and more"],
      ["Hosting", "Hosted in the US, EU or APAC; self-hosted as an Enterprise add-on", "Managed cloud; EU region available"],
      ["Cost tracking", "Token and cost tracking", uncoilRows.cost],
      ["Evaluation", "Datasets and evaluators", uncoilRows.eval],
    ],
    faq: [
      { q: "Do I need LangChain to use Uncoil?", a: "No. Uncoil works with any code that emits OpenTelemetry spans, and wraps for OpenAI, Anthropic and LangGraph are in the docs." },
      { q: "Is Uncoil a LangSmith alternative?", a: "Yes, for teams who want framework-neutral tracing, cost tracking and evaluation in one managed product." },
      { q: "How long does LangSmith keep traces?", a: "LangSmith's pricing FAQ says base traces are kept for 14 days and extended traces for 180 days. Upgrading a trace to extended costs extra. Uncoil keeps 7 days on Free, 30 on Pro and 90 on Team." },
      { q: "Does LangSmith charge per seat?", a: "Yes. Plus is $39 per seat per month. Uncoil Pro is a flat $19 a month for up to 5 members, and Team is a flat $39 a month for up to 20." },
    ],
    plans: [
      { name: "Developer", price: "$0 per seat", includes: "1 seat, up to 5k base traces a month, then pay as you go" },
      { name: "Plus", price: "$39 per seat a month", includes: "Unlimited seats, up to 10k base traces a month, Deployment and Engine access" },
      { name: "Enterprise", price: "Custom", includes: "Self-hosted or hybrid, custom SSO, RBAC and ABAC, support SLA" },
    ],
    theirEdge: [
      "The tightest fit for LangChain and LangGraph, from the team that builds them.",
      "A wider product: deployment, an LLM gateway with fallbacks and cost controls, and a prompt hub.",
      "Self-hosted and hybrid options on Enterprise. Uncoil is managed only.",
      "SOC 2 Type 2 and HIPAA statements on its regions page.",
    ],
    unitNote: "LangSmith counts traces and sells extra products in LangChain Standard Units ($1.00 per LSU). Uncoil counts spans. Compare using your own traffic.",
    switching: [
      "Create an Uncoil project and copy its API key.",
      "Replace the LangSmith tracing variables with an OpenTelemetry exporter that points at Uncoil's OTLP endpoint.",
      "Keep LangGraph and LangChain as they are. Only the destination of the traces changes.",
      "Run both side by side for a week, then turn LangSmith off.",
    ],
    asOf: "7 November 2026",
    sources: [
      { label: "LangSmith pricing", href: "https://www.langchain.com/pricing" },
      { label: "LangSmith regions FAQ", href: "https://docs.langchain.com/langsmith/regions-faq" },
    ],
  },
  {
    slug: "helicone",
    name: "Helicone",
    oneLine: "Helicone is an open-source LLM observability platform and AI gateway, often set up by routing traffic through its proxy. Uncoil watches whole agent runs from instrumentation, with no proxy in your request path.",
    theirs: "Apache-2.0 licensed, self-hostable LLM observability with request logging and analytics, plus AI gateway routing and fallbacks.",
    pickThem: ["You want a gateway in front of providers for routing and fallbacks", "You want the simplest drop-in request logging", "You want an open-source tool you can self-host"],
    pickUncoil: ["Your product is an agent, so you need the whole run with its tool calls, not only single requests", "You want evaluation and alerts alongside traces", "You prefer SDK or OpenTelemetry instrumentation to a proxy in the request path"],
    rows: [
      ["Setup style", "Proxy or gateway in front of providers, or SDK", "SDK or OpenTelemetry; no proxy in your request path"],
      ["Unit of observation", "LLM requests and sessions", "Whole agent runs with nested model and tool calls"],
      ["Open source", "Yes (Apache 2.0, self-hostable)", "No; SDKs and docs are public"],
      ["Cost tracking", "Per-request cost analytics", uncoilRows.cost],
      ["Evaluation", "Datasets and scoring", uncoilRows.eval],
    ],
    faq: [
      { q: "Does Uncoil sit in the request path?", a: "No. Uncoil receives traces after the work is done, so it cannot add latency or a failure point to your model calls." },
      { q: "Is Helicone still maintained?", a: "Helicone's pricing page shows a banner that says it is no longer part of Mintlify, with details to come. We found no statement about its roadmap, so we make no claim. Check Helicone's own site." },
      { q: "Can I keep a gateway and use Uncoil?", a: "Yes. A gateway handles routing and fallbacks. Uncoil records what the agent did with the results. Many teams use both." },
    ],
    plans: [
      { name: "Hobby", price: "Free", includes: "10,000 requests, 1 seat, 7 days of history, 10 logs a minute" },
      { name: "Pro", price: "$79 a month", includes: "Unlimited seats, alerts and reports, 1 month of history, 1,000 logs a minute" },
      { name: "Team", price: "$799 a month", includes: "5 organisations, SOC 2 and HIPAA, 3 months of history, 15,000 logs a minute" },
      { name: "Enterprise", price: "Contact them", includes: "SAML SSO, on-prem, custom MSA" },
    ],
    theirEdge: [
      "A real AI gateway: 100+ models behind one key, with automatic fallbacks and caching.",
      "Open source (Apache 2.0) and self-hostable with Docker Compose.",
      "Drop-in setup. Changing a base URL is the fastest way to start logging.",
    ],
    unitNote: "Helicone bills per request. Uncoil bills per span, and one agent run holds many spans. Compare using your own traffic.",
    news: "Helicone's pricing page shows a banner: no longer part of Mintlify, details to come. We found no more detail and make no claim about it.",
    switching: [
      "Create an Uncoil project and copy its API key.",
      "Add the Uncoil SDK or an OpenTelemetry exporter to your agent code.",
      "Keep Helicone as your gateway if you use its routing. Remove only the logging you no longer need.",
      "Check that tool calls now show inside each run.",
    ],
    asOf: "7 November 2026",
    sources: [
      { label: "Helicone pricing", href: "https://www.helicone.ai/pricing" },
      { label: "Helicone docs", href: "https://docs.helicone.ai/" },
      { label: "Helicone on GitHub", href: "https://github.com/Helicone/helicone" },
    ],
  },
  {
    slug: "arize-phoenix",
    name: "Arize Phoenix",
    post: "arize-vs-uncoil",
    oneLine: "Phoenix is Arize's free, self-hosted tracing and evaluation tool (Elastic License 2.0); Arize AX is its managed product. Uncoil is a managed product built specifically around agent runs.",
    theirs: "Arize Phoenix is self-hosted and source-available under the Elastic License 2.0, with tracing, evaluations, datasets, experiments and prompt management. Arize AX is Arize's managed platform.",
    pickThem: ["You want a free tool you run yourself, with the source available", "You also monitor classical ML models and want one vendor for both"],
    pickUncoil: ["Agents are your main workload and you want runs, tool calls and cost front and center", "You want a managed product with alerts, saved views and an EU region, without running infrastructure"],
    rows: [
      ["Focus", "ML observability and LLM tracing", "AI agent observability and evaluation"],
      ["Hosting", "Phoenix self-hosted; Arize AX managed", "Managed cloud; EU region available"],
      ["Tracing", "OpenTelemetry-based tracing", uncoilRows.tracing],
      ["Cost tracking", "Token and cost tracking", uncoilRows.cost],
      ["Evaluation", "Evaluators, datasets and experiments", uncoilRows.eval],
    ],
    faq: [{ q: "Is Uncoil built on OpenTelemetry?", a: "Uncoil ingests OpenTelemetry (OTLP) spans, so instrumentation you write for one OpenTelemetry-compatible tool carries over." }],
  },
  {
    slug: "braintrust",
    name: "Braintrust",
    post: "braintrust-vs-uncoil",
    oneLine: "Braintrust is centered on evaluation and experiments, with logging and tracing alongside. Uncoil starts from production traces and adds evaluation on top.",
    theirs: "A platform for evaluating and shipping AI products, with logging, datasets and scoring.",
    pickThem: ["Evaluation and experiment workflows are your top priority", "Your team lives in scoring and side-by-side experiment views"],
    pickUncoil: ["You want to start from what happened in production and turn traces into test cases", "You want cost, alerts and failure debugging in the same place as evals"],
    rows: [
      ["Starting point", "Evaluation and experiments", "Production traces, then evaluation"],
      ["Tracing", "Logging and tracing", uncoilRows.tracing],
      ["Cost tracking", "Cost per log and experiment", uncoilRows.cost],
      ["Alerts", "Monitoring and alerting features", "Rule-based alerts checked every 5 minutes, by email"],
    ],
    faq: [{ q: "Can I build evaluation datasets from production traces in Uncoil?", a: "Yes. Traces can be turned into dataset cases so a real failure becomes a repeatable test. See the evaluation docs." }],
  },
  {
    slug: "datadog",
    name: "Datadog LLM Observability",
    post: "datadog-vs-uncoil",
    oneLine: "Datadog adds LLM monitoring to a general infrastructure platform. Uncoil is purpose-built for agents.",
    theirs: "LLM observability inside Datadog's broader monitoring platform, useful if the rest of your stack already lives there.",
    pickThem: ["Your whole company already runs on Datadog and wants one pane of glass", "You want LLM traces next to infrastructure and APM data"],
    pickUncoil: ["You want agent-specific views (runs, tool calls, retries, cost per task) rather than generic APM views", "You want evaluation and prompt tooling in the same product", "You want a focused tool for the AI team without a platform rollout"],
    rows: [
      ["Scope", "Full-stack monitoring platform with an LLM product", "Focused on AI agents"],
      ["Tracing", "LLM spans inside APM traces", uncoilRows.tracing],
      ["Cost tracking", "Token and cost metrics", uncoilRows.cost],
      ["Evaluation", "Quality evaluations and experiments", uncoilRows.eval],
    ],
    faq: [{ q: "Can I use Uncoil and Datadog together?", a: "Yes. Teams often keep Datadog for infrastructure and use Uncoil for agent behavior, cost and evaluation." }],
  },
] as const;

export type IntegrationPage = {
  slug: string;
  name: string;
  title: string;
  description: string;
  answer: string;
  captures: readonly string[];
  language: "typescript" | "python" | "bash";
  code: string;
  doc: string;
  faq: readonly Faq[];
  /** Optional step-by-step setup. When present it replaces the single code block on the page. */
  steps?: readonly IntegrationStep[];
  /** Optional plain notes on what is and is not traced, shown after the steps. */
  notes?: readonly { title: string; body: string }[];
};

export type IntegrationStep = {
  title: string;
  body: string;
  language?: "typescript" | "python" | "bash";
  code?: string;
};

const coreIntegrationPages: readonly IntegrationPage[] = [
  {
    slug: "openai",
    name: "OpenAI",
    title: "Trace OpenAI calls",
    description: "Trace every OpenAI API call with model, tokens, latency and cost in Uncoil using the TypeScript or Python SDK.",
    answer: "To trace OpenAI calls with Uncoil, wrap your OpenAI client with the Uncoil SDK. Each request is then recorded as a span with the model, token counts, latency, cost and any error.",
    captures: ["Model name and parameters", "Input, cached and output tokens", "Latency and errors", "Cost per call, rolled up to the run"],
    language: "typescript",
    code: `import OpenAI from "openai";
import { wrapOpenAI } from "@uncoil.dev/sdk";

const openai = wrapOpenAI(new OpenAI());

const reply = await openai.responses.create({
  model: process.env.OPENAI_MODEL!,
  input: "Hello",
});`,
    doc: "provider-integrations",
    faq: [{ q: "Does tracing OpenAI calls change my responses?", a: "No. Uncoil records each call and sends it to the backend; your request and response are unchanged." }],
  },
  {
    slug: "anthropic",
    name: "Anthropic Claude",
    title: "Trace Anthropic Claude calls",
    description: "Trace Claude API calls, tool use and streaming in Uncoil with tokens, latency and cost.",
    answer: "To trace Claude calls with Uncoil, wrap the Anthropic client with the Uncoil SDK. Messages, tool use and streamed responses are recorded as spans with tokens, latency and cost.",
    captures: ["Model and parameters", "Tool use blocks and results", "Streaming time to first token", "Token usage and cost"],
    language: "python",
    code: `import uncoil
from anthropic import Anthropic

anthropic = uncoil.wrap_anthropic(Anthropic())

reply = anthropic.messages.create(
    model=MODEL,
    max_tokens=100,
    messages=[{"role": "user", "content": "Hello"}],
)`,
    doc: "provider-integrations",
    faq: [{ q: "Can I trace tool use with Claude?", a: "Yes. Each tool call the model requests is recorded and linked to the run that made it." }],
  },
  {
    slug: "langgraph",
    name: "LangGraph",
    title: "Trace LangGraph agents",
    description: "See every node, model call and tool call of a LangGraph agent as one trace in Uncoil.",
    answer: "To trace a LangGraph agent with Uncoil, add the Uncoil integration to your graph. Each node run, model call and tool call becomes a span inside a single trace for the run.",
    captures: ["One trace per graph run", "Spans for nodes, model calls and tools", "Loops and retries visible in order", "Cost and latency per node"],
    language: "typescript",
    code: `import { UncoilLangGraphHandler } from "@uncoil.dev/sdk";

await graph.invoke(input, { callbacks: [new UncoilLangGraphHandler()] });`,
    doc: "provider-integrations",
    faq: [{ q: "Do I have to use LangChain to trace LangGraph?", a: "Uncoil traces LangGraph through its integration; for other frameworks you can use OpenTelemetry." }],
  },
  {
    slug: "opentelemetry",
    name: "OpenTelemetry",
    title: "Send OpenTelemetry traces to Uncoil",
    description: "Send LLM and agent traces to Uncoil over OTLP HTTP using any OpenTelemetry-instrumented library.",
    answer: "Uncoil accepts traces over the standard OTLP HTTP protocol. Point your OpenTelemetry exporter at the Uncoil endpoint with your project key and spans from any instrumented library appear as traces.",
    captures: ["Any OTLP-compatible span", "LLM semantic attributes such as model and tokens", "Parent and child relationships", "Errors and timing"],
    language: "bash",
    code: `# Send OTLP HTTP JSON to the /api/otel endpoint, authenticated with a project API key.
curl -X POST https://uncoil.dev/api/otel \\
  -H "Authorization: Bearer uncoil_sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d @otlp-traces.json`,
    doc: "api",
    faq: [{ q: "Which OpenTelemetry protocol does Uncoil support?", a: "OTLP over HTTP with JSON." }],
  },
  {
    slug: "crewai",
    name: "CrewAI",
    title: "Monitor CrewAI agents",
    description: "Trace CrewAI multi-agent workflows in Uncoil with the Python SDK.",
    answer: "To monitor CrewAI with Uncoil, instrument your crew with the Python SDK. Each agent step, tool call and model call is recorded in one trace for the crew run.",
    captures: ["Agent and task steps", "Tool calls between agents", "Cost per crew run", "Failures and retries"],
    language: "python",
    code: `import uncoil
from openai import OpenAI

# Wrap the provider client your crew uses; calls join the current run.
openai = uncoil.wrap_openai(OpenAI())`,
    doc: "python",
    faq: [{ q: "Can I see which agent in a crew caused a failure?", a: "Yes, each agent's steps are separate spans, so you can open the failing span directly." }],
  },
  {
    slug: "vercel-ai-sdk",
    name: "Vercel AI SDK",
    title: "Trace the Vercel AI SDK",
    description: "Trace streaming calls, tools and multi-step generations from the Vercel AI SDK in Uncoil.",
    answer: "To trace the Vercel AI SDK with Uncoil, use the TypeScript SDK or OpenTelemetry telemetry. Streaming calls, tool use and each step of a multi-step generation are recorded as spans.",
    captures: ["Streaming generations", "Tool calls per step", "Tokens and cost", "Route handler timing in Next.js"],
    language: "typescript",
    code: `import { traceAgent } from "@uncoil.dev/sdk";

// Wrap your route handler's work in a run; model calls inside it join the trace.
// See the TypeScript docs for the full traceAgent signature.`,
    doc: "typescript",
    faq: [{ q: "Does it work with Next.js route handlers?", a: "Yes. The TypeScript SDK traces server-side code including route handlers and Server Actions." }],
  },
  {
    slug: "llamaindex",
    name: "LlamaIndex",
    title: "Trace LlamaIndex agents and RAG",
    description: "Trace LlamaIndex queries, retrieval and agent steps in Uncoil with the Python SDK, with tokens, latency and cost per run.",
    answer: "To trace LlamaIndex with Uncoil, wrap each query or agent run in the Python SDK's trace_agent decorator and record retrieval as its own step. Model calls made through a wrapped provider client join the same trace.",
    captures: ["One trace per query or agent run", "Retrieval as a separate step", "Model calls with tokens and cost", "Errors and slow steps in order"],
    language: "python",
    code: `import uncoil

@uncoil.trace_agent(name="docs-rag")
def answer(question: str):
    with uncoil.span("retrieve", type="retrieval", input=question):
        nodes = retriever.retrieve(question)
    with uncoil.span("synthesize", type="llm"):
        return query_engine.query(question)`,
    doc: "python",
    faq: [{ q: "Can I see which retrieved chunks led to a bad answer?", a: "Yes. Retrieval is recorded as its own step in the run, so you can open it next to the model call that used it." }],
  },
  {
    slug: "autogen",
    name: "AutoGen",
    title: "Trace AutoGen multi-agent chats",
    description: "Trace AutoGen conversations, tool execution and model calls in Uncoil with the Python SDK or OpenTelemetry.",
    answer: "To trace AutoGen with Uncoil, wrap the conversation in trace_agent and record each tool execution as a step, or send AutoGen's OpenTelemetry spans to Uncoil over OTLP.",
    captures: ["One trace per conversation", "Tool execution per agent turn", "Model calls with tokens and cost", "Loops and failed turns"],
    language: "python",
    code: `import uncoil

@uncoil.trace_agent(name="autogen-team")
async def run_team(task: str):
    with uncoil.span("team-run", type="agent", input=task):
        return await team.run(task=task)`,
    doc: "python",
    faq: [{ q: "Can I use OpenTelemetry instead of the SDK?", a: "Yes. Uncoil accepts OTLP over HTTP, so any OpenTelemetry instrumentation AutoGen emits can be sent to your project." }],
  },
  {
    slug: "mastra",
    name: "Mastra",
    title: "Trace Mastra agents and workflows",
    description: "Trace Mastra agents, tools and workflows in Uncoil with the TypeScript SDK or OpenTelemetry.",
    answer: "To trace Mastra with Uncoil, wrap an agent call with traceAgent in the TypeScript SDK, or export Mastra's OpenTelemetry traces to Uncoil over OTLP.",
    captures: ["One trace per agent or workflow run", "Tool calls and results", "Model calls with tokens and cost", "Errors and retries"],
    language: "typescript",
    code: `import { traceAgent } from "@uncoil.dev/sdk";

const run = traceAgent(async (input: string) => {
  const result = await mastraAgent.generate(input);
  return result.text;
}, { name: "mastra-agent" });`,
    doc: "typescript",
    faq: [{ q: "Does Mastra work with the Uncoil TypeScript SDK?", a: "Yes. Mastra runs as ordinary server-side TypeScript, so traceAgent can wrap its calls, and OTLP export works too." }],
  },
  {
    slug: "pydantic-ai",
    name: "Pydantic AI",
    title: "Trace Pydantic AI agents",
    description: "Trace Pydantic AI agent runs, tool calls and model usage in Uncoil with the Python SDK or OpenTelemetry.",
    answer: "To trace Pydantic AI with Uncoil, wrap the agent run in trace_agent and record tools as steps, or send Pydantic AI's OpenTelemetry spans to Uncoil over OTLP.",
    captures: ["One trace per agent run", "Tool calls and validation failures", "Model usage and cost", "Retries in order"],
    language: "python",
    code: `import uncoil

@uncoil.trace_agent(name="pydantic-agent")
async def ask(question: str):
    with uncoil.span("agent-run", type="agent", input=question):
        result = await agent.run(question)
        return result.output`,
    doc: "python",
    faq: [{ q: "Will I see structured-output retries?", a: "Yes. Each retry is a separate step inside the run, so you can see why validation failed." }],
  },
  {
    slug: "openai-agents-sdk",
    name: "OpenAI Agents SDK",
    title: "Trace the OpenAI Agents SDK",
    description: "Trace OpenAI Agents SDK runs, handoffs and tool calls in Uncoil with tokens, latency and cost.",
    answer: "To trace the OpenAI Agents SDK with Uncoil, wrap the run in trace_agent and wrap the OpenAI client so every model call is recorded with tokens and cost.",
    captures: ["One trace per agent run", "Handoffs between agents", "Tool calls and results", "Tokens and cost per model call"],
    language: "python",
    code: `import uncoil
from agents import Runner

@uncoil.trace_agent(name="support-triage")
async def triage(message: str):
    result = await Runner.run(agent, message)
    return result.final_output`,
    doc: "python",
    faq: [{ q: "Do I lose OpenAI's own trace viewer?", a: "No. Uncoil records alongside it, so you keep both." }],
  },
] as const;

export const integrationPages: readonly IntegrationPage[] = [...coreIntegrationPages, ...integrationGuides];
