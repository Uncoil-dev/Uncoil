"use client";

import { useEffect, useRef, useState } from "react";
import { CREAM, INK, Px, YELLOW } from "./pixels";
import { snapCell, targetCell } from "./grid";
import {
  ROBOT_W,
  feetRow,
  progressAt,
  railLeft,
  railStops,
  robotRows,
  type Mood,
} from "./companion-art";
import { LABEL } from "./ui";
import { useCalm } from "./use-calm";

/** The page's chapters, top to bottom: the stops on the robot's rail. */
export const CHAPTERS = [
  ["break", "Where it broke"],
  ["trace", "Logs and trace"],
  ["fix", "Fix and verify"],
  ["kit", "What you get"],
  ["pw-setup", "Setup"],
  ["price", "Price"],
  ["faq", "Questions"],
  ["close", "Your turn"],
] as const;

const MOODS: readonly Mood[] = ["alert", "search", "carry"];
/** Rows kept free above the first stop, for the tallest robot. */
const HEADROOM = 12;
const TOP = 96;
/** Clear of the site's chat button and the cookie banner at the bottom of the screen. */
const BOTTOM = 136;

const two = (n: number) => String(n).padStart(2, "0");

type Rail = {
  cell: number;
  left: number;
  rows: number;
  stops: number[];
  phone: boolean;
};

/**
 * The robot, walking down the page with the reader. It stands on a rail in the margin with a stop
 * per chapter: alarmed at the break, searching through the trace, carrying the repair through the
 * fix, then walking on into the morning until the closing scene, where the scene's own robot takes
 * over. It is drawn on the page grid in whichever of ink and cream the page under it is not, and it
 * redraws only inside animation frames when the reader scrolls. Every stop is a link to its chapter.
 */
