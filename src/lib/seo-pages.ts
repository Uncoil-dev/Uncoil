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
};

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
    faq: [{ q: "Does Uncoil sit in the request path?", a: "No. Uncoil receives traces after the work is done, so it cannot add latency or a failure point to your model calls." }],
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
