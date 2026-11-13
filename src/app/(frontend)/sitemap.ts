import { getPostDate, getPublishedPosts } from "@/lib/markdoc-blog";
import { getDocs } from "@/lib/markdoc-docs";
import { comparisons, integrationPages } from "@/lib/seo-pages";
import { answers } from "@/lib/answers";
import { glossaryTerms } from "@/lib/glossary";
import { tools } from "@/lib/tools/registry";
import type { MetadataRoute } from "next";

// Baseline review date for static pages. Add route-specific dates below for pages changed later.
const SITE_REVIEWED = new Date("2026-10-25T00:00:00.000Z");
const PAGE_LAST_MODIFIED: Record<string, Date> = {
  "/": new Date("2026-11-08T03:29:55.000Z"),
  "/pricing": new Date("2026-11-08T03:29:55.000Z"),
  "/about": new Date("2026-11-08T03:29:55.000Z"),
  "/contact": new Date("2026-11-08T03:29:55.000Z"),
  "/security": new Date("2026-11-08T03:29:55.000Z"),
  "/status": new Date("2026-11-08T03:29:55.000Z"),
};
const pageLastModified = (path: string) => PAGE_LAST_MODIFIED[path] ?? SITE_REVIEWED;
const INTERNAL_POSTS = new Set(["how-to-write-uncoil-blog-posts"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.uncoil.dev";

  const posts = await getPublishedPosts();
  const comparedPosts = new Set(comparisons.map((c) => c.post).filter(Boolean));
  const blogPosts = posts.filter((post) => post.slug && !INTERNAL_POSTS.has(post.slug) && !comparedPosts.has(post.slug)).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(getPostDate(post)),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const productFeatures = ["trace-viewer", "cost-dashboard", "tool-calls", "llm-calls", "failures", "reports", "runtime-control", "evaluation-engine", "lifecycle"];
  const useCases = ["research", "support", "automation", "tool-calling", "coding", "rag", "voice", "browser", "multi-agent", "mcp", "chatbot", "sales", "sql", "documents", "cost-control", "release", "copilot"];
  const documentation = getDocs().map((doc) => doc.slug);

  return [
    { url: baseUrl, lastModified: pageLastModified("/"), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: posts[0] ? new Date(getPostDate(posts[0])) : undefined, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: pageLastModified("/pricing"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/roadmap`, lastModified: SITE_REVIEWED, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/integrations`, lastModified: SITE_REVIEWED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/security`, lastModified: pageLastModified("/security"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/status`, lastModified: pageLastModified("/status"), changeFrequency: "daily", priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: pageLastModified("/contact"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: SITE_REVIEWED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/cookie-policy`, lastModified: SITE_REVIEWED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: SITE_REVIEWED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/changelog`, lastModified: SITE_REVIEWED, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/docs`, lastModified: SITE_REVIEWED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tools`, lastModified: SITE_REVIEWED, changeFrequency: "monthly", priority: 0.8 },
    ...tools.map((t) => ({ url: `${baseUrl}/tools/${t.slug}`, lastModified: SITE_REVIEWED, changeFrequency: (t.slug === "ai-api-status" ? "daily" : "monthly") as "daily" | "monthly", priority: 0.8 })),
    { url: `${baseUrl}/about`, lastModified: pageLastModified("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/answers`, lastModified: SITE_REVIEWED, changeFrequency: "monthly", priority: 0.7 },
    ...answers.map((a) => ({ url: `${baseUrl}/answers/${a.slug}`, lastModified: SITE_REVIEWED, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${baseUrl}/glossary`, lastModified: SITE_REVIEWED, changeFrequency: "monthly", priority: 0.7 },
    ...documentation.map((slug) => ({ url: `${baseUrl}/docs/${slug}`, lastModified: SITE_REVIEWED, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...productFeatures.map((slug) => ({ url: `${baseUrl}/product/${slug}`, lastModified: SITE_REVIEWED, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...useCases.map((slug) => ({ url: `${baseUrl}/use-cases/${slug}`, lastModified: SITE_REVIEWED, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${baseUrl}/best-llm-observability-tools`, lastModified: SITE_REVIEWED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/compare`, lastModified: SITE_REVIEWED, changeFrequency: "monthly", priority: 0.8 },
    ...comparisons.map((c) => ({ url: `${baseUrl}/compare/${c.slug}`, lastModified: SITE_REVIEWED, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...integrationPages.map((p) => ({ url: `${baseUrl}/integrations/${p.slug}`, lastModified: SITE_REVIEWED, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...glossaryTerms.map((t) => ({ url: `${baseUrl}/glossary/${t.slug}`, lastModified: SITE_REVIEWED, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...blogPosts,
  ];
}
