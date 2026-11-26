"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, type MotionValue } from "framer-motion";
import { usePixelCanvas } from "../pixel-world/use-pixel-canvas";
import { drawJourney, journeyPixel } from "./journey-scene";
import { SPAN_COUNT, hud, stopAt } from "./story";
import { Eyebrow } from "./eyebrow";
import { toBuffer, useCopyBoxes } from "./sky";
import { DUR, EASE, H3, LABEL, primary } from "./ui";
import { useCalm } from "./use-calm";

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
  { kicker: "Paste", title: "Paste one prompt.", body: "Drop the setup prompt into Claude Code, Cursor or Codex. Your coding agent does the install, the sign-in and a test run. You watch." },
  { kicker: "First trace", title: "Every step lands.", body: "Run your agent once. Each model call, tool call, token and cent drops in as one run you can open and walk through." },
  { kicker: "Next failure", title: "It comes marked.", body: "When a run fails, Uncoil walks it back from the error and marks the step that started it: which tool, what it returned and how long it took." },
];

// Scroll positions shown as stills when motion is reduced.
const STILL_P = [0.2, 0.5, 1];

function Dialog({ index, h, pinned = false, children }: { index: number; h: Hud; pinned?: boolean; children?: ReactNode }) {
  const stop = STOPS[index];
  return (
    <div className="relative w-full max-w-[30rem] border-2 border-[#eceae3] bg-[#090909] p-4 text-[#eceae3] shadow-[inset_0_0_0_4px_#090909,inset_0_0_0_6px_#eceae3] sm:p-5 md:p-8">
      <p className={`text-[#eceae3]/60 ${LABEL}`}>
        Stop 0{index + 1} / 03 · {stop.kicker}
      </p>
      <h3 className={`mt-3 ${H3}`}>{stop.title}</h3>
      <p className="mt-3 text-[14px] leading-6 text-[#eceae3]/80 sm:mt-4 sm:text-[15px] sm:leading-7 md:text-base">{stop.body}</p>
      {index === 0 && (
        <a href="#pw-setup" tabIndex={pinned ? -1 : undefined} className={`mt-6 ${primary("ink")}`}>
          Get the prompt <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
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
  const frameRef = useRef<HTMLDivElement>(null);
  const copy = useCopyBoxes(frameRef);
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

  usePixelCanvas(
    canvasRef,
    ({ px, scale, seconds }) => {
      // The first copy box is the section marker: the sky starts below it.
      const boxes = toBuffer(copy.current, scale);
      drawJourney(px, p.get(), seconds, prevX, { boxes, band: boxes[0] ? boxes[0].y + boxes[0].h + 2 : 0 });
    },
    { pixel: journeyPixel, still: false },
  );

  return (
    <div ref={ref} className="relative h-[250svh]">
      <div ref={frameRef} className="sticky top-0 h-[100svh] overflow-hidden">
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
        <div aria-hidden="true" className="relative mx-auto flex h-full max-w-[1400px] flex-col px-5 pb-6 pt-[6.5rem] md:px-10 md:pt-[7.5rem]">
          <div data-clear>
            <Eyebrow n="05" on="ink">Setup, in three stops</Eyebrow>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-4 md:mt-8 md:flex-row md:items-start md:justify-between">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={stop} data-clear initial={{ opacity: 0, x: -24, clipPath: "inset(0 100% 0 0)" }} animate={{ opacity: 1, x: 0, clipPath: "inset(0 0% 0 0)" }} exit={{ opacity: 0, x: 24 }} transition={{ duration: DUR.fast, ease: EASE }}>
                <Dialog index={stop} h={h} pinned />
              </motion.div>
            </AnimatePresence>
            <div data-clear className="self-end md:self-start">
              <HudBar h={h} />
            </div>
          </div>
          <p data-clear className={`mt-auto w-fit text-[#eceae3]/70 ${LABEL}`}>Keep scrolling to walk the run ↓</p>
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
      <div className="relative mx-auto max-w-[1400px] px-5 pt-8 md:px-10">
        <Dialog index={index} h={hud(STILL_P[index])} />
      </div>
    </div>
  );
}

export function ShortJourney() {
  const reduce = useCalm();
  return (
    <section id="walk" aria-label="Setting up Uncoil, in three stops" className="relative bg-[#090909] text-[#eceae3]">
      {reduce ? (
        <>
          <div className="mx-auto max-w-[1400px] px-5 pb-8 pt-10 text-[#eceae3] md:px-10 md:pt-14">
            <Eyebrow n="05" on="ink">Setup, in three stops</Eyebrow>
          </div>
          {STOPS.map((_, i) => <StillStop key={i} index={i} />)}
        </>
      ) : (
        <PinnedJourney />
      )}
    </section>
  );
}
