// Ranks menu entries against what was typed at the prompt. Plain rules, strongest first, so
// short inputs land where people expect: "pri" on Pricing, "py" on the Python SDK.

import type { Hit } from "./menu-data";

export type Match = { hit: Hit; score: number; marks: readonly (readonly [number, number])[] };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Word starts in `text`, as character offsets. */
function wordStarts(text: string) {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) if (i === 0 || /[\s\-/]/.test(text[i - 1])) out.push(i);
  return out;
}

/** Positions of `q` as an in-order subsequence of `text`, or null. */
function subsequence(text: string, q: string) {
  const at: number[] = [];
  let j = 0;
  for (let i = 0; i < text.length && j < q.length; i++) {
    if (text[i] !== q[j]) continue;
    at.push(i);
    j++;
  }
  return j === q.length ? at : null;
}

/** Merges neighbouring positions into [start, end) ranges for highlighting. */
function ranges(at: readonly number[]) {
  const out: [number, number][] = [];
  for (const i of at) {
    const last = out[out.length - 1];
    if (last && last[1] === i) last[1] = i + 1;
    else out.push([i, i + 1]);
  }
  return out;
}

export function scoreHit(hit: Hit, raw: string): Match | null {
  const q = norm(raw).replace(/^\/+/, "");
  if (!q) return null;
  const title = hit.title.toLowerCase();
  const span = (i: number) => [[i, i + q.length] as const];
  if (title === q) return { hit, score: 100, marks: span(0) };
  if (title.startsWith(q)) return { hit, score: 90, marks: span(0) };
  const word = wordStarts(title).find((i) => title.startsWith(q, i));
  if (word !== undefined) return { hit, score: 80, marks: span(word) };
  if (hit.also?.some((a) => a.startsWith(q))) return { hit, score: 70, marks: [] };
  if (hit.group.toLowerCase().startsWith(q)) return { hit, score: 50, marks: [] };
  const inside = title.indexOf(q);
  if (inside >= 0) return { hit, score: 45, marks: span(inside) };
  const desc = hit.desc.toLowerCase();
  if (wordStarts(desc).some((i) => desc.startsWith(q, i))) return { hit, score: 30, marks: [] };
  if (q.length >= 2 && hit.href.toLowerCase().includes(q)) return { hit, score: 20, marks: [] };
  const loose = q.length >= 3 ? subsequence(title, q.replace(/ /g, "")) : null;
  if (loose) return { hit, score: 10, marks: ranges(loose) };
  return null;
}

/** Best first; ties keep menu order. One row per destination. */
export function findPages(all: readonly Hit[], raw: string, limit = 8): Match[] {
  const seen = new Set<string>();
  return all
    .map((hit, i) => ({ m: scoreHit(hit, raw), i }))
    .filter((x): x is { m: Match; i: number } => x.m !== null)
    .sort((a, b) => b.m.score - a.m.score || a.i - b.i)
    .map((x) => x.m)
    .filter((m) => {
      if (seen.has(m.hit.href)) return false;
      seen.add(m.hit.href);
      return true;
    })
    .slice(0, limit);
}
