import { appHref } from "@/lib/app-links";
import Link from "next/link";

const bars = [
  { left: 0, width: 100, tone: "bg-[#090909]" },
  { left: 3, width: 32, tone: "bg-[#090909]/70" },
  { left: 38, width: 20, tone: "bg-[#f4d44d] outline outline-1 outline-black" },
  { left: 60, width: 36, tone: "bg-[#090909]/70" },
] as const;

/** End-of-article call to action: a yellow panel with a mini trace waterfall. */
export function ArticleCta() {
  return (
    <aside className="mt-16 grid overflow-hidden border border-black bg-[#f4d44d] text-black md:grid-cols-[1.1fr_1fr]" aria-label="Try Uncoil">
      <div className="p-6 md:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em]">Put it into practice</p>
        <p className="mt-4 text-balance font-pixel text-[clamp(2rem,4vw,3.2rem)] leading-[0.92] tracking-[-0.06em]">Watch your own agent think.</p>
        <p className="mt-4 max-w-sm text-sm leading-6">Send one real run and see every model call, tool call and failure on a single timeline.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={appHref("/sign-up")} className="inline-flex min-h-11 items-center bg-black px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eceae3] transition-colors hover:bg-white hover:text-black">Start free →</Link>
          <Link href="/docs/quickstart" className="inline-flex min-h-11 items-center border border-black px-5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-black hover:text-[#eceae3]">Read the quickstart</Link>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3 border-t border-black bg-[#eceae3] p-6 md:border-l md:border-t-0 md:p-10" aria-hidden="true">
        {bars.map((bar, i) => (
          <div key={i} className="h-4 bg-black/10">
            <div className={`h-full ${bar.tone}`} style={{ marginLeft: `${bar.left}%`, width: `${Math.min(bar.width, 100 - bar.left)}%` }} />
          </div>
        ))}
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">run_9f3a · 2.4 s · 4 spans</p>
      </div>
    </aside>
  );
}