export function Companion() {
  const calm = useCalm();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rail, setRail] = useState<Rail | null>(null);
  const [at, setAt] = useState(-1);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let px: Px | null = null;
    let geo: Rail | null = null;
    let raf = 0;
    let lastFeet = -1;
    let frame = 0;
    let blink = 0;
    let key = "";
    let mood: Mood = "walk";

    const layout = () => {
      const vw = window.innerWidth;
      const dpr = window.devicePixelRatio || 1;
      const cell = snapCell(targetCell(vw), dpr);
      const rows = Math.max(
        HEADROOM + 20,
        Math.floor((window.innerHeight - TOP - BOTTOM) / cell),
      );
      geo = {
        cell,
        left: railLeft(vw, cell, dpr),
        rows,
        phone: vw < 768,
        stops: railStops(rows - HEADROOM, CHAPTERS.length).map(
          (r) => r + HEADROOM - 1,
        ),
      };
      px = new Px(ROBOT_W, rows);
      canvas.width = ROBOT_W;
      canvas.height = rows;
      canvas.style.width = `${ROBOT_W * cell}px`;
      canvas.style.height = `${rows * cell}px`;
      canvas.style.left = `${geo.left}px`;
      setRail(geo);
      key = "";
    };

    const draw = () => {
      raf = 0;
      if (!px || !geo) return;
      const vh = window.innerHeight;
      const tops = CHAPTERS.map(
        ([id]) =>
          document.getElementById(id)?.getBoundingClientRect().top ?? Infinity,
      );
      const progress = progressAt(tops, vh * 0.4);
      const heroEnd =
        document
          .getElementById("pw-hero-title")
          ?.closest("section")
          ?.getBoundingClientRect().bottom ?? 0;
      const close = tops[tops.length - 1];
      setShown(heroEnd < vh * 0.35 && close > vh * 0.6);
      setAt(Math.floor(progress));
      const chapter = Math.max(0, Math.floor(progress));
      mood = MOODS[chapter] ?? "walk";
      const feet = feetRow(geo.stops, Math.max(0, progress), calm);
      // The legs move a step for every cell the robot moves, so it walks exactly as far as you scroll.
      if (lastFeet >= 0 && feet !== lastFeet && !calm) frame++;
      lastFeet = feet;
      // Ink above the dawn strip's middle, cream below it: the robot takes the other colour.
      const dawn = document
        .querySelector("[data-dawn]")
        ?.getBoundingClientRect();
      const turn = dawn
        ? (dawn.top + dawn.height / 2 - TOP) / geo.cell
        : Infinity;
      const next = `${feet}:${frame}:${blink}:${mood}:${Math.round(turn)}:${progress < 0 ? -1 : Math.floor(progress)}`;
      if (next === key) return;
      key = next;
      paint(px, geo, feet, mood, frame, blink, turn, Math.floor(progress));
      px.blit(ctx);
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onResize = () => {
      layout();
      ask();
    };
    layout();
    draw();
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", onResize);
    // While searching, the robot looks left and right twice a second; nothing else runs on a timer.
    const look = calm
      ? 0
      : window.setInterval(() => {
          if (mood !== "search" || document.hidden) return;
          blink++;
          ask();
        }, 500);
    return () => {
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", onResize);
      window.clearInterval(look);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [calm]);

  const fade = calm ? "" : "transition-opacity duration-300";
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-40 ${fade} ${shown ? "opacity-100" : "invisible opacity-0"}`}
      style={{ top: TOP }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute top-0 block [image-rendering:pixelated]"
      />
      {rail && (
        <nav aria-label="Page chapters" className="max-md:hidden">
          <ol>
            {CHAPTERS.map(([id, name], i) => (
              <li
                key={id}
                className="group absolute"
                style={{
                  left: rail.left + (ROBOT_W * rail.cell) / 2 - 14,
                  top: (rail.stops[i] + 0.5) * rail.cell - 14,
                }}
              >
                <a
                  href={`#${id}`}
                  aria-label={`${two(i + 1)} ${name}`}
                  aria-current={i === at ? "step" : undefined}
                  tabIndex={shown ? 0 : -1}
                  className="pointer-events-auto block size-7 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#f4d44d]"
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap border border-[#eceae3]/30 bg-[#090909] px-2 py-1 text-[#eceae3] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${LABEL}`}
                >
                  <span className="text-[#eceae3]/55">{two(i + 1)}</span> {name}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}

/** One frame of the rail: the dashed track, a knot per chapter, and the robot standing at `feet`. */
function paint(
  px: Px,
  geo: Rail,
  feet: number,
  mood: Mood,
  frame: number,
  blink: number,
  turn: number,
  at: number,
) {
  px.buf.fill(0);
  const ink = (y: number) => (y < turn ? CREAM : INK);
  const page = (y: number) => (y < turn ? INK : CREAM);
  const rows = robotRows(mood, frame, blink);
  const top = feet - rows.length + 1;
  // The track and the knots stop short of the robot, so nothing shows through between its legs.
  const free = (y: number) => y < top - 1 || y > feet + 1;
  const mid = ROBOT_W >> 1;
  // On phones only the robot shows, peeking in at the edge: no track beside the text.
  if (!geo.phone) {
    for (let y = geo.stops[0]; y <= geo.stops[geo.stops.length - 1]; y++)
      if (y % 4 < 2 && free(y)) px.set(mid, y, ink(y));
    geo.stops.forEach((s, i) => {
      const passed = i < at;
      const current = i === at;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!free(s + dy)) continue;
          const edge = dx !== 0 || dy !== 0;
          px.set(
            mid + dx,
            s + dy,
            current ? YELLOW : passed || edge ? ink(s + dy) : page(s + dy),
          );
        }
    });
  }
  rows.forEach((row, j) => {
    const y = top + j;
    for (let x = 0; x < ROBOT_W; x++) {
      const ch = row[x];
      if (ch === "B") px.set(x, y, ink(y));
      else if (ch === "Y") px.set(x, y, YELLOW);
      else if (ch === "F") px.set(x, y, page(y));
    }
  });
}
