"use client";

import { useEffect, useRef } from "react";
import { CREAM, INK, PALE, YELLOW, Px, dith } from "./pixels";
import { robotInFront } from "./hero-art";
import { carrierX, riseOf } from "./handoff";
import { hash } from "./math";
import { snapCell, targetCell } from "./grid";
import { useCalm } from "./use-calm";

/** Rows of the strip, in page cells. */
export const DAWN_ROWS = 34;

/**
 * The strip's art for a given sunrise progress (0 as it enters the screen, 1 as it leaves): the
 * sky turns from ink to cream down the strip in ordered dither, the last stars fade out of its
 * dark top, and the sun climbs from the horizon at the bottom edge, its bands thinning as it rises.
 * Pure, so the tests can check that nothing is drawn off the grid or through the copy below.
 */
export function drawDawn(px: Px, rise: number) {
  const { w, h } = px;
  px.clear(INK);
  // The sky: ink at the top to cream at the horizon, a whole cell at a time.
  for (let y = 0; y < h; y++) {
    const k = Math.pow(y / (h - 1), 1.35);
    for (let x = 0; x < w; x++) if (dith(x, y, k)) px.set(x, y, CREAM);
  }
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(hash(i, 31) * w);
    const y = Math.floor(hash(i, 37) * h * 0.3);
    if (!dith(x, y, Math.pow(y / (h - 1), 1.35))) px.set(x, y, CREAM);
  }
  // The sun: the same size as in the scenes, its centre climbing as the strip scrolls by.
  const r = Math.round(Math.min(w * 0.11, 24));
  const cx = Math.round(w * 0.78);
  const sunRise = Math.round(rise * 14) / 14;
  const cy = Math.round(h - 2 + r * 0.15 - sunRise * r * 0.55);
  const bands = 0.55 * (1 - sunRise);
  for (let y = -r; y <= r; y++) {
    if (cy + y >= h - 2) break;
    const band = bands > 0 && y > r * (1 - 1.15 * bands) && (y + r) % 5 < 1 + Math.floor(((y + r * 0.15) / r) * 3);
    if (band) continue;
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      px.set(cx + x, cy + y, d > 0.86 && dith(cx + x, cy + y, 0.5) ? PALE : YELLOW);
    }
  }
  // The horizon: two solid cream rows that run on into the section below.
  px.rect(0, h - 2, w, 2, CREAM);
  // The robot carries the yellow plank across the strip, a step for every two cells it moves. It
  // walks on once the robot under the trace board has left, so only one is ever in view.
  const x = carrierX(w, rise);
  if (x !== null) robotInFront(px, x, h - 2, Math.floor(x / 2) % 4, false, false, { swap: true, plank: true, solid: true });
}

/**
 * Dawn, between the night half of the page and the morning half. The strip is drawn on the page
 * grid and redrawn only when the robot moves a whole cell, from scroll, inside an animation frame;
 * off screen it does nothing at all. With reduced motion the sun and the robot stand still halfway.
 */
export function Dawn() {
  const calm = useCalm();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!box || !canvas || !ctx) return;
    let px: Px | null = null;
    let key = "";
    let raf = 0;
    let visible = false;
    const render = () => {
      raf = 0;
      const cell = snapCell(targetCell(window.innerWidth), window.devicePixelRatio || 1);
      const w = Math.ceil(box.clientWidth / cell);
      const rect = box.getBoundingClientRect();
      const vh = window.innerHeight;
      const rise = calm ? 0.5 : riseOf(rect.top, rect.height, vh);
      // Redrawn for every whole cell the robot moves.
      const step = carrierX(w, rise) ?? "none";
      const next = `${w}:${cell}:${step}`;
      if (next === key) return;
      key = next;
      if (!px || px.w !== w) {
        px = new Px(w, DAWN_ROWS);
        canvas.width = w;
        canvas.height = DAWN_ROWS;
      }
      canvas.style.width = `${w * cell}px`;
      canvas.style.height = `${DAWN_ROWS * cell}px`;
      box.style.height = `${DAWN_ROWS * cell}px`;
      drawDawn(px, rise);
      px.blit(ctx);
    };
    const ask = () => {
      if (!raf && (visible || !key)) raf = requestAnimationFrame(render);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) ask();
    });
    io.observe(box);
    // A resize can change the cell, and with it the strip's height, so it always redraws.
    const resize = () => {
      key = "";
      ask();
    };
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", resize);
    render();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [calm]);

  return (
    <div ref={boxRef} data-edge data-dawn aria-hidden="true" className="relative h-[136px] overflow-hidden bg-[#090909] md:h-[170px] lg:h-[204px]">
      <canvas ref={canvasRef} className="absolute left-0 top-0 block [image-rendering:pixelated]" />
    </div>
  );
}
