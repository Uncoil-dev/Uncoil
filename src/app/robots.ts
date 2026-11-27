import type { MetadataRoute } from "next";

// Only API and private admin routes are blocked. Sign-in, dashboard, onboarding and preview pages
// carry a noindex tag instead: blocking them would hide that tag, and Google would keep the bare URLs.
const disallow = ["/admin/", "/api/", "/auth/", "/pricing/checkout"];

// AI search and assistant crawlers are welcomed explicitly so public docs, guides and comparisons can be found and cited.
const aiCrawlers = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Amazonbot", "DuckAssistBot", "MistralAI-User", "Meta-ExternalAgent"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: "https://www.uncoil.dev/sitemap.xml",
    host: "https://www.uncoil.dev",
  };
}
