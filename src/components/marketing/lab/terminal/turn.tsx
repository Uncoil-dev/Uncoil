"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { typed } from "./session";

/** Types `text` once the element scrolls into view; the answer prints when typing is done. Reduced motion shows it whole. */
export function useTypeOnView(text: string, msPerChar = 38) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    const total = Array.from(text).length * msPerChar;
    const id = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / total);
      setProgress(p);
      if (p >= 1) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [inView, reduce, text, msPerChar]);
  const p = reduce ? 1 : progress;
  return { ref, shown: typed(text, p), done: p >= 1 };
}

const Printed = createContext(true);

/** True once this turn's answer has printed. Outputs start their own motion from this, not from scroll position. */
export function usePrinted() {
  return useContext(Printed);
}

/**
 * One turn of the session: the visitor's question typed on the cream page, then the answer
 * printed underneath as a black output block. The question doubles as the section heading.
 */
export function Turn({ n, prompt, id, children }: { n: number; prompt: string; id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const { ref, shown, done } = useTypeOnView(prompt);
  return (
    <section aria-labelledby={id} className="bg-[#eceae3] px-3 pb-6 pt-16 text-[#090909] sm:px-5 md:px-8 md:pt-28">
      <div className="mx-auto max-w-[1380px]">
        <div ref={ref} className="grid grid-cols-[auto_1fr] items-start gap-x-4 md:grid-cols-[88px_auto_1fr] md:gap-x-5">
          <span className="hidden pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-black/45 md:block">turn {String(n).padStart(2, "0")}</span>
          <span className="grid size-9 place-items-center bg-[#090909] font-mono text-lg text-[#f4d44d] md:size-12 md:text-2xl" aria-hidden="true">
            &gt;
          </span>
          <h2 id={id} className="min-h-[1.2em] font-mono text-[clamp(1.35rem,3vw,2.6rem)] leading-[1.15] tracking-[-0.03em]">
            <span className="sr-only">{prompt}</span>
            <span aria-hidden="true">
              {shown}
              <span className={`ml-1 inline-block h-[0.95em] w-[0.5em] translate-y-[0.12em] bg-[#090909] ${done ? "animate-pulse" : ""}`} />
            </span>
          </h2>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
          animate={done ? { opacity: 1, clipPath: "inset(0 0 0% 0)" } : undefined}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="mt-6 md:ml-[calc(88px+1.25rem)] md:mt-8"
        >
          <Printed.Provider value={done}>{children}</Printed.Provider>
        </motion.div>
      </div>
    </section>
  );
}

/** The "⏺" answer marker used at the top of every output block. */
export function OutputHead({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50 md:px-6">
      <span className="flex items-center gap-2 text-[#eceae3]">
        <span className="text-[#f4d44d]">⏺</span> {left}
      </span>
      {right && <span className="truncate">{right}</span>}
    </div>
  );
}
