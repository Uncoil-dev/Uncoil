import { appHref } from "@/lib/app-links";
import { breadcrumbJsonLd, jsonLdString, pageMetadata, SITE_URL } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";
import { NewsletterPanel } from "@/components/marketing/newsletter-panel";
import { ToolBench } from "@/components/marketing/company/tool-bench";
import { toolPath, tools } from "@/lib/tools/registry";

const path = "/tools";

export const metadata = pageMetadata({
  title: "Free tools for AI agent builders",
  description: "Free tools for people building AI agents: a log checker, token counter, model price comparison, prompt cost checker, context window checker, tool definition checker, AI API status, JSON fixer and rate limit calculator.",
  path,
});

export default function ToolsIndex() {
  const schema = [
    breadcrumbJsonLd([{ name: "Tracify", path: "/" }, { name: "Free tools", path }]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Free tools for AI agent builders",
      itemListElement: tools.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: `${SITE_URL}${toolPath(t.slug)}` })),
    },
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow="Free tools" title="Tools for people building agents." lede="Debug a log, count tokens, compare prices, check a prompt, fix JSON. No sign-up, and nothing you paste leaves your browser.">
        <HeaderAction href="#tools">Pick a tool</HeaderAction>
        <HeaderAction href={appHref("/sign-up")} kind="secondary">Track your agent with Tracify</HeaderAction>
      </PageHeader>
      <CreamBand id="tools">
        <Eyebrow dark={false}>{tools.length} free tools / no sign-up</Eyebrow>
        <SectionTitle>Pick up a tool.</SectionTitle>
        <div className="mt-12"><ToolBench /></div>
        <div className="mx-auto max-w-[1320px]"><NewsletterPanel source="tools-index" heading="Get new tools and cost guides when they land." /></div>
      </CreamBand>
      <ClosingBand
        title="Checking once is good. Tracking always is better."
        body="Tracify records every run, so cost, speed and failures are always one click away."
        actions={[{ href: appHref("/sign-up"), label: "Track this automatically with Tracify", primary: true }, { href: "/docs/quickstart", label: "Read the quickstart" }]}
      />
    </div>
  );
}
