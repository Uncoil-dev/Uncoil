import type { DocArticle } from "./markdoc-docs";

export type DocsSearchResult = { slug: string; title: string; description: string; section: string; excerpt: string; score: number };

function tokens(value: string) { return value.toLowerCase().match(/[a-z0-9]+/g) ?? []; }
function excerpt(body: string, query: string) {
  const index = body.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return body.slice(0, 160).trim();
  return `${index > 60 ? "…" : ""}${body.slice(Math.max(0, index - 60), index + query.length + 100).trim()}${index + query.length + 100 < body.length ? "…" : ""}`;
}

export type SearchableDoc = Pick<DocArticle, "slug" | "title" | "description" | "section" | "headings" | "bodyText" | "noindex">;
export function searchDocs(docs: SearchableDoc[], query: string, limit = 8): DocsSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const queryTokens = tokens(normalized);
  return docs.filter((doc) => !doc.noindex).map((doc) => {
    const title = doc.title.toLowerCase();
    const headings = doc.headings.map((heading) => heading.title.toLowerCase()).join(" ");
    const description = doc.description.toLowerCase();
    const body = doc.bodyText.toLowerCase();
    let score = 0;
    if (doc.slug === normalized) score += 1000;
    if (title === normalized) score += 900;
    if (title.includes(normalized)) score += 700;
    if (headings.includes(normalized)) score += 500;
    if (description.includes(normalized)) score += 300;
    if (body.includes(normalized)) score += 100;
    score += queryTokens.filter((token) => `${title} ${headings} ${description} ${body}`.includes(token)).length * 10;
    return { slug: doc.slug, title: doc.title, description: doc.description, section: doc.section, excerpt: excerpt(doc.bodyText, normalized), score };
  }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

/** The search bar only needs these fields. Sending full markdown bodies would add every guide to each docs page payload. */
export function toDockDocs(docs: DocArticle[]): SearchableDoc[] {
  return docs.map(({ slug, title, description, section, headings, bodyText, noindex }) => ({ slug, title, description, section, headings, bodyText, noindex }));
}
