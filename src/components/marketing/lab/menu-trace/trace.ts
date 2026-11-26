// The site laid out as one run. Every page in the desktop menu is one cell on the timeline,
// in menu order, so a section's bar is exactly as long as its number of links and starts
// where the previous section ended. Nothing here is a measurement of the site.

export type Link = readonly [label: string, href: string];

export const GROUPS: readonly { name: string; links: readonly Link[] }[] = [
  {
    name: "Product",
    links: [
      ["Observe", "/product/trace-viewer"],
      ["Improve", "/product/evaluation-engine"],
      ["Release", "/product/lifecycle"],
      ["Operate", "/integrations"],
      ["Free tools", "/tools"],
      ["Live demo", "/demo/project"],
    ],
  },
  {
    name: "Solutions",
    links: [
      ["Support", "/use-cases/support"],
      ["Research", "/use-cases/research"],
      ["Automation", "/use-cases/automation"],
      ["Tool calling", "/use-cases/tool-calling"],
      ["Compare", "/compare"],
      ["Alternatives", "/best-llm-observability-tools"],
    ],
  },
  {
    name: "Developers",
    links: [
      ["Docs", "/docs"],
      ["TypeScript SDK", "/docs/typescript"],
      ["Python SDK", "/docs/python"],
      ["API reference", "/docs/api"],
      ["Integrations", "/integrations"],
      ["Glossary", "/glossary"],
    ],
  },
  {
    name: "Company",
    links: [
      ["Blog", "/blog"],
      ["Changelog", "/changelog"],
      ["Roadmap", "/roadmap"],
      ["Security", "/security"],
      ["Status", "/status"],
      ["Contact", "/contact"],
    ],
  },
  { name: "Pricing", links: [["Pricing", "/pricing"]] },
];

export type Span = { label: string; href: string; cell: number };
export type Section = { name: string; index: number; start: number; len: number; links: Span[]; href?: string };
export type Here = { section: number; link: number; cell: number };

export function buildTrace(groups = GROUPS) {
  let cell = 0;
  const sections: Section[] = groups.map((g, index) => {
    const start = cell;
    const links = g.links.map(([label, href]) => ({ label, href, cell: cell++ }));
    // A section with a single page is a leaf step: tapping it navigates instead of unfolding.
    return { name: g.name, index, start, len: links.length, links, href: links.length === 1 ? links[0].href : undefined };
  });
  return { sections, total: cell };
}

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** The step for the page you are on: an exact match first, else the longest parent path. */
export function findHere(sections: Section[], path: string): Here | null {
  const p = clean(path.split(/[?#]/)[0] || "/");
  let best: Here | null = null;
  let bestLen = 0;
  for (const s of sections) {
    for (let i = 0; i < s.links.length; i++) {
      const h = s.links[i].href;
      if (h === p) return { section: s.index, link: i, cell: s.links[i].cell };
      if (p.startsWith(h + "/") && h.length > bestLen) {
        best = { section: s.index, link: i, cell: s.links[i].cell };
        bestLen = h.length;
      }
    }
  }
  return best;
}
