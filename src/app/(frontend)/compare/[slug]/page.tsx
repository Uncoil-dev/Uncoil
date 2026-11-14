import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdString, productJsonLd } from "@/lib/seo";
import { comparisons, uncoilPlans } from "@/lib/seo-pages";
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
    title: `Uncoil vs ${c.name}: AI agent observability compared`,
    description: `Uncoil vs ${c.name}: how they differ on tracing, cost tracking, evaluation and hosting, and when each is the better choice.`,
    path: `/compare/${c.slug}`,
  });
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = comparisons.find((item) => item.slug === slug);
  if (!c) notFound();
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Compare", path: "/compare" }, { name: `Uncoil vs ${c.name}`, path: `/compare/${c.slug}` }]),
    productJsonLd({ name: `Uncoil vs ${c.name}`, description: c.oneLine, path: `/compare/${c.slug}` }),
    faqJsonLd(c.faq),
  ];
  const article = c.post ? await getPublishedPost(c.post) : null;
  const others = comparisons.filter((item) => item.slug !== c.slug);
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow={`Compare / ${c.name}`} title={`Uncoil vs ${c.name}`} lede={c.oneLine}>
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
            <h3 className="font-pixel text-2xl tracking-[-0.05em]">Pick Uncoil if</h3>
            <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-black/80">{c.pickUncoil.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-6 text-black/60">About {c.name}: {c.theirs}</p>
      </CreamBand>

      <DarkBand>
        <Eyebrow>Head to head</Eyebrow>
        <div className="mt-8 grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
          <p className="font-pixel text-[clamp(2rem,5vw,4.2rem)] leading-[0.9] tracking-[-0.06em] text-white/80">{c.name}</p>
          <p aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.3em] text-[#f4d44d]">vs</p>
          <p className="font-pixel text-[clamp(2rem,5vw,4.2rem)] leading-[0.9] tracking-[-0.06em] text-[#f4d44d] md:text-right">Uncoil</p>
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
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d] md:hidden">Uncoil</span>
                {us}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-xs leading-5 text-white/45">Descriptions of other products are summaries and can change. Check {c.name}&apos;s own site for current features and pricing.</p>
      </DarkBand>

      {c.plans && (
        <CreamBand>
          <Eyebrow dark={false}>Plans and prices{c.asOf ? ` / checked ${c.asOf}` : ""}</Eyebrow>
          <SectionTitle>What each one costs.</SectionTitle>
          <div className="mt-12 grid gap-px border border-black bg-black md:grid-cols-2">
            <div className="bg-[#eceae3] p-8">
              <h3 className="font-pixel text-2xl tracking-[-0.05em]">{c.name}</h3>
              <ul className="mt-6 divide-y divide-black/15">
                {c.plans.map((p) => (
                  <li key={p.name} className="py-4">
                    <p className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-mono text-xs uppercase tracking-[0.14em]">{p.name}</span><span className="font-pixel text-xl tracking-[-0.04em]">{p.price}</span></p>
                    <p className="mt-1 text-sm leading-6 text-black/70">{p.includes}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#f4d44d] p-8">
              <h3 className="font-pixel text-2xl tracking-[-0.05em]">Uncoil</h3>
              <ul className="mt-6 divide-y divide-black/20">
                {uncoilPlans.map((p) => (
                  <li key={p.name} className="py-4">
                    <p className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-mono text-xs uppercase tracking-[0.14em]">{p.name}</span><span className="font-pixel text-xl tracking-[-0.04em]">{p.price}</span></p>
                    <p className="mt-1 text-sm leading-6 text-black/80">{p.includes}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {c.unitNote && <p className="mt-6 max-w-3xl border-l-2 border-black pl-4 text-sm leading-6 text-black/75">{c.unitNote}</p>}
        </CreamBand>
      )}

      {c.theirEdge && (
        <DarkBand>
          <Eyebrow>Where {c.name} is ahead</Eyebrow>
          <SectionTitle>Plain credit where it is due.</SectionTitle>
          <ul className="mt-10 grid gap-px border border-white/20 bg-white/20 md:grid-cols-2">
            {c.theirEdge.map((t, i) => (
              <li key={t} className="bg-[#090909] p-6 text-sm leading-6 text-white/80">
                <span className="mb-3 block font-pixel text-lg text-[#f4d44d]">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </li>
            ))}
          </ul>
          {c.news && <p className="mt-8 max-w-3xl text-sm leading-6 text-white/60">Recent news: {c.news}</p>}
        </DarkBand>
      )}

      {c.switching && (
        <CreamBand>
          <Eyebrow dark={false}>Switching</Eyebrow>
          <SectionTitle>Moving to Uncoil, step by step.</SectionTitle>
          <ol className="mt-10 grid gap-px border border-black bg-black md:grid-cols-2">
            {c.switching.map((t, i) => (
              <li key={t} className="bg-[#eceae3] p-6 text-sm leading-6 text-black/80">
                <span className="mb-3 block font-pixel text-2xl tracking-[-0.05em]">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          {c.sources && (
            <div className="mt-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Sources, read {c.asOf}</p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {c.sources.map((src) => (
                  <li key={src.href}><a href={src.href} rel="noopener noreferrer" target="_blank" className="inline-block border border-black px-3 py-1.5 font-mono text-xs hover:bg-[#f4d44d]">{src.label}</a></li>
                ))}
              </ul>
            </div>
          )}
        </CreamBand>
      )}

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
              <li key={o.slug}><Link href={`/compare/${o.slug}`} className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">Uncoil vs {o.name}</Link></li>
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
