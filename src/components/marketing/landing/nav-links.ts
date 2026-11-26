import { appHref } from "@/lib/app-links";

/** The desktop navbar's four dropdowns. The phone menu is built from the same links. */
export const menus = {
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

export type MenuName = keyof typeof menus;

export type MenuLink = { label: string; note: string; href: string };
export type MenuSection = { title?: string; links: MenuLink[] };
export type MenuEntry = { kind: "link"; label: string; href: string } | { kind: "group"; label: string; sections: MenuSection[] };

const linksOf = (name: MenuName, skip: readonly string[] = []): MenuLink[] =>
  menus[name].links.filter(([label]) => !skip.includes(label)).map(([label, note, href]) => ({ label, note, href }));

/**
 * The phone menu: five rows. Docs and Pricing are one tap away; everything else from the desktop
 * dropdowns sits one level down. "More" holds the developer and company pages.
 */
export const mobileMenu: MenuEntry[] = [
  { kind: "group", label: "Product", sections: [{ links: linksOf("Product") }] },
  { kind: "group", label: "Solutions", sections: [{ links: linksOf("Solutions") }] },
  { kind: "link", label: "Docs", href: "/docs" },
  { kind: "link", label: "Pricing", href: "/pricing" },
  {
    kind: "group",
    label: "More",
    sections: [
      { title: "Developers", links: linksOf("Developers", ["Docs"]) },
      { title: "Company", links: linksOf("Company") },
    ],
  },
];

/** Every destination in the phone menu, in order. */
export function mobileMenuHrefs(menu: readonly MenuEntry[] = mobileMenu): string[] {
  return menu.flatMap((entry) => (entry.kind === "link" ? [entry.href] : entry.sections.flatMap((s) => s.links.map((l) => l.href))));
}

/**
 * The menu link for the page being viewed: an exact match, or else the longest link that is a
 * parent path of it ("/blog/some-post" marks "Blog"). Returns null on pages outside the menu.
 */
export function currentHref(pathname: string, hrefs: readonly string[] = mobileMenuHrefs()): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (!href.startsWith("/") || href === "/") continue;
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

/** The label of the group that holds `href`, so the menu can open on the visitor's section. */
export function groupOf(href: string | null, menu: readonly MenuEntry[] = mobileMenu): string | null {
  if (!href) return null;
  const hit = menu.find((entry) => entry.kind === "group" && entry.sections.some((s) => s.links.some((l) => l.href === href)));
  return hit?.label ?? null;
}
