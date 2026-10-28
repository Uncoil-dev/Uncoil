"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Filter,
  LayoutGrid,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  findLibrarySection,
  libraryCategories,
  librarySections,
  siteStructures,
} from "@/components/marketing/section-library-data";

const toneClass = {
  yellow: "bg-[#f4d44d] text-black",
  coral: "bg-[#ff655a] text-black",
  violet: "bg-[#8b7cff] text-black",
  mint: "bg-[#7ee0b8] text-black",
  light: "bg-[#eceae3] text-black",
  dark: "bg-[#0b0b0b] text-white",
} as const;

export function SectionLibrary() {
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const [category, setCategory] = useState(
    requestedCategory &&
      libraryCategories.includes(
        requestedCategory as (typeof libraryCategories)[number],
      )
      ? requestedCategory
      : "All",
  );
  const [query, setQuery] = useState("");
  const [structureId, setStructureId] = useState(siteStructures[0].id);

  const visibleSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return librarySections.filter((section) => {
      const categoryMatches =
        category === "All" || section.category === category;
      const queryMatches =
        !normalized ||
        `${section.title} ${section.category} ${section.description}`
          .toLowerCase()
          .includes(normalized);
      return categoryMatches && queryMatches;
    });
  }, [category, query]);

  const activeStructure =
    siteStructures.find((structure) => structure.id === structureId) ??
    siteStructures[0];

  return (
    <>
      <section className="border-b border-white/15 px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7ee0b8]">
              Private design workspace
            </p>
            <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-500">
              <ShieldCheck className="size-3" /> approved administrators only
            </span>
          </div>
          <div className="grid gap-10 pt-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-[980px] font-pixel text-7xl leading-[0.79] tracking-[-0.08em] md:text-9xl">
                The Uncoil section library.
              </h1>
              <p className="mt-7 max-w-[700px] text-lg leading-8 text-zinc-400">
                Browse every exploration by purpose, jump directly to the live
                section, or assemble a recommended homepage narrative.
              </p>
              <Link
                href="/alternative"
                className="mt-6 inline-flex items-center gap-2 border-b border-[#f4d44d] pb-1 font-mono text-[9px] uppercase tracking-[0.13em] text-[#f4d44d] hover:text-white"
              >
                Open curated alternative <ArrowUpRight className="size-3" />
              </Link>
              <Link
                href="/admin/composer"
                className="mt-4 inline-flex items-center gap-2 border-b border-white/20 pb-1 font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-400 hover:text-white"
              >
                Open homepage composer <ArrowUpRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 border border-white/15">
              <div className="p-5">
                <p className="font-pixel text-5xl tracking-[-0.06em]">
                  {librarySections.length}
                </p>
                <p className="mt-2 font-mono text-[8px] uppercase text-zinc-600">
                  sections
                </p>
              </div>
              <div className="border-l border-white/15 p-5">
                <p className="font-pixel text-5xl tracking-[-0.06em]">
                  {libraryCategories.length - 1}
                </p>
                <p className="mt-2 font-mono text-[8px] uppercase text-zinc-600">
                  categories
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="site-structures"
        className="border-b border-white/15 bg-[#090909] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-wrap items-end justify-between gap-7">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">
                Site structure planner
              </p>
              <h2 className="mt-5 font-pixel text-6xl leading-[0.84] tracking-[-0.07em] md:text-8xl">
                Choose the story before the sections.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-zinc-500">
              Each structure is a recommended order, not a lock. Open any step
              to compare the live implementation.
            </p>
          </div>
          <div className="mt-12 grid gap-px bg-white/15 lg:grid-cols-[0.42fr_1.58fr]">
            <div className="bg-black">
              {siteStructures.map((structure) => (
                <button
                  key={structure.id}
                  type="button"
                  onClick={() => setStructureId(structure.id)}
                  aria-pressed={structure.id === activeStructure.id}
                  className={`flex w-full items-center justify-between border-b border-white/10 p-5 text-left font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${structure.id === activeStructure.id ? "bg-white text-black" : "text-zinc-500 hover:bg-white/5 hover:text-white"}`}
                >
                  <span>{structure.name}</span>
                  <ArrowRight className="size-3" />
                </button>
              ))}
            </div>
            <div className="bg-[#0b0b0b] p-7 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#7ee0b8]">
                    Best for / {activeStructure.bestFor}
                  </p>
                  <h3 className="mt-4 font-pixel text-5xl tracking-[-0.06em]">
                    {activeStructure.name}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500">
                    {activeStructure.summary}
                  </p>
                </div>
                <span className="border border-white/15 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-500">
                  {activeStructure.sections.length} sections
                </span>
              </div>
              <div className="mt-10 space-y-2">
                {activeStructure.sections.map((anchor, index) => {
                  const section = findLibrarySection(anchor);
                  if (!section) return null;
                  return (
                    <Link
                      key={anchor}
                      href={`/admin/library#${anchor}`}
                      className="group grid grid-cols-[42px_1fr_auto] items-center gap-4 border border-white/15 p-4 transition-colors hover:bg-white hover:text-black"
                    >
                      <span className="font-mono text-[8px] opacity-45">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="font-pixel text-2xl tracking-[-0.04em]">
                          {section.title}
                        </p>
                        <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] opacity-45">
                          {section.category}
                        </p>
                      </div>
                      <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="section-gallery" className="px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-wrap items-end justify-between gap-7">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b7cff]">
                Section gallery
              </p>
              <h2 className="mt-5 font-pixel text-6xl leading-[0.84] tracking-[-0.07em] md:text-8xl">
                Browse by the job it does.
              </h2>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
              {visibleSections.length} matching sections
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-[250px_1fr]">
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <label className="flex h-12 items-center gap-3 border border-white/15 px-4">
                <Search className="size-4 text-zinc-600" />
                <span className="sr-only">Search section library</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sections"
                  className="min-w-0 flex-1 bg-transparent font-mono text-[10px] outline-none placeholder:text-zinc-700"
                />
              </label>
              <div className="mt-3 border border-white/15">
                <div className="flex items-center gap-2 border-b border-white/15 p-4 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600">
                  <Filter className="size-3" /> Categories
                </div>
                {libraryCategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    aria-pressed={category === item}
                    className={`flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left font-mono text-[9px] transition-colors last:border-b-0 ${category === item ? "bg-[#f4d44d] text-black" : "text-zinc-500 hover:text-white"}`}
                  >
                    <span>{item}</span>
                    <span className="text-[8px] opacity-45">
                      {item === "All"
                        ? librarySections.length
                        : librarySections.filter(
                            (section) => section.category === item,
                          ).length}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
            <div>
              {visibleSections.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleSections.map((section, index) => (
                    <article
                      key={section.anchor}
                      className={`group flex min-h-[270px] flex-col justify-between border border-white/15 p-5 transition-transform duration-300 hover:-translate-y-1 ${toneClass[section.tone]}`}
                    >
                      <div>
                        <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.12em] opacity-45">
                          <span>{section.category}</span>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                        </div>
                        <h3 className="mt-8 font-pixel text-4xl leading-[0.9] tracking-[-0.06em]">
                          {section.title}
                        </h3>
                        <p className="mt-4 text-sm leading-6 opacity-55">
                          {section.description}
                        </p>
                      </div>
                      <Link
                        href={`/admin/library#${section.anchor}`}
                        className="mt-8 flex items-center justify-between border-t border-current/15 pt-4 font-mono text-[8px] uppercase tracking-[0.12em]"
                      >
                        Open live section
                        <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center border border-white/15 text-center">
                  <LayoutGrid className="size-7 text-zinc-700" />
                  <p className="mt-5 font-pixel text-4xl">No sections match.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
                    }}
                    className="mt-5 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500 hover:text-white"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
