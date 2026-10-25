"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MoveHorizontal } from "lucide-react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";

const art = "[image-rendering:pixelated]";

/* ---------- Before / after: logs vs the map ---------- */

export function BeforeAfter() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // Until someone grabs the handle, scrolling sweeps it from logs to map.
  const [userPos, setUserPos] = useState<number | null>(null);
  const [autoPos, setAutoPos] = useState(100);
  const pos = userPos ?? (reduce ? 46 : autoPos);
  const { scrollYProgress } = useScroll({ target: box, offset: ["start 0.85", "end 0.35"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setAutoPos(100 - Math.min(1, Math.max(0, v)) * 88));

  function moveTo(clientX: number) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setUserPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }

  return (
    <section className="bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">Before / after</p>
            <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">Same run. Two ways to read it.</h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-white/65">Scroll, or drag the handle. On the left, the run as a wall of logs. On the right, the same run as Tracify draws it, with the failing step lit up.</p>
        </div>

        <div
          ref={box}
          className="relative mt-14 aspect-[16/10] w-full cursor-ew-resize touch-none select-none overflow-hidden border border-white/20"
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            moveTo(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
        >
          <Image src="/images/landing/map-flat.png" alt="The run drawn as a clean flow graph with the failed step highlighted" fill unoptimized sizes="100vw" className={`object-cover ${art}`} />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <Image src="/images/landing/logs-wall.png" alt="The same run as a dense wall of log lines" fill unoptimized sizes="100vw" className={`object-cover ${art}`} />
          </div>
          <span className="absolute left-4 top-4 bg-[#eceae3] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black">Plain logs</span>
          <span className="absolute right-4 top-4 bg-[#f4d44d] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black">Tracify</span>
          <div className="absolute inset-y-0 w-0.5 bg-[#f4d44d]" style={{ left: `${pos}%` }}>
            <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#f4d44d] text-black shadow-[4px_4px_0_#000]">
              <MoveHorizontal className="size-5" aria-hidden="true" />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(pos)}
            onChange={(e) => setUserPos(Number(e.target.value))}
            aria-label="Compare plain logs with the Tracify map"
            className="absolute inset-x-0 bottom-0 h-8 w-full cursor-ew-resize opacity-0"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- Anatomy of a step ---------- */

const parts = [
  ["Input", "The exact prompt or arguments that went in, secrets stripped."],
  ["Output", "What came back: the reply, the tool result, or the error."],
  ["Model + tokens", "Which model answered and how many tokens it used each way."],
  ["Cost + latency", "What the step cost and how long it took, to the millisecond."],
  ["Parent", "The step that called it, so loops and branches stay readable."],
] as const;

export function Anatomy() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">Anatomy of a step</p>
        <h2 className="mx-auto mt-5 max-w-4xl text-center font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">Every step, taken apart.</h2>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr_1fr]">
          <ul className="grid gap-8 lg:text-right">
            {parts.slice(0, 3).map(([t, b], i) => (
              <motion.li key={t} initial={reduce ? false : { opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ delay: i * 0.12 }}>
                <span className="font-mono text-[10px] text-[#f4d44d]">0{i + 1}</span>
                <h3 className="mt-1 font-pixel text-3xl tracking-[-0.05em]">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{b}</p>
              </motion.li>
            ))}
          </ul>
          <motion.div
            className="relative mx-auto aspect-[12/13] w-full max-w-[520px]"
            initial={reduce ? false : { opacity: 0, scale: 0.9, rotate: -4 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div className="absolute inset-0" animate={reduce ? undefined : { y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <Image src="/images/landing/span-anatomy.png" alt="One step exploded into stacked layers, with the cost layer highlighted" fill unoptimized sizes="40vw" className={`object-contain ${art}`} />
            </motion.div>
          </motion.div>
          <ul className="grid gap-8">
            {parts.slice(3).map(([t, b], i) => (
              <motion.li key={t} initial={reduce ? false : { opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ delay: 0.2 + i * 0.12 }}>
                <span className="font-mono text-[10px] text-[#f4d44d]">0{i + 4}</span>
                <h3 className="mt-1 font-pixel text-3xl tracking-[-0.05em]">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{b}</p>
              </motion.li>
            ))}
            <li>
              <Link href="/docs/typescript" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d] hover:text-white">
                What the SDK records <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Use cases: horizontal gallery driven by vertical scroll ---------- */

const cases = [
  { slug: "support", title: "Support agents", line: "Find the decision behind every escalation.", img: "/images/landing/uc-support.png" },
  { slug: "research", title: "Research agents", line: "Show the path from question to source.", img: "/images/landing/uc-research.png" },
  { slug: "automation", title: "Automation agents", line: "Debug the chain, not the final error.", img: "/images/landing/uc-automation.png" },
  { slug: "tool-calling", title: "Tool-calling agents", line: "See what the model asked the world to do.", img: "/images/landing/uc-tools.png" },
] as const;

function CaseCard({ c, i }: { c: (typeof cases)[number]; i: number }) {
  return (
    <Link href={`/use-cases/${c.slug}`} className="group relative block aspect-[4/5] w-[78vw] shrink-0 overflow-hidden border-2 border-black bg-[#090909] text-[#eceae3] sm:w-[420px]">
      <Image src={c.img} alt="" fill unoptimized sizes="420px" className={`object-cover transition-transform duration-700 group-hover:scale-110 ${art}`} />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#090909_0%,#090909_22%,rgba(9,9,9,0)_55%)]" />
      <span className="absolute left-5 top-5 font-mono text-[10px] text-[#f4d44d]">0{i + 1} / 04</span>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <h3 className="font-pixel text-4xl leading-none tracking-[-0.06em]">{c.title}</h3>
        <p className="mt-3 text-sm text-white/65">{c.line}</p>
        <span className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d]">
          Explore <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function UseCases() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const track = useRef<HTMLDivElement>(null);
  const dist = useMotionValue(0);
  useEffect(() => {
    const measure = () => dist.set(Math.max(0, (track.current?.scrollWidth ?? 0) - window.innerWidth));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [dist]);
  const x = useTransform(() => -scrollYProgress.get() * dist.get());

  const heading = (
    <div className="px-5 md:px-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Use cases</p>
      <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">Whatever your agent does.</h2>
    </div>
  );

  if (reduce) {
    return (
      <section className="bg-[#f4d44d] py-24 text-black">
        {heading}
        <div className="mt-12 flex gap-5 overflow-x-auto px-5 pb-4 md:px-10">
          {cases.map((c, i) => (
            <CaseCard key={c.slug} c={c} i={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[260vh] bg-[#f4d44d] text-black">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-[64px]">
        {heading}
        <motion.div ref={track} style={{ x }} className="mt-10 flex w-max gap-5 px-5 md:px-10">
          {cases.map((c, i) => (
            <CaseCard key={c.slug} c={c} i={i} />
          ))}
          <Link href={appHref("/demo/project")} className="flex aspect-[4/5] w-[78vw] shrink-0 flex-col justify-between border-2 border-black p-8 hover:bg-black hover:text-[#f4d44d] sm:w-[420px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">Not sure yet?</span>
            <span className="font-pixel text-6xl leading-[0.9] tracking-[-0.07em]">Try the live demo →</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
