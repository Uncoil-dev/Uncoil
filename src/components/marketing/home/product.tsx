"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { appHref } from "@/lib/app-links";
import { CREAM, pines, type Scene } from "./pixels";
import { groundArt } from "./hero-art";
import { useGridCanvas } from "./use-grid";
import { useCase } from "./case-state";
import type { Case } from "./cases";
import { logLines } from "./logs";
import { PREDAWN, clearStars, landscapeUnder, toBuffer, useCopyBoxes } from "./sky";
import { BODY, H2, LABEL } from "./ui";

// The real trace view ships in its own chunk, so it never holds up the hero. It is still
// rendered on the server, so the section never shows an empty frame while it loads.
const TraceWindow = dynamic(() => import("./product-view").then((m) => m.TraceWindow));

/**
 * Timeline rows the trace view makes room for: on wide screens enough for the longest example run
 * and the tallest step panel beside it; on phones the folded run.
 */
const ROOM = { desk: 19, phone: 6 };

const LEVEL: Record<string, string> = { DEBUG: "text-[#eceae3]/40", INFO: "text-[#eceae3]/60", WARN: "text-[#eceae3]", ERROR: "text-[#eceae3]" };

/** The picked run as an ordinary log tail, generated from the same spans the trace view draws. */
function Logs({ c }: { c: Case }) {
  const lines = useMemo(() => logLines(c.run, c.runId), [c]);
  return (
    <div className="flex h-full min-w-0 flex-col border-2 border-[#eceae3]/40 bg-[#090909]">
      <p className={`border-b border-[#eceae3]/20 px-4 py-2.5 text-[#eceae3]/55 ${LABEL}`}>$ tail -f agent.log · {c.runId}</p>
      <pre className="flex min-h-0 min-w-0 flex-1 flex-col justify-end overflow-hidden px-4 py-3 font-mono text-[10.5px] leading-[1.6] sm:text-[11.5px]">
        {lines.map((l, i) => (
          <span key={i} className={`block truncate ${LEVEL[l.level]}`}>
            <span className="text-[#eceae3]/30">{l.time} </span>
            <span className="inline-block w-[5ch]">{l.level}</span> {l.text}
          </span>
        ))}
      </pre>
      <p className={`border-t border-[#eceae3]/20 px-4 py-2.5 text-[#eceae3]/55 ${LABEL}`}>
        {lines.length} lines · the cause is in here, unmarked
      </p>
    </div>
  );
}

const VIEWS = ["Uncoil", "Your logs"] as const;

/**
 * The same run two ways, standing in the pixel world like a signboard on two posts: the trace
 * view opened on the step that explains the failure, or the log tail you would have read
 * instead. Both views always tell the failure picked in the hero. The two views share one frame
 * sized for the taller one, so flipping between them never moves the page.
 */
export function Product() {
  const c = useCase();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const copy = useCopyBoxes(sectionRef);
  const [view, setView] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useGridCanvas(
    canvasRef,
    ({ px, scale, seconds }) => {
      const section = sectionRef.current;
      const board = boardRef.current;
      if (!section || !board) return;
      const sr = section.getBoundingClientRect();
      const br = board.getBoundingClientRect();
      const groundY = Math.round((sr.height - 40) / scale);
      const bx0 = Math.round((br.left - sr.left) / scale);
      const bx1 = Math.round((br.right - sr.left) / scale);
      const bBottom = Math.round((br.bottom - sr.top) / scale);
      const s: Scene = { px, cam: 0, groundY, t: seconds };
      const words = toBuffer(copy.current, scale, 4);
      // Before dawn: fewer stars, and first light along the horizon where the sun will come up.
      landscapeUnder(s, 1.5, 0.5, words, PREDAWN);
      clearStars(px, words);
      const postL = bx0 + Math.round((bx1 - bx0) * 0.12);
      const postR = bx1 - Math.round((bx1 - bx0) * 0.12);
      pines(s, [[postL - 40, postL + 20], [postR - 20, postR + 20]], 1);
      groundArt(s, []);
      // Two posts carry the board down to the ground, with a crossbeam just under it.
      for (const x of [postL, postR]) {
        px.rect(x - 1, bBottom, 3, groundY - bBottom, CREAM);
        px.rect(x - 3, groundY - 3, 7, 3, CREAM);
      }
      px.rect(postL, bBottom + 4, postR - postL, 1, CREAM);
    },
    { still: true, redraw: c.id },
  );

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - view;
    setView(n);
    tabs.current[n]?.focus();
  };

  return (
    <section ref={sectionRef} id="trace" className="relative isolate scroll-mt-16 overflow-hidden bg-[#090909] px-5 pb-24 pt-8 text-[#eceae3] md:px-10 md:pb-24 md:pt-10" aria-labelledby="mix-trace-title">
      {/* Older links to the logs chapter land here: the comparison now lives on this board. */}
      <span id="logs" aria-hidden="true" className="absolute top-0 scroll-mt-16" />
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      <div className="mx-auto w-full max-w-[1280px]">
        <p data-clear className={`w-fit text-[#eceae3]/60 ${LABEL}`}>02 · The same run, two ways</p>
        <h2 id="mix-trace-title" className={`mt-5 ${H2}`}>
          <span data-clear className="inline-block max-w-[22ch]">Your logs say it failed. Uncoil says why.</span>
        </h2>

        <div ref={boardRef} data-clear className="mt-8 md:mt-10">
          <div role="tablist" aria-label="Read the run in" className="grid grid-cols-2 border-2 border-b-0 border-[#eceae3] sm:w-fit">
            {VIEWS.map((v, i) => (
              <button
                key={v}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`trace-tab-${i}`}
                aria-selected={view === i}
                aria-controls="trace-panel"
                tabIndex={view === i ? 0 : -1}
                onClick={() => setView(i)}
                onKeyDown={onKey}
                className={`min-h-12 px-5 font-mono text-[11px] uppercase tracking-[0.14em] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#f4d44d] ${view === i ? (i === 0 ? "bg-[#f4d44d] text-black" : "bg-[#eceae3] text-black") : "bg-[#090909] text-[#eceae3]/70 hover:text-[#eceae3]"}`}
              >
                {i === 0 ? "Uncoil" : "Your logs"}
              </button>
            ))}
          </div>
          <div id="trace-panel" role="tabpanel" aria-labelledby={`trace-tab-${view}`} className="grid">
            <div className={`[grid-area:1/1] ${view === 0 ? "" : "invisible"}`}>
              <TraceWindow key={c.id} c={c} rows={ROOM} />
            </div>
            <div className={`[grid-area:1/1] ${view === 1 ? "" : "invisible"}`}>
              <Logs c={c} />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-2 border-t-0 border-[#eceae3] bg-[#090909] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`min-h-28 max-w-3xl text-[#eceae3]/85 sm:min-h-14 md:min-h-16 ${BODY}`}>{c.shows}</p>
            <a href={appHref("/demo/project")} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b border-[#eceae3] hover:text-[#f4d44d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae3] ${LABEL}`}>
              Open the live demo <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
