import Link from "next/link";
import { integrationPages } from "@/lib/seo-pages";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/landing/reveal";
import { ClosingBand, DarkBand, CreamBand, Eyebrow, HeaderAction, SectionTitle , StatStrip } from "@/components/marketing/company/blocks";
import { IntegrationGrid, type Integration } from "@/components/marketing/company/integration-grid";

import { faqJsonLd, jsonLdString } from "@/lib/seo";
import { CodeTabs } from "@/components/marketing/company/code-tabs";
export const metadata = pageMetadata({ title: "AI agent integrations: trace OpenAI, LangChain, OTel", description: "Trace OpenAI, Anthropic, LangChain, LangGraph, CrewAI, LlamaIndex, AutoGen, Vercel AI SDK and OpenTelemetry agents in Uncoil, plus Slack alerts.", path: "/integrations" });

const faqs = [
  { q: "Which AI agent frameworks does Uncoil work with?", a: "Anything that speaks OpenTelemetry works through the OTLP endpoint. LangChain, CrewAI, LlamaIndex, AutoGen, Mastra, Pydantic AI and the OpenAI Agents SDK are covered through the Python and TypeScript SDKs or OTel instrumentation." },
  { q: "Do I need to change my agent code to trace it?", a: "Usually a few lines: install the SDK, set a project key and wrap the client or add the OTel exporter. Provider calls such as OpenAI and Anthropic record model, latency, tokens and cost automatically." },
  { q: "Can I send traces from an OpenTelemetry setup I already have?", a: "Yes. Point an OTLP HTTP JSON exporter at Uncoil with your project key. See the ingest reference in the docs for the endpoint and headers." },
  { q: "Does Uncoil send alerts to Slack?", a: "Yes. Project alerts can post failures and threshold breaches to a validated Slack webhook." },
  { q: "What if my tool is not listed?", a: "If it can export OpenTelemetry spans it already works. Otherwise use the contact page to request an adapter." },
] as const;

const integrations: Integration[] = [
  { name: "OpenTelemetry (OTLP)", description: "Ingest spans through the standard OTLP HTTP JSON protocol. Any OTel-instrumented library or exporter works out of the box.", badge: "Native", category: "Tracing" },
  { name: "OpenLLMetry", description: "Drop-in LLM observability instrumentation for OpenAI, Anthropic, Cohere, and more.", badge: "Compatible", category: "Tracing" },
  { name: "LangChain", description: "Trace LangChain agents, chains, and tool calls through the built-in OTel callback handler.", category: "Frameworks" },
  { name: "CrewAI", description: "Monitor CrewAI multi-agent workflows through Python SDK instrumentation.", category: "Frameworks" },
  { name: "LlamaIndex", description: "Trace LlamaIndex queries, retrieval and agent steps through Python SDK instrumentation.", category: "Frameworks" },
  { name: "Mastra", description: "Trace Mastra agents and workflows through the TypeScript SDK or OpenTelemetry.", category: "Frameworks" },
  { name: "Pydantic AI", description: "Trace Pydantic AI agent runs and tool calls through the Python SDK or OpenTelemetry.", category: "Frameworks" },
  { name: "OpenAI Agents SDK", description: "Trace agent runs, handoffs and tool calls from the OpenAI Agents SDK.", category: "Frameworks" },
  { name: "AutoGen", description: "Trace AutoGen conversations and tool execution through OTel instrumentation or the Python decorator.", category: "Frameworks" },
  { name: "OpenAI SDK", description: "Capture model, latency, tokens, and cost for every OpenAI API call automatically.", category: "Providers" },
  { name: "Anthropic SDK", description: "Trace Claude model calls, tool use, streaming, and extended-thinking spans.", category: "Providers" },
  { name: "Vercel AI SDK", description: "Trace streaming calls, tool use, and multi-step generations from the Vercel AI SDK.", category: "Providers" },
  { name: "Next.js", description: "Server-side tracing for route handlers, Server Actions, and middleware through the TypeScript SDK.", category: "Runtimes" },
  { name: "Python", description: "Wrap FastAPI, Flask, or ordinary Python functions for automatic span collection.", category: "Runtimes" },
  { name: "Redis", description: "Track cache hits, misses, and rate-limiter state as spans in the agent pipeline.", category: "Infrastructure" },
  { name: "Slack", description: "Route alerts and failed-trace notifications into Slack channels through webhooks.", category: "Alerts" },
  { name: "Microsoft Teams", description: "Route alerts and failed-trace notifications into a Teams channel through an incoming webhook or Power Automate flow.", category: "Alerts" },
  { name: "PagerDuty", description: "Escalate high-severity agent failures into the on-call workflow.", category: "Alerts" },
  { name: "Webhooks", description: "Send spans, alerts, cost thresholds, and orchestration events to any HTTP endpoint.", category: "Alerts" },
  { name: "Docs MCP Server", description: "Give AI agents and MCP-compatible clients read access to Uncoil's documentation as structured resources.", badge: "Native", category: "Agent tooling" },
];

