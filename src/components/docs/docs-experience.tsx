"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";

/* ---------- Terminal: a first trace, typed out ---------- */

const script = [
  { text: "npm install @uncoil.dev/sdk", kind: "cmd" },
  { text: "added 1 package in 2s", kind: "dim" },
  { text: "node agent.js", kind: "cmd" },
  { text: "▸ run_9f3a  support-agent", kind: "ok" },
  { text: "  LLM   chat            820 ms", kind: "out" },
  { text: "  TOOL  order.lookup    140 ms", kind: "out" },
  { text: "  TOOL  refund.issue    502 · 5000 ms", kind: "fail" },
  { text: "✓ trace sent → /runs/run_9f3a", kind: "ok" },
] as const;

const tone = { cmd: "text-white", dim: "text-white/40", ok: "text-[#f4d44d]", out: "text-white/75", fail: "text-[#f4d44d]" } as const;

export function DocsTerminal() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? script.length : 1);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setCount((c) => (c >= script.length + 3 ? 1 : c + 1)), 850);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="border border-white/20 bg-[#090909]/90 font-mono text-[12px] backdrop-blur-sm" aria-label="Terminal showing a first trace">
      <div className="flex items-center justify-between border-b border-white/15 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-white/55">
        <span className="flex gap-1.5" aria-hidden="true"><i className="size-2 bg-white/25" /><i className="size-2 bg-white/25" /><i className="size-2 bg-[#f4d44d]" /></span>
        <span>~/my-agent</span>
        <span>zsh</span>
      </div>
      <ul className="min-h-[260px] space-y-1.5 px-4 py-4 leading-5">
        {script.slice(0, Math.min(count, script.length)).map((line) => (
          <motion.li key={line.text} initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={tone[line.kind]}>
            {line.kind === "cmd" ? <span className="text-[#f4d44d]">$ </span> : null}
            {line.text}
          </motion.li>
        ))}
        <li aria-hidden="true" className="h-4 w-2 animate-pulse bg-[#f4d44d]" />
      </ul>
    </div>
  );
}

/* ---------- Journey: install, instrument, inspect, improve ---------- */

const wrap = `import { traceAgent } from "@uncoil.dev/sdk";

const runAgent = traceAgent(
  async (question: string) => callModel(question),
  { apiKey: process.env.UNCOIL_API_KEY },
);

await runAgent("Where is my order?");`;

function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex size-full min-w-0 flex-col border border-white/20 bg-[#090909] text-[#eceae3]">
      <div className="flex items-center justify-between border-b border-white/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
        <span>{title}</span>
        <span className="flex gap-1.5" aria-hidden="true"><i className="size-2 bg-white/20" /><i className="size-2 bg-[#f4d44d]" /></span>
      </div>
      <div className="flex-1 overflow-hidden p-5">{children}</div>
    </div>
  );
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="flex w-full items-center justify-between gap-3 border border-white/20 px-4 py-3 text-left font-mono text-sm transition-colors hover:border-[#f4d44d]"
    >
      <span><span className="text-[#f4d44d]">$ </span>{text}</span>
      {copied ? <Check className="size-4 text-[#f4d44d]" /> : <Copy className="size-4 text-white/50" />}
    </button>
  );
}

const bars = [
  { n: "support-agent", k: "AGENT", l: 0, w: 100 },
  { n: "chat", k: "LLM", l: 2, w: 34 },
  { n: "order.lookup", k: "TOOL", l: 38, w: 14 },
  { n: "refund.issue", k: "FAIL", l: 54, w: 20 },
  { n: "chat · retry", k: "LLM", l: 76, w: 22 },
] as const;

