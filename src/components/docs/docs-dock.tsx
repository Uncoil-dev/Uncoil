"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { searchDockLinks, searchDocs, type DockLink, type SearchableDoc } from "@/lib/docs-search";

let indexRequest: Promise<SearchableDoc[]> | null = null;
function loadIndex() {
  indexRequest ??= fetch("/api/docs/search-index").then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`)))).catch((error: unknown) => { indexRequest = null; throw error; });
  return indexRequest;
}

/**
 * Search bar pinned to the bottom of every docs page. Results open upward.
 * Pages carry only guide titles; the full-text index loads on first use and
 * title search answers until it arrives.
 */
export function DocsDock({ links }: { links: DockLink[] }) {
  const router = useRouter();
  const [index, setIndex] = useState<SearchableDoc[] | null>(null);
  const prepare = () => { if (!index) loadIndex().then(setIndex, () => {}); };
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (query.trim()) return index ? searchDocs(index, query, 6) : searchDockLinks(links, query, 6);
    return links.slice(0, 6).map((d) => ({ ...d, excerpt: d.description, score: 0 }));
  }, [index, links, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      const typing = !!el && (/input|textarea|select/i.test(el.tagName) || el.isContentEditable);
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, []);

  const go = (slug: string) => { setOpen(false); setQuery(""); inputRef.current?.blur(); router.push(`/docs/${slug}`); };

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pl-3 pr-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="pointer-events-auto relative mx-auto w-full max-w-[720px]">
        {open && (
          <div role="listbox" aria-label="Search results" className="absolute inset-x-0 bottom-full mb-2 max-h-[min(60svh,460px)] overflow-y-auto border border-[#090909] bg-[#eceae3] shadow-[8px_8px_0_#090909]">
            <p className="border-b border-black/20 px-4 py-2 font-mono text-[9px] uppercase tracking-[.14em] text-black/55">{query.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Jump to a guide"}</p>
            {results.length ? results.map((doc, i) => (
              <Link key={doc.slug} href={`/docs/${doc.slug}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => { setOpen(false); setQuery(""); }} className={`block border-b border-black/15 px-4 py-3 last:border-b-0 ${i === active ? "bg-[#f4d44d]" : ""}`}>
                <span className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[.08em]"><span>{doc.title} <span className="text-black/50">/ {doc.section}</span></span>{i === active ? <ArrowUpRight className="size-3.5 shrink-0" /> : null}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-black/65">{doc.excerpt}</span>
              </Link>
            )) : <p className="px-4 py-5 text-sm text-black/60">No guide matches “{query}”. Try a shorter word.</p>}
          </div>
        )}
        <div className="flex items-center gap-3 border-2 border-[#f4d44d] bg-[#090909] px-4 py-3 text-[#eceae3] shadow-[0_0_0_1px_#090909,6px_6px_0_rgba(244,212,77,.35)]">
          <Search className="size-4 shrink-0 text-[#f4d44d]" aria-hidden />
          <label htmlFor="docs-dock-search" className="sr-only">Search documentation</label>
          <input
            ref={inputRef}
            id="docs-dock-search"
            value={query}
            autoComplete="off"
            onFocus={() => { prepare(); setOpen(true); }}
            onPointerEnter={prepare}
            onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
              else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].slug); }
              else if (e.key === "Escape") { setOpen(false); setQuery(""); inputRef.current?.blur(); }
            }}
            placeholder="Search the docs"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:text-white/50"
          />
          <span className="hidden items-center gap-2 font-mono text-[10px] text-white/50 sm:flex"><kbd className="border border-white/25 px-1.5 py-0.5">/</kbd> or <kbd className="border border-white/25 px-1.5 py-0.5">⌘K</kbd></span>
          {open && results.length ? <CornerDownLeft className="size-3.5 shrink-0 text-white/50 sm:hidden" aria-hidden /> : null}
        </div>
      </div>
    </div>
  );
}
