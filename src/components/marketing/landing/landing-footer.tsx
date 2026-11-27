"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUp, ArrowUpRight } from "lucide-react";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";
import { useCell } from "@/components/marketing/home/use-grid";
import { appHref } from "@/lib/app-links";
import { ChromeScene } from "./chrome-scene";
import { footerRuler } from "./chrome-layout";

const groups = [
  ["Product", [["Trace viewer", "/product/trace-viewer"], ["Cost dashboard", "/product/cost-dashboard"], ["Tool calls", "/product/tool-calls"], ["LLM calls", "/product/llm-calls"], ["Failures", "/product/failures"], ["Reports", "/product/reports"], ["Runtime control", "/product/runtime-control"], ["Evaluation engine", "/product/evaluation-engine"], ["Lifecycle", "/product/lifecycle"], ["Pricing", "/pricing"], ["Agent health report", "/health-report"]]],
  ["Integrations", [["All integrations", "/integrations"], ["OpenAI", "/integrations/openai"], ["Anthropic", "/integrations/anthropic"], ["LangGraph", "/integrations/langgraph"], ["OpenTelemetry", "/integrations/opentelemetry"], ["CrewAI", "/integrations/crewai"], ["Vercel AI SDK", "/integrations/vercel-ai-sdk"], ["LlamaIndex", "/integrations/llamaindex"], ["Mastra", "/integrations/mastra"], ["OpenAI Agents SDK", "/integrations/openai-agents-sdk"]]],
  ["Developers", [["Docs", "/docs"], ["Quickstart", "/docs/quickstart"], ["TypeScript SDK", "/docs/typescript"], ["Python SDK", "/docs/python"], ["API reference", "/docs/api"], ["MCP server", "/docs/mcp-server"], ["Self-hosting", "/docs/self-hosting"], ["Glossary", "/glossary"], ["Answers", "/answers"], ["Tracing explained", "/blog/llm-tracing-explained"]]],
  ["Free tools", [["All free tools", "/tools"], ["Token counter", "/tools/token-counter"], ["Log checker", "/tools/agent-log-checker"], ["AI API status", "/tools/ai-api-status"], ["Cost estimator", "/tools/ai-cost-estimator"], ["LLM prices", "/tools/llm-price-comparison"], ["Prompt cost", "/tools/prompt-cost-checker"], ["Context window", "/tools/context-window-checker"], ["Rate limits", "/tools/rate-limit-calculator"], ["Prompt caching", "/tools/prompt-caching-calculator"], ["Tracing bill", "/tools/ai-observability-cost-calculator"], ["JSON fixer", "/tools/json-fixer"]]],
  ["Compare", [["All comparisons", "/compare"], ["vs Langfuse", "/compare/langfuse"], ["vs LangSmith", "/compare/langsmith"], ["vs Helicone", "/compare/helicone"], ["vs Arize Phoenix", "/compare/arize-phoenix"], ["vs Braintrust", "/compare/braintrust"], ["vs Opik", "/compare/opik"], ["vs AgentOps", "/compare/agentops"], ["vs Logfire", "/compare/logfire"], ["vs W&B Weave", "/compare/weave"], ["vs Datadog", "/compare/datadog"], ["Switch to Uncoil", "/switch"], ["Best tools list", "/best-llm-observability-tools"], ["Observability guide", "/blog/ai-agent-observability-complete-guide"]]],
  ["Company", [["About", "/about"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Roadmap", "/roadmap"], ["Security", "/security"], ["Startups", "/startups"], ["Status", "/status"], ["Contact", "/contact"], ["Live demo", appHref("/demo/project")], ["Share Uncoil", "/refer"], ["Start free", appHref("/sign-up")]]],
] as const;

const useCases = [["Support", "/use-cases/support"], ["Research", "/use-cases/research"], ["Automation", "/use-cases/automation"], ["Tool calling", "/use-cases/tool-calling"], ["Coding agents", "/use-cases/coding"], ["RAG apps", "/use-cases/rag"], ["Voice agents", "/use-cases/voice"], ["Browser agents", "/use-cases/browser"], ["Multi-agent", "/use-cases/multi-agent"], ["MCP servers", "/use-cases/mcp"], ["Chatbots", "/use-cases/chatbot"], ["Data and SQL agents", "/use-cases/sql"], ["Cost control", "/use-cases/cost-control"], ["Sales agents", "/use-cases/sales"], ["Document agents", "/use-cases/documents"], ["Release checks", "/use-cases/release"], ["Copilots", "/use-cases/copilot"]] as const;

const totalLinks = groups.reduce((n, [, links]) => n + links.length, 0) + useCases.length;
const MARKS = groups.map((_, i) => i);

const mono = "font-mono uppercase tracking-[0.14em]";
const ring = "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]";
// Links are 44px tall wherever a finger is the pointer, and compact on desktop.
const row = "min-h-11 lg:min-h-8";

/** A 3x5 pixel caret at two CSS px per pixel: points right, turns down when its group is open. */
function Caret({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 3 5" width={6} height={10} shapeRendering="crispEdges" className={`shrink-0 text-[#f4d44d] ${open ? "rotate-90" : ""}`} aria-hidden="true">
      {[1, 2, 3, 2, 1].map((w, y) => (
        <rect key={y} x="0" y={y} width={w} height="1" fill="currentColor" />
      ))}
    </svg>
  );
}

/** One link: a cell-sized block lights beside it on hover and focus, like a step on the trace. */
function FootLink({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className={`group flex items-center gap-3 py-1 text-sm text-[#eceae3]/70 transition-colors hover:text-[#eceae3] focus-visible:text-[#eceae3] ${row} ${ring}`}>
      <span className="shrink-0 bg-[#eceae3]/20 group-hover:bg-[#f4d44d] group-focus-visible:bg-[#f4d44d]" style={{ width: "var(--c)", height: "var(--c)" }} aria-hidden="true" />
      <span className="min-w-0">{label}</span>
    </Link>
  );
}

/**
 * A group's heading. On phones it is a button that folds the group, since six long lists stacked
 * would be most of a phone's scroll; the links stay in the page either way. From tablet width up
 * every group is open and the heading is plain text.
 */
function GroupHead({ n, title, count, open, onToggle, id }: { n: number; title: string; count: number; open: boolean; onToggle: () => void; id: string }) {
  const label = (
    <span>
      <span className="text-[#f4d44d]">0{n}</span> / {title}
    </span>
  );
  return (
    <>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className={`flex h-14 w-full items-center justify-between gap-3 text-[11px] text-[#eceae3]/80 md:hidden ${mono} ${ring} outline-offset-[-2px]`}>
        {label}
        <span className="flex items-center gap-3 text-[#eceae3]/45">
          {count}
          <Caret open={open} />
        </span>
      </button>
      <p className={`hidden items-baseline justify-between gap-2 pb-3 text-[10px] text-[#eceae3]/55 md:flex ${mono}`}>
        {label}
        <span className="text-[#eceae3]/35">{count}</span>
      </p>
    </>
  );
}

export function LandingFooter() {
  const cell = useCell();
  const [lit, setLit] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState(false);
  const sitemap = useRef<HTMLDivElement>(null);

  // The robot walks in along the ruler the first time the sitemap scrolls into view.
  useEffect(() => {
    const el = sitemap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setSeen(true);
      io.disconnect();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // When the six columns sit in one row, each board hangs over its column.
  const ruler = useCallback((cells: number, c: number, el: HTMLElement) => {
    const cols = [...(sitemap.current?.querySelectorAll<HTMLElement>("[data-foot-col]") ?? [])].map((col) => col.getBoundingClientRect());
    const left = el.getBoundingClientRect().left;
    const oneRow = cols.length === groups.length && cols.every((r) => Math.abs(r.top - cols[0].top) < 1);
    return footerRuler(cells, groups.length, oneRow ? cols.map((r) => Math.round((r.left - left) / c)) : []);
  }, []);

  const toggle = (i: number) => {
    setOpen(open === i ? null : i);
    setLit(open === i ? null : i);
  };
  const target = lit ?? groups.length - 1;
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate bg-[#090909] text-[#eceae3]" style={{ "--c": `${cell}px` } as CSSProperties}>
      <div className="mx-auto max-w-[1440px] px-5 pt-14 md:px-8 md:pt-20">
        {/* The primary action, then the monthly note. */}
        <div className="grid grid-cols-[minmax(0,1fr)] border border-[#eceae3]/15 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-6 p-6 md:p-10">
            <p className={`${mono} text-[10px] text-[#f4d44d]`}>First trace in five minutes</p>
            <p className="font-pixel text-[clamp(2.5rem,7vw,4.75rem)] leading-[0.9] tracking-[-0.06em]">
              One map
              <br />
              per run.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={appHref("/sign-up")} className={`group inline-flex h-12 items-center gap-3 bg-[#f4d44d] px-6 text-[11px] text-[#090909] hover:bg-[#fff4b5] ${mono} focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[#eceae3]`}>
                Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
              <Link href="/docs" className={`inline-flex h-12 items-center gap-3 border border-[#eceae3]/30 px-6 text-[11px] hover:border-[#eceae3] hover:bg-[#eceae3] hover:text-[#090909] ${mono} ${ring}`}>
                Read the docs
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-end gap-4 border-t border-[#eceae3]/15 p-6 md:p-10 lg:border-l lg:border-t-0">
            <p className={`${mono} text-[10px] text-[#eceae3]/55`}>The dispatch · monthly</p>
            <p className="max-w-sm text-lg leading-7 text-[#eceae3]/85 md:text-xl">Notes on debugging agents, plus what shipped. One email a month.</p>
            <div className="[&_form:focus-within]:border-[#f4d44d] [&_form>*]:min-h-11">
              <NewsletterCapture />
            </div>
            <p className={`${mono} text-[9px] text-[#eceae3]/50`}>No spam. Unsubscribe anytime.</p>
          </div>
        </div>

        {/* The sitemap, drawn as the end of a run: a ruler with one board per group, and the robot. */}
        <nav aria-label="Footer" className="mt-14 md:mt-20">
          <div className={`${mono} flex items-center justify-between gap-4 text-[10px] text-[#eceae3]/55`}>
            <span className="flex items-center gap-2">
              <span className="bg-[#f4d44d]" style={{ width: "var(--c)", height: "var(--c)" }} aria-hidden="true" />
              Sitemap · uncoil.dev
            </span>
            <span>
              {groups.length + 1} groups · {totalLinks} pages
            </span>
          </div>
          <ChromeScene rows={30} pages={groups.length} marks={MARKS} lit={lit} target={target} ruler={ruler} armed={seen} className="mt-2" />

          <div ref={sitemap} className="mt-4 grid border-b border-[#eceae3]/15 md:mt-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12 md:border-b-0 xl:grid-cols-6">
            {groups.map(([title, links], i) => (
              <div
                key={title}
                data-foot-col
                className="border-t border-[#eceae3]/15 md:border-t-0"
                onMouseEnter={() => setLit(i)}
                onMouseLeave={() => setLit(open)}
                onFocus={() => setLit(i)}
              >
                <GroupHead n={i + 1} title={title} count={links.length} open={open === i} onToggle={() => toggle(i)} id={`footer-group-${i}`} />
                <ul id={`footer-group-${i}`} className={`${open === i ? "grid" : "hidden"} pb-4 md:grid md:pb-0`}>
                  {links.map(([label, href]) => (
                    <li key={href}>
                      <FootLink label={label} href={href} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-b border-[#eceae3]/15 md:mt-12 md:grid md:grid-cols-3 md:gap-x-6 md:border-b-0 md:border-t md:pt-8 xl:grid-cols-6">
            <GroupHead n={groups.length + 1} title="Built for" count={useCases.length} open={open === groups.length} onToggle={() => toggle(groups.length)} id="footer-group-uses" />
            <ul id="footer-group-uses" className={`${open === groups.length ? "grid" : "hidden"} grid-cols-2 gap-x-6 pb-4 md:col-span-2 md:grid md:pb-0 xl:col-span-5 xl:grid-cols-5 lg:grid-cols-3`}>
              {useCases.map(([label, href]) => (
                <li key={href}>
                  <FootLink label={label} href={href} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* The fine print. The floating assistant button sits bottom right, so this row keeps
            clear of that corner. */}
        <div className="mt-14 grid gap-8 border-t border-[#eceae3]/15 pb-24 pt-8 md:mt-20 lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-10 lg:pb-10 lg:pr-20">
          <div className="grid gap-3">
            <Link href="/" aria-label="Uncoil home" className={`flex h-11 w-fit items-center ${ring}`}>
              <Image src="/logos/uncoil/uncoil-logo-crisp-on-dark.svg" alt="Uncoil" width={204} height={38} unoptimized className="block h-[38px] w-[204px] max-w-none" />
            </Link>
            <p className={`${mono} text-[10px] text-[#eceae3]/60`}>© {year} Uncoil</p>
            <p className="font-mono text-[11px] leading-5 text-[#eceae3]/60">
              <span className="normal-case tracking-normal">
                formerly Tracify – not affiliated with Tracify GmbH (
                <a href="https://tracify.ai/" target="_blank" rel="noopener noreferrer" className="py-[15px] underline decoration-[#f4d44d]/60 underline-offset-2 hover:text-[#eceae3]">tracify.ai</a>)
              </span>
            </p>
          </div>
          <ul className={`${mono} flex flex-wrap gap-x-6 text-[10px] text-[#eceae3]/65 lg:justify-end`}>
            {[
              ["Where your data lives", "/security#data"],
              ["Delete anytime", "/security#deletion"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
              ["Cookies", "/cookie-policy"],
              ["Status", "/status"],
            ].map(([label, href], i) => (
              <li key={href}>
                <Link href={href} className={`inline-flex items-center gap-2 hover:text-[#eceae3] ${row} ${ring}`}>
                  {i === 0 && <span className="size-1.5 bg-[#f4d44d]" aria-hidden="true" />}
                  {label}
                  {href === "/status" && <ArrowUpRight className="size-3" aria-hidden="true" />}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
            className={`inline-flex h-11 w-fit items-center gap-2 whitespace-nowrap border border-[#eceae3]/30 px-4 text-[10px] hover:border-[#f4d44d] hover:bg-[#f4d44d] hover:text-[#090909] ${mono} ${ring}`}
          >
            Back to top <ArrowUp className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
