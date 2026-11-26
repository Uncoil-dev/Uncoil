"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useCalm } from "./use-calm";
import { segment } from "../editorial/art";

const START = 6;

export function Fix() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useCalm();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [scrolled, setCount] = useState(START);
    const count = reduce ? 0 : scrolled;
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!reduce) setCount(Math.max(0, START - Math.floor(segment(p, 0.1, 0.7) * (START + 0.999))));
  });
  const clip = useTransform(scrollYProgress, [0, 0.45], ["inset(0% 0% 0% 100%)", "inset(0% 0% 0% 0%)"]);

  return (
    <section ref={ref} id="fix" className="relative h-[180svh] bg-[#090909] text-[#eceae3]" aria-labelledby="ed-fix-title">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col overflow-hidden px-5 py-8 md:px-10 md:py-10">
        <motion.div className="absolute inset-y-0 right-0 w-full md:w-[58%]" style={{ clipPath: reduce ? "none" : clip }} aria-hidden="true">
          <Image src="/images/landing/failure-shatter.png" alt="" fill unoptimized sizes="60vw" className="object-cover object-center opacity-60 [image-rendering:pixelated] md:opacity-100" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,#090909_38%,transparent_70%)] md:bg-[linear-gradient(to_right,#090909,transparent_35%)]" />
        </motion.div>

        <div className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col">
          <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span>04</span>
            <span className="h-px flex-1 bg-[#eceae3]/60" />
            <span>Fix and verify</span>
          </p>

          <div className="flex flex-1 items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">Failed steps · same agent, after each fix</p>
              <div className="mt-2 flex items-end gap-[0.08em] font-pixel leading-[0.78] tracking-[-0.08em]" aria-live="off">
                <span className="relative inline-block h-[0.78em] w-[0.68em] overflow-hidden text-[clamp(10rem,min(34vw,52svh),30rem)]">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={count}
                      initial={{ y: "-100%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "100%" }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0"
                    >
                      {count}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className={`mb-[0.6em] size-[clamp(1.5rem,3vw,2.75rem)] transition-colors duration-500 ${count === 0 ? "bg-[#f4d44d]" : "bg-[#eceae3]/20"}`} aria-hidden="true" />
              </div>
              <p className="sr-only">Failed steps went from 6 to 0 in this example.</p>
            </div>
          </div>

          <div className="relative grid gap-6 border-t border-[#eceae3]/60 pt-6 md:grid-cols-[1.1fr_1fr] md:gap-16">
            <h2 id="ed-fix-title" className="font-pixel text-[clamp(2rem,4vw,3.75rem)] leading-[0.92] tracking-[-0.07em]">
              Fix the step. Run it again. Watch it come back clean.
            </h2>
            <p className="max-w-xl text-base leading-7 text-[#eceae3]/80 md:text-lg md:leading-8">
              Each fix is one change you can point at: a prompt, a tool, a retry rule. Run the agent again and read the new trace, so you know the failure is gone instead of hoping it is.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
