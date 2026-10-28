import { NewsletterCapture } from "@/components/marketing/newsletter-capture";

/** Dark signup band for the end of blog posts, docs pages and tools. */
export function NewsletterPanel({ source, heading = "One email when we publish something worth reading." }: { source: string; heading?: string }) {
  return (
    <aside aria-label="Newsletter" className="mt-14 grid overflow-hidden border border-black bg-[#090909] text-[#eceae3] md:grid-cols-[1.2fr_1fr]">
      <div className="p-6 md:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">The Uncoil letter</p>
        <p className="mt-4 text-balance font-pixel text-[clamp(1.8rem,3.4vw,2.8rem)] leading-[0.95] tracking-[-0.06em]">{heading}</p>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/65">New guides on tracing, cost and reliability for AI agents, plus product updates. No spam, unsubscribe any time.</p>
      </div>
      <div className="flex flex-col justify-center border-t border-white/20 p-6 md:border-l md:border-t-0 md:p-10">
        <NewsletterCapture source={source} />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">We use your email only for this letter.</p>
      </div>
    </aside>
  );
}
