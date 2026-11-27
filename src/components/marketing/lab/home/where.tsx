"use client";

import { useRef, useState } from "react";
import { motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Eyebrow } from "./eyebrow";
import { PLAN_CALL, tokens } from "./run-data";
import { AFTER_EYEBROW, AFTER_HEADLINE, DUR, EASE, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";
import { useCell, useGridCanvas } from "./use-grid";
import { ENTER, drawWhere, type IconName } from "./where-art";
import { WHERE_ROWS, boardBox, whereLayout } from "./where-layout";
import { segment } from "../editorial/art";

// One example run, the same one the hero calls out. Step 4 is where it went wrong; step 6 is where it showed.
const STEPS = [
  { name: "support-agent", note: "run started" },
  { name: "llm.chat", note: `${tokens(PLAN_CALL).toLocaleString("en-US")} tok · ${PLAN_CALL.latencyMs} ms` },
  { name: "order.lookup", note: "140 ms" },
  { name: "docs.search", note: "0 results", cause: true },
  { name: "llm.chat · retry", note: "guessed the policy" },
  { name: "refund.issue", note: "502 · 5000 ms", failed: true },
] as const;

const ICON_OF: readonly IconName[] = ["agent", "chat", "parcel", "search", "retry", "coin"];

/**
 * One run on the page grid: six plates on a rope, each with its number board and its own icon.
 * The rope draws in when the figure comes into view; as it scrolls up the screen, Uncoil's scan
 * reads the rope back from step 06 to step 04 and the cause plate turns yellow when it gets there.
 */
function Plate({ vertical, scan, className }: { vertical: boolean; scan: MotionValue<number>; className: string }) {
  const calm = useCalm();
  const cell = useCell();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(boxRef, { once: true, amount: 0.35 });
  const startedAt = useRef<number | null>(null);
  const [cols, setCols] = useState(0);

  useGridCanvas(
    canvasRef,
    ({ px, seconds }) => {
      if (inView && startedAt.current === null) startedAt.current = seconds;
      const t = calm ? 99 : startedAt.current === null ? 0 : seconds - startedAt.current;
      drawWhere(px, whereLayout(px.w, vertical), ICON_OF, { t, scan: scan.get() });
      if (px.w !== cols) setCols(px.w);
    },
    { still: calm },
  );

  const l = cols ? whereLayout(cols, vertical) : null;
  const rows = vertical ? WHERE_ROWS.vertical : WHERE_ROWS.horizontal;
  return (
    <div ref={boxRef} className={`relative overflow-hidden ${className}`} style={{ height: rows * cell }}>
      <div className="absolute inset-0" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      {l &&
        STEPS.map((s, i) => {
          const b = boardBox(l, i);
          const c = l.centers[i];
          const above = !vertical && i % 2 === 0;
          const style = vertical
            ? { left: (b.x + b.w + 3) * cell, top: (c.y + 0.5) * cell, transform: "translateY(-50%)" }
            : { left: (c.x + 0.5) * cell, top: (above ? b.y - 1 : b.y + b.h + 1) * cell, transform: above ? "translate(-50%,-100%)" : "translateX(-50%)" };
          return (
            <motion.p
              key={s.name + i}
              aria-hidden="true"
              className={`absolute whitespace-nowrap font-mono leading-5 ${vertical ? "text-left" : "text-center"}`}
              style={style}
              initial={calm ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: DUR.base, delay: ENTER.plate(i) + 0.15, ease: EASE }}
            >
              <span className="block text-[14px] md:text-[15px]">{s.name}</span>
              <span className="block text-[12px] text-black/60 md:text-[13px]">{s.note}</span>
            </motion.p>
          );
        })}
    </div>
  );
}

const READING = ["06 · refund.issue failed: 502 after 5000 ms", "05 · llm.chat retried 7 times, guessing the policy", "04 · docs.search returned 0 results: the cause"] as const;

export function Where() {
  const calm = useCalm();
  const figRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: figRef, offset: ["start 0.8", "end 0.55"] });
  const scrolled = useTransform(scrollYProgress, (p) => segment(p, 0.12, 0.82));
  const still = useMotionValue(1);
  const scan = calm ? still : scrolled;
  const [read, setRead] = useState(0);
  useMotionValueEvent(scrolled, "change", (k) => setRead(k < 0.35 ? 0 : k < 0.92 ? 1 : 2));
  const line = calm ? 2 : read;

  return (
    <section id="break" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="ed-break-title">
      <div className={WRAP}>
        <Eyebrow n="01" on="cream">Where it broke</Eyebrow>
        <h2 id="ed-break-title" className={`${AFTER_EYEBROW} ${H2}`}>
          It failed at step 6.
          <br />
          It broke at{" "}
          <span className="relative inline-block">
            <span aria-hidden="true" className="absolute -inset-x-[0.06em] bottom-[0.02em] top-[0.14em] bg-[#f4d44d]" />
            <span className="relative">step 4.</span>
          </span>
        </h2>

        <figure ref={figRef} className={AFTER_HEADLINE}>
          <div role="img" aria-label="Diagram of one run: six steps on a rope. Step 4, docs.search, returned 0 results. The rope snaps at step 6, refund.issue, which failed with a 502.">
            <Plate vertical={false} scan={scan} className="hidden w-full md:block" />
            <Plate vertical scan={scan} className="mx-auto w-full max-w-[420px] md:hidden" />
          </div>
          <figcaption className={`mt-6 flex flex-col gap-2 border-t border-black/25 pt-3 sm:flex-row sm:items-baseline sm:justify-between ${LABEL}`}>
            <span className="flex items-center gap-2 text-black">
              <span aria-hidden="true" className={`size-2 shrink-0 ${line === 2 ? "bg-[#f4d44d] outline outline-1 outline-black" : line === 0 ? "bg-[#ff4d3d]" : "bg-black"}`} />
              Reading back · {READING[line]}
            </span>
            <span className="text-black/55">Fig. 1 · one run, example data</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
