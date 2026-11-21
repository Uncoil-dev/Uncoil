const BASE_URL = "https://www.uncoil.dev";

export type FeedRelease = { code: string; date: string; items: string[] };

export function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Parse dated releases out of the release log, in file order (newest first). */
export function parseReleases(source: string): FeedRelease[] {
  return [...source.matchAll(/^## \[(.+?)\] — (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)].map((m) => ({
    code: m[1],
    date: m[2],
    items: [...m[3].matchAll(/^- (.+)$/gm)].map((i) => i[1]).filter((t) => !/^none\.?$/i.test(t.trim())),
  }));
}

export function buildChangelogRss(releases: FeedRelease[]) {
  const items = releases
    .map((r) => {
      const link = `${BASE_URL}/changelog#release-${r.code}`;
      const summary = r.items.slice(0, 5).join(" ");
      return `
    <item>
      <title>${escapeXml(`Release ${r.code}`)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(summary)}</description>
      <pubDate>${new Date(`${r.date}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    })
    .join("");
  const last = releases[0] ? new Date(`${releases[0].date}T00:00:00Z`).toUTCString() : new Date(0).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Uncoil Changelog</title>
  <link>${BASE_URL}/changelog</link>
  <description>Release notes for Uncoil.</description>
  <language>en</language>
  <lastBuildDate>${last}</lastBuildDate>
  <atom:link href="${BASE_URL}/changelog/rss.xml" rel="self" type="application/rss+xml"/>${items}
</channel>
</rss>`;
}
