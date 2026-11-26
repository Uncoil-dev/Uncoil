"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type KeyboardEvent } from "react";
import { appHref } from "@/lib/app-links";
import { CREAM, ground, pines, robot, type Scene } from "../pixel-world/pixels";
import { usePixelCanvas } from "../pixel-world/use-pixel-canvas";
import { CASES } from "./cases";
import { clearStars, landscapeUnder, toBuffer, useCopyBoxes } from "./sky";
import { BODY, H2, LABEL } from "./ui";
import { useCalm } from "./use-calm";

// The real trace view ships in its own chunk, so it never holds up the hero. It is still
// rendered on the server, so the section never shows an empty frame while it loads.
const TraceWindow = dynamic(() => import("./product-view").then((m) => m.TraceWindow));

const ROOM = { desk: 13, phone: 6 };
const scenePixel = (w: number) => (w < 640 ? 4 : w < 1100 ? 5 : 6);

/**
 * "What broke?": the real trace view standing in the pixel world like a signboard on two posts,
 * with the robot waiting beside it. The visitor picks the failure that looks like theirs and the
 * board shows that run, opened on the step that explains it.
 */
export function Product() {
  const calm = useCalm();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const copy = useCopyBoxes(sectionRef);
  const [pick, setPick] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const c = CASES[pick];

  usePixelCanvas(
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
      // No sun here: the board stands where it would be, so the scene is lit only by the stars.
      landscapeUnder(s, 1.5, 0.5, words);
      clearStars(px, words);
      const postL = bx0 + Math.round((bx1 - bx0) * 0.12);
      const postR = bx1 - Math.round((bx1 - bx0) * 0.12);
      pines(s, [[postL - 40, postL + 20], [postR - 20, postR + 20]], 1);
      ground(s, []);
      // Two posts carry the board down to the ground, with a crossbeam just under it.
      for (const x of [postL, postR]) {
        px.rect(x - 1, bBottom, 3, groundY - bBottom, CREAM);
        px.rect(x - 3, groundY - 3, 7, 3, CREAM);
      }
      px.rect(postL, bBottom + 4, postR - postL, 1, CREAM);
      robot(px, postL - 12, groundY - 3, calm ? 0 : Math.floor(seconds * 1.2) % 2 === 0 ? 0 : 1);
    },
    { pixel: scenePixel, still: calm },
  );

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? CASES.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + CASES.length) % CASES.length;
    setPick(n);
    tabs.current[n]?.focus();
  };

  return (
    <section ref={sectionRef} id="trace" className="relative isolate scroll-mt-16 overflow-hidden bg-[#090909] px-5 pb-40 pt-14 text-[#eceae3] md:px-10 md:pb-44 md:pt-16" aria-labelledby="mix-trace-title">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      </div>
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-12">
          <div>
            <p data-clear className={`w-fit text-[#eceae3]/60 ${LABEL}`}>03 · In the trace view</p>
            <h2 id="mix-trace-title" className={`mt-5 ${H2}`}>
              <span data-clear className="inline-block">What broke? Pick yours.</span>
            </h2>
          </div>
          <div data-clear role="tablist" aria-label="Pick a failure" className="grid gap-2 sm:grid-cols-2">
            {CASES.map((k, i) => {
              const on = i === pick;
              return (
                <button
                  key={k.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`case-tab-${k.id}`}
                  aria-selected={on}
                  aria-controls="case-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setPick(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`flex min-h-12 items-center gap-3 border-2 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d] ${on ? "border-[#f4d44d] bg-[#f4d44d] text-black" : "border-[#eceae3]/40 bg-[#090909] text-[#eceae3] hover:border-[#eceae3]"}`}
                >
                  <span className={`shrink-0 tabular-nums ${on ? "text-black/60" : "text-[#eceae3]/50"}`}>{String(i + 1).padStart(2, "0")}</span>
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={boardRef} data-clear id="case-panel" role="tabpanel" aria-labelledby={`case-tab-${c.id}`} className="mt-10 md:mt-12">
          <TraceWindow key={c.id} c={c} rows={ROOM} />
          <div className="flex flex-col gap-3 border-2 border-t-0 border-[#eceae3] bg-[#090909] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`max-w-3xl text-[#eceae3]/85 ${BODY}`}>{c.shows}</p>
            <a href={appHref("/demo/project")} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b border-[#eceae3] hover:text-[#f4d44d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae3] ${LABEL}`}>
              Open the live demo <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
