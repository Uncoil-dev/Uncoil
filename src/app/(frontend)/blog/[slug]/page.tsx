import { ArticleCta } from "@/components/blog/article-cta";
import { LegalToc } from "@/components/reading/legal-toc";
import { AuthorBio } from "@/components/blog/author-bio";
import { MarkdocRichText } from "@/components/blog/markdoc-rich-text";
import { BlogTableOfContents } from "@/components/blog/blog-table-of-contents";
import { ReadPlayhead } from "@/components/reading/read-playhead";
import { PostArt } from "@/components/reading/post-art";
import { RelatedPosts } from "@/components/blog/related-posts";
import { NewsletterPanel } from "@/components/marketing/newsletter-panel";
import { ShareButtons } from "@/components/blog/share-buttons";
import { getReadingTime } from "@/components/blog/reading-time";
import {
  extractBlogFaqItems,
  getPostDate,
  getPublishedPost,
  getPublishedPosts,
  type BlogPost,
} from "@/lib/markdoc-blog";
import { fitDescription, fitTitle, fitTitleText, ogImageUrl } from "@/lib/seo";
import { comparisons } from "@/lib/seo-pages";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

// Each "X vs Tracify" post has a matching /compare page that now carries the full article, so the post points search engines there.
const comparePageFor = (slug: string) => comparisons.find((c) => c.post === slug)?.slug;
const canonicalPath = (slug: string) => { const compare = comparePageFor(slug); return compare ? `/compare/${compare}` : `/blog/${slug}`; };
// Workflow notes for contributors, not reader-facing content.
const internalPosts = new Set(["how-to-write-tracify-blog-posts"]);
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.slug).map((post) => ({ slug: post.slug! }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const metaTitle = post.seo?.metaTitle || post.title;
  const metaDescription = fitDescription(post.seo?.metaDescription || post.excerpt);
  const shareTitle = fitTitleText(metaTitle);
  const canonical = post.seo?.canonicalUrl || canonicalPath(slug);
  const image = ogImageUrl({ title: post.title, kicker: "Blog", sub: post.author ? `By ${post.author}` : undefined, kind: "blog" });

  return {
    title: fitTitle(metaTitle),
    description: metaDescription,
    openGraph: {
      title: shareTitle,
      description: metaDescription,
      url: canonical,
      siteName: "Tracify",
      locale: "en_US",
      type: "article",
      publishedTime: getPostDate(post),
      authors: post.author ? [post.author] : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: metaDescription,
      images: [image],
    },
    alternates: {
      canonical,
      types: { "text/markdown": `/blog/${slug}.md` },
    },
    robots: { index: !internalPosts.has(slug), follow: true },
  };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function absoluteUrl(value: string) {
  return value.startsWith("http") ? value : `https://www.tracify.tech${value}`;
}

function jsonLd(post: BlogPost) {
  const canonical = post.seo?.canonicalUrl || `https://www.tracify.tech${canonicalPath(post.slug!)}`;
  const image = post.heroImage?.og || post.heroImage?.src;
  const faqItems = extractBlogFaqItems(post.body);

  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      datePublished: getPostDate(post),
      dateModified: post.updatedAt || getPostDate(post),
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      author: post.author === "Tracify Team"
        ? { "@type": "Organization", name: "Tracify", url: "https://www.tracify.tech" }
        : { "@type": "Person", name: post.author },
      publisher: { "@type": "Organization", name: "Tracify", url: "https://www.tracify.tech" },
      image: image ? absoluteUrl(image) : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tracify", item: "https://www.tracify.tech/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.tracify.tech/blog" },
        { "@type": "ListItem", position: 3, name: post.title, item: canonical },
      ],
    },
    ...(faqItems.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]
      : []),
  ];
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const categories = post.categories;
  const tags = post.tags;
  const all = await getPublishedPosts();
  const at = all.findIndex((p) => p.slug === post.slug);
  const next = all[at + 1] ?? all[0];
  const tocItems = post.headings.filter((h) => h.level === 2).map((h) => ({ id: h.id, title: h.text }));
  const heroUrl = post.heroImage?.hero || post.heroImage?.src;
  const isMonitoringPost = post.slug === "ai-agent-monitoring";
  const articleClassName = isMonitoringPost ? "blog-post--monitoring" : undefined;

  return (
    <div className="min-h-screen bg-[#eceae3] text-black">
      <ReadPlayhead sections={tocItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(post)).replace(/</g, "\\u003c") }}
      />
      <article className={articleClassName}>
        <header className="relative isolate overflow-hidden bg-[#090909] text-[#eceae3]">
          <PostArt seed={post.slug} className="absolute inset-0 -z-10 size-full opacity-60" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#090909_28%,rgba(9,9,9,0.55)_70%,rgba(9,9,9,0.15)_100%),linear-gradient(to_top,#090909_0%,transparent_35%)]" />
          <div className="mx-auto flex min-h-[72svh] max-w-[1240px] flex-col justify-end px-5 pb-14 pt-24 sm:px-8 md:pb-20">
            <Link href="/blog" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4d44d]">
              ← All articles
            </Link>
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
              <time dateTime={getPostDate(post)}>{formatDate(getPostDate(post))}</time>
              <span aria-hidden="true">/</span>
              <span>{post.author}</span>
              <span aria-hidden="true">/</span>
              <span>{getReadingTime(post.plainText)} min read</span>
            </div>
            <h1 className="blog-post__title mt-6 max-w-4xl text-balance font-pixel text-[clamp(2.8rem,7.5vw,6.8rem)] leading-[0.88] tracking-[-0.065em]">{post.title}</h1>
            <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-white/70 md:text-lg md:leading-8">{post.excerpt}</p>

            {categories.length ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span key={category} className="border border-[#f4d44d] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f4d44d]">{category}</span>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="mx-auto max-w-[1240px] border-x border-black">
          {heroUrl ? (
            <div className="relative min-h-[320px] overflow-hidden border-b border-black bg-black md:min-h-[520px]">
              <Image
                src={heroUrl}
                alt={post.heroImage?.alt || post.title}
                fill
                sizes="(min-width: 1240px) 1240px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="blog-post__body mx-auto grid max-w-[1100px] gap-10 px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                {tocItems.length > 2 ? <LegalToc items={tocItems} /> : null}
                <div className="mt-8 border-t border-black/20 pt-6">
                  <ShareButtons title={post.title} />
                </div>
              </div>
            </aside>
            <div className="min-w-0">
              <div className="lg:hidden"><BlogTableOfContents headings={post.headings} /></div>
              <MarkdocRichText content={post.content} />

              <ArticleCta />

              <NewsletterPanel source="blog" />

              <div className="mt-12 flex flex-col gap-6 border-t border-black/20 pt-8">
                <div className="lg:hidden"><ShareButtons title={post.title} /></div>
                <AuthorBio author={post.author} />
              </div>

              {!isMonitoringPost ? <RelatedPosts posts={post.relatedPosts} currentSlug={post.slug} categories={post.categories} /> : null}

              {tags.length ? (
                <div className="mt-12 border-t border-black/20 pt-8">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="border border-black/20 px-2 py-1 font-mono text-[11px] text-black/60">#{tag}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {isMonitoringPost ? <RelatedPosts posts={post.relatedPosts} currentSlug={post.slug} categories={post.categories} heading="Recommended posts" /> : null}
            </div>
          </div>
        </div>

        {next && next.slug !== post.slug ? (
          <Link href={`/blog/${next.slug}`} className="group relative isolate block overflow-hidden bg-[#090909] text-[#eceae3]">
            <PostArt seed={next.slug!} className="absolute inset-0 -z-10 size-full opacity-50 transition duration-700 group-hover:scale-105 group-hover:opacity-80" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#090909_30%,transparent)]" />
            <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 md:py-28">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Next in the loop</p>
              <p className="mt-5 max-w-3xl text-balance font-pixel text-[clamp(2.2rem,5vw,4.6rem)] leading-[0.92] tracking-[-0.06em]">{next.title}</p>
              <span className="mt-8 inline-block bg-[#f4d44d] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-black transition-colors group-hover:bg-white">Keep reading →</span>
            </div>
          </Link>
        ) : null}
      </article>
    </div>
  );
}
