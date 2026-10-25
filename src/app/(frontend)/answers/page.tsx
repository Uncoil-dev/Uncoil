import Link from "next/link";
import { pageMetadata, breadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, HeaderAction } from "@/components/marketing/company/blocks";
import { answers } from "@/lib/answers";

export const metadata = pageMetadata({
  title: "AI agent observability questions, answered",
  description: "Straight answers to common questions about tracing AI agents, catching failures, OpenTelemetry, cost and tool calls, with links to the docs.",
  path: "/answers",
});

export default function AnswersPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd([{ name: "Tracify", path: "/" }, { name: "Answers", path: "/answers" }])) }} />
      <PageHeader eyebrow="Reference / answers" title="Questions, answered" lede="The questions teams ask when an AI agent breaks, costs too much or cannot be explained. Each answer is short and links to the docs.">
        <HeaderAction href="/docs/quickstart">Send your first trace</HeaderAction>
        <HeaderAction href="/glossary" kind="secondary">Glossary</HeaderAction>
      </PageHeader>
      <CreamBand>
        <ul className="grid gap-px border-2 border-black bg-black md:grid-cols-2">
          {answers.map((a) => (
            <li key={a.slug} className="bg-[#eceae3]">
              <Link href={`/answers/${a.slug}`} className="block h-full p-6 transition-colors hover:bg-[#f4d44d] md:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Question</p>
                <h2 className="mt-3 text-xl leading-7 text-black">{a.question}</h2>
                <p className="mt-4 text-sm leading-6 text-black/70">{a.answer.split(". ")[0]}.</p>
              </Link>
            </li>
          ))}
        </ul>
      </CreamBand>
      <ClosingBand title="Answers are the start." body="Open a real trace and see it for yourself." actions={[{ href: "/demo/project", label: "Open the demo", primary: true }, { href: "/blog/ai-agent-observability-complete-guide", label: "Read the complete guide" }]} />
    </div>
  );
}
