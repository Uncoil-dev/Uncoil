import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { pageMetadata, breadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { comparisons } from "@/lib/seo-pages";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";

export const metadata = pageMetadata({
  title: "Uncoil alternatives and comparisons",
  description: "Compare Uncoil with Langfuse, LangSmith, Helicone, Arize Phoenix, Braintrust and Datadog for AI agent observability, cost tracking and evaluation.",
  path: "/compare",
});

export default function ComparePage() {
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Compare", path: "/compare" }]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Uncoil comparisons",
      itemListElement: comparisons.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `https://www.uncoil.dev/compare/${c.slug}`, name: `Uncoil vs ${c.name}` })),
    },
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow="Compare / alternatives" title="Uncoil vs the rest." lede="Plain comparisons with the other tools teams look at, including the cases where they are the better pick.">
        <HeaderAction href={appHref("/demo/project")}>See Uncoil live</HeaderAction>
        <HeaderAction href="/pricing" kind="secondary">Pricing</HeaderAction>
      </PageHeader>
      <CreamBand>
        <Eyebrow dark={false}>{comparisons.length} comparisons</Eyebrow>
        <SectionTitle>Pick the tool that fits.</SectionTitle>
        <p className="mt-6 max-w-2xl text-base leading-7 text-black/70">
          Most teams compare tools on four things: how traces are collected, what cost visibility they get, whether evaluation is built in, and where data is hosted. Each page below answers those honestly.
        </p>
        <ul className="mt-12 grid gap-px border border-black bg-black md:grid-cols-2">
          {comparisons.map((c) => (
            <li key={c.slug} className="bg-[#eceae3]">
              <Link href={`/compare/${c.slug}`} className="block h-full p-8 transition-colors hover:bg-[#f4d44d]">
                <h3 className="font-pixel text-3xl tracking-[-0.06em]">Uncoil vs {c.name}</h3>
                <p className="mt-4 text-sm leading-6 text-black/70">{c.oneLine}</p>
              </Link>
            </li>
          ))}
        </ul>
      </CreamBand>
      <ClosingBand title="Try it on your own agent." body="Send a first trace in a few minutes." actions={[{ href: appHref("/sign-up"), label: "Start free", primary: true }, { href: "/docs", label: "Read the docs" }]} />
    </div>
  );
}
