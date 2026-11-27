// The site laid out as one run. Every page in the navbar is one cell on the timeline, in menu
// order, so a section's bar is exactly as long as its number of links and starts where the
// previous section ended. Nothing here is a measurement of the site.

import { NAV_MENUS, NAV_PRICING } from "../nav-links";

export type Span = { label: string; href: string; cell: number };
export type Section = { name: string; index: number; start: number; len: number; links: Span[]; href?: string };
export type Here = { section: number; link: number; cell: number };
export type Group = { name: string; links: readonly (readonly [string, string])[] };

/** The navbar's menus plus Pricing, as label and href pairs. */
export const GROUPS: readonly Group[] = [
  ...Object.entries(NAV_MENUS).map(([name, menu]) => ({ name, links: menu.links.map(([label, , href]) => [label, href] as const) })),
  { name: NAV_PRICING.label, links: [[NAV_PRICING.label, NAV_PRICING.href]] },
];

export function buildTrace(groups: readonly Group[] = GROUPS) {
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

/** Whether a desktop destination can be reached from the trace: listed, or under a listed page. */
export function reaches(sections: Section[], href: string) {
  return sections.some((s) => s.links.some((l) => l.href === href)) || findHere(sections, href) !== null;
}

/**
 * Whole grid cells per page so `pages` pages fit in `cells` cells, keeping `reserve` cells free on
 * the right for the step's caret. Never below 2, so every page keeps a visible block.
 */
export const pitch = (cells: number, pages: number, reserve = 0) => Math.max(2, Math.floor((cells - reserve) / pages));

/** The first line of the menu header: which page the trace is on, or none. */
export function onLine(here: Here | null, path: string) {
  const p = clean(path.split(/[?#]/)[0] || "/");
  if (p === "/") return "on / · home";
  if (!here) return `on ${p} · off the menu`;
  return `on ${p}`;
}
