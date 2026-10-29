import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDot,
  GitBranch,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const evidence = [
  { name: "agent.run", detail: "support-agent", time: "2.8s", width: "100%" },
  { name: "retrieve.account", detail: "vector search · 8 results", time: "184ms", width: "18%" },
  { name: "tool.refund_status", detail: "processor timeout · recovered", time: "1.9s", width: "68%" },
  { name: "model.response", detail: "gpt-5 · 612 tokens", time: "462ms", width: "31%" },
] as const;

export function DefinitiveHeroExploration() {
  return (
    <section id="hero-definitive" aria-labelledby="definitive-hero-title" className="relative isolate min-h-[760px] overflow-hidden border-y border-white/15 bg-[#030303] px-6 py-10 text-white md:px-10 md:py-12">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_73%_42%,rgba(255,255,255,0.09),transparent_34%)]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />

      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-center justify-between border-b border-white/15 pb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
          <span>Hero F / definitive direction</span>
          <span className="flex items-center gap-2 text-zinc-300"><span className="size-1.5 bg-white" /> Production signal live</span>
        </div>

        <div className="grid gap-10 pt-10 xl:grid-cols-[0.86fr_1.14fr] xl:items-center">
          <div className="relative z-10">
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.19em] text-zinc-400">
              <span className="h-px w-9 bg-white" /> Agent observability, evaluation, and release
            </div>
            <h2 id="definitive-hero-title" className="mt-7 max-w-[760px] font-pixel text-[clamp(4.2rem,8.3vw,8.3rem)] font-normal leading-[0.76] tracking-[-0.082em]">
              Understand every run. Improve the next.
            </h2>
            <p className="mt-7 max-w-[590px] text-[17px] leading-8 text-zinc-400 md:text-lg">
              Uncoil connects what your agent did, why it failed, what it cost, and whether the fix actually worked—from the first trace to the next production release.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/sign-up" className="group inline-flex h-12 items-center gap-4 bg-white px-6 font-mono text-[10px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Start tracing free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/demo" className="group inline-flex h-12 items-center gap-3 border border-white/20 bg-black/30 px-6 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-200 transition-colors hover:border-white/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Inspect a real run <ScanLine className="size-4" />
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-600">
              <span className="flex items-center gap-2"><Check className="size-3 text-zinc-300" /> Free to start</span>
              <span className="flex items-center gap-2"><Check className="size-3 text-zinc-300" /> TypeScript + Python</span>
              <span className="flex items-center gap-2"><Check className="size-3 text-zinc-300" /> OpenTelemetry native</span>
            </div>
          </div>

          <div className="relative xl:-ml-6">
            <div aria-hidden="true" className="absolute -inset-5 border border-white/[0.06]" />
            <div className="relative border border-white/20 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.65)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-4">
                <div className="flex items-center gap-3"><CircleDot className="size-3" /><p className="font-mono text-[10px] uppercase tracking-[0.15em]">un health / support-agent</p><span className="border border-white/15 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-500">Live</span></div>
                <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-600">run_18f2a9</p>
              </div>

              <div className="grid grid-cols-2 border-b border-white/15 sm:grid-cols-5">
                {[["Release","v2.4.0"],["Quality","0.94"],["Runs","18,204"],["p95","2.8s"],["Spend","$0.041"]].map(([label,value]) => (
                  <div key={label} className="border-r border-white/15 p-4 last:border-r-0">
                    <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-600">{label}</p>
                    <p className="mt-2 font-mono text-[15px] text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-[1.18fr_0.82fr]">
                <div className="border-b border-white/15 p-5 lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500"><span>Execution evidence</span><span>4 spans</span></div>
                  <div className="mt-3 divide-y divide-white/10">
                    {evidence.map((item, index) => (
                      <div key={item.name} className="grid grid-cols-[22px_1fr_auto] items-center gap-3 py-3.5">
                        <span className="font-mono text-[9px] text-zinc-700">0{index + 1}</span>
                        <div className="min-w-0"><div className="flex items-center gap-2"><ChevronRight className="size-3 text-zinc-600" /><p className="truncate font-mono text-[10px]">{item.name}</p></div><div className="ml-5 mt-2 h-px bg-white/10"><div className="h-px bg-white/60" style={{ width: item.width }} /></div><p className="ml-5 mt-1.5 truncate font-mono text-[8px] text-zinc-700">{item.detail}</p></div>
                        <span className="font-mono text-[9px] text-zinc-500">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex-1 p-5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">Root cause</p>
                    <div className="mt-5 border-l-2 border-white pl-4">
                      <p className="font-sans text-lg leading-6">Refund status timed out. The model recovered from stale context.</p>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-px bg-white/10">
                      <div className="bg-[#070707] p-3"><p className="font-mono text-[8px] uppercase text-zinc-600">Impact</p><p className="mt-2 font-mono text-xs">12 sessions</p></div>
                      <div className="bg-[#070707] p-3"><p className="font-mono text-[8px] uppercase text-zinc-600">Confidence</p><p className="mt-2 font-mono text-xs">98.6%</p></div>
                    </div>
                  </div>
                  <div className="border-t border-white/15 bg-white p-5 text-black">
                    <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em]"><Sparkles className="size-3" /> Fix evaluated</p>
                    <div className="mt-4 flex items-end justify-between gap-4"><div><p className="font-sans text-lg leading-5">Verified tool state before response</p><p className="mt-2 font-mono text-[8px] uppercase text-zinc-500">Prompt v18 · candidate</p></div><p className="font-pixel text-4xl tracking-[-0.06em]">+22</p></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 px-5 py-4">
                <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em]"><ShieldCheck className="size-3" /> Regression check passed</p>
                <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500"><GitBranch className="size-3" /> Safe to promote</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid border-y border-white/15 sm:grid-cols-3">
          <Link href="/product/trace-viewer" className="group flex items-center justify-between border-b border-white/15 py-4 pr-5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500 hover:text-white sm:border-b-0 sm:border-r sm:pl-5"><span>01 · Trace every decision</span><ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          <Link href="/product/evaluation-engine" className="group flex items-center justify-between border-b border-white/15 py-4 pr-5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500 hover:text-white sm:border-b-0 sm:border-r sm:pl-5"><span>02 · Evaluate real behavior</span><ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          <Link href="/product/lifecycle" className="group flex items-center justify-between py-4 pr-5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500 hover:text-white sm:pl-5"><span>03 · Release with proof</span><ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
        </div>
      </div>
    </section>
  );
}
