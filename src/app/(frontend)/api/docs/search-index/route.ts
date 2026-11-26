import { toDockDocs } from "@/lib/docs-search";
import { getDocs } from "@/lib/markdoc-docs";

export const dynamic = "force-static";

/** Full docs search index, fetched by the docs search bar on first use. */
export function GET() {
  return Response.json(toDockDocs(getDocs()), { headers: { "X-Robots-Tag": "noindex" } });
}
