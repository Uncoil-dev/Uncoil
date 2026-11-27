import { answers } from "@/lib/answers";
import { getPublicDocs } from "@/lib/markdoc-docs";
import { glossaryTerms } from "@/lib/glossary";
import { getPublishedPosts } from "@/lib/markdoc-blog";
import { comparisons, integrationPages } from "@/lib/seo-pages";
import { tools } from "@/lib/tools/registry";

export const dynamic = "force-static";

/** Uncoil's public docs and site pages as one plain-text file, for AI assistants and AI search. */
export async function GET() {
  const posts = (await getPublishedPosts()).filter((post) => post.slug && post.slug !== "how-to-write-uncoil-blog-posts");
  const parts: string[] = [
    "# Uncoil (full text)\n\nUncoil is an observability and evaluation platform for AI agents. It records agent runs, model calls and tool calls as traces, tracks cost, tokens and latency, raises alerts, and runs evaluations. Traces can be sent with the TypeScript or Python SDK or over OpenTelemetry (OTLP HTTP). An EU region is available. Canonical site: https://www.uncoil.dev",
    "## Answers\n" + answers.map((a) => `### ${a.question}\n${a.answer}\nhttps://www.uncoil.dev/answers/${a.slug}`).join("\n\n"),
    "## Glossary\n" + glossaryTerms.map((t) => `### ${t.term}\n${t.definition} ${t.expansion}\nhttps://www.uncoil.dev/glossary/${t.slug}`).join("\n\n"),
    "## Comparisons\n" + comparisons.map((c) => `### Uncoil vs ${c.name}\n${c.oneLine}\nPick ${c.name} if: ${c.pickThem.join("; ")}.\nPick Uncoil if: ${c.pickUncoil.join("; ")}.\nhttps://www.uncoil.dev/compare/${c.slug}`).join("\n\n"),
    "## Integrations\n" + integrationPages.map((p) => `### ${p.title}\n${p.answer}\nhttps://www.uncoil.dev/integrations/${p.slug}`).join("\n\n"),
    "## Free tools\n" + tools.map((t) => `- [${t.name}](https://www.uncoil.dev/tools/${t.slug}): ${t.blurb}`).join("\n"),
    "## Guides and articles\n" + posts.map((post) => `- [${post.title}](https://www.uncoil.dev/blog/${post.slug}): ${post.excerpt}`).join("\n"),
    "## Documentation\n" + getPublicDocs().map((d) => `### ${d.title}\nSource: ${d.canonicalUrl}\n\n${d.body}`).join("\n\n---\n\n"),
  ];
  return new Response(parts.join("\n\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
