"use client";

import { useEffect, useRef, useState } from "react";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const hideScrollbar: React.CSSProperties = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

type PortableBlock = {
  _type?: string;
  style?: string;
  children?: { text?: string }[];
};

export function TableOfContents({ body, collapsible }: { body: PortableBlock[]; collapsible?: boolean }) {
  const [activeId, setActiveId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const headings = (Array.isArray(body) ? body : []).filter(
    (block) => block?._type === "block" && (block.style === "h2" || block.style === "h3")
  );

  const headingItems = headings.map((heading) => {
    const text = heading.children?.map((c) => c.text).join("") || "";
    const slug = slugify(text);
    return { text, slug, level: heading.style };
  });

  useEffect(() => {
    function handleScroll() {
      for (let i = headingItems.length - 1; i >= 0; i--) {
        const el = document.getElementById(headingItems[i].slug);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveId(headingItems[i].slug);
          return;
        }
      }
      setActiveId(headingItems[0]?.slug || "");
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headingItems]);

  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const link = scrollRef.current.querySelector(`[data-toc-link="${activeId}"]`);
    link?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  if (!Array.isArray(body) || headingItems.length < 2) return null;

  const list = (
    <ul className="flex flex-col gap-0.5">
      {headingItems.map((item) => (
        <li key={item.slug}>
          <a
            href={`#${item.slug}`}
            data-toc-link={item.slug}
            className={`block font-sans text-[12px] leading-snug py-0.5 transition-colors duration-150 ${
              item.level === "h3" ? "pl-4" : ""
            } ${
              activeId === item.slug
                ? "text-white"
                : "text-[#666666] hover:text-[#CCCCCC]"
            }`}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );

  const inner = (
    <div className="flex flex-col">
      <style>{`.toc-scroll-hide::-webkit-scrollbar { display: none; }`}</style>
      <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#666666] mb-3">
        On this page
      </h4>
      <div
        ref={scrollRef}
        className="toc-scroll-hide max-h-[65vh] overflow-y-auto"
        style={hideScrollbar}
      >
        {list}
      </div>
    </div>
  );

  if (collapsible) {
    return (
      <details className="border border-[#2A2A2A] bg-[#0A0A0A] group">
        <summary className="font-mono text-[11px] uppercase tracking-widest text-[#666666] px-4 py-3 cursor-pointer select-none list-none flex items-center justify-between">
          On this page
          <span className="text-[#666666] group-open:rotate-180 transition-transform text-[10px]">▼</span>
        </summary>
        <div className="px-4 pb-4 border-t border-[#2A2A2A] pt-3">
          {inner}
        </div>
      </details>
    );
  }

  return <nav aria-label="On this page">{inner}</nav>;
}
