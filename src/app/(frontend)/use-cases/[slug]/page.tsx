import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { UseCasePage as UseCaseView } from "@/components/marketing/pages/use-case-page";
import { useCases, type UseCaseSlug } from "@/lib/use-cases";

// These use cases share a head term with a long blog guide. The guide keeps "X observability"; the use case page takes the product angle so the two do not compete.
const guideTwins: Partial<Record<string, string>> = { voice: "Uncoil for voice agents", browser: "Uncoil for browser agents", mcp: "Uncoil for MCP servers", "multi-agent": "Uncoil for multi-agent systems", "tool-calling": "Uncoil for tool-calling agents" };

export function generateStaticParams() { return Object.keys(useCases).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const page = useCases[slug as UseCaseSlug]; return page ? pageMetadata({ title: guideTwins[slug] ?? `${page.title} observability`, description: page.description, path: `/use-cases/${slug}` }) : {}; }

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = useCases[slug as UseCaseSlug];
  if (!page) notFound();

  return <main className="overflow-x-clip bg-[#090909]"><UseCaseView slug={slug} page={page} /></main>;
}