function Panel({ index }: { index: number }) {
  if (index === 0) {
    return (
      <Screen title="1 · install">
        <div className="space-y-3">
          <CopyLine text="npm install @uncoil.dev/sdk" />
          <CopyLine text="pip install uncoil-sdk" />
          <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">.env</p>
          <pre className="font-mono text-[13px] text-white/80">UNCOIL_API_KEY=uncoil_sk_live_…</pre>
        </div>
      </Screen>
    );
  }
  if (index === 1) {
    return (
      <Screen title="2 · instrument">
        <pre className="overflow-x-auto font-mono text-[12px] leading-6 text-white/85">{wrap}</pre>
      </Screen>
    );
  }
  if (index === 2) {
    return (
      <Screen title="3 · inspect · run_9f3a">
        <ul className="space-y-3">
          {bars.map((b, i) => (
            <li key={b.n}>
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-white/60"><span>{b.n}</span><span className={b.k === "FAIL" ? "text-[#f4d44d]" : ""}>{b.k}</span></div>
              <div className="mt-1 h-3 bg-white/10">
                <motion.div className={`h-full ${b.k === "FAIL" ? "bg-[#f4d44d]" : b.k === "TOOL" ? "bg-[#eceae3]" : "bg-[#eceae3]/60"}`} style={{ marginLeft: `${b.l}%`, maxWidth: `${100 - b.l}%` }} initial={{ width: 0 }} animate={{ width: `${b.w}%` }} transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-white/15 pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#f4d44d]">First failure: refund.issue · 502</p>
      </Screen>
    );
  }
  return (
    <Screen title="4 · improve · release gate (example)">
      <ul className="space-y-3 font-mono text-sm">
        {[["Pass rate on the eval set ≥ 95%", true], ["p95 latency under 4 s", true], ["Cost per task under $0.05", false]].map(([label, ok]) => (
          <li key={String(label)} className="flex items-center justify-between gap-4 border border-white/15 px-4 py-3">
            <span className="text-white/80">{label as string}</span>
            <span className={ok ? "text-[#eceae3]" : "bg-[#f4d44d] px-2 text-black"}>{ok ? "PASS" : "BLOCKED"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm leading-6 text-white/55">Ship the version that proves itself in production.</p>
    </Screen>
  );
}

const chapters = [
  { n: "01", title: "Install.", body: "Add the SDK, drop in your API key, and you are one wrapper away from a trace.", links: [["Quickstart", "quickstart"], ["TypeScript SDK", "typescript"], ["Python SDK", "python"]] },
  { n: "02", title: "Instrument.", body: "Wrap a run. Model calls, tool calls and retries become spans with inputs, outputs, tokens and timing.", links: [["Tool calls", "tool-calls"], ["Integrations", "integrations"]] },
  { n: "03", title: "Inspect.", body: "Open the run. See the whole path, the cost of every step, and the first place it went wrong.", links: [["Observability", "observability"], ["Costs", "costs"]] },
  { n: "04", title: "Improve.", body: "Turn what you saw in production into evaluations, versioned prompts and release gates.", links: [["Evaluation", "evaluation"], ["Prompts", "prompts"], ["Release gates", "release-gates"]] },
] as const;

export function DocsJourney() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  return (
    <section className="bg-[#090909] px-5 mk-section text-[#eceae3] md:px-10">
      <div className="mx-auto max-w-[1320px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">The path / pick a step</p>
        <h2 className="mt-4 max-w-3xl font-pixel mk-h2 leading-[0.92] tracking-[-0.07em]">From npm install to release gate.</h2>
        <div className="mk-gap grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <ol className="min-w-0 border-b border-white/15">
            {chapters.map((c, i) => {
              const on = active === i;
              return (
                <li key={c.n} className={`border-t border-white/15 transition-colors ${on ? "bg-white/[0.04]" : ""}`} onMouseEnter={() => setActive(i)}>
                  <button type="button" aria-expanded={on} onClick={() => setActive(i)} onFocus={() => setActive(i)} className="flex w-full items-baseline gap-5 px-3 pt-5 text-left">
                    <span className={`font-mono text-sm transition-colors ${on ? "text-[#f4d44d]" : "text-white/35"}`}>{c.n}</span>
                    <span className={`font-pixel text-[clamp(1.6rem,2.6vw,2.2rem)] leading-none tracking-[-0.06em] transition-colors ${on ? "text-[#f4d44d]" : ""}`}>{c.title}</span>
                  </button>
                  <div className="px-3 pb-5 pl-[3.25rem]">
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/70">{c.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.links.map(([label, slug]) => (
                        <Link key={slug} href={`/docs/${slug}`} className="border border-white/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:border-[#f4d44d] hover:bg-[#f4d44d] hover:text-black">{label} →</Link>
                      ))}
                    </div>
                    {on && <div className="mt-5 h-[280px] lg:hidden"><Panel index={i} /></div>}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="hidden lg:block">
            <div className="relative h-[440px]">
              <AnimatePresence mode="popLayout">
                <motion.div key={active} className="absolute inset-0" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                  <Panel index={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
