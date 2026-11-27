"use client";

import { useRef, useState } from "react";
import { motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Eyebrow } from "./eyebrow";
import { useCase } from "./case-state";
import { type Case } from "./cases";
import { AFTER_EYEBROW, AFTER_HEADLINE, DUR, EASE, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";
import { useCell, useGridCanvas } from "./use-grid";
import { ENTER, NIGHT_INK, drawWhere } from "./where-art";
import { WHERE_ROWS, boardBox, scanStopIndex, scanStops, whereLayout } from "./where-layout";
import { segment } from "./math";

/**
 * One run on the page grid: six plates on a rope, each with its number board and its own icon.
 * The rope draws in when the figure comes into view; as it scrolls up the screen, Uncoil's scan
 * reads the rope back from step 06 to the cause and the cause plate turns yellow when it gets there.
 */
function Plate({ c, vertical, scan, className }: { c: Case; vertical: boolean; scan: MotionValue<number>; className: string }) {
  const calm = useCalm();
  const cell = useCell();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(boxRef, { once: true, amount: 0.35 });
  const startedAt = useRef<number | null>(null);
  const foundAt = useRef<number | null>(null);
  const [cols, setCols] = useState(0);

  useGridCanvas(
    canvasRef,
    ({ px, seconds }) => {
      if (inView && startedAt.current === null) startedAt.current = seconds;
      const t = calm ? 99 : startedAt.current === null ? 0 : seconds - startedAt.current;
      const k = scan.get();
      // The robot arrives on the cause plate when the scan locks on it, and stays.
      if (k >= 0.92 && foundAt.current === null) foundAt.current = seconds;
      if (k < 0.92) foundAt.current = null;
      const since = calm ? 99 : foundAt.current === null ? -1 : seconds - foundAt.current;
      drawWhere(px, whereLayout(px.w, vertical, c.cause), c.steps.map((st) => st.icon), { t, scan: k, cause: c.cause, since }, NIGHT_INK);
      if (px.w !== cols) setCols(px.w);
    },
    { still: calm, redraw: c.id },
  );

  const l = cols ? whereLayout(cols, vertical, c.cause) : null;
  const rows = vertical ? WHERE_ROWS.vertical : WHERE_ROWS.horizontal;
  return (
    <div ref={boxRef} className={`relative overflow-hidden ${className}`} style={{ height: rows * cell }}>
      <div className="absolute inset-0" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      {l &&
        c.steps.map((s, i) => {
          const b = boardBox(l, i);
          const c = l.centers[i];
          const above = !vertical && l.above[i];
          const style = vertical
            ? { left: (b.x + b.w + 5) * cell, top: (c.y + 0.5) * cell, transform: "translateY(-50%)" }
            : { left: (c.x + 0.5) * cell, top: (above ? b.y - 4 : b.y + b.h + 4) * cell, transform: above ? "translate(-50%,-100%)" : "translateX(-50%)" };
          return (
            <motion.p
              key={i}
              aria-hidden="true"
              className={`absolute whitespace-nowrap font-mono leading-5 ${vertical ? "text-left" : "text-center"}`}
              style={style}
              initial={calm ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: DUR.base, delay: ENTER.plate(i) + 0.15, ease: EASE }}
            >
              <span className="block text-[14px] md:text-[15px]">{s.name}</span>
              <span className="block text-[12px] text-[#eceae3]/60 md:text-[13px]">{s.note}</span>
            </motion.p>
          );
        })}
    </div>
  );
}

export function Where() {
  const calm = useCalm();
  const c = useCase();
  const figRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: figRef, offset: ["start 0.8", "end 0.55"] });
  const scrolled = useTransform(scrollYProgress, (p) => segment(p, 0.12, 0.82));
  const still = useMotionValue(1);
  const scan = calm ? still : scrolled;
  // Only the caption's line is React state, and it changes a few times per pass, not every frame.
  const last = scanStops(c.cause).length - 1;
  const [read, setRead] = useState({ cause: c.cause, stop: 0 });
  useMotionValueEvent(scrolled, "change", (k) => setRead({ cause: c.cause, stop: scanStopIndex(k, c.cause) }));
  // One caption per stop the frame visits, so the words always name the step the frame is on;
  // after a new case is picked the stop is read from the scroll position again.
  const stop = read.cause === c.cause ? read.stop : scanStopIndex(scrolled.get(), c.cause);
  const line = calm ? last : Math.min(stop, last);
  const failed = c.steps[5];
  const cause = c.steps[c.cause - 1];

  return (
    <section id="break" className={`scroll-mt-16 bg-[#090909] text-[#eceae3] ${SECTION}`} aria-labelledby="ed-break-title">
      <div className={WRAP}>
        <Eyebrow n="01" on="ink">Where it broke</Eyebrow>
        <h2 id="ed-break-title" className={`${AFTER_EYEBROW} ${H2}`}>
          It failed at step 6.
          <br />
          {c.brokeLead ?? "It broke at"}{" "}
          <span className="relative inline-block text-black">
            <span aria-hidden="true" className="absolute -inset-x-[0.06em] bottom-[0.02em] top-[0.14em] bg-[#f4d44d]" />
            <span className="relative">{c.brokeAt}</span>
          </span>
        </h2>

        <figure ref={figRef} className={AFTER_HEADLINE}>
          <div role="img" aria-label={`Diagram of one run: six steps on a rope. Step 6, ${failed.name}, failed: ${c.failShort}. The cause is step ${c.cause}, ${cause.name}: ${c.causeShort}.`}>
            <Plate c={c} vertical={false} scan={scan} className="hidden w-full md:block" />
            <Plate c={c} vertical scan={scan} className="mx-auto w-full max-w-[420px] md:hidden" />
          </div>
          <figcaption className={`mt-6 flex flex-col gap-2 border-t border-[#eceae3]/25 pt-3 sm:flex-row sm:items-baseline sm:justify-between ${LABEL}`}>
            <span className="flex items-center gap-2 text-[#eceae3]">
              <span aria-hidden="true" className={`size-2 shrink-0 ${line === last ? "bg-[#f4d44d]" : line === 0 ? "bg-[#ff4d3d]" : "bg-[#eceae3]"}`} />
              Reading back · {c.reading[line]}
            </span>
            <span className="text-[#eceae3]/55">Fig. 1 · one run, example data</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
