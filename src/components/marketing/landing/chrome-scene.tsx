"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { snapCell, targetCell } from "@/components/marketing/home/grid";
import { Px, drawScene } from "./phone-menu/pixel-art";
import { SunTrack, deviceShift, lanePitch, restX, rowsBelow } from "./chrome-layout";

export type Ruler = { ox: number; pitch: number; boards: boolean; scale?: number };

type Props = {
  /** Scene height in cells. The ruler sits 12 cells above the bottom, with the boards under it. */
  rows: number;
  /** Scene height when the ruler asks for boards and robot at twice the size (the boards then need more room). */
  rows2?: number;
  /** Grow to the height the parent gives it (never under `rows`), adding sky above the ruler. */
  fill?: boolean;
  /** Pages on the ruler. */
  pages: number;
  /** Pages where a numbered board hangs, numbered from 1 in order. */
  marks: readonly number[];
  /** The board to light, as an index into `marks`, or null. */
  lit: number | null;
  /** The page the robot walks to (it stands in the middle of that page). */
  target: number;
  /** Where the ruler starts and its pitch, given the scene width in cells. */
  ruler?: (cells: number, cell: number, el: HTMLElement) => Ruler;
  /** Hold the robot at the start until this turns true, so it walks in when the scene is seen. */
  armed?: boolean;
  className?: string;
};

function useReduced() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduce;
}

const defaultRuler = (cells: number, pages: number): Ruler => {
  // Six cells in, so the robot (ten cells wide, centred on its page) is never cut at the left.
  const pitch = lanePitch(cells - 8, pages);
  return { ox: 6, pitch, boards: true };
};

/**
 * The phone menu's night scene (sky, banded sun, a ruler of pages with numbered boards, and the
 * robot walking it), drawn on the homepage grid: one buffer pixel per cell, every cell a whole
 * number of device pixels, and the canvas nudged onto a whole device pixel. Under reduced motion
 * the robot stands still where it is going.
 */
export function ChromeScene({ rows: minRows1, rows2, fill = false, pages, marks, lit, target, ruler, armed = true, className = "" }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReduced();
  const sun = useRef(new SunTrack());
  const [size, setSize] = useState<{ cells: number; c: number; shift: number; ruler: Ruler; rows: number } | null>(null);
  const minRows = size?.ruler.scale === 2 && rows2 ? rows2 : minRows1;
  const rows = size?.rows ?? minRows;
  const goal = armed || reduce ? target : 0;
  const live = useRef({ goal, lit, size, pages, marks, rows });
  const walk = useRef({ pos: 0, from: 0, t0: 0, dist: 0, hop: -1, raf: 0 });

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const dpr = window.devicePixelRatio || 1;
      const c = snapCell(targetCell(window.innerWidth), dpr);
      const cells = Math.floor(el.clientWidth / c);
      if (!cells) return;
      const r = ruler ? ruler(cells, c, el) : defaultRuler(cells, pages);
      const rows = fill ? Math.max(minRows1, Math.floor(el.clientHeight / c)) : r.scale === 2 && rows2 ? rows2 : minRows1;
      setSize({ cells, c, shift: deviceShift(el.getBoundingClientRect().left, dpr), ruler: r, rows });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    const dpr = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dpr.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      dpr.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
    };
  }, [ruler, pages, fill, minRows1, rows2]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    const prev = live.current;
    live.current = { goal, lit, size, pages, marks, rows };
    if (!el || !ctx || !size) return;
    const w = walk.current;
    if (prev.goal !== goal || w.t0 === 0) {
      w.from = w.pos;
      w.t0 = performance.now();
    }
    let px: Px | null = null;
    const frame = (now: number) => {
      w.raf = 0;
      const { goal: g, lit: l, size: s, pages: n, marks: mk, rows: H } = live.current;
      if (!s) return;
      if (!px || px.w !== s.cells || px.h !== H) {
        px = new Px(s.cells, H);
        el.width = s.cells;
        el.height = H;
      }
      // A steady pace, at most 700ms for any trip, then one hop on arrival.
      const dist = g - w.from;
      const dur = Math.min(700, (Math.abs(dist) / Math.max(1, n)) * 1400);
      const k = reduce || dur === 0 ? 1 : Math.min(1, (now - w.t0) / dur);
      const before = w.pos;
      w.pos = w.from + dist * k;
      if (w.pos !== before) w.dist += Math.abs(w.pos - before) * s.ruler.pitch;
      if (k === 1 && before !== w.pos && !reduce) w.hop = now;
      const hopT = w.hop < 0 ? 99 : (now - w.hop) / 60;
      const lift = reduce ? 0 : ([1, 2, 2, 1][Math.floor(hopT)] ?? 0);
      const sc = s.ruler.scale ?? 1;
      const horizon = H - rowsBelow(sc);
      drawScene(px, {
        pitch: s.ruler.pitch,
        pages: n,
        ox: s.ruler.ox,
        ruler: horizon,
        scale: sc,
        sun: sun.current.update(now, s.cells, horizon, restX(s.ruler.ox, s.ruler.pitch, g, sc), sc, reduce),
        trail: true,
        pos: w.pos,
        frame: k < 1 ? Math.floor(w.dist / 2) % 4 : 0,
        lift,
        antenna: true,
        copied: false,
        boards: s.ruler.boards ? mk.map((at, i) => ({ at, n: i + 1, lit: l === i })) : [],
      });
      px.blit(ctx);
      if (!reduce && (k < 1 || hopT < 4 || sun.current.moving)) w.raf = requestAnimationFrame(frame);
    };
    if (reduce) {
      w.pos = goal;
      w.from = goal;
    }
    frame(performance.now());
    return () => {
      if (w.raf) cancelAnimationFrame(w.raf);
      w.raf = 0;
    };
  }, [goal, lit, size, pages, marks, rows, reduce]);

  return (
    <div ref={wrap} className={`overflow-hidden ${fill ? "relative min-h-0 flex-1" : ""} ${className}`} style={fill ? { minHeight: minRows * (size?.c ?? 6) } : undefined} aria-hidden="true">
      <canvas
        ref={canvas}
        className={`block [image-rendering:pixelated] ${fill ? "absolute bottom-0 left-0" : ""}`}
        style={size ? { width: size.cells * size.c, height: rows * size.c, transform: `translateX(${size.shift}px)` } : { height: rows * 6 }}
      />
    </div>
  );
}
