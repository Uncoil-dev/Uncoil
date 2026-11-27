import Link from "next/link";
import { appHref } from "@/lib/app-links";
import { pageMetadata, breadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, HeaderAction } from "@/components/marketing/company/blocks";
import { notDoing, sections, type Statement } from "@/lib/how-we-work";

export const metadata = pageMetadata({
  title: "How Uncoil works with customers",
  description: "Public pricing, MIT-licensed code, where data is stored, how to export and delete it, how support works and what Uncoil does not do. Each line links to its source.",
  path: "/how-we-work",
});

function Proof({ proof }: Pick<Statement, "proof">) {
  const className = "mt-2 inline-block font-mono text-xs uppercase tracking-[0.12em] underline underline-offset-4 hover:bg-[#f4d44d]";
  return proof.href.startsWith("/")
    ? <Link href={proof.href} className={className}>{proof.label}</Link>
    : <a href={proof.href} rel="noopener" className={className}>{proof.label}</a>;
}

function SectionHeading({ children }: { children: string }) {
  return <h2 className="font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-black/50">{children}</h2>;
}

function List({ items }: { items: readonly Statement[] }) {
  return (
    <ul className="mt-6 space-y-5">
      {items.map((item) => (
        <li key={item.text} className="text-lg leading-8 text-black/80">
          {item.text}
          <br />
          <Proof proof={item.proof} />
        </li>
      ))}
    </ul>
  );
}

export default function HowWeWorkPage() {
  const schema = [breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "How we work", path: "/how-we-work" }])];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow="Company / how we work" title="How we work with customers" lede="Terms you can read in a minute. Each line links to the page that shows it.">
        <HeaderAction href="/pricing">Pricing</HeaderAction>
        <HeaderAction href="/contact" kind="secondary">Contact us</HeaderAction>
      </PageHeader>
      <CreamBand>
        <div className="max-w-3xl space-y-12">
          {sections.map((section) => (
            <div key={section.title}>
              <SectionHeading>{section.title}</SectionHeading>
              <List items={section.items} />
            </div>
          ))}
          <div>
            <SectionHeading>What Uncoil does not do</SectionHeading>
            <List items={notDoing} />
          </div>
        </div>
      </CreamBand>
      <ClosingBand title="Questions about any of this?" body="Email us from the contact page." actions={[{ href: "/contact", label: "Contact", primary: true }, { href: appHref("/demo/project"), label: "Open the demo" }]} />
    </div>
  );
}
