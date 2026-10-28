import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDot,
  Code2,
  GitBranch,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

function HeroTag({ letter, title, light = false }: { letter: string; title: string; light?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b pb-4 font-mono text-[9px] uppercase tracking-[0.18em] ${light ? "border-black/15 text-zinc-500" : "border-white/15 text-zinc-500"}`}>
      <span>Hero {letter} / {title}</span>
      <span>Standalone direction</span>
    </div>
  );
}

const traceRows = [
  ["01", "agent.run", "2.8s", "ok"],
  ["02", "retrieve.account", "184ms", "ok"],
  ["03", "tool.refund_status", "1.9s", "slow"],
  ["04", "model.response", "462ms", "ok"],
] as const;

export function LandingHeroExplorations() {
  return (
    <section aria-label="Alternative hero explorations" className="border-t-4 border-double border-white/30 bg-black">
      <div className="border-b border-white/15 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Hero exploration gallery</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">Five new openings · original hero unchanged</p>
        </div>
      </div>

      <section id="hero-command-center" className="relative min-h-[720px] overflow-hidden border-b border-white/15 px-6 py-16 md:px-10">
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="relative mx-auto max-w-[1240px]">
          <HeroTag letter="A" title="command center" />
          <div className="grid gap-12 pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Agent observability for production teams</p>
              <h2 className="mt-6 max-w-[660px] font-pixel text-[clamp(4.2rem,8vw,7.6rem)] font-normal leading-[0.78] tracking-[-0.075em]">Know why the agent did that.</h2>
              <p className="mt-7 max-w-[520px] text-lg leading-8 text-zinc-400">Trace every decision, explain every failure, and prove the next release is better before it reaches everyone.</p>
              <div className="mt-9 flex flex-wrap gap-3"><Link href="/sign-up" className="inline-flex h-12 items-center gap-3 bg-white px-6 font-mono text-[10px] uppercase tracking-[0.14em] text-black">Start tracing free <ArrowRight className="size-4" /></Link><Link href="/demo" className="inline-flex h-12 items-center gap-3 border border-white/20 px-6 font-mono text-[10px] uppercase tracking-[0.14em]">Explore a live run <ArrowUpRight className="size-4" /></Link></div>
            </div>
            <div className="border border-white/15 bg-[#080808] shadow-[24px_24px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between border-b border-white/15 px-5 py-4"><div className="flex items-center gap-3"><CircleDot className="size-3" /><span className="font-mono text-[10px] uppercase tracking-[0.14em]">support-agent / run_18f2</span></div><span className="font-mono text-[9px] uppercase text-zinc-500">Live</span></div>
              <div className="grid grid-cols-4 border-b border-white/15">{[["Quality","0.94"],["p95","2.8s"],["Cost","$0.041"],["Release","v2.4"]].map(([label,value]) => <div key={label} className="border-r border-white/15 p-4 last:border-r-0"><p className="font-mono text-[8px] uppercase text-zinc-600">{label}</p><p className="mt-2 font-mono text-base">{value}</p></div>)}</div>
              <div className="divide-y divide-white/10 p-5">{traceRows.map(([number,name,time,status]) => <div key={number} className="grid grid-cols-[34px_1fr_auto_auto] items-center gap-4 py-4 font-mono text-[10px]"><span className="text-zinc-700">{number}</span><span>{name}</span><span className="text-zinc-500">{time}</span><span className={status === "slow" ? "border border-white/30 px-2 py-1" : "text-zinc-600"}>{status}</span></div>)}</div>
              <div className="flex items-center gap-2 border-t border-white/15 px-5 py-4 font-mono text-[9px] uppercase tracking-[0.14em]"><Check className="size-3" /> Regression check passed</div>
            </div>
          </div>
        </div>
      </section>

      <section id="hero-editorial" className="min-h-[720px] border-b border-black/15 bg-[#f2f0ea] px-6 py-16 text-black md:px-10">
        <div className="mx-auto max-w-[1240px]"><HeroTag letter="B" title="editorial declaration" light /><div className="grid min-h-[600px] grid-rows-[1fr_auto] pt-12"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Uncoil / the evidence layer for AI agents</p><h2 className="mt-8 max-w-[1120px] font-pixel text-[clamp(4.5rem,11vw,10rem)] font-normal leading-[0.74] tracking-[-0.085em]">Your agent is already telling you what went wrong.</h2></div><div className="grid gap-8 border-t border-black/20 pt-7 md:grid-cols-[1fr_0.7fr_auto] md:items-end"><p className="max-w-[570px] text-xl leading-8">Uncoil turns production behavior into a record your whole team can inspect, evaluate, and improve.</p><p className="font-mono text-[10px] uppercase leading-6 tracking-[0.12em] text-zinc-500">Trace → evaluate → compare → release</p><Link href="/sign-up" className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">Build with evidence <ArrowRight className="size-4" /></Link></div></div></div>
      </section>

      <section id="hero-incident" className="min-h-[720px] border-b border-white/15 bg-[#060606] px-6 py-16 md:px-10">
        <div className="mx-auto max-w-[1240px]"><HeroTag letter="C" title="live incident" /><div className="grid gap-px border border-white/15 bg-white/15 lg:grid-cols-[0.82fr_1.18fr]"><div className="flex min-h-[590px] flex-col justify-between bg-[#060606] p-7 md:p-10"><div><div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em]"><span className="size-2 bg-white" /> Incident 018 · detected 42s ago</div><h2 className="mt-10 max-w-[610px] font-pixel text-6xl font-normal leading-[0.84] tracking-[-0.07em] md:text-8xl">Find the failure before the customer does.</h2><p className="mt-7 max-w-[490px] text-lg leading-8 text-zinc-400">One live view connects the broken response to the exact tool call, prompt version, and release that caused it.</p></div><div className="flex flex-wrap gap-3"><Link href="/demo" className="inline-flex h-12 items-center gap-3 bg-white px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-black">Investigate this run <ScanLine className="size-4" /></Link><Link href="/docs" className="inline-flex h-12 items-center px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">Read the docs</Link></div></div><div className="bg-black p-6 font-mono"><div className="flex items-center justify-between border-b border-white/15 pb-4 text-[9px] uppercase tracking-[0.14em] text-zinc-500"><span>Root-cause inspector</span><Terminal className="size-4" /></div><div className="mt-6 border-l border-white/20 pl-5"><p className="text-[9px] uppercase text-zinc-600">Customer report</p><p className="mt-3 max-w-[520px] font-sans text-2xl leading-tight">“The assistant said my refund was complete, but nothing arrived.”</p></div><div className="mt-8 grid gap-px bg-white/10"><div className="bg-[#080808] p-5"><p className="text-[9px] uppercase text-zinc-600">Failed decision</p><p className="mt-3 text-sm leading-7">model.response relied on stale account context after refund_status timed out.</p></div><div className="grid gap-px bg-white/10 sm:grid-cols-2"><div className="bg-[#080808] p-5"><p className="text-[9px] uppercase text-zinc-600">Prompt</p><p className="mt-3 text-sm">support-agent@v17</p></div><div className="bg-[#080808] p-5"><p className="text-[9px] uppercase text-zinc-600">Recommended fix</p><p className="mt-3 text-sm">Require verified processor state.</p></div></div></div><div className="mt-8 border border-white/20 bg-white p-5 text-black"><p className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em]"><Sparkles className="size-3" /> Fix candidate evaluated</p><div className="mt-4 flex items-end justify-between"><p className="font-sans text-lg">Quality +22 points</p><p className="text-3xl">0.94</p></div></div></div></div></div>
      </section>

      <section id="hero-release-proof" className="min-h-[720px] border-b border-white/15 px-6 py-16 md:px-10">
        <div className="mx-auto max-w-[1240px]"><HeroTag letter="D" title="release proof" /><div className="grid gap-12 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Release with proof, not hope</p><h2 className="mt-7 max-w-[760px] font-pixel text-[clamp(4rem,8vw,7.5rem)] font-normal leading-[0.8] tracking-[-0.075em]">Every release should explain why it deserves production.</h2><p className="mt-7 max-w-[560px] text-lg leading-8 text-zinc-400">Compare behavior across prompts and models, gate regressions, and watch the winning version hold up in the real world.</p></div><div className="border-l border-white/15"><div className="border-y border-r border-white/15 p-6"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.14em]">Candidate v2.4.0</p><GitBranch className="size-4 text-zinc-500" /></div><p className="mt-9 font-pixel text-8xl tracking-[-0.08em]">94.2</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">Release quality score</p><div className="mt-8 space-y-4">{[["Task success","96%"],["Policy compliance","100%"],["Cost target","91%"]].map(([label,value]) => <div key={label} className="flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[10px]"><span className="text-zinc-500">{label}</span><span>{value}</span></div>)}</div><div className="mt-7 flex items-center gap-2 bg-white px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-black"><ShieldCheck className="size-3" /> Ready for production</div></div></div></div><div className="mt-14 flex flex-wrap items-center justify-between gap-5 border-t border-white/15 pt-6"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">18,204 production runs · regression check passed</p><Link href="/sign-up" className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">Start a release check <ArrowRight className="size-4" /></Link></div></div>
      </section>

      <section id="hero-developer" className="min-h-[720px] bg-white px-6 py-16 text-black md:px-10">
        <div className="mx-auto max-w-[1240px]"><HeroTag letter="E" title="developer quickstart" light /><div className="grid gap-14 pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"><div><div className="inline-flex items-center gap-2 border border-black/15 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em]"><Code2 className="size-3" /> TypeScript · Python · OpenTelemetry</div><h2 className="mt-8 max-w-[660px] font-pixel text-[clamp(4rem,8vw,7.4rem)] font-normal leading-[0.8] tracking-[-0.075em]">One wrapper. The whole story.</h2><p className="mt-7 max-w-[520px] text-lg leading-8 text-zinc-600">Add Uncoil where your agent runs. Get prompts, tool calls, cost, latency, failures, and evaluations in one connected trace.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/docs" className="inline-flex h-12 items-center gap-3 bg-black px-6 font-mono text-[10px] uppercase tracking-[0.14em] text-white">Read the quickstart <ArrowRight className="size-4" /></Link><Link href="/sign-up" className="inline-flex h-12 items-center border border-black/20 px-6 font-mono text-[10px] uppercase tracking-[0.14em]">Create a free project</Link></div></div><div className="border border-black/20 bg-[#f3f2ed] shadow-[20px_20px_0_#111]"><div className="flex items-center justify-between border-b border-black/15 px-5 py-4 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500"><span>support-agent.ts</span><span>First trace / 01</span></div><pre className="overflow-x-auto p-6 font-mono text-[13px] leading-8"><code><span className="text-zinc-400">01</span>{"  import { trace } from 'uncoil'\n"}<span className="text-zinc-400">02</span>{"\n"}<span className="text-zinc-400">03</span>{"  const result = await trace(\n"}<span className="text-zinc-400">04</span>{"    'support-agent',\n"}<span className="text-zinc-400">05</span>{"    () => agent.respond(ticket),\n"}<span className="text-zinc-400">06</span>{"  )\n"}<span className="text-zinc-400">07</span>{"\n"}<span className="text-zinc-400">08</span>{"  // inspect what happened"}</code></pre><div className="grid grid-cols-3 border-t border-black/15">{[["Setup","3 min"],["Signals","12"],["Status","Live"]].map(([label,value]) => <div key={label} className="border-r border-black/15 p-4 last:border-r-0"><p className="font-mono text-[8px] uppercase text-zinc-500">{label}</p><p className="mt-2 font-mono text-sm">{value}</p></div>)}</div></div></div></div>
      </section>

      <div className="border-y border-white/15 bg-black px-6 py-5 md:px-10"><div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-[0.18em]">End of hero explorations A–E</p><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">Original hero remains unchanged</p></div></div>
    </section>
  );
}
