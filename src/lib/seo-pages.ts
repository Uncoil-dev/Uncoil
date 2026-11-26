import { integrationGuides, KEY_STEP, verify } from "./integration-guides";
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
  /** ISO date (YYYY-MM-DD) the facts on this page were last verified. Single source for the page. */
  lastChecked: string;
  sources?: readonly { label: string; href: string }[];
};

export const uncoilPlans = [
  { name: "Free", price: "$0", includes: "10k spans a month, 7 days of history, 1 member, 2 projects" },
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
    lastChecked: "2026-11-07",
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
    lastChecked: "2026-11-07",
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
    lastChecked: "2026-11-07",
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
    lastChecked: "2026-11-19",
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
    lastChecked: "2026-11-19",
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
    slug: "opik",
    lastChecked: "2026-11-19",
    name: "Opik",
    oneLine: "Opik is Comet's Apache-2.0 open-source platform for LLM tracing, evaluation and prompt management, free to self-host. Uncoil is a managed platform built around agent runs, with alerts and an EU region.",
    theirs: "Opik is built by Comet. Its README describes it as open-source LLM observability and evaluation for agent tracing, LLM evaluation, prompt management and production monitoring, Apache-2.0 licensed and free to self-host.",
    pickThem: ["You want an open-source tool you can read, change and run yourself", "Prompt management and LLM-as-a-judge metrics are central to your workflow", "You already use Comet for experiment tracking"],
    pickUncoil: ["You want a managed product with no servers to run", "You want to follow one agent run end to end, with model and tool calls in order", "You want cost alerts, saved views and an EU region ready on day one"],
    rows: [
      ["Focus", "LLM observability, evaluation and prompt management", "AI agent observability and evaluation"],
      ["Open source", "Yes (Apache-2.0)", "No; SDKs and docs are public"],
      ["Hosting", "Self-host the full platform, or use Comet's hosted version", "Managed cloud; EU region available"],
      ["Tracing", "Traces and spans for LLM apps and agents through an SDK and integrations", uncoilRows.tracing],
      ["Cost tracking", "Token and cost tracking", uncoilRows.cost],
      ["Evaluation", "Datasets, experiments and LLM-as-a-judge metrics", uncoilRows.eval],
    ],
    faq: [
      { q: "Is Uncoil an alternative to Opik?", a: "Yes. Both trace LLM apps and agents and help you evaluate quality. Opik is open source and self-hostable. Uncoil is managed, with alerts and an EU region built in." },
      { q: "Can I send OpenTelemetry traces to Uncoil?", a: "Yes. Uncoil accepts spans over OTLP HTTP, so OpenTelemetry-instrumented code can send traces without a proprietary SDK." },
      { q: "Can I move from Opik to Uncoil?", a: "Yes. Create a project, add the Uncoil SDK or OTLP exporter, and run both on the same traffic for a week. History does not move across, so export what you need first." },
    ],
    asOf: "19 November 2026",
    sources: [{ label: "Opik on GitHub", href: "https://github.com/comet-ml/opik" }],
  },
  {
    slug: "agentops",
    lastChecked: "2026-11-19",
    name: "AgentOps",
    oneLine: "AgentOps is an MIT-licensed observability and developer tool platform for AI agents, with session replays and cost tracking. Uncoil is a managed platform for agent runs with alerts, evaluation and an EU region.",
    theirs: "AgentOps describes itself as an observability and DevTool platform for AI agents. Its README lists replay analytics, step-by-step execution graphs, LLM cost management and self-hosting. The app is open source under the MIT license.",
    pickThem: ["You want session replays of agent runs", "You want an open-source app you can run on your own cloud", "You use one of the agent frameworks it lists on its integrations page"],
    pickUncoil: ["You want alerts on cost and failures, not only replays", "You want evaluation datasets and release gates in the same product", "You want standard OpenTelemetry ingestion and an EU region"],
    rows: [
      ["Focus", "Observability and developer tooling for AI agents", "AI agent observability and evaluation"],
      ["Open source", "App is open source (MIT)", "No; SDKs and docs are public"],
      ["Hosting", "Hosted dashboard, or self-host on your own cloud", "Managed cloud; EU region available"],
      ["Debugging", "Session replays and step-by-step execution graphs", "Run view with model calls and tool calls nested in order"],
      ["Cost tracking", "Spend with LLM providers", uncoilRows.cost],
      ["Evaluation", "Check their docs for current evaluation features", uncoilRows.eval],
    ],
    faq: [
      { q: "Is Uncoil an alternative to AgentOps?", a: "Yes. Both trace agent runs and track cost. AgentOps puts replays first and is open source. Uncoil adds alerts, evaluation and release gates in a managed product." },
      { q: "Does Uncoil work with the same agent frameworks?", a: "Uncoil has setup guides for LangChain, LangGraph, CrewAI, AutoGen, the OpenAI Agents SDK, Pydantic AI and more. It also takes OpenTelemetry spans from any other framework." },
      { q: "Can I try Uncoil for free?", a: "Yes. The Free plan needs no card. See the pricing page for the current limits." },
    ],
    asOf: "19 November 2026",
    sources: [{ label: "AgentOps on GitHub", href: "https://github.com/AgentOps-AI/agentops" }],
  },
  {
    slug: "logfire",
    lastChecked: "2026-11-19",
    name: "Pydantic Logfire",
    oneLine: "Logfire is Pydantic's general observability platform built on OpenTelemetry, with a Python-first SDK and SQL queries. Uncoil is purpose-built for AI agent runs, cost and evaluation.",
    theirs: "Pydantic Logfire is an observability platform from the team behind Pydantic. Its README says it is an opinionated wrapper around OpenTelemetry, lets you query data with standard SQL, and gives Python-centric insights. The SDK is MIT licensed; the server application is closed source.",
    pickThem: ["You want one tool for your whole Python app, not only the AI parts", "You like querying your telemetry with SQL", "You already use Pydantic and want validation analytics"],
    pickUncoil: ["Agents are your main workload and you want runs, tool calls and cost front and center", "You want alerts and evaluation datasets built for agents", "You use TypeScript as well as Python"],
    rows: [
      ["Scope", "General application observability, with LLM and agent support", "Focused on AI agents"],
      ["Built on", "OpenTelemetry (traces, metrics and logs)", "Ingests OpenTelemetry (OTLP) spans"],
      ["Querying", "Standard SQL over your data", "Run, cost and failure views with filters and saved views"],
      ["Cost tracking", "Check their docs for current LLM cost features", uncoilRows.cost],
      ["Evaluation", "Evals in production are listed on their site", uncoilRows.eval],
      ["Source", "SDK open source (MIT), server closed", "No; SDKs and docs are public"],
    ],
    faq: [
      { q: "Is Uncoil an alternative to Logfire?", a: "For AI agents, yes. Logfire watches a whole application. Uncoil focuses on agent runs, model and tool calls, cost and evaluation." },
      { q: "Can I use Uncoil and Logfire together?", a: "Yes. Both speak OpenTelemetry, so many teams keep a general tool for the app and use Uncoil for agent behavior and cost." },
    ],
    asOf: "19 November 2026",
    sources: [{ label: "Logfire on GitHub", href: "https://github.com/pydantic/logfire" }],
  },
  {
    slug: "datadog",
    lastChecked: "2026-11-19",
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
  /** Rough time this step takes, shown on the framework setup pages. */
  time?: string;
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
    code: `# Standard OpenTelemetry exporter settings: OTLP over HTTP with JSON, authenticated with a project API key.
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://eu.cloud.uncoil.dev/api/otel
export OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer%20uncoil_sk_live_...
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json`,
    doc: "api",
    faq: [{ q: "Which OpenTelemetry protocol does Uncoil support?", a: "OTLP over HTTP with JSON." }],
  },
  {
    slug: "crewai",
    name: "CrewAI",
    title: "Monitor CrewAI agents",
    description: "Trace CrewAI crews in Uncoil: every agent model call, tool call, token and failure in one run. Five-minute Python setup with copy-paste code.",
    answer: "To monitor CrewAI with Uncoil, call uncoil.init() once at startup and wrap crew.kickoff() in trace_agent. Every model call your agents make joins one run for the crew, and you can add tool calls with one more line.",
    captures: ["One run per crew kickoff", "Each agent's model calls with tokens and time", "Tool calls with input and output", "Failures and retries in order"],
    language: "python",
    code: `import uncoil

uncoil.init()  # once, at startup

@uncoil.trace_agent(name="research-crew")
def run_crew(topic: str):
    return crew.kickoff(inputs={"topic": topic})`,
    steps: [
      { title: "Install", body: "The Uncoil SDK sits next to CrewAI. It needs no other package.", language: "bash", code: `pip install uncoil-sdk crewai`, time: "1 min" },
      KEY_STEP,
      { title: "Switch tracing on", body: "Call init() once, before you build your crew. CrewAI talks to its models through the OpenAI and Anthropic libraries, and init() records those calls with tokens, time and errors.", language: "python", code: `import uncoil

uncoil.init()`, time: "1 min" },
      { title: "Wrap the crew run", body: "trace_agent turns one kickoff into one run. The model calls of every agent in the crew appear inside it, in order.", language: "python", code: `import uncoil
from crewai import Agent, Task, Crew

uncoil.init()

researcher = Agent(
    role="Researcher",
    goal="Find facts about {topic}",
    backstory="You check sources before you answer.",
    llm="gpt-4o-mini",
)
task = Task(description="Research {topic}", expected_output="One short paragraph", agent=researcher)
crew = Crew(agents=[researcher], tasks=[task])

@uncoil.trace_agent(name="research-crew")
def run_crew(topic: str):
    return crew.kickoff(inputs={"topic": topic})

print(run_crew("agent observability"))`, time: "1 min" },
      { title: "Trace your tools", body: "Wrap the plain function with trace_tools, then hand the result to CrewAI. Each call becomes its own step with its input, output and time. Keep the docstring: CrewAI needs it.", language: "python", code: `import uncoil
from crewai.tools import tool

def search(query: str) -> str:
    """Search the web."""
    return run_search(query)

traced = uncoil.trace_tools({"web_search": search})
web_search = tool("web_search")(traced["web_search"])

researcher = Agent(role="Researcher", goal="Find facts", backstory="...", tools=[web_search])`, time: "1 min" },
      verify("Your crew"),
    ],
    notes: [
      { title: "Which model calls are recorded", body: "Calls that CrewAI sends through the OpenAI or Anthropic libraries are recorded. A model that CrewAI reaches another way, for example through LiteLLM, is not recorded by init(). The crew run and your tools still are." },
      { title: "Keep the docstring on tools", body: "CrewAI builds the tool description from the function's docstring and fails without one. trace_tools keeps the docstring, so wrapped tools work as before." },
    ],
    doc: "python",
    faq: [
      { q: "Can I see which agent in a crew caused a failure?", a: "Yes. Each model call and tool call is its own step in the run, so you open the failing one and see its input, error and time." },
      { q: "Does tracing change what my crew does?", a: "No. The SDK records a copy of each call and passes your request and the answer through unchanged. If the SDK cannot reach Uncoil, your crew keeps running." },
      { q: "Do I need to change my agents or tasks?", a: "No. init() and one decorator are enough. Your agents, tasks and prompts stay as they are." },
      { q: "Is personal data in prompts sent to Uncoil?", a: "The SDK masks emails, phone numbers and card numbers in prompts and answers before it sends anything, unless you switch that off." },
      { q: "Can I use it with the Uncoil cost view?", a: "Yes. Tokens are recorded for every traced call. Add your own prices with calculate_cost to see dollars per crew run." },
    ],
  },
  {
    slug: "vercel-ai-sdk",
    name: "Vercel AI SDK",
    title: "Trace the Vercel AI SDK",
    description: "Trace Vercel AI SDK generateText and streamText calls in Uncoil: model calls, tools, tokens and failures in one run. Five-minute TypeScript setup with copy-paste code.",
    answer: "To trace the Vercel AI SDK with Uncoil, wrap your model with uncoilMiddleware and your handler with traceAgent. Every generateText and streamText call becomes a step in one run, and traceTools adds your tools.",
    captures: ["One run per request or agent call", "generateText and streamText calls with tokens and time to first token", "Tool calls per step with input and output", "Errors thrown inside a step"],
    language: "typescript",
    code: `import { wrapLanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { traceAgent, uncoilMiddleware } from "@uncoil.dev/sdk";

const model = wrapLanguageModel({
  model: openai("gpt-4o-mini"),
  middleware: uncoilMiddleware(),
});`,
    steps: [
      { title: "Install", body: "The Uncoil SDK sits next to the AI SDK and the provider you already use.", language: "bash", code: `npm install @uncoil.dev/sdk ai @ai-sdk/openai zod`, time: "1 min" },
      KEY_STEP,
      { title: "Wrap the model", body: "wrapLanguageModel is part of the AI SDK. uncoilMiddleware records every generateText, streamText and generateObject call made with the wrapped model: input, output, tokens and errors.", language: "typescript", code: `import { openai } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";
import { uncoilMiddleware } from "@uncoil.dev/sdk";

export const model = wrapLanguageModel({
  model: openai("gpt-4o-mini"),
  middleware: uncoilMiddleware(),
});`, time: "1 min" },
      { title: "Wrap the call in a run", body: "traceAgent turns one call into one run, so the model calls of a multi-step generation sit together in the trace.", language: "typescript", code: `import { generateText } from "ai";
import { traceAgent } from "@uncoil.dev/sdk";
import { model } from "./model";

export const answer = traceAgent(async (question: string) => {
  const { text } = await generateText({ model, prompt: question });
  return text;
}, { name: "answer" });

console.log(await answer("Where is order A1?"));`, time: "1 min" },
      { title: "Trace your tools", body: "traceTools wraps each tool's execute function, so every tool call is its own step with input, output and time.", language: "typescript", code: `import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { traceAgent, traceTools } from "@uncoil.dev/sdk";

const tools = traceTools({
  getOrder: tool({
    description: "Look up an order",
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => fetchOrder(id),
  }),
});

export const answer = traceAgent(async (question: string) => {
  const { text } = await generateText({ model, tools, stopWhen: stepCountIs(5), prompt: question });
  return text;
}, { name: "order-bot" });`, time: "1 min" },
      verify("Your call"),
    ],
    notes: [
      { title: "Next.js route handlers", body: "The same three pieces work inside a route handler or Server Action. Set the route to the Node.js runtime. The full route example is on the Next.js page." },
      { title: "Needs Node.js", body: "The SDK keeps concurrent requests in separate runs with Node.js features, so it does not run on the edge runtime." },
    ],
    doc: "typescript",
    faq: [
      { q: "Does it work with Next.js route handlers?", a: "Yes. The TypeScript SDK traces server-side code including route handlers and Server Actions. Use the Node.js runtime." },
      { q: "Are streamed answers traced?", a: "Yes. streamText calls are recorded as the stream finishes, with the time to first token and the tokens the provider reports." },
      { q: "Does the middleware change my output?", a: "No. It watches the stream and passes every part through unchanged. If Uncoil is unreachable, your call still works." },
      { q: "Which provider packages work?", a: "Any provider that works with wrapLanguageModel, such as OpenAI, Anthropic and Google. The provider and model name are read from the model you wrap." },
      { q: "Can I use OpenTelemetry instead?", a: "Yes. Uncoil accepts OTLP over HTTP, so you can send the AI SDK's telemetry there. The middleware is the shorter route and records tokens and tool inputs without extra setup." },
    ],
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
    description: "Trace Mastra agent runs and tool calls in Uncoil with the TypeScript SDK. Short setup with copy-paste code.",
    answer: "To trace Mastra with Uncoil, wrap an agent call with traceAgent in the TypeScript SDK and wrap your tools with traceTools. The agent run and each tool call are recorded; model calls made inside Mastra are not.",
    captures: ["One trace per agent run", "Tool calls wrapped with traceTools, with input and output", "Errors thrown inside the run"],
    language: "typescript",
    code: `import { traceAgent } from "@uncoil.dev/sdk";

const run = traceAgent(async (input: string) => {
  const result = await mastraAgent.generate(input);
  return result.text;
}, { name: "mastra-agent" });`,
    steps: [
      { title: "Install", body: "The Uncoil SDK sits next to Mastra.", language: "bash", code: `npm install @uncoil.dev/sdk @mastra/core`, time: "1 min" },
      KEY_STEP,
      { title: "Wrap the agent call", body: "traceAgent turns one call into one run in Uncoil, with the run's timing, input, output and any error.", language: "typescript", code: `import { traceAgent } from "@uncoil.dev/sdk";

export const ask = traceAgent(async (input: string) => {
  const result = await mastraAgent.generate(input);
  return result.text;
}, { name: "mastra-agent" });`, time: "1 min" },
      { title: "Trace your tools", body: "traceTools wraps the execute function of each tool, so every call is its own step with input, output and time.", language: "typescript", code: `import { createTool } from "@mastra/core/tools";
import { traceTools } from "@uncoil.dev/sdk";

const tools = traceTools({
  getOrder: createTool({ id: "getOrder", description: "Look up an order", execute: async (args) => fetchOrder(args) }),
});

// Pass the traced tools to your agent, for example new Agent({ ..., tools })`, time: "1 min" },
      verify("Your agent"),
    ],
    notes: [
      { title: "What is recorded", body: "The agent run and each tool you wrap with traceTools are recorded. Model calls made inside Mastra are not recorded by these steps." },
      { title: "OpenTelemetry is not covered here", body: "This page covers the TypeScript SDK only. Sending Mastra's own OpenTelemetry spans to Uncoil is not part of these steps." },
    ],
    doc: "typescript",
    faq: [{ q: "Does Mastra work with the Uncoil TypeScript SDK?", a: "Yes. Mastra runs as ordinary server-side TypeScript, so traceAgent can wrap its calls and traceTools can wrap its tools. Model calls made inside Mastra are not recorded by these steps." }],
  },
  {
    slug: "pydantic-ai",
    name: "Pydantic AI",
    title: "Trace Pydantic AI agents",
    description: "Trace Pydantic AI agent runs, tool calls and model usage in Uncoil with the Python SDK. Short setup with copy-paste code.",
    answer: "To trace Pydantic AI with Uncoil, call uncoil.init() once at startup and wrap your agent run in trace_agent. Model calls made through the OpenAI or Anthropic libraries join one run, and trace_tools adds your tools as steps.",
    captures: ["One trace per agent run", "Tool calls and validation failures", "Model usage and cost", "Retries in order"],
    language: "python",
    code: `import uncoil

@uncoil.trace_agent(name="pydantic-agent")
async def ask(question: str):
    with uncoil.span("agent-run", type="agent", input=question):
        result = await agent.run(question)
        return result.output`,
    steps: [
      { title: "Install", body: "The Uncoil SDK sits next to Pydantic AI.", language: "bash", code: `pip install uncoil-sdk pydantic-ai`, time: "1 min" },
      KEY_STEP,
      { title: "Switch tracing on", body: "Call init() once at startup, before you build your agent. Pydantic AI reaches OpenAI and Anthropic models through their official libraries, and init() records those calls with tokens, time and errors.", language: "python", code: `import uncoil

uncoil.init()`, time: "1 min" },
      { title: "Wrap the agent run", body: "trace_agent turns one agent run into one run in Uncoil. The model calls inside it appear as steps, in order.", language: "python", code: `import uncoil
from pydantic_ai import Agent

uncoil.init()

agent = Agent("openai:gpt-4o-mini", instructions="Answer in one sentence.")

@uncoil.trace_agent(name="pydantic-agent")
async def ask(question: str):
    result = await agent.run(question)
    return result.output`, time: "1 min" },
      { title: "Trace your tools", body: "Wrap the plain function with trace_tools, then pass it to the agent. Each call becomes its own step with its input, output and time. The signature and docstring are kept, so Pydantic AI builds the same tool schema.", language: "python", code: `import uncoil

def get_order(order_id: str) -> str:
    """Look up an order by id."""
    return lookup(order_id)

traced = uncoil.trace_tools({"get_order": get_order})
agent = Agent("openai:gpt-4o-mini", tools=[traced["get_order"]])`, time: "1 min" },
      verify("Your agent"),
    ],
    notes: [
      { title: "Which model calls are recorded", body: "Calls that Pydantic AI sends through the OpenAI or Anthropic libraries are recorded. Other providers, such as Gemini or Groq, are not recorded by init(). The agent run and your tools still are." },
      { title: "OpenTelemetry is not covered here", body: "This page covers the Python SDK only. Sending Pydantic AI's own OpenTelemetry spans to Uncoil is not part of these steps." },
    ],
    doc: "python",
    faq: [{ q: "Will I see structured-output retries?", a: "Yes. Each retry is a separate step inside the run, so you can see why validation failed." }],
  },
  {
    slug: "openai-agents-sdk",
    name: "OpenAI Agents SDK",
    title: "Trace the OpenAI Agents SDK",
    description: "Trace OpenAI Agents SDK runs in Uncoil: every model call, tool call, token and failure in one run. Five-minute Python setup with copy-paste code.",
    answer: "To trace the OpenAI Agents SDK with Uncoil, call uncoil.init() once at startup and wrap your Runner call in trace_agent. Every model call the agent makes joins one run, and one more line adds your function tools.",
    captures: ["One run per Runner call", "Model calls from every agent, handoffs included", "Function tool calls with input and output", "Tokens, time and errors per call"],
    language: "python",
    code: `import uncoil
from agents import Runner

uncoil.init()  # once, at startup

@uncoil.trace_agent(name="support-triage")
async def triage(message: str):
    result = await Runner.run(agent, message)
    return result.final_output`,
    steps: [
      { title: "Install", body: "The Uncoil SDK sits next to the Agents SDK and the OpenAI library.", language: "bash", code: `pip install uncoil-sdk openai-agents`, time: "1 min" },
      KEY_STEP,
      { title: "Switch tracing on", body: "Call init() once at startup. The Agents SDK calls OpenAI through the official library, so every model call it makes is recorded with tokens, time and errors.", language: "python", code: `import uncoil

uncoil.init()`, time: "1 min" },
      { title: "Wrap the run", body: "trace_agent turns one Runner call into one run. Every model call the agent makes is a step inside it.", language: "python", code: `import uncoil
from agents import Agent, Runner

uncoil.init()

agent = Agent(name="Support", instructions="Answer in one sentence.", model="gpt-4o-mini")

@uncoil.trace_agent(name="support-triage")
async def triage(message: str):
    result = await Runner.run(agent, message)
    return result.final_output

# asyncio.run(triage("Can I get a refund?"))`, time: "1 min" },
      { title: "Trace your function tools", body: "Wrap the plain function with trace_tools, then pass it to function_tool. Each call becomes its own step between the two model calls.", language: "python", code: `import uncoil
from agents import Agent, function_tool

def lookup_order(order_id: str) -> str:
    """Look up an order by id."""
    return fetch_order(order_id)

lookup_order = function_tool(
    uncoil.trace_tools({"lookup_order": lookup_order})["lookup_order"]
)

agent = Agent(name="Support", instructions="Use tools.", model="gpt-4o-mini", tools=[lookup_order])`, time: "1 min" },
      verify("Your agent run"),
    ],
    notes: [
      { title: "Runs next to OpenAI's own traces", body: "The Agents SDK keeps its own tracing. Uncoil records alongside it, so you keep both and do not have to switch anything off." },
      { title: "Other model providers", body: "If you point the Agents SDK at another provider through an OpenAI-style client, calls go through the OpenAI library and are recorded under the model name you send." },
    ],
    doc: "python",
    faq: [
      { q: "Do I lose OpenAI's own trace viewer?", a: "No. Uncoil records alongside it, so you keep both." },
      { q: "Will I see handoffs between agents?", a: "Yes. Each agent's model calls are steps in the same run, in the order they happened, so you can follow the handoff from one agent to the next." },
      { q: "Does tracing change my agent's answers?", a: "No. The SDK records a copy of each call. Your request and the answer pass through unchanged, and if Uncoil is unreachable your agent keeps running." },
      { q: "Do I need to rewrite my agents?", a: "No. init() and one decorator are enough. Agents, instructions and tools stay as they are." },
      { q: "Is personal data in prompts sent to Uncoil?", a: "The SDK masks emails, phone numbers and card numbers in prompts and answers before it sends anything, unless you switch that off." },
    ],
  },
] as const;

export const integrationPages: readonly IntegrationPage[] = [...coreIntegrationPages, ...integrationGuides];

/** Formats an ISO `YYYY-MM-DD` date as "November 2026". */
export function formatLastChecked(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[m - 1]} ${y}`;
}
