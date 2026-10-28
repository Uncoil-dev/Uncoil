import { breadcrumbJsonLd, itemListJsonLd, jsonLdString, pageMetadata } from "@/lib/seo";
import { JournalHero, TopicStory, TraceArchive, type JournalPost } from "@/components/blog/journal";
import { getReadingTime } from "@/components/blog/reading-time";
import { Reveal } from "@/components/marketing/landing/reveal";
import { PostArt } from "@/components/reading/post-art";
import { getCategoryOptions, getPostDate, getPublishedPosts } from "@/lib/markdoc-blog";
import Link from "next/link";

export const revalidate = 60;
export const metadata = pageMetadata({ title: "AI agent observability blog", description: "Guides on AI agent observability, tracing, evaluation, cost control and debugging in production, plus honest Uncoil vs alternatives comparisons.", path: "/blog" });

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function BlogPage() {
  const [posts, categoryOptions] = await Promise.all([getPublishedPosts(), getCategoryOptions()]);
  const categories = categoryOptions.map((option) => option.value);
  const journal: JournalPost[] = posts.map((post) => ({
    slug: post.slug!,
    title: post.title,
    excerpt: post.excerpt,
    date: getPostDate(post),
    label: formatDate(getPostDate(post)),
    minutes: getReadingTime(post.plainText),
    categories: post.categories,
  }));
  const topics = categories
    .map((name) => ({ name, posts: journal.filter((p) => p.categories.includes(name)) }))
    .sort((a, b) => b.posts.length - a.posts.length)
    .slice(0, 4)
    .map((t) => ({ name: t.name, count: t.posts.length, posts: t.posts.slice(0, 3) }));
  const [lead, ...others] = posts;
  const side = others.slice(0, 2);

  return (
    <main className="bg-[#eceae3] text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString([breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Blog", path: "/blog" }]), itemListJsonLd("Uncoil blog", journal.map((p) => ({ name: p.title, path: `/blog/${p.slug}` })))]) }}
      />
      <JournalHero posts={journal} total={journal.length} />

      {lead ? (
        <section className="px-5 py-20 md:px-10 md:py-28" aria-label="Latest">
          <div className="mx-auto max-w-[1320px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Latest</p>
            <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.4rem,5.4vw,4.8rem)] leading-[0.92] tracking-[-0.07em]">Fresh off the loop.</h2>
            <div className="mt-12 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <Reveal>
                <Link href={`/blog/${lead.slug}`} className="group relative flex min-h-[460px] flex-col justify-end overflow-hidden border border-black bg-[#090909] text-[#eceae3] lg:h-full">
                  <PostArt seed={lead.slug!} className="absolute inset-0 size-full transition duration-700 group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,#090909_10%,rgba(9,9,9,0.1)_70%)]" />
                  <div className="relative p-6 md:p-10">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">{(lead.categories[0] ?? "note").replace(/-/g, " ")} · {getReadingTime(lead.plainText)} min</p>
                    <h3 className="mt-4 max-w-2xl text-balance font-pixel text-[clamp(2rem,4vw,3.6rem)] leading-[0.93] tracking-[-0.06em]">{lead.title}</h3>
                    <p className="mt-4 line-clamp-2 max-w-xl text-white/70">{lead.excerpt}</p>
                    <span className="mt-6 inline-block bg-[#f4d44d] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black transition-colors group-hover:bg-white">Read →</span>
                  </div>
                </Link>
              </Reveal>
              <div className="grid gap-5">
                {side.map((post, i) => (
                  <Reveal key={post.id} delay={0.08 * (i + 1)}>
                    <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col justify-between border border-black bg-[#eceae3] p-6 transition-colors hover:bg-[#f4d44d] md:p-8">
                      <div className="h-24 overflow-hidden border border-black"><PostArt seed={post.slug!} className="size-full transition duration-500 group-hover:scale-110" /></div>
                      <div className="mt-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">{(post.categories[0] ?? "note").replace(/-/g, " ")} · {getReadingTime(post.plainText)} min</p>
                        <h3 className="mt-3 text-balance font-pixel text-[1.9rem] leading-[0.95] tracking-[-0.05em]">{post.title}</h3>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {topics.length ? <TopicStory topics={topics} /> : null}
      <TraceArchive posts={journal} categories={categories} />
    </main>
  );
}
