import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdString } from "@/lib/seo";
import { comparisons } from "@/lib/seo-pages";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, DarkBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";
import { MarkdocRichText } from "@/components/blog/markdoc-rich-text";
import { getPublishedPost } from "@/lib/markdoc-blog";
import { FaqList } from "@/components/marketing/company/faq-list";

export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = comparisons.find((item) => item.slug === slug);
  if (!c) return {};
  return pageMetadata({
    title: `Tracify vs ${c.name}: AI agent observability compared`,
    description: `Tracify vs ${c.name}: how they differ on tracing, cost tracking, evaluation and hosting, and when each is the better choice.`,
    path: `/compare/${c.slug}`,
  });
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = comparisons.find((item) => item.slug === slug);
  if (!c) notFound();
  const schema = [
    breadcrumbJsonLd([{ name: "Tracify", path: "/" }, { name: "Compare", path: "/compare" }, { name: `Tracify vs ${c.name}`, path: `/compare/${c.slug}` }]),
    faqJsonLd(c.faq),
  ];
  const article = c.post ? await getPublishedPost(c.post) : null;
  const others = comparisons.filter((item) => item.slug !== c.slug);
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow={`Compare / ${c.name}`} title={`Tracify vs ${c.name}`} lede={c.oneLine}>
        <HeaderAction href={appHref("/sign-up")}>Start free</HeaderAction>
        {article && <HeaderAction href="#full-comparison" kind="secondary">Read the full comparison</HeaderAction>}
      </PageHeader>

      <CreamBand>
        <Eyebrow dark={false}>Short answer</Eyebrow>
        <SectionTitle>Which one should you pick?</SectionTitle>
        <div className="mt-12 grid gap-px border border-black bg-black md:grid-cols-2">
          <div className="bg-[#eceae3] p-8">
            <h3 className="font-pixel text-2xl tracking-[-0.05em]">Pick {c.name} if</h3>
            <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-black/75">{c.pickThem.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div className="bg-[#f4d44d] p-8">
            <h3 className="font-pixel text-2xl tracking-[-0.05em]">Pick Tracify if</h3>
            <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-black/80">{c.pickTracify.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-6 text-black/60">About {c.name}: {c.theirs}</p>
      </CreamBand>

      <DarkBand>
        <Eyebrow>Head to head</Eyebrow>
        <div className="mt-8 grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
          <p className="font-pixel text-[clamp(2rem,5vw,4.2rem)] leading-[0.9] tracking-[-0.06em] text-white/80">{c.name}</p>
          <p aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.3em] text-[#f4d44d]">vs</p>
          <p className="font-pixel text-[clamp(2rem,5vw,4.2rem)] leading-[0.9] tracking-[-0.06em] text-[#f4d44d] md:text-right">Tracify</p>
        </div>
        <dl className="mt-10 border-t border-white/30">
          {c.rows.map(([area, them, us], i) => (
            <div key={area} className="group grid gap-3 border-b border-white/15 py-6 transition-colors hover:bg-white/[0.03] md:grid-cols-[1fr_9rem_1fr] md:items-start md:gap-8">
              <dd className="text-sm leading-6 text-white/70 md:text-base">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 md:hidden">{c.name}</span>
                {them}
              </dd>
              <dt className="order-first flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white/60 md:order-none md:justify-center md:text-center">
                <span className="font-pixel text-lg text-[#f4d44d]">{String(i + 1).padStart(2, "0")}</span>
                {area}
              </dt>
              <dd className="border-l-2 border-[#f4d44d] pl-4 text-sm leading-6 text-[#eceae3] md:text-base">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d] md:hidden">Tracify</span>
                {us}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-xs leading-5 text-white/45">Descriptions of other products are summaries and can change. Check {c.name}&apos;s own site for current features and pricing.</p>
      </DarkBand>

      {article && (
        <CreamBand>
          <div id="full-comparison" className="scroll-mt-24">
            <Eyebrow dark={false}>Full comparison</Eyebrow>
            <SectionTitle>{article.title}</SectionTitle>
            <div className="mt-10 max-w-3xl"><MarkdocRichText content={article.content} /></div>
          </div>
        </CreamBand>
      )}

      <CreamBand>
        <Eyebrow dark={false}>Questions</Eyebrow>
        <SectionTitle>Common questions.</SectionTitle>
        <div className="mt-10"><FaqList items={c.faq} /></div>
        <div className="mt-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">More comparisons</p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {others.map((o) => (
              <li key={o.slug}><Link href={`/compare/${o.slug}`} className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">Tracify vs {o.name}</Link></li>
            ))}
            <li><Link href="/pricing" className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">Pricing</Link></li>
            <li><Link href="/docs" className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">Docs</Link></li>
          </ul>
        </div>
      </CreamBand>
      <ClosingBand title="See it on your own traces." body="Free to start. First trace in minutes." actions={[{ href: appHref("/sign-up"), label: "Start free", primary: true }, { href: appHref("/demo/project"), label: "Open the demo" }]} />
    </div>
  );
}
