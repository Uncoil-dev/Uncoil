import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";

const workflow = [
  ["01", "Intake", "Turn a customer report into a traceable run."],
  ["02", "Inspect", "Open the exact tool call, retry, and payload."],
  ["03", "Improve", "Compare a prompt or model against the same evidence."],
] as const;

const faqs = [
  ["What does Uncoil capture?", "Runs, nested spans, model calls, tools, retries, cost, quality scores, sessions, and release context."],
  ["Can we keep our existing stack?", "Yes. Use the TypeScript or Python SDK, or send OpenTelemetry data directly to the same workspace."],
  ["Where does the improvement loop end?", "At a measured release: compare candidates, promote the winner, and keep monitoring production drift."],
] as const;

export function MarketingProofSections() {
  return (
    <>
      <section className="border-y border-white/10 bg-[#0b0b0b] px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid gap-10 md:grid-cols-[0.72fr_1.28fr] md:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">A workspace for the work between runs</p>
              <h2 className="mt-5 max-w-[500px] font-sans text-5xl font-medium leading-[0.95] tracking-[-0.06em] md:text-6xl">Make the next decision visible.</h2>
              <p className="mt-6 max-w-[420px] text-[16px] leading-7 text-zinc-400">A trace is only useful when it moves an incident forward. Uncoil keeps evidence, quality, and release context in one continuous surface.</p>
            </div>
            <div className="border border-white/15 bg-black">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Support agent / incident 1842</span><span className="font-mono text-[10px] uppercase text-zinc-600">live context</span></div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-3">
                {workflow.map(([number, label, body]) => <div key={label} className="bg-black p-5"><span className="font-mono text-[10px] tracking-[0.16em] text-zinc-600">{number}</span><h3 className="mt-8 font-mono text-sm uppercase tracking-[0.12em] text-white">{label}</h3><p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p><ChevronRight className="mt-8 size-4 text-zinc-600" /></div>)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">12 spans · 3.84s · $0.0214</span><Link href="/demo" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white hover:text-zinc-300">Open sample <ArrowUpRight className="size-3" /></Link></div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">README / first trace</p><h2 className="mt-5 max-w-[520px] font-sans text-5xl font-medium leading-[0.95] tracking-[-0.06em] md:text-6xl">From install to insight in one sitting.</h2><p className="mt-6 max-w-[430px] text-[16px] leading-7 text-zinc-400">Keep the setup as small as the decision you need to make. Instrument one function, then expand into sessions, evaluations, and release gates.</p><Link href="/docs" className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white underline underline-offset-8 decoration-zinc-600 hover:decoration-white">Read the quickstart <ArrowUpRight className="size-3" /></Link></div>
          <div className="border border-white/15 bg-[#0b0b0b] font-mono text-[12px] leading-7"><div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500"><span>quickstart.ts</span><span>uncoil</span></div><pre className="overflow-x-auto px-5 py-6 text-zinc-300"><code><span className="text-zinc-600">01</span>{"  import { trace } from 'uncoil'\n"}<span className="text-zinc-600">02</span>{"\n"}<span className="text-zinc-600">03</span>{"  const answer = await trace(\n"}<span className="text-zinc-600">04</span>{"    'support-agent',\n"}<span className="text-zinc-600">05</span>{"    () =&gt; agent.run(ticket),\n"}<span className="text-zinc-600">06</span>{"  )\n"}<span className="text-zinc-600">07</span>{"\n"}<span className="text-zinc-600">08</span>{"  // trace, cost, tools, and quality\n"}<span className="text-zinc-600">09</span>{"  // are now linked to this run."}</code></pre><div className="flex items-center gap-2 border-t border-white/10 px-5 py-4 text-[10px] uppercase tracking-[0.14em] text-zinc-500"><Check className="size-3 text-white" /> Your first trace is ready to inspect</div></div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white px-6 py-24 text-black md:px-10 md:py-32"><div className="mx-auto max-w-[980px] text-center"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">The useful part is the connection</p><h2 className="mx-auto mt-6 max-w-[820px] font-sans text-5xl font-medium leading-[0.92] tracking-[-0.07em] md:text-7xl">One trace. Every decision around it.</h2><p className="mx-auto mt-6 max-w-[600px] text-base leading-7 text-zinc-600">From the first tool call to the final release gate, Uncoil keeps your evidence in the same frame.</p><div className="mt-12 grid border-y border-black/15 sm:grid-cols-4">{[["01", "Run", "what happened"], ["02", "Score", "was it good"], ["03", "Compare", "what changed"], ["04", "Ship", "what stays live"]].map(([number, label, detail]) => <div key={label} className="border-b border-black/15 p-5 text-left last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="font-mono text-[10px] text-zinc-500">{number}</span><span className="mt-6 block font-mono text-xs uppercase tracking-[0.14em]">{label}</span><span className="mt-2 block text-sm text-zinc-600">{detail}</span></div>)}</div></div></section>

      <section className="border-t border-white/10 px-6 py-24 md:px-10 md:py-32"><div className="mx-auto max-w-[1240px]"><div className="flex items-center justify-between border-b border-white/15 pb-5"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">Works with the way you build</p><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">open platform</span></div><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">{["OpenAI", "Anthropic", "Vercel AI", "LangChain", "LlamaIndex", "OpenTelemetry"].map((item) => <div key={item} className="border-b border-white/15 p-6 font-mono text-sm text-zinc-300 md:border-r lg:border-b-0">{item}<span className="mt-10 block font-mono text-[10px] uppercase text-zinc-600">connected</span></div>)}</div></div></section>

      <section className="border-t border-white/10 px-6 py-24 md:px-10 md:py-32"><div className="mx-auto max-w-[1240px]"><div className="flex flex-col justify-between gap-6 border-b border-white/15 pb-8 md:flex-row md:items-end"><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">Questions, answered in context</p><h2 className="mt-5 font-sans text-5xl font-medium leading-[0.95] tracking-[-0.06em] md:text-6xl">Built for the whole AI team.</h2></div><Link href="/contact" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-300 hover:text-white">Talk to us <ArrowUpRight className="size-3" /></Link></div><div className="grid border-b border-white/15 md:grid-cols-3">{faqs.map(([question, answer]) => <div key={question} className="border-b border-white/15 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:p-8"><h3 className="font-mono text-sm uppercase tracking-[0.08em] text-white">{question}</h3><p className="mt-5 text-sm leading-7 text-zinc-500">{answer}</p></div>)}</div></div></section>
    </>
  );
}