const steps = [
  ["Point", "Set the OTLP endpoint and your project key. Nothing else is required."],
  ["Run", "Use any OTel-instrumented library, wrap your agent with the TypeScript or Python SDK, or post spans over plain HTTP."],
  ["Read", "Spans arrive as one trace per run, with cost, tokens and failures attached."],
] as const;

export default function IntegrationsPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader
        eyebrow={`Connection map / ${integrations.length} adapters`}
        title="Bring your stack. Keep the standard."
        lede="Providers, frameworks, runtimes and alert channels all converge on one OpenTelemetry ingest surface."
        image="/images/company/integrations-hub.png"
      >
        <HeaderAction href="/docs/api">Open the ingest reference</HeaderAction>
        <HeaderAction href="/docs" kind="secondary">Read the docs</HeaderAction>
      </PageHeader>
      <StatStrip stats={[[String(integrations.length),"Adapters"],["OTLP","HTTP JSON ingest"],["2","SDKs: TypeScript, Python"],["~10","Lines to wrap an agent"]]} />

      <DarkBand>
        <Eyebrow>Adapters</Eyebrow>
        <SectionTitle>Filter by what you run.</SectionTitle>
        <div className="mt-12"><IntegrationGrid integrations={integrations} /></div>
        <div className="mt-16"><Eyebrow>Setup guides</Eyebrow></div>
        <ul className="mt-6 flex flex-wrap gap-3">
          {integrationPages.map((o) => (
            <li key={o.slug}><Link href={`/integrations/${o.slug}`} className="inline-block border border-white/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black">{o.name}</Link></li>
          ))}
        </ul>
      </DarkBand>

      <CreamBand>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow dark={false}>Three steps</Eyebrow>
            <SectionTitle>No proprietary agent.</SectionTitle>
            <ol className="mt-10 border-t border-black">
              {steps.map(([title, body], i) => (
                <Reveal key={title} delay={i * 0.07}>
                  <li className="grid grid-cols-[64px_1fr] gap-4 border-b border-black py-6">
                    <span className="font-pixel text-4xl leading-none text-black/25">0{i + 1}</span>
                    <div>
                      <h3 className="font-pixel text-2xl leading-none tracking-[-0.05em]">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-black/65">{body}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal><CodeTabs /></Reveal>
        </div>
      </CreamBand>

      <CreamBand>
        <Eyebrow dark={false}>Questions</Eyebrow>
        <SectionTitle>Integration questions, answered.</SectionTitle>
        <div className="mt-10 max-w-3xl border-t border-black/25">
          {faqs.map(({ q, a }) => (
            <details key={q} className="border-b border-black/25 py-4">
              <summary className="cursor-pointer font-pixel text-2xl tracking-[-0.05em]">{q}</summary>
              <p className="mt-3 text-sm leading-6 text-black/70">{a}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd(faqs.map(({ q, a }) => ({ q, a })))) }} />
      </CreamBand>

      <ClosingBand
        title="Missing your stack?"
        body="If it speaks OpenTelemetry it already works. If it does not, tell us and we will look."
        actions={[{ href: "/contact", label: "Request an adapter", primary: true }, { href: "/docs/api", label: "Ingest reference" }]}
      />
    </div>
  );
}
