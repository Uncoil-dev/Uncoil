// Reads the "Changelog" section of a pull request description and turns merged
// pull requests into release-log bullets grouped by category.
//
// Usage:
//   gh pr list --state merged --search "merged:>=2026-11-01" --json number,body \
//     | node scripts/changelog-from-prs.mjs

export const CATEGORIES = [
  "Features",
  "Fixes",
  "SDK changes",
  "Breaking changes",
  "Security and operations",
];

const NONE = /^(none|n\/a|no user-facing change)\.?$/i;

/**
 * Returns { category, line } for a pull request body, or null when the body has
 * no ticked category, no line, or says there is no user-facing change.
 */
export function parseChangelogEntry(body) {
  const section = /^## Changelog\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body ?? "");
  if (!section) return null;
  const text = section[1].replace(/<!--[\s\S]*?-->/g, "");

  const ticked = CATEGORIES.filter((name) =>
    new RegExp(`^- \\[[xX]\\] ${name}\\s*$`, "m").test(text),
  );
  if (ticked.length !== 1) return null;

  const line = /^Line:[ \t]*(.+)$/m.exec(text)?.[1].trim();
  if (!line || NONE.test(line)) return null;
  return { category: ticked[0], line };
}

/** Groups entries from pull requests (oldest number first) into markdown. */
export function renderReleaseNotes(prs) {
  const groups = new Map(CATEGORIES.map((c) => [c, []]));
  for (const pr of [...prs].sort((a, b) => a.number - b.number)) {
    const entry = parseChangelogEntry(pr.body);
    if (entry) groups.get(entry.category).push(entry.line);
  }
  return CATEGORIES.filter((c) => groups.get(c).length > 0)
    .map((c) => `### ${c}\n${groups.get(c).map((l) => `- ${l}`).join("\n")}`)
    .join("\n\n");
}
