import { appHref } from "@/lib/app-links";

// The site's navigation, in menu order. The desktop navbar and the phone menu both read this
// list, so a page added here shows up in both and the two cannot drift apart.
// Each link is [title, one-line description, href].
export const NAV_MENUS = {
  Product: {
    img: "/images/landing/hero-graph.png",
    feature: { title: "See the full loop.", body: "Trace a run, evaluate the output, compare changes, ship with evidence.", href: appHref("/demo/project"), label: "Open the demo" },
    links: [
      ["Observe", "Traces, sessions and costs", "/product/trace-viewer"],
      ["Improve", "Evaluations, datasets, prompts", "/product/evaluation-engine"],
      ["Release", "Experiments, gates, monitors", "/product/lifecycle"],
      ["Operate", "Alerts, reports, integrations", "/integrations"],
      ["Free tools", "Token counter, price and log checkers", "/tools"],
      ["Live demo", "Explore a sample project", appHref("/demo/project")],
    ],
  },
  Solutions: {
    img: "/images/landing/uc-research.png",
    feature: { title: "When an agent gets it wrong.", body: "Follow a bad answer back to the exact step, tool call and prompt.", href: "/use-cases/support", label: "Explore support" },
    links: [
      ["Support", "Find the decision behind every escalation", "/use-cases/support"],
      ["Research", "Verify multi-step investigations", "/use-cases/research"],
      ["Automation", "Debug workflows and retry chains", "/use-cases/automation"],
      ["Tool calling", "Catch failed APIs and loops", "/use-cases/tool-calling"],
      ["Compare", "Uncoil next to other tools", "/compare"],
      ["Alternatives", "The best LLM observability tools", "/best-llm-observability-tools"],
    ],
  },
  Developers: {
    img: "/images/landing/span-anatomy.png",
    feature: { title: "Your first trace.", body: "Install the SDK, send one run, and open it as a map.", href: "/docs", label: "Open the quickstart" },
    links: [
      ["Docs", "Install and send your first trace", "/docs"],
      ["TypeScript SDK", "Trace Node and Next.js agents", "/docs/typescript"],
      ["Python SDK", "Instrument with a decorator", "/docs/python"],
      ["API reference", "Ingest from custom runtimes", "/docs/api"],
      ["Integrations", "LlamaIndex, AutoGen, Mastra and more", "/integrations"],
      ["Glossary", "Agent tracing terms, explained", "/glossary"],
    ],
  },
  Company: {
    img: "/images/landing/globe-orbits.png",
    feature: { title: "Agent observability, explained.", body: "A field guide to traces, evaluations, cost and prompts.", href: "/blog/ai-agent-observability-complete-guide", label: "Read the guide" },
    links: [
      ["Blog", "Agent engineering notes", "/blog"],
      ["Changelog", "What shipped lately", "/changelog"],
      ["Roadmap", "What is shipping next", "/roadmap"],
      ["Security", "How Uncoil handles data", "/security"],
      ["Status", "Is everything running?", "/status"],
      ["Contact", "Talk through your stack", "/contact"],
    ],
  },
} as const;

/** The one top-level destination that is a page rather than a menu. */
export const NAV_PRICING = { label: "Pricing", href: "/pricing" } as const;
