import type { MetadataRoute } from "next";

const disallow = ["/admin/", "/dashboard/", "/onboarding/", "/api/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/accept-invitation", "/auth/", "/alternative", "/library", "/operations-preview", "/uncoil-preview", "/tracing-preview", "/cloud/", "/pricing/checkout", "/dash"];

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
