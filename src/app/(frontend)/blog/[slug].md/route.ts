import { NextResponse } from "next/server";
import { getPublishedPost, getPostDate } from "@/lib/markdoc-blog";

export const runtime = "nodejs";

// Markdoc tags ({% ... %}) are layout, not content, so they are dropped from the plain-text copy for AI assistants.
const stripTags = (body: string) => body.replace(/\{%[^%]*%\}/g, "").replace(/\n{3,}/g, "\n\n").trim();

export async function GET(_request: Request, { params }: { params: Promise<Record<string, string | string[] | undefined>> }) {
  const slug = String((await params).slug ?? "");
  const post = await getPublishedPost(slug);
  if (!post) return new NextResponse("Not found", { status: 404 });
  const markdown = `# ${post.title}\n\nBy ${post.author}, published ${getPostDate(post).slice(0, 10)}. Original: https://www.uncoil.dev/blog/${slug}\n\n${post.excerpt}\n\n${stripTags(post.body)}\n`;
  return new NextResponse(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
