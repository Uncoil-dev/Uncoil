"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";

const products = [
  { id: "trace", eyebrow: "Trace every decision", title: "See the whole run, not just the error.", body: "Nested spans preserve the model call, tool use, retries, input, output, and session context behind a result.", href: "/product/trace-viewer", metric: "One timeline", items: ["Inputs and outputs", "Tool calls and retries", "Session and release context"] },
  { id: "quality", eyebrow: "Measure quality", title: "Make behavior a release signal.", body: "Compare evaluators, human feedback, and prompt versions before a weak response reaches more users.", href: "/product/evaluation-engine", metric: "Release gates", items: ["Automated evaluators", "Human review queues", "Regression comparisons"] },
  { id: "cost", eyebrow: "Control the cost", title: "Know what every outcome costs.", body: "Connect model spend, latency, tools, and failures so expensive behavior is easy to explain and fix.", href: "/product/cost-dashboard", metric: "Actionable spend", items: ["Cost by model and tool", "Latency by step", "Incident-linked alerts"] },
] as const;

const runtimes = {
  TypeScript: ["npm install uncoil-sdk", "import { traceAgent } from 'uncoil-sdk'", "", "const tracedRun = traceAgent(", "  () => agent.run(input)", ")"],
  Python: ["pip install uncoil-sdk", "from uncoil import trace_agent", "", "@trace_agent()", "def run_agent(input):", "    return agent.run(input)"],
  OTLP: ["POST /v1/traces", "x-uncoil-key: $UNCOIL_API_KEY", "", "service.name=research-agent", "span.type=tool_call"],
} as const;
type Runtime = keyof typeof runtimes;

export function CommandCenterStory() {
  const [selectedProduct, setSelectedProduct] = useState(0);
  const [runtime, setRuntime] = useState<Runtime>("TypeScript");
  const [copied, setCopied] = useState(false);
  const product = products[selectedProduct];

  async function copyCode() { try { await navigator.clipboard.writeText(runtimes[runtime].join("\n")); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } }

  return <>
    <section className="px-6 py-24 md:px-10 md:py-36"><div className="mx-auto max-w-[1240px]"><div className="grid gap-8 border-b border-white/15 pb-12 md:grid-cols-[0.95fr_1.05fr] md:items-end"><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">One platform, useful evidence</p><h2 className="mt-5 max-w-[570px] font-sans text-5xl font-medium leading-[0.95] tracking-[-0.06em] md:text-7xl">Less guesswork. Better agents.</h2></div><p className="max-w-[460px] text-[17px] leading-8 text-zinc-400">Uncoil makes the right engineering signals available at the moment you need to make a decision.</p></div>
      <div className="grid border-b border-white/15 md:grid-cols-[0.78fr_1.22fr]"> <div className="border-b border-white/15 py-4 md:border-b-0 md:border-r md:py-8">{products.map((item, index) => <button key={item.id} type="button" onClick={() => setSelectedProduct(index)} aria-pressed={selectedProduct === index} className={`w-full border-l-2 px-0 py-5 pr-6 text-left transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-white ${selectedProduct === index ? "border-white" : "border-transparent"}`}><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">0{index + 1}</span><span className="mt-2 block font-sans text-2xl text-white">{item.eyebrow}</span></button>)}</div>
        <div className="py-10 md:px-12 md:py-16"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{product.metric}</p><h3 className="mt-5 max-w-[570px] font-sans text-4xl font-medium leading-[1] tracking-[-0.05em] md:text-5xl">{product.title}</h3><p className="mt-6 max-w-[550px] text-[16px] leading-7 text-zinc-400">{product.body}</p><ul className="mt-9 grid gap-3 sm:grid-cols-3">{product.items.map((item) => <li key={item} className="border-t border-white/15 pt-3 font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-zinc-300"><Check className="mb-2 size-3 text-white" />{item}</li>)}</ul><Link href={product.href} className="mt-10 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white underline underline-offset-8 decoration-zinc-600 hover:decoration-white">Explore this workflow <ArrowUpRight size={14} /></Link></div></div>
    </div></section>

    <section className="border-y border-white/10 bg-[#0b0b0b] px-6 py-24 md:px-10 md:py-32"><div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center"><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">Start in minutes</p><h2 className="mt-5 max-w-[470px] font-sans text-5xl font-medium leading-[0.95] tracking-[-0.06em] md:text-6xl">Bring your agent. Keep your stack.</h2><p className="mt-6 max-w-[440px] text-[16px] leading-7 text-zinc-400">Use the SDK you already write in, or send OpenTelemetry data directly. Your first trace lands in the same place.</p><Link href="/docs" className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white underline underline-offset-8 decoration-zinc-600 hover:decoration-white">Read the quickstart <ArrowUpRight size={14} /></Link></div><div className="overflow-hidden border border-white/15 bg-black"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex gap-1">{(Object.keys(runtimes) as Runtime[]).map((item) => <button type="button" key={item} onClick={() => setRuntime(item)} aria-pressed={runtime === item} className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white ${runtime === item ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}>{item}</button>)}</div><button type="button" onClick={copyCode} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"><Copy size={13} />{copied ? "Copied" : "Copy"}</button></div><pre className="overflow-x-auto px-6 py-6 font-mono text-[13px] leading-7 text-zinc-300">{runtimes[runtime].map((line, index) => <code key={`${runtime}-${index}`} className="grid grid-cols-[30px_1fr]"><span className="select-none text-zinc-700">{String(index + 1).padStart(2, "0")}</span><span>{line || " "}</span></code>)}</pre><div className="border-t border-white/10 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">One wrapper. Every run in context.</div></div></div></section>
  </>;
}
