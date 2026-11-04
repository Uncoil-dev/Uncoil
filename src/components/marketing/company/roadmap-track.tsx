"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export type Stage = { status: string; code: string; title: string; items: readonly string[] };

const tones = [
  "border-[#f4d44d] bg-[#f4d44d] text-black",
  "border-[#eceae3] bg-[#eceae3] text-black",
  "border-white/20 bg-[#111] text-[#eceae3]",
  "border-white/20 bg-[#090909] text-[#eceae3] [background-image:radial-gradient(rgba(244,212,77,0.18)_1px,transparent_1px)] [background-size:12px_12px]",
];

/** Four stages on a vertical track; the yellow line fills as you scroll. */
export function RoadmapTrack({ stages }: { stages: readonly Stage[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.7", "end 0.6"] });
  const fill = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  return (
    <ol ref={ref} className="relative grid gap-4 pl-10 md:pl-16">
      <span className="absolute bottom-0 left-[11px] top-0 w-0.5 bg-white/20 md:left-[19px]" aria-hidden="true" />
      <motion.span
        className="absolute bottom-0 left-[11px] top-0 w-0.5 origin-top bg-[#f4d44d] md:left-[19px]"
        style={{ scaleY: reduce ? 1 : fill }}
        aria-hidden="true"
      />
      {stages.map((stage, i) => (
        <motion.li
          key={stage.code}
          className="relative"
          initial={reduce ? false : { opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          <span className={`absolute -left-[39px] top-6 flex size-6 items-center justify-center border-2 md:-left-[55px] md:size-10 ${i === 0 ? "border-[#f4d44d] bg-[#f4d44d] text-black" : "border-[#f4d44d] bg-[#090909] text-[#f4d44d]"} font-mono text-[9px] md:text-[11px]`} aria-hidden="true">
            {i + 1}
          </span>
          <article className={`grid gap-5 border p-6 md:grid-cols-[200px_1fr] md:p-7 ${tones[i]}`}>
            <div className="flex flex-col justify-between gap-6">
              <span className="font-pixel text-[clamp(2.6rem,4.5vw,3.75rem)] leading-none tracking-[-0.07em]">{stage.code}</span>
              <span className="w-fit border border-current px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]">{stage.status}</span>
            </div>
            <div>
              <h3 className="font-pixel text-3xl leading-[0.95] tracking-[-0.055em] md:text-4xl">{stage.title}</h3>
              <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
                {stage.items.map((item) => (
                  <li key={item} className="flex gap-3 border-t border-current/25 py-2.5 text-sm leading-6">
                    <span className="mt-2 size-2 shrink-0 bg-current" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </motion.li>
      ))}
    </ol>
  );
}
