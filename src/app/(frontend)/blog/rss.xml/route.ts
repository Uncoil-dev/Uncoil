import { getPostDate, getPublishedPosts } from "@/lib/markdoc-blog";

export const dynamic = "force-static";

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRssDate(dateString: string) {
  return new Date(dateString).toUTCString();
}

export async function GET() {
  const baseUrl = "https://www.uncoil.dev";
  const posts = await getPublishedPosts();
  const items = posts
    .filter((post) => post.slug)
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${escapeXml(post.slug!)}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${escapeXml(post.slug!)}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${formatRssDate(getPostDate(post))}</pubDate>
      <author>${escapeXml(post.author)}</author>
      ${post.categories.map((category) => `<category>${escapeXml(category)}</category>`).join("")}
    </item>`,
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Uncoil Blog</title>
  <link>${baseUrl}/blog</link>
  <description>Engineering insights, agent patterns, and production AI from the Uncoil team.</description>
  <language>en</language>
  <lastBuildDate>${formatRssDate(new Date().toISOString())}</lastBuildDate>
  <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
  ${items}
</channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
