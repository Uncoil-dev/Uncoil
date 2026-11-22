import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildChangelogRss, parseReleases } from "@/lib/changelog-feed";

export const dynamic = "force-static";

export async function GET() {
  const source = readFileSync(resolve(process.cwd(), "docs/releases.md"), "utf8");
  return new Response(buildChangelogRss(parseReleases(source)), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
