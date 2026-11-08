import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdString } from "@/lib/seo";
import { integrationPages } from "@/lib/seo-pages";
import { IntegrationWire } from "@/components/marketing/company/integration-wire";
import { ClosingBand, CreamBand, DarkBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";
import { FaqList } from "@/components/marketing/company/faq-list";
import { CodePanel } from "@/components/marketing/company/code-panel";
import { CopyButton } from "@/components/marketing/company/copy-button";
import { FrameworkSwitcher } from "@/components/marketing/company/framework-switcher";
import { SampleTrace } from "@/components/marketing/company/sample-trace";
import { frameworkSetup } from "@/lib/framework-setups";

export function generateStaticParams() {
  return integrationPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = integrationPages.find((item) => item.slug === slug);
  return p ? pageMetadata({ title: p.title, description: p.description, path: `/integrations/${p.slug}` }) : {};
}

export default async function IntegrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = integrationPages.find((item) => item.slug === slug);
  if (!p) notFound();
  const framework = frameworkSetup(p.slug);
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Integrations", path: "/integrations" }, { name: p.name, path: `/integrations/${p.slug}` }]),
    faqJsonLd(p.faq),
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <section className="bg-[#090909] px-5 pb-8 pt-16 text-[#eceae3] md:px-10 md:pt-24">
        <div className="mx-auto max-w-[1320px]">
          <Eyebrow>Integrations / {p.name}</Eyebrow>
          <h1 className="mt-5 max-w-4xl font-pixel text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.88] tracking-[-0.06em]">{p.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 md:text-lg">{p.answer}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <HeaderAction href={`/docs/${p.doc}`}>Read the guide</HeaderAction>
            <HeaderAction href={appHref("/sign-up")} kind="secondary">Start free</HeaderAction>
          </div>
          {framework ? (
            <div className="mt-10 flex max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-1 border border-white/25 bg-white/[0.04] py-1 pl-5 pr-2">
              <code className="min-w-0 break-all py-3 font-mono text-[13px] text-[#eceae3]"><span className="select-none text-[#f4d44d]">$ </span>{framework.install}</code>
              <CopyButton text={framework.install} label="Copy install" className="min-h-11 px-3 text-[#f4d44d] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]" />
            </div>
          ) : null}
        </div>
      </section>

      <DarkBand className="!pt-8 md:!pt-8">
        <IntegrationWire name={p.name} captures={p.captures} />
        {framework ? <div className="mt-8"><SampleTrace name={framework.name} rows={framework.sample} /></div> : null}
      </DarkBand>

      <CreamBand>
        <Eyebrow dark={false}>Setup</Eyebrow>
        <SectionTitle>{framework ? "Five minutes." : p.steps ? `${p.steps.length} steps.` : "A few lines."}</SectionTitle>
        {framework ? <p className="mt-4 max-w-2xl text-sm leading-6 text-black/65">{p.steps?.length} short steps, each with code you can copy. We ran this setup against the current libraries before we published it.</p> : null}
        {p.steps ? (
          <ol className="mt-10 grid gap-6">
            {p.steps.map((step, i) => (
              <li key={step.title} className="grid gap-4 border-2 border-black bg-white p-5 md:grid-cols-[minmax(0,320px)_1fr] md:p-8">
                <div>
                  <span className="font-pixel text-4xl leading-none tracking-[-0.06em]">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 font-mono text-sm uppercase tracking-[0.12em]">{step.title}</h3>
                  {framework && step.time ? <p className="mt-2 inline-block bg-[#f4d44d] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">About {step.time}</p> : null}
                  <p className="mt-3 text-sm leading-6 text-black/70">{step.body}</p>
                </div>
                {step.code ? <CodePanel className="self-start" code={step.code} label={step.language ?? p.language} /> : null}
              </li>
            ))}
          </ol>
        ) : (
          <CodePanel className="mt-10" code={p.code} label={p.language} />
        )}
        {p.notes?.length ? (
          <div className="mt-10 grid gap-px border-2 border-black bg-black md:grid-cols-2">
            {p.notes.map((note) => (
              <div key={note.title} className="bg-[#f4d44d]/40 p-6 md:[&:last-child:nth-child(odd)]:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Good to know</p>
                <h3 className="mt-2 font-mono text-sm uppercase tracking-[0.12em]">{note.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/75">{note.body}</p>
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-sm text-black/60">Full details in the <Link className="underline" href={`/docs/${p.doc}`}>documentation</Link>. All integrations are listed on the <Link className="underline" href="/integrations">integrations page</Link>.</p>
        {framework ? (
          <div className="mt-14">
            <Eyebrow dark={false}>Other frameworks</Eyebrow>
            <div className="mt-4"><FrameworkSwitcher current={p.slug} /></div>
          </div>
        ) : null}
        <div className="mt-14"><FaqList items={p.faq} /></div>
        <ul className="mt-10 flex flex-wrap gap-3">
          {integrationPages.filter((o) => o.slug !== p.slug).map((o) => (
            <li key={o.slug}><Link href={`/integrations/${o.slug}`} className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">{o.name}</Link></li>
          ))}
        </ul>
      </CreamBand>
      <ClosingBand title="Send your first trace." body="Free to start." actions={[{ href: appHref("/sign-up"), label: "Start free", primary: true }, { href: "/compare", label: "Compare tools" }]} />
    </div>
  );
}
