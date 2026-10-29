import Link from "next/link";
import { ArrowUpRight, Check, Code2, Rss } from "lucide-react";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";

const linkGroups = [
  { title: "Product", links: [["Trace viewer", "/product/trace-viewer"], ["Evaluation", "/product/evaluation-engine"], ["Cost analysis", "/product/cost-dashboard"], ["Lifecycle", "/product/lifecycle"], ["Pricing", "/pricing"]] },
  { title: "Developers", links: [["Documentation", "/docs"], ["Quickstart", "/docs/typescript"], ["Integrations", "/integrations"], ["API reference", "/docs/api"], ["Status", "/status"]] },
  { title: "Company", links: [["Blog", "/blog"], ["Changelog", "/changelog"], ["Roadmap", "/roadmap"], ["Security", "/security"], ["Contact", "/contact"]] },
  { title: "Resources", links: [["Agent tracing", "/use-cases/automation"], ["Support agents", "/use-cases/support"], ["Research agents", "/use-cases/research"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
] as const;

function FooterLinks({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-x-8 gap-y-10 ${compact ? "lg:grid-cols-2" : "md:grid-cols-4"}`}>
      {linkGroups.map((group) => (
        <nav key={group.title} aria-label={`${group.title} footer links`}>
          <p className={`font-mono text-[9px] uppercase tracking-[0.18em] ${inverse ? "text-zinc-500" : "text-zinc-600"}`}>{group.title}</p>
          <ul className="mt-5 space-y-3">
            {group.links.map(([label, href]) => <li key={label}><Link href={href} className={`font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${inverse ? "text-zinc-700 hover:text-black" : "text-zinc-400 hover:text-white"}`}>{label}</Link></li>)}
          </ul>
        </nav>
      ))}
    </div>
  );
}

function NewsletterForm({ inverse = false }: { inverse?: boolean; buttonLabel?: string }) {
  return <NewsletterCapture inverse={inverse} />;
}

function VariationLabel({ number, name, inverse = false }: { number: string; name: string; inverse?: boolean }) {
  return <div className={`flex items-center justify-between border-b pb-4 font-mono text-[9px] uppercase tracking-[0.17em] ${inverse ? "border-black/15 text-zinc-500" : "border-white/15 text-zinc-600"}`}><span>Footer {number} / {name}</span><span>Newsletter + link categories</span></div>;
}

export function FooterExplorations() {
  const year = new Date().getFullYear();

  return (
    <section aria-label="Footer design explorations" className="border-t-4 border-double border-white/30 bg-black">
      <div className="border-b border-white/15 px-6 py-5 md:px-10"><div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-[0.2em]">Footer exploration gallery</p><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">Five independently removable directions</p></div></div>

      <footer id="footer-editorial" className="border-b border-white/15 px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1240px]"><VariationLabel number="01" name="editorial signal" /><div className="grid gap-12 border-b border-white/15 py-12 lg:grid-cols-[1fr_1fr]"><div><p className="font-pixel text-3xl tracking-[-0.05em]">uncoil</p><h2 className="mt-10 max-w-[630px] font-pixel text-5xl font-normal leading-[0.88] tracking-[-0.065em] md:text-7xl">Production intelligence for teams building agents.</h2></div><div className="grid content-between gap-12"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">The agent engineering briefing</p><p className="mt-4 max-w-[510px] text-[16px] leading-7 text-zinc-400">One useful email on debugging, evaluation, and shipping reliable agents. Product updates included. No noise.</p><div className="mt-6 max-w-[520px]"><NewsletterForm buttonLabel="Join briefing" /></div><p className="mt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-700">Monthly · unsubscribe anytime</p></div><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em]"><span className="size-1.5 bg-white" /> All systems operational</div></div></div><FooterLinks /><div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-700"><span>© {year} Uncoil, Inc.</span><span>Built for the next reliable run.</span><div className="flex gap-5"><Link href="https://x.com/uncoil">X / Twitter</Link><Link href="/blog/rss.xml">RSS</Link></div></div></div>
      </footer>

      <footer id="footer-newsroom" className="border-b border-black/15 bg-[#efede7] px-6 py-14 text-black md:px-10 md:py-20">
        <div className="mx-auto max-w-[1240px]"><VariationLabel number="02" name="newsroom grid" inverse /><div className="grid border-b border-black/15 lg:grid-cols-[1.08fr_0.92fr]"><div className="border-b border-black/15 py-12 lg:border-b-0 lg:border-r lg:pr-12"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Notes from production</p><h2 className="mt-6 max-w-[650px] font-pixel text-6xl font-normal leading-[0.84] tracking-[-0.07em] md:text-8xl">Better agents start with better evidence.</h2><p className="mt-7 max-w-[540px] text-lg leading-8 text-zinc-600">Field notes, release breakdowns, and practical lessons from teams operating AI agents.</p></div><div className="grid content-between gap-12 py-12 lg:pl-12"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em]">Get the next dispatch</p><div className="mt-6"><NewsletterForm inverse buttonLabel="Sign me up" /></div><div className="mt-5 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-500"><Check className="size-3" /> No launch spam. Just useful operational lessons.</div></div><Link href="/blog" className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em]">Browse every field note <ArrowUpRight className="size-3" /></Link></div></div><div className="grid gap-12 py-12 lg:grid-cols-[0.7fr_1.3fr]"><div><p className="font-pixel text-4xl tracking-[-0.06em]">uncoil</p><p className="mt-5 max-w-[260px] font-mono text-[9px] uppercase leading-5 tracking-[0.13em] text-zinc-500">The evidence layer between a production run and a better release.</p></div><FooterLinks inverse /></div><div className="flex flex-wrap justify-between gap-4 border-t border-black/15 pt-6 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-500"><span>© {year} Uncoil</span><div className="flex gap-5"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/status">Status · operational</Link></div></div></div>
      </footer>

      <footer id="footer-control-room" className="border-b border-white/15 bg-[#050505] px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1240px]"><VariationLabel number="03" name="control room" /><div className="grid gap-px border border-white/15 bg-white/15 lg:grid-cols-[0.72fr_1.28fr]"><div className="flex flex-col justify-between bg-[#050505] p-7"><div><div className="flex items-center justify-between"><p className="font-pixel text-3xl tracking-[-0.05em]">uncoil</p><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-600">TRL / 2026</span></div><p className="mt-9 max-w-[380px] font-sans text-3xl leading-tight tracking-[-0.045em]">Keep your team ahead of the next production failure.</p></div><div className="mt-12"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">Subscribe to signal reports</p><div className="mt-4"><NewsletterForm buttonLabel="Receive reports" /></div><p className="mt-3 font-mono text-[8px] text-zinc-700">01–02 reports / month</p></div></div><div className="bg-black"><div className="grid border-b border-white/15 sm:grid-cols-3">{[["Ingest API","Operational"],["Trace queries","Operational"],["Evaluations","Operational"]].map(([service,status]) => <div key={service} className="border-b border-white/15 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="font-mono text-[8px] uppercase text-zinc-600">{service}</p><p className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase"><span className="size-1.5 bg-white" />{status}</p></div>)}</div><div className="p-7"><FooterLinks compact /></div></div></div><div className="mt-6 grid gap-4 border-t border-white/15 pt-6 font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-700 md:grid-cols-3"><span>© {year} Uncoil</span><span className="md:text-center">Oslo · Remote · Everywhere</span><div className="flex gap-5 md:justify-end"><Link href="https://github.com">GitHub</Link><Link href="https://x.com/uncoil">X</Link><Link href="/contact">Email</Link></div></div></div>
      </footer>

      <footer id="footer-monument" className="bg-white px-6 pt-14 text-black md:px-10 md:pt-20">
        <div className="mx-auto max-w-[1240px]"><VariationLabel number="04" name="brand monument" inverse /><div className="grid gap-12 py-12 lg:grid-cols-[0.72fr_1.28fr]"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Stay close to the signal</p><h2 className="mt-6 max-w-[450px] font-sans text-4xl leading-[0.95] tracking-[-0.06em] md:text-5xl">A short newsletter for people responsible for agent behavior.</h2><div className="mt-8 max-w-[470px]"><NewsletterForm inverse buttonLabel="Subscribe" /></div><p className="mt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-500">Practical. Technical. Worth opening.</p></div><FooterLinks inverse /></div><div className="flex flex-wrap items-center justify-between gap-5 border-y border-black/15 py-5"><div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em]"><span className="size-1.5 bg-black" /> All systems operational</div><div className="flex items-center gap-5"><Link href="https://github.com" aria-label="Uncoil on GitHub"><Code2 className="size-4" /></Link><Link href="/blog/rss.xml" aria-label="Uncoil RSS feed"><Rss className="size-4" /></Link><Link href="https://x.com/uncoil" className="font-mono text-[9px] uppercase tracking-[0.14em]">X / Twitter</Link></div></div><div aria-hidden="true" className="overflow-hidden pt-8"><p className="translate-y-[0.12em] whitespace-nowrap font-pixel text-[clamp(8rem,25vw,22rem)] leading-[0.62] tracking-[-0.09em]">uncoil</p></div><div className="flex flex-wrap justify-between gap-4 border-t border-black/15 py-5 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-500"><span>© {year} Uncoil, Inc.</span><span>Agent observability infrastructure</span><div className="flex gap-5"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div></div>
      </footer>

      <footer id="footer-full-bleed" className="relative overflow-hidden border-t border-white/15 bg-[#050505] pt-14 md:pt-20">
        <div className="px-6 md:px-10"><div className="mx-auto max-w-[1240px]"><VariationLabel number="05" name="full-bleed wordmark" /><div className="grid gap-12 py-12 lg:grid-cols-[0.78fr_1.22fr]"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Agent engineering, in your inbox</p><h2 className="mt-5 max-w-[480px] font-sans text-4xl leading-[0.98] tracking-[-0.055em]">Learn from production. Ship the next run better.</h2><p className="mt-5 max-w-[450px] text-sm leading-7 text-zinc-500">A concise monthly briefing on tracing, evaluation, cost, and release quality.</p><div className="mt-7 max-w-[500px]"><NewsletterForm buttonLabel="Join newsletter" /></div></div><FooterLinks /></div><div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 py-5 font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-600"><div className="flex items-center gap-2"><span className="size-1.5 bg-white" /> All systems operational</div><div className="flex gap-5"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/contact" className="hover:text-white">Contact</Link><Link href="https://x.com/uncoil" className="hover:text-white">X / Twitter</Link></div></div></div></div>
        <Link href="/" aria-label="Uncoil home" className="group block w-full overflow-hidden border-t border-white/15 pt-[4vw] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white">
          <span className="block w-full origin-center scale-x-[1.12] whitespace-nowrap text-center font-pixel text-[clamp(7rem,27vw,34rem)] font-normal leading-[0.53] tracking-[-0.105em] text-white transition-colors group-hover:text-zinc-300">uncoil</span>
        </Link>
        <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/15 px-6 py-5 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-700 md:px-10"><span>© {year} Uncoil, Inc.</span><span>Understand every run. Improve the next.</span><span>Oslo · Worldwide</span></div>
      </footer>

      <div className="border-y border-white/15 bg-black px-6 py-5 md:px-10"><div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-[0.18em]">End of footer explorations 01–05</p><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">Current production footer remains below</p></div></div>
    </section>
  );
}
