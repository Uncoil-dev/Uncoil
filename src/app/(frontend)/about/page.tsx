import { pageMetadata, breadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction } from "@/components/marketing/company/blocks";
import { ORG_PROFILES } from "@/lib/about";

export const metadata = pageMetadata({
  title: "About the AI agent observability platform",
  description: "Tracify at tracify.tech is an observability and evaluation platform for AI agents: traces, tool calls, cost, alerts and release checks. Find our SDKs, code and docs here.",
  path: "/about",
});

const profileLabels: Record<string, string> = {
  "https://github.com/BN-KR/Tracify": "GitHub: source code",
  "https://www.npmjs.com/package/tracify-sdk": "npm: TypeScript SDK",
  "https://pypi.org/project/tracify-sdk/": "PyPI: Python SDK",
};

export default function AboutPage() {
  const schema = [
    breadcrumbJsonLd([{ name: "Tracify", path: "/" }, { name: "About", path: "/about" }]),
    { "@context": "https://schema.org", "@type": "AboutPage", name: "About Tracify", url: "https://www.tracify.tech/about", about: { "@type": "Organization", name: "Tracify", url: "https://www.tracify.tech", sameAs: ORG_PROFILES } },
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow="Company / about" title="About Tracify" lede="Tracify is an observability and evaluation platform for AI agents, at tracify.tech.">
        <HeaderAction href="/docs/quickstart">Send your first trace</HeaderAction>
        <HeaderAction href="/contact" kind="secondary">Contact us</HeaderAction>
      </PageHeader>
      <CreamBand>
        <div className="max-w-3xl space-y-10">
          <div>
            <Eyebrow dark={false}>What Tracify is</Eyebrow>
            <p className="mt-6 text-lg leading-8 text-black/80">Tracify helps engineering teams see what their AI agents did. It records each run as a trace of model calls and tool calls, tracks cost and quality, sends alerts and checks releases before they ship. You can reach it from our TypeScript and Python SDKs, OpenTelemetry or the ingestion API.</p>
          </div>
          <div>
            <Eyebrow dark={false}>Looking for another Tracify?</Eyebrow>
            <p className="mt-6 text-lg leading-8 text-black/80">The name is shared by other companies. This site, tracify.tech, is the AI agent observability product. If you searched for something unrelated to AI agents, you may be looking for a different business.</p>
          </div>
          <div>
            <Eyebrow dark={false}>Find us elsewhere</Eyebrow>
            <ul className="mt-6 flex flex-wrap gap-3">
              {ORG_PROFILES.map((href) => <li key={href}><a href={href} rel="noopener" className="inline-block border border-black px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#f4d44d]">{profileLabels[href] ?? href}</a></li>)}
            </ul>
          </div>
        </div>
      </CreamBand>
      <ClosingBand title="See it on a real trace." body="Open the demo project." actions={[{ href: "/demo/project", label: "Open the demo", primary: true }, { href: "/security", label: "Security" }]} />
    </div>
  );
}
