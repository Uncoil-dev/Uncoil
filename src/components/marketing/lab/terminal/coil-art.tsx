"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { Phase } from "./session";

// The run drawn as a pixel coil. While the agent runs, a yellow pulse travels along it; on failure
// the coil knots up in red where it broke; once the fix passes, the coil literally uncoils and its
// pixels settle into the Dissolve mark (the same 50x38 grid and Bayer dither as the logo).
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const BARS = [
  { y: 0, w: 50 },
  { y: 14, w: 26 },
  { y: 28, w: 18 },
];
const CREAM = "#eceae3";
const YELLOW = "#f4d44d";
const RED = "#ff4d3d";
/** Where along the coil (0..1) the failing step sits. */
const BREAK_AT = 0.68;

/** Logo pixels on a grid twice as fine as the 50x38 mark, so the coil has enough pixels to read as a band. */
function logoPixels() {
  const out: { x: number; y: number }[] = [];
  for (const { y: y0, w } of BARS) {
    const x0 = 50 - w;
    for (let y = y0 * 2; y < (y0 + 10) * 2; y++)
      for (let x = x0 * 2; x < 100; x++) if (BAYER[y % 4][x % 4] / 16 < ((x / 2 - x0 + 0.25) / w) * 1.9 - 0.15) out.push({ x: x / 2, y: y / 2 });
  }
  return out.sort((a, b) => a.x - b.x || a.y - b.y);
}

const LOGO = logoPixels();

type P = { t: number; jitter: number; lx: number; ly: number; x: number; y: number; depth: number; col: string };

function seeded(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function CoilArt({ phase, className = "", label }: { phase: Phase; className?: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const reduce = useReducedMotion();
  // With reduced motion the canvas draws one still frame, so it redraws whenever the phase changes.
  const stillPhase = reduce ? phase : null;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const parts: P[] = LOGO.map((p, i) => ({ t: i / (LOGO.length - 1), jitter: seeded(i), lx: p.x, ly: p.y, x: 0, y: 0, depth: 1, col: CREAM }));
    let w = 0;
    let h = 0;
    let cell = 4;
    let raf = 0;
    let visible = true;
    // Smoothed state so phase changes ease instead of snapping.
    let tight = 0;
    let morph = 0;
    let knot = 0;
    let pulse = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.max(3, Math.round(Math.min(w / 110, h / 60)));
    };

    const frame = (ms: number) => {
      const p = phaseRef.current;
      const k = reduce ? 1 : 0.045;
      tight += ((p === "setup" ? 0.55 : 1) - tight) * k;
      morph += ((p === "passed" ? 1 : 0) - morph) * (reduce ? 1 : 0.06);
      // Land exactly on the logo grid instead of creeping towards it forever.
      if (p === "passed" && morph > 0.97) morph = 1;
      knot += ((p === "failed" || p === "explain" ? 1 : p === "fixing" ? 0.35 : 0) - knot) * (reduce ? 1 : 0.08);
      if (p === "running") pulse = Math.min(BREAK_AT, pulse + 0.004);
      else if (p === "setup") pulse = 0;
      else if (p === "fixing") pulse = Math.min(1, pulse + 0.006);
      const time = reduce ? 0 : ms / 1000;

      ctx.clearRect(0, 0, w, h);
      const len = w * 0.8;
      const radius = Math.min(h * 0.3, 150);
      const turns = 5.5;
      const cx = w / 2;
      const cy = h / 2;
      // Logo target, centred and snapped to the pixel grid.
      const lc = Math.max(2, Math.floor(Math.min((w * 0.62) / 50, (h * 0.62) / 38) / 2) * 2);
      const lx0 = Math.round(cx - 25 * lc);
      const ly0 = Math.round(cy - 19 * lc);

      for (const q of parts) {
        const a = q.t * turns * Math.PI * 2 + time * 0.9;
        const tube = (q.jitter - 0.5) * cell * 5;
        const loose = (1 - tight) * (q.jitter - 0.5) * h * 0.9;
        const nearBreak = Math.max(0, 1 - Math.abs(q.t - BREAK_AT) / 0.07);
        const shake = knot * nearBreak * cell * 2.2 * Math.sin(time * 23 + q.jitter * 40);
        const r = radius * (1 + knot * nearBreak * 0.7);
        const hx = cx - len / 2 + q.t * len + Math.cos(a) * radius * 0.42 + shake;
        const hy = cy + Math.sin(a) * r + tube + loose;
        const depth = (Math.cos(a) + 1) / 2;
        const tx = lx0 + q.lx * lc;
        const ty = ly0 + q.ly * lc;
        q.x = hx + (tx - hx) * morph;
        q.y = hy + (ty - hy) * morph;
        q.depth = depth + (1 - depth) * morph;
        const pulseHit = p === "running" || p === "fixing" ? Math.max(0, 1 - Math.abs(q.t - pulse) / 0.05) : 0;
        q.col = morph > 0.5 ? YELLOW : knot > 0.3 && nearBreak > 0.25 ? RED : pulseHit > 0.2 || (p === "fixing" && q.t < pulse) ? YELLOW : CREAM;
      }

      const size = morph > 0.9 ? Math.max(1, lc / 2) : cell - 1;
      for (const q of parts) {
        const gx = Math.round(q.x / cell);
        const gy = Math.round(q.y / cell);
        // Depth reads as brightness and pixel density: the back of the coil is sparse and faint.
        const back = morph < 0.9 && BAYER[((gy % 4) + 4) % 4][((gx % 4) + 4) % 4] / 16 > q.depth * 1.4;
        if (back && q.jitter > 0.5) continue;
        const dim = knot > 0.3 && q.t > BREAK_AT + 0.07 && morph < 0.5;
        ctx.globalAlpha = (dim ? 0.28 : 1) * (back ? 0.35 : 1);
        ctx.fillStyle = q.col;
        if (morph > 0.9) ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
        else ctx.fillRect(gx * cell, gy * cell, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (ms: number) => {
      frame(ms);
      raf = visible && !reduce ? requestAnimationFrame(tick) : 0;
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      frame(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduce, stillPhase]);

  return <canvas ref={ref} role="img" aria-label={label} className={`block h-full w-full ${className}`} />;
}
