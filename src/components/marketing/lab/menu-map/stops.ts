// The five stops on the menu map, in desktop navbar order, with every link the desktop menu has.

import { appHref } from "@/lib/app-links";

export type StopLink = { title: string; note: string; href: string };
export type Stop = { name: string; links: readonly StopLink[] };

const link = (title: string, note: string, href: string): StopLink => ({ title, note, href });

export const STOPS: readonly Stop[] = [
  {
    name: "Product",
    links: [
      link("Observe", "Traces, sessions and costs", "/product/trace-viewer"),
      link("Improve", "Evaluations, datasets, prompts", "/product/evaluation-engine"),
      link("Release", "Experiments, gates, monitors", "/product/lifecycle"),
      link("Operate", "Alerts, reports, integrations", "/integrations"),
      link("Free tools", "Token counter, price and log checkers", "/tools"),
      link("Live demo", "Explore a sample project", appHref("/demo/project")),
    ],
  },
  {
    name: "Solutions",
    links: [
      link("Support", "Find the decision behind every escalation", "/use-cases/support"),
      link("Research", "Verify multi-step investigations", "/use-cases/research"),
      link("Automation", "Debug workflows and retry chains", "/use-cases/automation"),
      link("Tool calling", "Catch failed APIs and loops", "/use-cases/tool-calling"),
      link("Compare", "Uncoil next to other tools", "/compare"),
      link("Alternatives", "The best LLM observability tools", "/best-llm-observability-tools"),
    ],
  },
  {
    name: "Developers",
    links: [
      link("Docs", "Install and send your first trace", "/docs"),
      link("TypeScript SDK", "Trace Node and Next.js agents", "/docs/typescript"),
      link("Python SDK", "Instrument with a decorator", "/docs/python"),
      link("API reference", "Ingest from custom runtimes", "/docs/api"),
      link("Integrations", "LlamaIndex, AutoGen, Mastra and more", "/integrations"),
      link("Glossary", "Agent tracing terms, explained", "/glossary"),
    ],
  },
  {
    name: "Company",
    links: [
      link("Blog", "Agent engineering notes", "/blog"),
      link("Changelog", "What shipped lately", "/changelog"),
      link("Roadmap", "What is shipping next", "/roadmap"),
      link("Security", "How Uncoil handles data", "/security"),
      link("Status", "Is everything running?", "/status"),
      link("Contact", "Talk through your stack", "/contact"),
    ],
  },
  {
    name: "Pricing",
    links: [link("Plans and pricing", "Free, Pro, Team and Enterprise", "/pricing")],
  },
];

/**
 * Which stop the robot starts at for the page being viewed, or -1 for pages outside the five
 * stops (the home page starts at the trailhead). The longest matching link wins, so
 * "/docs/python" lands on Developers, and a path shared by two stops ("/integrations") goes to
 * the first one.
 */
export function stopForPath(path: string): number {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  let best = -1;
  let bestLen = 0;
  STOPS.forEach((stop, i) =>
    stop.links.forEach(({ href }) => {
      if (!href.startsWith("/")) return;
      const hit = clean === href || clean.startsWith(`${href}/`);
      if (hit && href.length > bestLen) {
        best = i;
        bestLen = href.length;
      }
    }),
  );
  return best;
}

/** The link on a stop's board that marks the current page, matched the same way. */
export function isCurrent(href: string, path: string) {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return href.startsWith("/") && clean === href;
}
