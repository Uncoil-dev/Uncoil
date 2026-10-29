import { appHref } from "@/lib/app-links";
import Link from "next/link";
import type { ReactNode } from "react";
import { breadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";
import { NewsletterPanel } from "@/components/marketing/newsletter-panel";
import { getTool, toolPath, tools } from "@/lib/tools/registry";

export type Faq = { q: string; a: string };
export type Step = { title: string; body: string };

const underline = "underline decoration-[#f4d44d] decoration-2 underline-offset-4 hover:bg-[#f4d44d]";

/** Shared frame for every free tool page: header, the tool, how-to, FAQ, related tools, and the Uncoil prompt. */
export function ToolPage({
  slug,
  title,
  lede,
  toolEyebrow,
  toolTitle,
  steps,
  faqs,
  children,
  notes,
}: {
  slug: string;
  /** Large headline in the dark header. */
  title: string;
  lede: string;
  toolEyebrow: string;
  toolTitle: string;
  steps: Step[];
  faqs: Faq[];
  children: ReactNode;
  /** Short honest caveats shown under the tool, for example how a number was produced. */
  notes?: ReactNode;
}) {
  const tool = getTool(slug);
  const path = toolPath(slug);
  const related = tools.filter((t) => t.slug !== slug).slice(0, 4);
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Free tools", path: "/tools" }, { name: tool.name, path }]),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow={`Free tool / ${tool.group.toLowerCase()}`} title={title} lede={lede}>
        <HeaderAction href="#tool">Open the tool</HeaderAction>
        <HeaderAction href="/tools" kind="secondary">All free tools</HeaderAction>
      </PageHeader>

      <CreamBand id="tool">
        <Eyebrow dark={false}>{toolEyebrow}</Eyebrow>
        <SectionTitle>{toolTitle}</SectionTitle>
        <div className="mt-12">{children}</div>
        {notes ? <div className="mt-10 max-w-3xl border-l-2 border-black pl-5 text-sm leading-6 text-black/65">{notes}</div> : null}
        <aside aria-label="Track this with Uncoil" className="mt-14 grid gap-6 border border-black bg-[#090909] p-6 text-[#eceae3] md:grid-cols-[1.5fr_auto] md:items-center md:p-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">From one check to every run</p>
            <p className="mt-3 max-w-2xl text-balance text-lg leading-7">{tool.trackLine}</p>
          </div>
          <Link href={appHref("/sign-up")} className="group inline-flex min-h-12 items-center justify-center bg-[#f4d44d] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-white">
            Track this automatically with Uncoil
          </Link>
        </aside>
      </CreamBand>

      <section className="border-t-2 border-black bg-[#eceae3] px-5 pb-20 text-black md:px-10 md:pb-28">
        <div className="mx-auto grid max-w-[1320px] gap-12 border-t border-black/20 pt-16 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow dark={false}>How it works</Eyebrow>
            <h2 className="mt-5 font-pixel text-[clamp(2rem,4vw,3.4rem)] leading-[0.95] tracking-[-0.06em]">Three steps, no sign-up.</h2>
            <ol className="mt-8 space-y-6">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[2.2rem_1fr] gap-3">
                  <span className="font-pixel text-3xl leading-none tracking-[-0.05em]">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="mt-1 text-sm leading-6 text-black/65">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <Eyebrow dark={false}>Questions people ask</Eyebrow>
            <div className="mt-5 divide-y divide-black/15 border-y border-black/15">
              {faqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span aria-hidden className="font-mono text-lg transition-transform group-open:rotate-45">+</span></summary>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-black/70">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-[1320px] border-t border-black/20 pt-12">
          <Eyebrow dark={false}>More free tools</Eyebrow>
          <ul className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {related.map((t) => (
              <li key={t.slug}>
                <Link className={underline} href={toolPath(t.slug)}>{t.name}</Link>
                <p className="mt-1 text-xs leading-5 text-black/55">{t.blurb}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm"><Link className={underline} href="/tools">See all {tools.length} free tools</Link></p>
        </div>
        <div className="mx-auto max-w-[1320px]"><NewsletterPanel source={`tool-${slug}`} heading="Get new tools and cost guides when they land." /></div>
      </section>

      <ClosingBand
        title="Now measure the real thing."
        body="Send a first trace and see the true cost, speed and failures of every run."
        actions={[{ href: appHref("/sign-up"), label: "Track this automatically with Uncoil", primary: true }, { href: "/docs/quickstart", label: "Read the quickstart" }]}
      />
    </div>
  );
}
