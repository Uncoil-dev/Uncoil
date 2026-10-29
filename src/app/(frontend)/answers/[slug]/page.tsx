import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdString } from "@/lib/seo";
import { answers } from "@/lib/answers";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction } from "@/components/marketing/company/blocks";

export function generateStaticParams() {
  return answers.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = answers.find((item) => item.slug === slug);
  return a ? pageMetadata({ title: a.title, description: a.answer.slice(0, 158), path: `/answers/${a.slug}` }) : {};
}

export default async function AnswerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = answers.find((item) => item.slug === slug);
  if (!a) notFound();
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Answers", path: "/answers" }, { name: a.title, path: `/answers/${a.slug}` }]),
    faqJsonLd([{ q: a.question, a: a.answer }]),
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <section className="bg-[#090909] px-5 pb-16 pt-14 text-[#eceae3] md:px-10 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-[1320px]">
          <Link href="/answers" className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d] hover:underline">← All answers</Link>
          <div className="mt-8 grid gap-px border-2 border-[#eceae3] bg-[#eceae3] lg:grid-cols-[1.1fr_1fr]">
            <div className="bg-[#090909] p-8 md:p-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Question</p>
              <h1 className="mt-5 font-pixel text-[clamp(1.9rem,4.2vw,3.6rem)] leading-[0.98] tracking-[-0.05em]">{a.question}</h1>
            </div>
            <div className="bg-[#f4d44d] p-8 text-black md:p-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">Short answer</p>
              <p className="mt-5 text-lg leading-8 md:text-xl md:leading-9">{a.answer}</p>
            </div>
          </div>
        </div>
      </section>
      <CreamBand>
        <div className="max-w-3xl">
          <Eyebrow dark={false}>In more detail</Eyebrow>
          <ul className="mt-8 space-y-8">
            {a.points.map((p) => (
              <li key={p.heading} className="border-l-4 border-[#f4d44d] pl-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-black">{p.heading}</h2>
                <p className="mt-3 text-base leading-7 text-black/80">{p.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Keep reading</p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {a.related.map((r) => <li key={r.href}><Link href={r.href} className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">{r.label}</Link></li>)}
            </ul>
          </div>
          <div className="mt-10"><HeaderAction href={a.link.href}>{a.link.label}</HeaderAction></div>
        </div>
      </CreamBand>
      <ClosingBand title="Answers are the start." body="Open a real trace and see it for yourself." actions={[{ href: appHref("/demo/project"), label: "Open the demo", primary: true }, { href: "/docs", label: "Read the docs" }]} />
    </div>
  );
}
