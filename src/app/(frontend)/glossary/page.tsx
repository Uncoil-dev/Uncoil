import { appHref } from "@/lib/app-links";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, DarkBand, HeaderAction } from "@/components/marketing/company/blocks";
import { glossaryTerms as terms } from "@/lib/glossary";
import { GlossaryExplorer } from "@/components/marketing/company/glossary-explorer";



import { TermFlipper } from "@/components/marketing/company/term-flipper";
import { SpanAnatomy } from "@/components/marketing/company/span-anatomy";
export const metadata = pageMetadata({ title: "AI observability glossary", description: "Plain-language definitions of LLM observability, AI agent tracing, spans, tool calls, and agent evaluation terms used across the Tracify platform.", path: "/glossary" });

function GlossarySchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "AI Observability Glossary",
    url: "https://www.tracify.tech/glossary",
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `https://www.tracify.tech/glossary#${t.slug}`,
      name: t.term,
      description: t.definition,
      inDefinedTermSet: "https://www.tracify.tech/glossary",
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function GlossaryPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <GlossarySchema />
      <PageHeader
        eyebrow="Reference / definitions"
        title="AI observability glossary"
        lede="Short, direct definitions for the terms used across agent tracing, LLM observability and evaluation, written to be quoted, not just read."
        image="/images/company/glossary-text.png"
      >
        <HeaderAction href={appHref("/demo/project")}>See the terms as live traces</HeaderAction>
        <HeaderAction href="/docs" kind="secondary">Read the docs</HeaderAction>
      </PageHeader>

      <DarkBand className="!py-12 md:!py-16"><TermFlipper terms={terms} /></DarkBand>

      <section className="bg-[#eceae3] px-5 pb-24 pt-20 text-black md:px-10">
        <div className="mx-auto max-w-[1320px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Start with the picture</p>
          <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[0.92] tracking-[-0.07em]">Most of these words are one trace.</h2>
          <div className="mb-20 mt-10"><SpanAnatomy /></div>
          <GlossaryExplorer terms={terms} />
        </div>
      </section>

      <ClosingBand
        title="Definitions are the start."
        body="Open a real trace and watch these terms move."
        actions={[{ href: appHref("/demo/project"), label: "Open the demo", primary: true }, { href: "/blog/what-is-ai-observability", label: "What is AI observability?" }]}
      />
    </div>
  );
}
