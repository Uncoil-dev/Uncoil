"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Eyebrow } from "./eyebrow";
import { AFTER_EYEBROW, BODY, DUR, EASE, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";

// Step 04 of the same example run, opened up. Every value is example data.
const LAYERS = [
  { name: "Input", value: "docs.search(\"refund window, delivered orders\")" },
  { name: "Output", value: "[ ] · 0 results", hot: true },
  { name: "Model + tokens", value: "none · tool call" },
  { name: "Cost + latency", value: "$0.000 · 210 ms" },
  { name: "Parent", value: "step 02 · llm.chat" },
] as const;

const CHAIN = [
  { n: "04", name: "docs.search", what: "returned nothing" },
  { n: "05", name: "llm.chat · retry", what: "guessed the refund policy" },
  { n: "06", name: "refund.issue", what: "502 after 5000 ms", failed: true },
] as const;

export function Why() {
  const calm = useCalm();
  const rise = (i: number) => ({
    initial: calm ? false : { opacity: 0, x: 24 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: DUR.base, delay: 0.1 + i * 0.08, ease: EASE },
  });

  return (
    <section id="why" className={`relative overflow-hidden bg-[#090909] text-[#eceae3] ${SECTION}`} aria-labelledby="mix-why-title">
      <div className={WRAP}>
        <Eyebrow n="02" on="ink">Why it broke</Eyebrow>

        <div className={`${AFTER_EYEBROW} grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16`}>
          <div className="relative mx-auto aspect-[12/13] w-full max-w-[300px] sm:max-w-[380px] lg:max-w-[520px]">
            <motion.div
              className="absolute inset-0"
              animate={calm ? undefined : { y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image src="/images/landing/span-anatomy.png" alt="Step 04 pulled apart into stacked layers, with its output layer lit in yellow" fill unoptimized sizes="(min-width: 1024px) 40vw, 380px" className="object-contain [image-rendering:pixelated]" />
            </motion.div>
            {/* A scan line passes through the layers once, the way Uncoil reads a step. */}
            {!calm && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-[6%] h-[2px] bg-[#f4d44d]"
                initial={{ top: "4%", opacity: 0 }}
                whileInView={{ top: ["4%", "96%"], opacity: [0, 1, 1, 0] }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
              />
            )}
          </div>

          <div>
            {/* One phrase per line, so no word is stranded at a line end. */}
            <h2 id="mix-why-title" className={H2}>
              <span className="block">Open step 4.</span>
              <span className="block">The search</span>
              <span className="block">came back empty.</span>
            </h2>
            <dl className="mt-8 border-t border-[#eceae3] font-mono text-[11px] uppercase tracking-[0.1em] md:mt-10 md:text-xs">
              {LAYERS.map((layer, i) => (
                <motion.div
                  key={layer.name}
                  {...rise(i)}
                  className={`grid grid-cols-[7.5rem_1fr] items-baseline gap-4 border-b border-[#eceae3]/25 py-3 sm:grid-cols-[10rem_1fr] md:py-4 ${"hot" in layer ? "relative" : ""}`}
                >
                  <dt className={"hot" in layer ? "text-[#f4d44d]" : "text-[#eceae3]/55"}>
                    <span className="mr-2 inline-block size-2 align-middle" style={{ background: "hot" in layer ? "#f4d44d" : "rgba(236,234,227,0.35)" }} aria-hidden="true" />
                    {layer.name}
                  </dt>
                  <dd className="min-w-0 break-words normal-case tracking-normal text-[#eceae3]">
                    {"hot" in layer ? <span className="bg-[#f4d44d] px-1.5 py-0.5 text-black">{layer.value}</span> : layer.value}
                  </dd>
                </motion.div>
              ))}
            </dl>
            <p className={`mt-3 text-[#eceae3]/50 ${LABEL}`}>What Uncoil keeps for every step · example values</p>
          </div>
        </div>

        <div className="mt-16 grid gap-8 border-t border-[#eceae3] pt-8 md:mt-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <p className={`max-w-xl text-[#eceae3]/80 ${BODY}`}>
            With no policy to read, the model filled the gap with a guess and asked for a refund the order could not get. The refund call is where it showed. The empty search is where it started, and that is the step you fix.
          </p>
          {/* Cells are divided by their own borders, so nothing shows behind them before they reveal. */}
          <ol className="grid self-start border border-[#eceae3]/25 sm:grid-cols-3" aria-label="What happened after step 4">
            {CHAIN.map((c, i) => (
              <motion.li key={c.n} {...rise(i)} className={`relative p-4 sm:pr-8 ${i ? "border-t border-[#eceae3]/25 sm:border-l sm:border-t-0" : ""}`}>
                <p className={`font-pixel text-4xl leading-none tracking-[-0.06em] ${"failed" in c ? "text-[#ff4d3d]" : i === 0 ? "text-[#f4d44d]" : ""}`}>{c.n}</p>
                <p className={`mt-3 ${LABEL}`}>{c.name}</p>
                <p className="mt-1 text-sm leading-6 text-[#eceae3]/65">{c.what}</p>
                {i < CHAIN.length - 1 && (
                  <span aria-hidden="true" className="absolute right-3 top-4 hidden font-mono text-[#eceae3]/50 sm:block">
                    →
                  </span>
                )}
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
