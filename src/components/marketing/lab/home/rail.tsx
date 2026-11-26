"use client";

import { useEffect, useState } from "react";
import { CHAPTERS, chapterAt } from "./rail-logic";
import { LABEL } from "./ui";

/**
 * The page read as one run: a slim trace rail with a knot per chapter. Passed chapters are
 * filled, the current one is lit, and any knot jumps to its chapter. On narrow screens it shrinks
 * to a thin segmented bar under the navigation.
 */
export function Rail() {
  const [at, setAt] = useState(-1);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      const tops = CHAPTERS.map(([id]) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity);
      setAt(chapterAt(tops, line));
      const close = document.getElementById("close")?.getBoundingClientRect().top ?? Infinity;
      setDone(close <= line);
      setShown(window.scrollY > window.innerHeight * 0.6);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <nav
        aria-label="Page chapters"
        className={`fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-300 xl:block ${shown ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ol className="relative flex flex-col items-center gap-[14px] border border-[#eceae3]/30 bg-[#090909] px-[9px] py-3">
          <span aria-hidden="true" className="absolute inset-y-4 left-1/2 w-[2px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,rgba(236,234,227,0.35)_0_4px,transparent_4px_8px)]" />
          {CHAPTERS.map(([id, name], i) => {
            const current = i === at && !done;
            const passed = done || i < at;
            return (
              <li key={id} className="group relative">
                <a
                  href={`#${id}`}
                  aria-label={`${String(i + 1).padStart(2, "0")} ${name}`}
                  aria-current={current ? "step" : undefined}
                  className="relative grid size-[18px] place-items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]"
                >
                  <span
                    aria-hidden="true"
                    className={`block transition-all duration-300 ${current ? "size-3 bg-[#f4d44d]" : passed ? "size-2 bg-[#eceae3]" : "size-2 border border-[#eceae3]/60 bg-[#090909]"} ${current ? "" : "group-hover:bg-[#eceae3]"}`}
                  />
                </a>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 whitespace-nowrap border border-[#eceae3]/30 bg-[#090909] px-2 py-1 text-[#eceae3] transition-opacity duration-200 ${LABEL} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
                >
                  <span className="text-[#eceae3]/55">{String(i + 1).padStart(2, "0")}</span> {name}
                </span>
              </li>
            );
          })}
        </ol>
        <p aria-live="polite" className={`mt-2 text-center text-[#eceae3] ${LABEL}`}>
          <span className="block bg-[#090909] px-1 py-0.5 text-[9px]">{done ? "passed" : `${String(Math.max(0, at + 1)).padStart(2, "0")}/${String(CHAPTERS.length).padStart(2, "0")}`}</span>
        </p>
      </nav>

      <div aria-hidden="true" className={`fixed inset-x-0 top-0 z-[60] flex h-[3px] gap-[3px] bg-[#090909] transition-opacity duration-300 xl:hidden ${shown ? "opacity-100" : "opacity-0"}`}>
        {CHAPTERS.map(([id], i) => (
          <span key={id} className={`flex-1 transition-colors duration-300 ${done || i < at ? "bg-[#eceae3]" : i === at ? "bg-[#f4d44d]" : "bg-[#eceae3]/20"}`} />
        ))}
      </div>
    </>
  );
}
