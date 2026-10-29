import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getDocs } from "@/lib/markdoc-docs";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsJourney, DocsTerminal } from "@/components/docs/docs-experience";
import { Reveal } from "@/components/marketing/landing/reveal";

export const metadata = pageMetadata({ title: "Uncoil docs: trace AI agents in minutes", description: "Install the TypeScript or Python SDK, send OpenTelemetry traces, instrument an agent and inspect every run, tool call and cost.", path: "/docs" });

const eyebrow = "font-mono text-[10px] uppercase tracking-[.16em] text-black/55";

export default function DocsRootPage() {
  const docs = getDocs();
  const navigationDocs = docs.map(({ slug, title, section }) => ({ slug, title, section }));
  const sections = [...new Set(docs.map((doc) => doc.section))];

  return (
    <div className="bg-[#eceae3] text-black">
      <section className="relative isolate overflow-hidden bg-[#090909] text-[#eceae3]">
        <Image src="/images/reading/docs.png" alt="" fill priority unoptimized sizes="100vw" className="-z-10 object-cover opacity-45 [image-rendering:pixelated]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#090909_10%,rgba(9,9,9,0.55)_60%,rgba(9,9,9,0.3)_100%)]" />
        <div className="mx-auto grid min-h-[min(82svh,760px)] max-w-[1320px] items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70"><span className="bg-[#f4d44d] px-1.5 text-black">Docs</span> {docs.length} guides · TypeScript · Python</p>
            <h1 className="mt-8 font-pixel text-[clamp(3.2rem,9vw,8.4rem)] leading-[0.88] tracking-[-0.07em]">Build agents you can <span className="text-[#f4d44d]">explain.</span></h1>
            <p className="mt-7 max-w-[520px] text-base leading-7 text-white/70 md:text-lg md:leading-8">Trace decisions, measure outcomes, and promote the versions that prove themselves in production.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/docs/quickstart" className="inline-flex min-h-12 items-center gap-3 bg-[#f4d44d] px-6 font-mono text-[11px] uppercase tracking-[.14em] text-black transition-colors hover:bg-white">Start tracing <ArrowRight className="size-4" /></Link>
              <Link href="/docs/mcp-server" className="inline-flex min-h-12 items-center gap-3 border border-white/30 px-6 font-mono text-[11px] uppercase tracking-[.14em] transition-colors hover:border-[#f4d44d] hover:text-[#f4d44d]">Install Docs MCP <ArrowRight className="size-4" /></Link>
            </div>
          </div>
          <DocsTerminal />
        </div>
      </section>

      <DocsJourney />

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[250px_minmax(0,1fr)]">
      <DocsSidebar docs={navigationDocs} />
      <div className="min-w-0">

      <section id="guides" className="scroll-mt-24 px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1320px]">
          <p className={eyebrow}>All guides</p>
          <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">Read by intent.</h2>
          <div className="mt-14 grid gap-x-12 gap-y-12 md:grid-cols-2">
            {sections.map((section, si) => (
              <Reveal key={section} delay={(si % 2) * 0.06}>
                <div>
                  <div className="flex items-baseline justify-between border-b-2 border-black pb-3 font-mono text-[11px] uppercase tracking-[.14em]"><span>{section}</span><span className="text-black/50">{docs.filter((d) => d.section === section).length}</span></div>
                  {docs.filter((doc) => doc.section === section).map((doc) => (
                    <Link key={doc.slug} href={`/docs/${doc.slug}`} className="group block border-b border-black/20 py-4 transition-colors hover:bg-[#f4d44d] sm:px-3">
                      <span className="flex items-center justify-between gap-3 font-pixel text-2xl tracking-[-.04em]">{doc.title}<ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" /></span>
                      <span className="mt-1 block text-sm leading-6 text-black/65 group-hover:text-black">{doc.description}</span>
                    </Link>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      </div>
      </div>

      <aside className="bg-[#f4d44d]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-10 md:py-16">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-1 size-7 shrink-0" strokeWidth={1.4} />
            <div>
              <p className="font-pixel text-[clamp(2rem,4vw,3.2rem)] leading-none tracking-[-.06em]">Give your AI agent the docs.</p>
              <p className="mt-3 max-w-md text-sm leading-6">Read-only access to the whole public docs corpus, over MCP.</p>
            </div>
          </div>
          <Link href="/docs/mcp-server" className="inline-flex min-h-12 items-center justify-center bg-black px-6 font-mono text-[11px] uppercase tracking-[.14em] text-[#eceae3] transition-colors hover:bg-white hover:text-black">Install Docs MCP →</Link>
        </div>
      </aside>
    </div>
  );
}
