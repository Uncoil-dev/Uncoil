"use client";

import Link from "next/link";
import { useRef } from "react";
import { useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { segment } from "./art";
import { CoilArt } from "./coil-art";

export function Closing() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  // The hero's spring, mended, relaxes into one straight line as the page ends.
  const uncoil = useTransform(scrollYProgress, (p) => (reduce ? 1 : segment(p, 0.05, 0.55)));

  return (
    <section ref={ref} className="overflow-hidden bg-[#eceae3] px-5 pb-24 pt-24 text-[#090909] md:px-10 md:pb-32 md:pt-36" aria-labelledby="ed-close-title">
      <div className="mx-auto max-w-[1320px]">
        <figure className="mx-auto max-w-[1100px]">
          <CoilArt uncoil={uncoil} healed />
          <figcaption className="mt-2 border-t border-black/30 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">
            Fig. 3 — The same run, fixed and pulled straight.
          </figcaption>
        </figure>
        <h2 id="ed-close-title" className="mx-auto mt-16 max-w-[14ch] text-center font-pixel text-[clamp(3rem,8vw,8rem)] leading-[0.88] tracking-[-0.08em]">
          Know which step. Before your users do.
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-center text-lg leading-8 text-black/75">
          Paste the prompt, run your agent, open the trace. The free plan needs no card.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={appHref("/sign-up")} className="group inline-flex min-h-13 items-center gap-3 bg-[#090909] px-8 py-5 font-mono text-xs uppercase tracking-[0.14em] text-[#eceae3] hover:bg-[#f4d44d] hover:text-black">
            Start tracing free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link href="/docs" className="inline-flex min-h-13 items-center border-2 border-black px-8 py-5 font-mono text-xs uppercase tracking-[0.14em] hover:bg-black hover:text-[#eceae3]">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
