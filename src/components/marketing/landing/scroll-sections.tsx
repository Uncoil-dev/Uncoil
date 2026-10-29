"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

/* ---------- Statement: words light up as you scroll ---------- */

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const accent = word.startsWith("*");
  // Accent words get a black block that wipes in behind them, so the yellow
  // stays readable on the cream background.
  const wipe = useTransform(progress, range, [0, 1]);
  const color = useTransform(progress, range, ["#090909", "#f4d44d"]);
  if (accent) {
    return (
      <motion.span style={{ opacity, color }} className="relative inline-block px-[0.11em]">
        <motion.span style={{ scaleX: wipe }} className="absolute inset-x-0 -bottom-[0.06em] top-[0.02em] -z-10 origin-left bg-[#090909]" aria-hidden="true" />
        {word.slice(1)}
      </motion.span>
    );
  }
  return (
    <motion.span style={{ opacity }} className="mr-[0.22em] inline-block">
      {word}
    </motion.span>
  );
}

export function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words =
    "Agents don't crash. They wander. A search comes back empty, a fallback model guesses, a tool times out, and the answer still looks fine. *Uncoil *shows *the *whole *path.".split(
      " ",
    );
  return (
    <section className="bg-[#eceae3] px-5 py-28 md:px-10 md:py-40">
      <div ref={ref} className="mx-auto max-w-[1200px]">
        <p className="mb-10 font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Why it matters</p>
        <p className="relative isolate font-pixel text-[clamp(2.2rem,5.6vw,5.2rem)] leading-[1.02] tracking-[-0.06em] text-black">
          {reduce
            ? words.map((w, i) => (
                <span key={i} className={w.startsWith("*") ? "bg-black px-[0.11em] text-[#f4d44d]" : "mr-[0.22em]"}>
                  {w.replace("*", "")}
                </span>
              ))
            : words.map((w, i) => (
                <Word key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
              ))}
        </p>
      </div>
    </section>
  );
}

/* ---------- Story: sticky artwork that changes per chapter ---------- */

const chapters = [
  {
    n: "01",
    title: "Capture everything.",
    body: "Wrap your agent once. Every step streams in as it happens: model calls, tool calls, retrievals, with inputs, outputs, tokens and timing. Secrets get stripped before anything leaves your app.",
    img: "/images/landing/capture-streams.png",
    tag: "Hundreds of steps, one clean trace",
  },
  {
    n: "02",
    title: "Follow the money.",
    body: "Cost is tracked on every step, not just per month. See the one retry that quietly tripled the bill, and sort every run by what it cost.",
    img: "/images/landing/cost-city.png",
    tag: "The step that burned the budget",
  },
  {
    n: "03",
    title: "Find the first crack.",
    body: "Failures don't start where they surface. Uncoil points at the first step that went wrong, so you fix the empty search, not the tool that timed out three steps later.",
    img: "/images/landing/failure-shatter.png",
    tag: "Root cause, not the symptom",
  },
] as const;

