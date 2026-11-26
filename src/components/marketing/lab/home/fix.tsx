"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "./eyebrow";
import { BODY, EASE, H3, LABEL, WRAP } from "./ui";
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
    <section ref={ref} id="fix" className="relative h-[160svh] bg-[#090909] text-[#eceae3]" aria-labelledby="ed-fix-title">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col overflow-hidden px-5 pb-10 pt-10 md:px-10 md:pb-12 md:pt-14">
        <div className={`${WRAP} relative flex flex-1 flex-col`}>
          <Eyebrow n="04" on="ink">Fix and verify</Eyebrow>

          <p className={`mt-8 text-[#eceae3]/55 md:mt-10 ${LABEL}`}>Failed steps · same agent, after each fix</p>
          <div className="relative flex flex-1 items-center pb-6 pt-3">
            {/* The art stays inside the figure band and fades out at every edge, so it never runs behind the copy. */}
            <motion.div className="absolute inset-y-0 -right-5 w-[64%] md:-right-10 md:w-[60%]" style={{ clipPath: reduce ? "none" : clip }} aria-hidden="true">
              <Image src="/images/landing/failure-shatter.png" alt="" fill unoptimized sizes="60vw" className="object-cover object-center opacity-70 [image-rendering:pixelated] md:opacity-100" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#090909,transparent_30%),linear-gradient(to_top,#090909,transparent_22%),linear-gradient(to_bottom,#090909,transparent_14%)]" />
            </motion.div>
            <div className="relative">
              <div className="flex items-end font-pixel text-[clamp(9rem,min(30vw,44svh),26rem)] leading-[0.78] tracking-[-0.08em]" aria-live="off">
                <span className="relative inline-block h-[0.78em] w-[0.62em] overflow-hidden">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={count}
                      initial={{ y: "-100%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "100%" }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="absolute inset-0"
                    >
                      {count}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {/* A full stop in the same pixel face; it lights up once the count reaches zero. */}
                <span aria-hidden="true" className={`transition-colors duration-500 ${count === 0 ? "text-[#f4d44d]" : "text-[#eceae3]/20"}`}>.</span>
              </div>
              <p className="sr-only">Failed steps went from 6 to 0 in this example.</p>
            </div>
          </div>

          <div className="relative grid gap-6 border-t border-[#eceae3] pt-6 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-8">
            <h2 id="ed-fix-title" className={H3}>
              Fix the step. Run it again. Watch it come back clean.
            </h2>
            <p className={`max-w-xl text-[#eceae3]/80 ${BODY}`}>
              Each fix is one change you can point at: a prompt, a tool, a retry rule. Run the agent again and read the new trace, so you know the failure is gone instead of hoping it is.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
