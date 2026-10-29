import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, breadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { glossaryTerms } from "@/lib/glossary";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction } from "@/components/marketing/company/blocks";

export function generateStaticParams() {
  return glossaryTerms.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ term: string }> }): Promise<Metadata> {
  const { term } = await params;
  const t = glossaryTerms.find((item) => item.slug === term);
  return t ? pageMetadata({ title: `What is ${t.term}?`, description: t.definition.slice(0, 158), path: `/glossary/${t.slug}` }) : {};
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  const t = glossaryTerms.find((item) => item.slug === term);
  if (!t) notFound();
  const index = glossaryTerms.indexOf(t);
  const prev = glossaryTerms[(index - 1 + glossaryTerms.length) % glossaryTerms.length];
  const next = glossaryTerms[(index + 1) % glossaryTerms.length];
  const related = t.related.map((slug) => glossaryTerms.find((x) => x.slug === slug)).filter((x): x is (typeof glossaryTerms)[number] => Boolean(x));
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Glossary", path: "/glossary" }, { name: t.term, path: `/glossary/${t.slug}` }]),
    { "@context": "https://schema.org", "@type": "DefinedTerm", name: t.term, description: t.definition, url: `https://www.uncoil.dev/glossary/${t.slug}`, inDefinedTermSet: "https://www.uncoil.dev/glossary" },
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <section className="bg-[#090909] px-5 pb-16 pt-14 text-[#eceae3] md:px-10 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-[1320px]">
          <Link href="/glossary" className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d] hover:underline">← Glossary / {String(index + 1).padStart(2, "0")} of {glossaryTerms.length}</Link>
          <div className="mt-8 grid gap-px border-2 border-[#eceae3] bg-[#eceae3] lg:grid-cols-[1.1fr_1fr]">
            <div className="bg-[#090909] p-8 md:p-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">n. / {t.group ?? "AI agents"}</p>
              <h1 className="mt-5 font-pixel text-[clamp(2.6rem,6.5vw,6rem)] leading-[0.88] tracking-[-0.06em]">{t.term}</h1>
            </div>
            <div className="bg-[#f4d44d] p-8 text-black md:p-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">Definition</p>
              <p className="mt-5 text-xl leading-8 md:text-2xl md:leading-9">{t.definition}</p>
            </div>
          </div>
          <div className="mt-px flex items-stretch justify-between gap-px border-2 border-t-0 border-[#eceae3] bg-[#eceae3] font-mono text-[11px] uppercase tracking-[0.14em]">
            <Link href={`/glossary/${prev.slug}`} className="flex-1 bg-[#090909] p-4 transition-colors hover:bg-[#f4d44d] hover:text-black">← {prev.term}</Link>
            <Link href={`/glossary/${next.slug}`} className="flex-1 bg-[#090909] p-4 text-right transition-colors hover:bg-[#f4d44d] hover:text-black">{next.term} →</Link>
          </div>
        </div>
      </section>
      <CreamBand>
        <div className="max-w-3xl">
          <Eyebrow dark={false}>In more detail</Eyebrow>
          <p className="mt-6 text-lg leading-8 text-black/80">{t.expansion}</p>
          {t.example && (
            <div className="mt-10 border-l-4 border-[#f4d44d] bg-black/[0.04] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Example</p>
              <p className="mt-3 text-base leading-7 text-black/80">{t.example}</p>
            </div>
          )}
          {related.length > 0 && (
            <div className="mt-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Related terms</p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {related.map((r) => <li key={r.slug}><Link href={`/glossary/${r.slug}`} className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">{r.term}</Link></li>)}
              </ul>
            </div>
          )}
          <div className="mt-10"><HeaderAction href={t.link?.href ?? appHref("/demo/project")}>{t.link?.label ?? "See it in a live trace"}</HeaderAction></div>
        </div>
      </CreamBand>
      <ClosingBand title="Definitions are the start." body="Open a real trace and watch these terms move." actions={[{ href: appHref("/demo/project"), label: "Open the demo", primary: true }, { href: "/docs", label: "Read the docs" }]} />
    </div>
  );
}
