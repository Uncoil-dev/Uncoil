"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUp, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";
import { PixelWordmark } from "@/components/marketing/landing/pixel-wordmark";
import { appHref } from "@/lib/app-links";
import { traceReachY } from "@/components/marketing/landing/trace-reach";

const groups = [
  ["Product", [["Trace viewer", "/product/trace-viewer"], ["Cost dashboard", "/product/cost-dashboard"], ["Tool calls", "/product/tool-calls"], ["LLM calls", "/product/llm-calls"], ["Failures", "/product/failures"], ["Reports", "/product/reports"], ["Runtime control", "/product/runtime-control"], ["Evaluation engine", "/product/evaluation-engine"], ["Lifecycle", "/product/lifecycle"], ["Pricing", "/pricing"]]],
  ["Integrations", [["All integrations", "/integrations"], ["OpenAI", "/integrations/openai"], ["Anthropic", "/integrations/anthropic"], ["LangGraph", "/integrations/langgraph"], ["OpenTelemetry", "/integrations/opentelemetry"], ["CrewAI", "/integrations/crewai"], ["Vercel AI SDK", "/integrations/vercel-ai-sdk"], ["LlamaIndex", "/integrations/llamaindex"], ["Mastra", "/integrations/mastra"], ["OpenAI Agents SDK", "/integrations/openai-agents-sdk"]]],
  ["Developers", [["Docs", "/docs"], ["Quickstart", "/docs/quickstart"], ["TypeScript SDK", "/docs/typescript"], ["Python SDK", "/docs/python"], ["API reference", "/docs/api"], ["MCP server", "/docs/mcp-server"], ["Self-hosting", "/docs/self-hosting"], ["Glossary", "/glossary"], ["Answers", "/answers"], ["Tracing explained", "/blog/llm-tracing-explained"]]],
  ["Free tools", [["All free tools", "/tools"], ["Token counter", "/tools/token-counter"], ["Log checker", "/tools/agent-log-checker"], ["AI API status", "/tools/ai-api-status"], ["Cost estimator", "/tools/ai-cost-estimator"], ["LLM prices", "/tools/llm-price-comparison"], ["Prompt cost", "/tools/prompt-cost-checker"], ["Context window", "/tools/context-window-checker"], ["Rate limits", "/tools/rate-limit-calculator"], ["JSON fixer", "/tools/json-fixer"]]],
  ["Compare", [["All comparisons", "/compare"], ["vs Langfuse", "/compare/langfuse"], ["vs LangSmith", "/compare/langsmith"], ["vs Helicone", "/compare/helicone"], ["vs Arize Phoenix", "/compare/arize-phoenix"], ["vs Braintrust", "/compare/braintrust"], ["vs Datadog", "/compare/datadog"], ["Alternatives", "/alternative"], ["Best tools list", "/best-llm-observability-tools"], ["Observability guide", "/blog/ai-agent-observability-complete-guide"]]],
  ["Company", [["About", "/about"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Roadmap", "/roadmap"], ["Security", "/security"], ["Status", "/status"], ["Contact", "/contact"], ["Live demo", appHref("/demo/project")], ["Share Uncoil", "/refer"], ["Start free", appHref("/sign-up")]]],
] as const;

const useCases = [["Support", "/use-cases/support"], ["Research", "/use-cases/research"], ["Automation", "/use-cases/automation"], ["Tool calling", "/use-cases/tool-calling"], ["Coding agents", "/use-cases/coding"], ["RAG apps", "/use-cases/rag"], ["Voice agents", "/use-cases/voice"], ["Browser agents", "/use-cases/browser"], ["Multi-agent", "/use-cases/multi-agent"], ["MCP servers", "/use-cases/mcp"], ["Chatbots", "/use-cases/chatbot"], ["Data and SQL agents", "/use-cases/sql"], ["Cost control", "/use-cases/cost-control"], ["Sales agents", "/use-cases/sales"], ["Document agents", "/use-cases/documents"], ["Release checks", "/use-cases/release"], ["Copilots", "/use-cases/copilot"]] as const;

const totalLinks = groups.reduce((n, [, links]) => n + links.length, 0) + useCases.length;
const ease = [0.16, 1, 0.3, 1] as const;

/** Links laid out as one trace: a root spine, one span per column, one step per link. */
function TraceMap() {
  const reduce = useReducedMotion();
  const mapRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<number | null>(null);
  // The lit stretch of the root line: from the row's first node to the hovered column's node.
  const [litBox, setLitBox] = useState({ left: 0, top: 0, width: 0 });
  // The step the pointer is on: the column's trace line runs down to it and stops there.
  const [reach, setReach] = useState<{ col: number; y: number } | null>(null);

  const light = (i: number | null, el?: HTMLElement | null) => {
    setLit(i);
    const grid = el?.parentElement;
    if (!el || !grid || !mapRef.current) return;
    const map = mapRef.current.getBoundingClientRect();
    const col = el.getBoundingClientRect();
    const g = grid.getBoundingClientRect();
    setLitBox({ left: g.left - map.left, top: col.top - map.top, width: col.left - g.left });
  };

  return (
    <nav aria-label="Footer" className="border-x border-b border-white/15">
      <div className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse bg-[#f4d44d]" aria-hidden="true" />
          trace · uncoil.dev/sitemap
        </span>
        <span className="hidden sm:inline">7 spans · {totalLinks} steps · 0 errors</span>
      </div>

      <div ref={mapRef} className="relative px-4 pb-8 pt-10 sm:px-6">
        {/* Root spine across the columns, desktop only. */}
        <div className="pointer-events-none absolute left-4 right-4 top-10 hidden h-px xl:left-6 xl:right-6 xl:block" aria-hidden="true">
          <motion.div className="h-px origin-left bg-white/20" initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 1.1, ease }} />
        </div>
        <div className="pointer-events-none absolute z-10 h-px bg-[#f4d44d] transition-[width,opacity] duration-300 motion-reduce:transition-none" style={{ left: litBox.left, top: litBox.top, width: lit === null ? 0 : litBox.width, opacity: lit === null ? 0 : 1 }} aria-hidden="true" />

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-6">
          {groups.map(([title, links], i) => (
            <div key={title} data-trace-col className="relative pl-5" onMouseEnter={(e) => light(i, e.currentTarget)} onMouseLeave={() => { light(null); setReach(null); }} onFocus={(e) => light(i, e.currentTarget)} onBlur={() => { light(null); setReach(null); }}>
              <motion.span
                className={`absolute -left-[3.5px] -top-[3.5px] size-2 transition-colors ${lit === i ? "bg-[#f4d44d] shadow-[0_0_12px_#f4d44d]" : "bg-white/60"}`}
                initial={reduce ? false : { scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.3 }}
                aria-hidden="true"
              />
              {/* Below desktop the columns wrap into rows: link each node to the next one in its row and to the one above it. */}
              <motion.span
                className={`pointer-events-none absolute left-0 top-0 h-px w-[calc(100%+1.5rem)] origin-left bg-white/20 xl:hidden ${i % 2 === 0 ? "block" : "hidden"} ${i % 3 === 2 ? "md:hidden" : "md:block"}`}
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.8, ease }}
                aria-hidden="true"
              />
              {i >= 2 && (
                <span
                  className={`pointer-events-none absolute bottom-full left-0 h-11 w-px bg-white/15 xl:hidden ${i >= 3 ? "" : "md:hidden"}`}
                  aria-hidden="true"
                />
              )}
              <motion.span
                className="absolute bottom-1 left-0 top-0 w-px origin-top bg-white/15"
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.8, ease }}
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute left-0 top-0 w-px bg-[#f4d44d] shadow-[0_0_8px_#f4d44d] transition-[height,opacity] duration-300 ease-out motion-reduce:transition-none"
                style={{ height: reach?.col === i ? reach.y : 0, opacity: reach?.col === i ? 1 : 0 }}
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute -left-[2px] size-[5px] bg-[#f4d44d] transition-[top,opacity] duration-300 ease-out motion-reduce:transition-none"
                style={{ top: (reach?.col === i ? reach.y : 0) - 2.5, opacity: reach?.col === i ? 1 : 0 }}
                aria-hidden="true"
              />
              <p className="flex items-baseline justify-between gap-2 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45 sm:tracking-[0.16em]">
                <span><span className="text-[#f4d44d]">0{i + 1}</span> / {title}</span>
                <span className="hidden text-white/25 sm:inline">{links.length}</span>
              </p>
              <ul className="mt-4 grid gap-0.5">
                {links.map(([label, href], j) => (
                  <motion.li
                    key={href}
                    className="relative"
                    initial={reduce ? false : { opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.45 + i * 0.12 + j * 0.03, duration: 0.35 }}
                    onMouseEnter={(e) => setReach({ col: i, y: traceReachY(e.currentTarget) })}
                    onFocus={(e) => setReach({ col: i, y: traceReachY(e.currentTarget) })}
                  >
                    <Link href={href} className="group flex items-center py-1 text-sm text-white/65 transition-colors hover:text-white focus-visible:text-white">
                      <span data-trace-tick className="-ml-5 mr-2.5 h-px w-2.5 shrink-0 bg-white/20 transition-all group-hover:w-4 group-hover:bg-[#f4d44d] group-focus-visible:bg-[#f4d44d]" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{label}</span>
                      <ArrowUpRight className="size-3 shrink-0 text-[#f4d44d] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="relative mt-10 border-t border-white/15 pt-6 sm:flex sm:gap-8">
          <p className="mb-4 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 sm:mb-0 sm:w-36 sm:pt-0.5">
            <span className="text-[#f4d44d]">07</span> / Built for
          </p>
          <ul className="flex flex-wrap gap-x-1 gap-y-2 text-sm">
            {useCases.map(([label, href], j) => (
              <li key={href} className="flex items-center">
                {j > 0 && <span className="mx-2 size-1 bg-white/20" aria-hidden="true" />}
                <Link href={href} className="text-white/65 underline-offset-4 transition-colors hover:text-[#f4d44d] hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export function LandingFooter() {
  const reduce = useReducedMotion();
  return (
    <footer className="relative isolate overflow-hidden bg-[#090909] text-[#eceae3]">
      <div className="relative h-[14vw] max-h-[220px] min-h-[90px]">
        <Image src="/images/landing/footer-ridges.png" alt="" fill unoptimized sizes="100vw" className="object-cover object-bottom [image-rendering:pixelated]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#090909_0%,rgba(9,9,9,0)_35%,rgba(9,9,9,0)_70%,#090909_100%)]" />
      </div>

      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid gap-px border border-white/15 bg-white/15 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-7 bg-[#090909] p-6 md:p-10">
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
          <div className="flex flex-col justify-end gap-5 bg-[#090909] p-6 md:p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">The dispatch · monthly</p>
            <p className="max-w-sm text-xl leading-7 text-white/85">Notes on debugging agents, plus what shipped. One email a month.</p>
            <NewsletterCapture />
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">No spam. Unsubscribe anytime.</p>
          </div>
        </div>

        <TraceMap />

        <PixelWordmark className="mt-12 mb-8" />

        <div className="relative z-10 flex flex-col gap-4 border-t border-white/15 py-6 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-1.5">
            <span>© {new Date().getFullYear()} Uncoil</span>
            <span className="normal-case tracking-normal">
              formerly Tracify – not affiliated with Tracify GmbH (
              <a href="https://tracify.ai/" target="_blank" rel="noopener noreferrer" className="underline decoration-[#f4d44d]/60 underline-offset-2 hover:text-white">tracify.ai</a>)
            </span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/security#data" className="inline-flex items-center gap-2 hover:text-white">
              <span className="size-1.5 bg-[#f4d44d]" aria-hidden="true" />
              Where your data lives
            </Link>
            <Link href="/security#deletion" className="hover:text-white">Delete anytime</Link>
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
