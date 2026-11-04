"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";

type LinkList = readonly (readonly [string, string])[];

const productLinks: LinkList = [["Trace viewer", "/product/trace-viewer"], ["Cost dashboard", "/product/cost-dashboard"], ["Tool calls", "/product/tool-calls"], ["LLM calls", "/product/llm-calls"], ["Failures", "/product/failures"], ["Reports", "/product/reports"], ["Runtime control", "/product/runtime-control"], ["Evaluation engine", "/product/evaluation-engine"], ["Lifecycle", "/product/lifecycle"]];
const useCaseLinks: LinkList = [["Support", "/use-cases/support"], ["Research", "/use-cases/research"], ["Automation", "/use-cases/automation"], ["Tool calling", "/use-cases/tool-calling"], ["Coding agents", "/use-cases/coding"], ["RAG apps", "/use-cases/rag"], ["Voice agents", "/use-cases/voice"], ["Browser agents", "/use-cases/browser"], ["Multi-agent", "/use-cases/multi-agent"], ["MCP servers", "/use-cases/mcp"], ["Chatbots", "/use-cases/chatbot"], ["Data and SQL agents", "/use-cases/sql"], ["Cost control", "/use-cases/cost-control"], ["Sales agents", "/use-cases/sales"], ["Document agents", "/use-cases/documents"], ["Release checks", "/use-cases/release"], ["Copilots", "/use-cases/copilot"]];
const developerLinks: LinkList = [["Docs", "/docs"], ["TypeScript SDK", "/docs/typescript"], ["Python SDK", "/docs/python"], ["API reference", "/docs/api"], ["Glossary", "/glossary"], ["Questions answered", "/answers"], ["Observability guide", "/blog/ai-agent-observability-complete-guide"], ["Tracing explained", "/blog/llm-tracing-explained"]];
const compareLinks: LinkList = [["Pricing", "/pricing"], ["Integrations", "/integrations"], ["Compare tools", "/compare"], ["Alternatives", "/alternative"]];
const toolLinks: LinkList = [["All free tools", "/tools"], ["Token counter", "/tools/token-counter"], ["Agent log checker", "/tools/agent-log-checker"], ["AI API status", "/tools/ai-api-status"]];
const companyLinks: LinkList = [["About", "/about"], ["Blog", "/blog"], ["Roadmap", "/roadmap"], ["Changelog", "/changelog"], ["Security", "/security"], ["Status", "/status"], ["Contact", "/contact"]];

function LinkGroup({ title, links, split = false, className = "" }: { title: string; links: LinkList; split?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">{title}</p>
      <ul className={`mt-4 grid gap-x-8 gap-y-2.5 ${split ? "grid-cols-2" : ""}`}>
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="group inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
              <span className="h-px w-0 bg-[#f4d44d] transition-all group-hover:w-3" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
        <div className="flex flex-col gap-6 border-y border-white/15 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
            <p className="font-pixel text-3xl leading-none tracking-[-0.06em] md:text-4xl">One map per run.</p>
            <p className="max-w-md text-sm leading-6 text-white/60">Notes on debugging agents, plus what shipped. One email a month.</p>
          </div>
          <div className="w-full lg:w-[420px]">
            <NewsletterCapture />
          </div>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 pt-12 md:grid-cols-4 lg:grid-cols-6">
          <LinkGroup title="Product" links={productLinks} />
          <LinkGroup title="Use cases" links={useCaseLinks} split className="col-span-2" />
          <LinkGroup title="Developers" links={developerLinks} />
          <div className="grid content-start gap-10">
            <LinkGroup title="Compare" links={compareLinks} />
            <LinkGroup title="Free tools" links={toolLinks} />
          </div>
          <LinkGroup title="Company" links={companyLinks} />
        </nav>

        <div className="mt-14 select-none pb-[0.2em]" aria-hidden="true">
          {/* The official Dissolve lockup (public/logos/uncoil), untouched */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/uncoil/uncoil-logo-on-dark.svg" alt="" className="block h-auto w-full" />
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
