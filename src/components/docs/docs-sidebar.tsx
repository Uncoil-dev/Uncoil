import Link from "next/link";

type DocsSidebarItem = { slug: string; title: string; section: string };

export function DocsSidebar({ docs, activeSlug }: { docs: DocsSidebarItem[]; activeSlug?: string }) {
  return <aside className="border-b border-black bg-[#eceae3] lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
    <details className="group lg:hidden"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 font-mono text-[10px] uppercase tracking-[.13em]"><span>Browse documentation</span><span className="group-open:rotate-45">+</span></summary><DocsNavigation docs={docs} activeSlug={activeSlug} /></details>
    <div className="hidden p-6 lg:block"><Link href="/docs" className={`block font-pixel text-2xl tracking-[-.06em] ${activeSlug ? "" : "bg-[#f4d44d] px-2"}`}>uncoil docs</Link><DocsNavigation docs={docs} activeSlug={activeSlug} /></div>
  </aside>;
}

function DocsNavigation({ docs, activeSlug }: { docs: DocsSidebarItem[]; activeSlug?: string }) {
  const sections = [...new Set(docs.map((doc) => doc.section))];
  return <nav className="border-t border-black px-5 pb-6 lg:mt-8 lg:border-t-0 lg:px-0">{sections.map((section) => <div key={section} className="border-b border-black/20 py-5 last:border-b-0"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-black/55">{section}</p><div className="mt-3 space-y-2">{docs.filter((doc) => doc.section === section).map((doc) => <Link key={doc.slug} href={`/docs/${doc.slug}`} className={`block text-sm leading-5 ${doc.slug === activeSlug ? "-ml-3 border-l-4 border-[#f4d44d] bg-[#f4d44d]/40 py-0.5 pl-2 font-medium text-black" : "text-black/65 transition-colors hover:text-black"}`}>{doc.title}</Link>)}</div></div>)}</nav>;
}
