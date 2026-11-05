"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";
import { UncoilMark } from "@/components/brand/uncoil-mark";
import { appHref } from "@/lib/app-links";

const groups = [
  ["Product", [["Trace viewer", "/product/trace-viewer"], ["Cost dashboard", "/product/cost-dashboard"], ["Tool calls", "/product/tool-calls"], ["LLM calls", "/product/llm-calls"], ["Failures", "/product/failures"], ["Reports", "/product/reports"], ["Runtime control", "/product/runtime-control"], ["Evaluation engine", "/product/evaluation-engine"], ["Lifecycle", "/product/lifecycle"], ["Pricing", "/pricing"]]],
  ["Integrations", [["All integrations", "/integrations"], ["OpenAI", "/integrations/openai"], ["Anthropic", "/integrations/anthropic"], ["LangGraph", "/integrations/langgraph"], ["OpenTelemetry", "/integrations/opentelemetry"], ["CrewAI", "/integrations/crewai"], ["Vercel AI SDK", "/integrations/vercel-ai-sdk"], ["LlamaIndex", "/integrations/llamaindex"], ["Mastra", "/integrations/mastra"], ["OpenAI Agents SDK", "/integrations/openai-agents-sdk"]]],
  ["Developers", [["Docs", "/docs"], ["Quickstart", "/docs/quickstart"], ["TypeScript SDK", "/docs/typescript"], ["Python SDK", "/docs/python"], ["API reference", "/docs/api"], ["MCP server", "/docs/mcp-server"], ["Self-hosting", "/docs/self-hosting"], ["Glossary", "/glossary"], ["Answers", "/answers"], ["Tracing explained", "/blog/llm-tracing-explained"]]],
  ["Free tools", [["All free tools", "/tools"], ["Token counter", "/tools/token-counter"], ["Log checker", "/tools/agent-log-checker"], ["AI API status", "/tools/ai-api-status"], ["Cost estimator", "/tools/ai-cost-estimator"], ["LLM prices", "/tools/llm-price-comparison"], ["Prompt cost", "/tools/prompt-cost-checker"], ["Context window", "/tools/context-window-checker"], ["Rate limits", "/tools/rate-limit-calculator"], ["JSON fixer", "/tools/json-fixer"]]],
  ["Compare", [["All comparisons", "/compare"], ["vs Langfuse", "/compare/langfuse"], ["vs LangSmith", "/compare/langsmith"], ["vs Helicone", "/compare/helicone"], ["vs Arize Phoenix", "/compare/arize-phoenix"], ["vs Braintrust", "/compare/braintrust"], ["vs Datadog", "/compare/datadog"], ["Alternatives", "/alternative"], ["Best tools list", "/best-llm-observability-tools"], ["Observability guide", "/blog/ai-agent-observability-complete-guide"]]],
  ["Company", [["About", "/about"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Roadmap", "/roadmap"], ["Security", "/security"], ["Status", "/status"], ["Contact", "/contact"], ["Live demo", appHref("/demo/project")], ["Share Uncoil", "/refer"], ["Start free", appHref("/sign-up")]]],
] as const;

const useCases = [["Support", "/use-cases/support"], ["Research", "/use-cases/research"], ["Automation", "/use-cases/automation"], ["Tool calling", "/use-cases/tool-calling"], ["Coding agents", "/use-cases/coding"], ["RAG apps", "/use-cases/rag"], ["Voice agents", "/use-cases/voice"], ["Browser agents", "/use-cases/browser"], ["Multi-agent", "/use-cases/multi-agent"], ["MCP servers", "/use-cases/mcp"], ["Chatbots", "/use-cases/chatbot"], ["Data and SQL agents", "/use-cases/sql"], ["Cost control", "/use-cases/cost-control"], ["Sales agents", "/use-cases/sales"], ["Document agents", "/use-cases/documents"], ["Release checks", "/use-cases/release"], ["Copilots", "/use-cases/copilot"]] as const;

const word = "uncoil".split("");

export function LandingFooter() {
  const reduce = useReducedMotion();
  return (
    <footer className="relative isolate overflow-hidden bg-[#090909] text-[#eceae3]">
      <div className="relative h-[14vw] max-h-[220px] min-h-[90px]">
        <Image src="/images/landing/footer-ridges.png" alt="" fill unoptimized sizes="100vw" className="object-cover object-bottom [image-rendering:pixelated]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#090909_0%,rgba(9,9,9,0)_35%,rgba(9,9,9,0)_70%,#090909_100%)]" />
      </div>

      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid border border-white/15 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col justify-between gap-8 p-7 md:p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">First trace in five minutes</p>
            <p className="font-pixel text-[clamp(2.75rem,5.5vw,5rem)] leading-[0.88] tracking-[-0.06em]">One map<br />per run.</p>
            <div className="flex flex-wrap gap-3">
              <Link href={appHref("/sign-up")} className="group inline-flex h-12 items-center gap-3 bg-[#f4d44d] px-6 font-mono text-[10px] uppercase tracking-[0.14em] text-black hover:bg-[#fff4b5]">
                Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/docs" className="inline-flex h-12 items-center gap-3 border border-white/25 px-6 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-white hover:text-black">
                Read the docs
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 bg-[#eceae3] p-7 text-[#090909] md:p-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">The dispatch · monthly</p>
              <p className="mt-4 max-w-sm text-xl leading-7">Notes on debugging agents, plus what shipped. One email a month.</p>
            </div>
            <div>
              <NewsletterCapture inverse />
              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-black/50">No spam. Unsubscribe anytime.</p>
            </div>
          </div>
        </div>

        <nav aria-label="Footer" className="border-x border-b border-white/15">
          <div className="grid grid-cols-2 gap-px bg-white/15 md:grid-cols-3 xl:grid-cols-6">
            {groups.map(([title, links], i) => (
              <div key={title} className="bg-[#090909] px-4 py-6 sm:p-6">
                <p className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-white/45 sm:tracking-[0.16em]">
                  <span><span className="text-[#f4d44d]">0{i + 1}</span> / {title}</span>
                  <span className="hidden text-white/25 sm:inline">{links.length}</span>
                </p>
                <ul className="mt-5 grid gap-1">
                  {links.map(([label, href], j) => (
                    <li key={href}>
                      <Link href={href} className="group -mx-2 flex items-baseline gap-3 px-2 py-1 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white">
                        <span className="hidden w-4 shrink-0 font-mono text-[9px] sm:inline text-white/25 transition-colors group-hover:text-[#f4d44d]">{String(j + 1).padStart(2, "0")}</span>
                        <span className="min-w-0 flex-1">{label}</span>
                        <ArrowUpRight className="size-3 shrink-0 self-center text-[#f4d44d] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-5 border-t border-white/15 bg-[#eceae3] p-5 text-[#090909] sm:p-6 lg:flex-row lg:items-start lg:gap-10">
            <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-black/55 lg:w-44 lg:pt-2.5">
              <span className="text-black">07</span> / Built for
            </p>
            <ul className="flex flex-wrap gap-2">
              {useCases.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex items-center border border-black/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:border-black hover:bg-black hover:text-[#f4d44d]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="mt-12 flex select-none items-baseline justify-between pb-[0.2em] font-pixel text-[16vw] leading-[0.78] tracking-[-0.08em] lg:text-[18vw]" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { x: "-30%", opacity: 0 }}
            whileInView={{ x: "0%", opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <UncoilMark solid className="block h-[0.65em]" />
          </motion.span>
          {word.map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block cursor-default hover:text-[#f4d44d]"
              initial={reduce ? false : { y: "60%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              whileHover={reduce ? undefined : { y: "-12%" }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        <div className="relative z-10 flex flex-col gap-4 border-t border-white/15 py-6 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-1.5">
            <span>© {new Date().getFullYear()} Uncoil</span>
            <span className="normal-case tracking-normal">
              formerly Tracify – not affiliated with Tracify GmbH (
              <a href="https://tracify.ai/" target="_blank" rel="noopener noreferrer" className="underline decoration-[#f4d44d]/60 underline-offset-2 hover:text-white">tracify.ai</a>)
            </span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/cookie-policy" className="hover:text-white">Cookies</Link>
            <Link href="/status" className="inline-flex items-center gap-1 hover:text-white">
              Status <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })} className="inline-flex w-fit items-center gap-2 border border-white/25 px-3 py-2 hover:bg-[#f4d44d] hover:text-black">
            Back to top <ArrowUp className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
