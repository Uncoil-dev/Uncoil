"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, type MotionValue } from "framer-motion";
import { usePixelCanvas } from "../pixel-world/use-pixel-canvas";
import { drawJourney, journeyPixel } from "./journey-scene";
import { SPAN_COUNT, hud, stopAt } from "./story";

type Hud = ReturnType<typeof hud>;

const SPANS = [
  { kind: "AGENT", name: "support-agent", meta: "run started" },
  { kind: "LLM", name: "chat", meta: "412 tok · 820 ms" },
  { kind: "TOOL", name: "order.lookup", meta: "140 ms" },
  { kind: "TOOL", name: "docs.search", meta: "0 results" },
  { kind: "LLM", name: "chat · retry", meta: "guessed" },
  { kind: "TOOL", name: "refund.issue", meta: "502" },
] as const;

const STOPS: { kicker: string; title: string; body: string }[] = [
  { kicker: "Set up", title: "Paste one prompt.", body: "Copy the setup prompt into Claude Code, Cursor or Codex. It installs the SDK, signs you in, connects the project and sends a test trace." },
  { kicker: "First trace", title: "Every step lands.", body: "Run your agent once. Each model call, tool call, token and cent drops in as one run you can open and walk through." },
  { kicker: "Find it", title: "Not where it crashed.", body: "Uncoil walks the run back from the failure and marks the step that started it: which tool, what it returned and how long it took." },
];

// Scroll positions shown as stills when motion is reduced.
const STILL_P = [0.2, 0.5, 1];

function Dialog({ index, h, pinned = false, children }: { index: number; h: Hud; pinned?: boolean; children?: ReactNode }) {
  const stop = STOPS[index];
  return (
    <div className="relative w-full max-w-[30rem] border-2 border-[#eceae3] bg-[#090909] p-4 text-[#eceae3] shadow-[inset_0_0_0_4px_#090909,inset_0_0_0_6px_#eceae3] sm:p-5 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#eceae3]/60">
        Stop 0{index + 1} / 03 · {stop.kicker}
      </p>
      <h3 className="mt-3 font-pixel text-[clamp(2rem,4.2vw,3.4rem)] leading-[0.9] tracking-[-0.07em]">{stop.title}</h3>
      <p className="mt-3 text-[14px] leading-6 text-[#eceae3]/80 sm:mt-4 sm:text-[15px] sm:leading-7 md:text-base">{stop.body}</p>
      {index === 0 && (
        <a href="#pw-setup" tabIndex={pinned ? -1 : undefined} className="mt-5 inline-flex items-center gap-2 bg-[#f4d44d] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-black hover:bg-[#eceae3]">
          Get the prompt <ArrowDown className="size-3.5" aria-hidden="true" />
        </a>
      )}
      {index === 1 && (
        <ul className="mt-4 grid gap-1 font-mono text-[10px] uppercase tracking-[0.08em] sm:mt-5 md:text-[11px]">
          {SPANS.map((span, i) => (
            <li key={span.name} className={`flex items-center gap-3 transition-opacity duration-300 ${i < h.spans ? "opacity-100" : "opacity-20"}`}>
              <span className={`size-2 shrink-0 ${i === 0 ? "bg-[#f4d44d]" : "bg-[#eceae3]"}`} />
              <span className="w-10 shrink-0 text-[#eceae3]/55">{span.kind}</span>
              <span className="truncate">{span.name}</span>
              <span className="ml-auto shrink-0 text-[#eceae3]/55">{span.meta}</span>
            </li>
          ))}
        </ul>
      )}
      {index === 2 && (
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 font-mono text-[10px] uppercase tracking-[0.1em] md:text-[11px]">
          <div className="border border-[#eceae3]/40 p-3 text-[#eceae3]/60">
            <p>Crashed · step 06</p>
            <p className="mt-1 text-sm normal-case tracking-normal">refund.issue</p>
          </div>
          <span className="self-center text-[#eceae3]/60" aria-hidden="true">←</span>
          <div className={`border-2 p-3 transition-colors duration-300 ${h.status === "found" ? "border-[#f4d44d]" : "border-[#eceae3]/40"}`}>
            <p className={h.status === "found" ? "text-[#f4d44d]" : "text-[#eceae3]/60"}>Broke · step 04</p>
            <p className="mt-1 text-sm normal-case tracking-normal">docs.search</p>
            <p className="mt-1 text-[#eceae3]/70">0 results</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function HudBar({ h }: { h: Hud }) {
  const status = { idle: "waiting", recording: "recording", found: "marked · step 04" }[h.status];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-2 border-[#eceae3] bg-[#090909] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#eceae3]">
      <span className="text-[#eceae3]/55">run_9f3a</span>
      <span>
        spans <span className="tabular-nums">{String(h.spans).padStart(2, "0")}/0{SPAN_COUNT}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className={`size-2 ${h.status === "found" ? "bg-[#f4d44d]" : h.status === "idle" ? "border border-[#eceae3]" : "bg-[#eceae3]"}`} />
        {status}
      </span>
    </div>
  );
}

function PinnedJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.6 });
  const prevX = useRef(0);
  const [stop, setStop] = useState(0);
  const [h, setH] = useState<Hud>(() => hud(0));

  useMotionValueEvent(p as MotionValue<number>, "change", (v) => {
    setStop((cur) => (stopAt(v) === cur ? cur : stopAt(v)));
    const next = hud(v);
    setH((cur) => (cur.spans === next.spans && cur.status === next.status ? cur : next));
  });

  usePixelCanvas(canvasRef, ({ px, seconds }) => drawJourney(px, p.get(), seconds, prevX), { pixel: journeyPixel, still: false });

  return (
    <div ref={ref} className="relative h-[400svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
        </div>
        <ol className="sr-only">
          {STOPS.map((s, i) => (
            <li key={s.title}>
              <h3>{`Stop ${i + 1}: ${s.title}`}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <div aria-hidden="true" className="relative mx-auto flex h-full max-w-[1320px] flex-col px-4 pb-6 pt-[4.5rem] sm:px-5 md:px-10 md:pt-24">
          <div className="flex justify-end">
            <HudBar h={h} />
          </div>
          <div className="mt-4 md:-mt-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={stop} initial={{ opacity: 0, x: -24, clipPath: "inset(0 100% 0 0)" }} animate={{ opacity: 1, x: 0, clipPath: "inset(0 0% 0 0)" }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}>
                <Dialog index={stop} h={h} pinned />
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="mt-auto font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]/70">
            <span className="bg-[#090909] px-2 py-1">Keep scrolling to walk the run →</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function StillStop({ index }: { index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevX = useRef(0);
  usePixelCanvas(canvasRef, ({ px, seconds }) => drawJourney(px, STILL_P[index], seconds, prevX), { pixel: journeyPixel, still: true });
  return (
    <div className="relative h-[max(36rem,85svh)] overflow-hidden border-t-2 border-[#eceae3]/20">
      <div className="absolute inset-0" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      <div className="relative mx-auto max-w-[1320px] px-5 pt-8 md:px-10">
        <Dialog index={index} h={hud(STILL_P[index])} />
      </div>
    </div>
  );
}

export function ShortJourney() {
  const reduce = useReducedMotion();
  return (
    <section id="walk" aria-label="How Uncoil works, in three stops" className="relative bg-[#090909]">
      {reduce ? STOPS.map((_, i) => <StillStop key={i} index={i} />) : <PinnedJourney />}
    </section>
  );
}
