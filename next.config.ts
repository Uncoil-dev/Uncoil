import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow a second dev server to run alongside the first. Next refuses to start
  // two dev instances that share a build directory, which otherwise makes it
  // impossible to run the marketing host and a regional cloud host side by side
  // the way they exist in production.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The Dockerfile sets this so the image only ships the files the server
  // needs instead of the full source tree and every dependency. Left unset,
  // builds (Nixpacks, Vercel, local) behave exactly as before.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  typescript: {
    tsconfigPath: process.env.NODE_ENV === "production" ? "tsconfig.build.json" : "tsconfig.json",
  },
  // The docs loader discovers Markdoc files through fs at build/render time.
  // Include them in Vercel's traced server functions so deployed docs pages
  // have the same content repository available as local builds.
  outputFileTracingIncludes: {
    "/*": ["./content/docs/**/*.mdoc"],
  },
  // Create-form aliases resolve at the request layer so client navigation never
  // renders a page whose only job is to call redirect(). Query values on the
  // incoming request are passed through and merged with `view=create`.
  async redirects() {
    return [
      // Old blog URLs from before the rename.
      // Old comparison posts that now live on /compare: one hop, no chain through /blog.
      { source: "/blog/langfuse-vs-tracify", destination: "/compare/langfuse", permanent: true },
      { source: "/blog/langsmith-vs-tracify", destination: "/compare/langsmith", permanent: true },
      { source: "/blog/arize-vs-tracify", destination: "/compare/arize-phoenix", permanent: true },
      { source: "/blog/braintrust-vs-tracify", destination: "/compare/braintrust", permanent: true },
      { source: "/blog/datadog-vs-tracify", destination: "/compare/datadog", permanent: true },
      { source: "/blog/:name(.+)-vs-tracify", destination: "/blog/:name-vs-uncoil", permanent: true },
      { source: "/blog/how-to-write-tracify-blog-posts", destination: "/blog/how-to-write-uncoil-blog-posts", permanent: true },
      // Merged into the complete AI agent observability guide.
      { source: "/blog/agentic-ai-observability", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/what-is-ai-observability", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/ai-observability-best-practices", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/ai-observability-platform", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/ai-observability-tools", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/ai-observability-dashboard", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/generative-ai-observability", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/ai-agent-observability-vs-apm", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/monitoring-vs-observability", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      // Merged near-duplicate posts: 301 to the one canonical page.
      { source: "/blog/ai-observability-metrics-that-matter", destination: "/blog/llm-observability-metrics-that-matter", permanent: true },
      { source: "/blog/prompt-versioning-production", destination: "/blog/prompt-versioning-and-prompt-management", permanent: true },
      { source: "/blog/ai-agent-cost-optimization", destination: "/blog/reduce-llm-costs-without-hurting-quality", permanent: true },
      { source: "/blog/ai-agent-cost-per-task", destination: "/blog/reduce-llm-costs-without-hurting-quality", permanent: true },
      { source: "/blog/how-to-estimate-ai-agent-costs", destination: "/blog/reduce-llm-costs-without-hurting-quality", permanent: true },
      { source: "/blog/ai-agent-evaluation-in-production", destination: "/blog/ai-agent-evaluation-practical-guide", permanent: true },
      { source: "/blog/ai-agent-testing-unit-tests-production-evals", destination: "/blog/ai-agent-evaluation-practical-guide", permanent: true },
      { source: "/glossary/cost-per-run", destination: "/blog/reduce-llm-costs-without-hurting-quality", permanent: true },
      { source: "/glossary/cost-budget", destination: "/blog/reduce-llm-costs-without-hurting-quality", permanent: true },
      // Old post URLs that still get Google impressions. Each goes to the closest live post.
      { source: "/blog/what-is-agent-tracing-llm-observability", destination: "/blog/llm-tracing-explained", permanent: true },
      { source: "/blog/ai-observability-complete-guide-ml-engineers", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/blog/cost-latency-monitoring-ai-agents", destination: "/blog/ai-agent-monitoring", permanent: true },
      { source: "/blog/multi-agent-observability-tracing-handoffs", destination: "/blog/multi-agent-orchestration-patterns", permanent: true },
      { source: "/blog/debugging-ai-agent-failures-with-traces", destination: "/blog/debug-ai-agents-in-production", permanent: true },
      // Pages that competed for the same search as a stronger page: 301 to the one that should rank.
      { source: "/blog/instrumenting-ai-agents-for-observability", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/answers/ai-agent-observability-best-practices", destination: "/blog/ai-agent-observability-complete-guide", permanent: true },
      { source: "/answers/what-is-a-trace-viewer", destination: "/glossary/trace-viewer", permanent: true },
      { source: "/answers/arize-alternative-for-agents", destination: "/compare/arize-phoenix", permanent: true },
      { source: "/answers/opentelemetry-ingestion-for-ai-agents", destination: "/integrations/opentelemetry", permanent: true },
      { source: "/glossary/ai-agent-tracking", destination: "/glossary/ai-agent-observability", permanent: true },
      // The Norwegian and German pages are off for now. Send them to the English pages.
      { source: "/:locale(no|de)", destination: "/", permanent: false },
      { source: "/:locale(no|de)/:path*", destination: "/:path*", permanent: false },
      // The old /playground sandbox is gone; the demo project is the one demo.
      { source: "/playground/:view(dashboards|explore|prompts|scores|evaluators|human-annotation|datasets|experiments|settings|alerts|costs|playground|sessions|tracing|users)", destination: "/demo/project/:view", permanent: false },
      { source: "/playground/:path*", destination: "/demo/project", permanent: false },
      { source: "/playground", destination: "/demo/project", permanent: false },
      {
        source: "/dashboard/:projectId/alerts/new",
        destination: "/dashboard/:projectId/alerts?view=create",
        permanent: false,
      },
      {
        source: "/dashboard/:projectId/dashboards/new",
        destination: "/dashboard/:projectId/dashboards?view=create",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
