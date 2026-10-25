"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";
import { TracifyMark } from "@/components/brand/tracify-mark";
import { LocaleSwitcher } from "@/components/marketing/locale/locale-switcher";

const groups = [
  ["Product", [["Trace viewer", "/product/trace-viewer"], ["Cost dashboard", "/product/cost-dashboard"], ["Tool calls", "/product/tool-calls"], ["Pricing", "/pricing"], ["Integrations", "/integrations"], ["Compare tools", "/compare"], ["Alternatives", "/alternative"]]],
  ["Use cases", [["Support", "/use-cases/support"], ["Research", "/use-cases/research"], ["Automation", "/use-cases/automation"], ["Tool calling", "/use-cases/tool-calling"], ["Coding agents", "/use-cases/coding"], ["RAG apps", "/use-cases/rag"], ["Voice agents", "/use-cases/voice"], ["Browser agents", "/use-cases/browser"], ["Multi-agent", "/use-cases/multi-agent"], ["MCP servers", "/use-cases/mcp"], ["Chatbots", "/use-cases/chatbot"], ["Data and SQL agents", "/use-cases/sql"], ["Cost control", "/use-cases/cost-control"]]],
  ["Developers", [["Docs", "/docs"], ["TypeScript SDK", "/docs/typescript"], ["Python SDK", "/docs/python"], ["API reference", "/docs/api"], ["Glossary", "/glossary"], ["Questions answered", "/answers"], ["Observability guide", "/blog/ai-agent-observability-complete-guide"], ["Tracing explained", "/blog/llm-tracing-explained"], ["Free tools", "/tools"], ["Token counter", "/tools/token-counter"], ["Agent log checker", "/tools/agent-log-checker"], ["AI API status", "/tools/ai-api-status"]]],
  ["Company", [["About", "/about"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Security", "/security"], ["Status", "/status"], ["Contact", "/contact"]]],
] as const;

const word = "tracify".split("");

export function LandingFooter() {
  const reduce = useReducedMotion();
  return (
    <footer className="relative isolate overflow-hidden bg-[#090909] text-[#eceae3]">
      <div className="relative h-[14vw] max-h-[220px] min-h-[90px]">
        <Image src="/images/landing/footer-ridges.png" alt="" fill unoptimized sizes="100vw" className="object-cover object-bottom [image-rendering:pixelated]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#090909_0%,rgba(9,9,9,0)_35%,rgba(9,9,9,0)_70%,#090909_100%)]" />
      </div>

      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid gap-12 border-t border-white/15 pt-14 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <p className="font-pixel text-4xl leading-none tracking-[-0.06em]">One map per run.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">Notes on debugging agents, plus what shipped. One email a month.</p>
            <div className="mt-6">
              <NewsletterCapture />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {groups.map(([title, links]) => (
              <div key={title}>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">{title}</p>
                <ul className="mt-4 grid gap-2.5">
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
            ))}
          </div>
        </div>

        <div className="mt-16 flex select-none items-baseline justify-between pb-[0.2em] font-pixel text-[16vw] leading-[0.78] tracking-[-0.08em] lg:text-[18vw]" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { x: "-30%", opacity: 0 }}
            whileInView={{ x: "0%", opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <TracifyMark className="block h-[0.65em]" />
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
          <span>© {new Date().getFullYear()} Tracify</span>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/cookie-policy" className="hover:text-white">Cookies</Link>
            <Link href="/status" className="inline-flex items-center gap-1 hover:text-white">
              Status <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <LocaleSwitcher />
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })} className="inline-flex w-fit items-center gap-2 border border-white/25 px-3 py-2 hover:bg-[#f4d44d] hover:text-black">
            Back to top <ArrowUp className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