export function Story() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  return (
    <section className="bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">How it works</p>
        <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">From black box to blueprint.</h2>

        <div className="mt-16 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            {chapters.map((c, i) => (
              <motion.div
                key={c.n}
                onViewportEnter={() => setActive(i)}
                viewport={{ amount: 0.6 }}
                className="flex flex-col justify-center border-t border-white/15 py-12 lg:min-h-[80vh]"
              >
                <span className={`font-mono text-sm transition-colors ${active === i ? "text-[#f4d44d]" : "text-white/35"}`}>{c.n} / 03</span>
                <h3 className="mt-5 font-pixel text-[clamp(2rem,4vw,3.4rem)] leading-none tracking-[-0.06em]">{c.title}</h3>
                <p className="mt-5 max-w-md text-base leading-7 text-white/65">{c.body}</p>
                <div className="relative mt-8 aspect-[7/5] w-full overflow-hidden border border-white/15 lg:hidden">
                  <Image src={c.img} alt={c.tag} fill unoptimized sizes="100vw" className="object-cover [image-rendering:pixelated]" />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-[calc(64px+10vh)] aspect-[7/5] w-full overflow-hidden border border-white/20">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={active}
                  className="absolute inset-0"
                  initial={reduce ? false : { opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image src={chapters[active].img} alt={chapters[active].tag} fill unoptimized sizes="60vw" className="object-cover [image-rendering:pixelated]" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/20 bg-[#090909]/85 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm">
                <span>{chapters[active].tag}</span>
                <span className="flex gap-1.5">
                  {chapters.map((c, i) => (
                    <span key={c.n} className={`h-1.5 w-6 transition-colors ${i === active ? "bg-[#f4d44d]" : "bg-white/25"}`} />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Product window: the trace view, tilting flat as you scroll ---------- */

const runs = [
  ["support-agent", "FAILED", "7.5s", "$0.023"],
  ["support-agent", "OK", "2.1s", "$0.006"],
  ["research-crew", "OK", "14.8s", "$0.118"],
  ["checkout-bot", "OK", "1.4s", "$0.004"],
  ["support-agent", "OK", "2.4s", "$0.007"],
  ["inbox-triage", "FAILED", "8.9s", "$0.038"],
] as const;

const gNodes = [
  { id: "a", x: 300, y: 40, k: "AGENT", l: "support-agent" },
  { id: "b", x: 300, y: 120, k: "LLM", l: "chat" },
  { id: "c", x: 150, y: 210, k: "TOOL", l: "docs.search" },
  { id: "d", x: 450, y: 210, k: "TOOL", l: "order.lookup" },
  { id: "e", x: 300, y: 300, k: "LLM", l: "chat · retry" },
  { id: "f", x: 300, y: 380, k: "TOOL", l: "refund.issue" },
] as const;
const gEdges = [
  "M300 62 L300 98",
  "M300 142 C300 176 150 176 150 188",
  "M300 142 C300 176 450 176 450 188",
  "M150 232 C150 266 300 266 300 278",
  "M450 232 C450 266 300 266 300 278",
  "M300 322 L300 358",
];

function MiniGraph({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 600 420" className="h-full w-full" role="img" aria-label="Flow graph of a support agent run ending in a failed refund tool call">
      <defs>
        <pattern id="pw-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#fff" opacity="0.1" />
        </pattern>
      </defs>
      <rect width="600" height="420" fill="url(#pw-dots)" />
      {gEdges.map((d, i) => (
        <g key={d}>
          <path d={d} fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
          {animate && (
            <circle r="3.5" fill="#f4d44d">
              <animateMotion dur="2.4s" repeatCount="indefinite" path={d} begin={`${i * 0.35}s`} />
            </circle>
          )}
        </g>
      ))}
      {gNodes.map((n) => {
        const fail = n.id === "f";
        return (
          <g key={n.id}>
            <rect x={n.x - 78} y={n.y - 22} width="156" height="44" fill={fail ? "#f4d44d" : "#141414"} stroke={fail ? "#f4d44d" : "#fff"} strokeOpacity={fail ? 1 : 0.3} />
            <text x={n.x - 66} y={n.y - 4} fill={fail ? "#090909" : "#f4d44d"} fontSize="8" letterSpacing="1.2" fontFamily="var(--font-geist-mono), monospace">
              {fail ? "TOOL · FAILED" : n.k}
            </text>
            <text x={n.x - 66} y={n.y + 12} fill={fail ? "#090909" : "#fff"} fontSize="12" fontFamily="var(--font-geist-mono), monospace">
              {n.l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ProductWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.86, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 80, 0]);

  return (
    <section className="overflow-hidden bg-[#f4d44d] px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em] text-black">Every run, drawn as a map.</h2>
          <p className="max-w-sm text-base leading-7 text-black/70">Pick a run and Uncoil draws it: who called whom, what came back, how long it took and what it cost. The red flag is where you start.</p>
        </div>

        <div ref={ref} className="mt-14 [perspective:1600px]">
          <motion.div style={{ rotateX, scale, y, transformOrigin: "50% 0%" }} className="border-2 border-black bg-[#090909] text-white shadow-[16px_16px_0_#090909]">
            <div className="flex items-center gap-3 border-b border-white/15 px-4 py-3">
              <span className="flex gap-1.5">
                <span className="size-2.5 bg-white/25" />
                <span className="size-2.5 bg-white/25" />
                <span className="size-2.5 bg-[#f4d44d]" />
              </span>
              <span className="flex-1 truncate border border-white/15 px-3 py-1 font-mono text-[10px] text-white/50">uncoil.dev / support-bot / tracing / run_9f3a</span>
            </div>
            <div className="grid min-h-[460px] md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_260px]">
              <div className="hidden border-r border-white/15 md:block">
                <p className="border-b border-white/15 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">Runs · last hour</p>
                {runs.map(([name, st, lat, cost], i) => (
                  <div key={i} className={`border-b border-white/10 px-4 py-3 font-mono text-[11px] ${i === 0 ? "bg-white/10" : ""}`}>
                    <div className="flex justify-between">
                      <span>{name}</span>
                      <span className={st === "FAILED" ? "text-[#f4d44d]" : "text-white/45"}>{st}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/40">
                      <span>{lat}</span>
                      <span>{cost}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative min-h-[360px] p-2">
                <MiniGraph animate={!reduce} />
              </div>
              <div className="hidden border-l border-white/15 p-4 font-mono text-[11px] lg:block">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/45">Step · refund.issue</p>
                <dl className="mt-4 grid gap-3">
                  {[
                    ["Status", "502 Bad Gateway"],
                    ["Latency", "5,000 ms (timeout)"],
                    ["Input", '{ order: "4821", amount: 64 }'],
                    ["Called by", "chat · retry"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-white/40">{k}</dt>
                      <dd className="mt-1 break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 border border-[#f4d44d] p-3 text-[#f4d44d]">First bad step: docs.search returned 0 results.</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
