"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, type MotionValue } from "framer-motion";
import { drawJourney, journeyPixel } from "./journey-scene";
import { usePixelCanvas } from "./use-pixel-canvas";
import { RUN_SPANS, hud, stopAt } from "./world";

type Hud = ReturnType<typeof hud>;

const STOPS: { kicker: string; title: string; body: string }[] = [
  { kicker: "Set up", title: "Paste one prompt.", body: "Copy the setup prompt into Claude Code, Cursor or Codex. It installs the SDK, signs you in, connects the project and sends a test trace. No docs to read, no keys to copy." },
  { kicker: "First trace", title: "Every step lands.", body: "Run your agent once. Each model call, tool call, token and cent drops in as one run you can open and walk through." },
  { kicker: "Find it", title: "There. That one.", body: "When a run fails, Uncoil marks the exact step: which tool it was, what it returned, how long it hung and what the retries cost." },
  { kicker: "Fix · verify · spend less", title: "Fix it. Cross it. Pay less.", body: "Change the prompt or the tool, run again and watch the same step pass. Cost sits on every run, so the retry loop you removed shows up as money you keep." },
];

// The scroll position at which each stop is shown in full in the reduced-motion stills.
const STILL_P = [0.17, 0.36, 0.52, 0.9];

function Dialog({ index, h, pinned = false, children }: { index: number; h: Hud; pinned?: boolean; children?: ReactNode }) {
  const stop = STOPS[index];
  return (
    <div className="relative w-full max-w-[30rem] border-2 border-[#eceae3] bg-[#090909] p-4 text-[#eceae3] sm:p-5 shadow-[inset_0_0_0_4px_#090909,inset_0_0_0_6px_#eceae3] md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#eceae3]/60">
        Stop 0{index + 1} / 04 · {stop.kicker}
      </p>
      <h3 className="mt-3 font-pixel text-[clamp(2rem,4.2vw,3.4rem)] leading-[0.9] tracking-[-0.07em]">{stop.title}</h3>
      <p className="mt-3 text-[14px] leading-6 text-[#eceae3]/80 sm:mt-4 sm:text-[15px] sm:leading-7 md:text-base">{stop.body}</p>
      {index === 0 && (
        <a href="#pw-setup" tabIndex={pinned ? -1 : undefined} className="mt-5 inline-flex items-center gap-2 bg-[#f4d44d] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-black hover:bg-[#eceae3]">
          Get the prompt <ArrowDown className="size-3.5" aria-hidden="true" />
        </a>
      )}
      {index === 1 && (
        <ul className="mt-4 grid gap-1 sm:mt-5 font-mono text-[10px] uppercase tracking-[0.08em] md:text-[11px]">
          {RUN_SPANS.map((span, i) => (
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
        <div className="mt-5 border-2 border-[#f4d44d] p-3 font-mono text-[10px] uppercase tracking-[0.1em] md:text-[11px]">
          <p className="text-[#eceae3]/55">Step 06 · tool</p>
          <p className="mt-1 text-sm normal-case tracking-normal">refund.issue</p>
          <p className="mt-2 grid grid-cols-3 gap-2 text-[#eceae3]/80">
            <span>502</span>
            <span>5000 ms</span>
            <span>2 retries</span>
          </p>
        </div>
      )}
      {index === 3 && (
        <p className="mt-5 flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#eceae3]/60">
          Cost per run
          <span className="font-pixel text-3xl normal-case tracking-[-0.05em] text-[#eceae3]">${h.cost.toFixed(4)}</span>
          <span>example</span>
        </p>
      )}
      {children}
    </div>
  );
}

function HudBar({ h }: { h: Hud }) {
  const status = { idle: "waiting", recording: "recording", failed: "failed · step 06", fixed: "passed" }[h.status];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-2 border-[#eceae3] bg-[#090909] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#eceae3]">
      <span className="text-[#eceae3]/55">run_9f3a</span>
      <span>
        spans <span className="tabular-nums">{String(h.spans).padStart(2, "0")}/06</span>
      </span>
      <span className="flex items-center gap-2">
        <span className={`size-2 ${h.status === "fixed" ? "bg-[#f4d44d]" : h.status === "idle" ? "border border-[#eceae3]" : "bg-[#eceae3]"}`} />
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
    setH((cur) => (cur.spans === next.spans && cur.status === next.status && cur.cost.toFixed(4) === next.cost.toFixed(4) ? cur : next));
  });

  usePixelCanvas(canvasRef, ({ px, seconds }) => drawJourney(px, p.get(), seconds, prevX), { pixel: journeyPixel, still: false });

  return (
    <div ref={ref} className="relative h-[640svh]">
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

export function Journey() {
  const reduce = useReducedMotion();
  return (
    <section id="pw-journey" aria-label="How Uncoil works, in four stops" className="relative bg-[#090909]">
      {reduce ? STOPS.map((_, i) => <StillStop key={i} index={i} />) : <PinnedJourney />}
    </section>
  );
}
