"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

// The footer wordmark, drawn as loose pixels. The pixels fly in and settle when the
// footer scrolls into view, and scatter away from the pointer like a dissolving trace.

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
const YELLOW = "#f4d44d";
const CREAM = "#eceae3";
// Canvas height as a share of its width. The wrapper uses the same ratio so nothing jumps.
const RATIO = 0.19;

type Particle = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; yellow: boolean };

export function PixelWordmark({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let cell = 6;
    let raf = 0;
    let visible = false;
    let assembled = false;
    let disposed = false;
    const pointer = { x: -1e4, y: -1e4, active: false };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const size = cell - 1;
      for (const yellow of [false, true]) {
        ctx.fillStyle = yellow ? YELLOW : CREAM;
        for (const p of particles) if (p.yellow === yellow) ctx.fillRect(p.x, p.y, size, size);
      }
    };

    const step = () => {
      raf = 0;
      if (disposed) return;
      const radius = cell * 14;
      let energy = 0;
      for (const p of particles) {
        let ax = (p.hx - p.x) * 0.06;
        let ay = (p.hy - p.y) * 0.06;
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2) || 1;
            const push = (1 - d / radius) * cell * 2.2;
            ax += (dx / d) * push;
            ay += (dy / d) * push;
          }
        }
        p.vx = (p.vx + ax) * 0.8;
        p.vy = (p.vy + ay) * 0.8;
        p.x += p.vx;
        p.y += p.vy;
        energy += Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.hx - p.x) + Math.abs(p.hy - p.y);
      }
      draw();
      if (visible && (pointer.active || energy > particles.length * 0.05)) raf = requestAnimationFrame(step);
    };

    const kick = () => {
      if (!raf && !reduce && visible) raf = requestAnimationFrame(step);
    };

    const build = async () => {
      await document.fonts.ready;
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = Math.round(width * RATIO);
      if (!width || !height) return;
      cell = Math.max(4, Math.round(width / 230));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const o = off.getContext("2d", { willReadFrequently: true });
      if (!o) return;

      const fontSize = height * 1.12;
      const baseline = height * 0.97;
      o.font = `${fontSize}px ${getComputedStyle(wrap).fontFamily}`;
      o.textBaseline = "alphabetic";
      o.fillStyle = "#fff";

      // The Dissolve mark sits on the baseline at the left. Letters spread across the rest.
      const unit = (fontSize * 0.6) / 38;
      const markWidth = unit * 50;
      const markTop = baseline - unit * 38;
      const letters = "uncoil".split("");
      const widths = letters.map((l) => o.measureText(l).width);
      const start = markWidth + width * 0.06;
      const gap = (width - start - widths.reduce((a, b) => a + b, 0)) / (letters.length - 1);
      let x = start;
      letters.forEach((l, i) => {
        o.fillText(l, x, baseline);
        x += widths[i] + gap;
      });

      const data = o.getImageData(0, 0, width, height).data;
      const next: Particle[] = [];
      const scatter = (hx: number, hy: number, yellow: boolean) => {
        const settled = reduce || assembled;
        next.push({
          hx,
          hy,
          x: settled ? hx : hx + (Math.random() - 0.5) * width * 0.5,
          y: settled ? hy : hy + (Math.random() - 0.2) * height * 2,
          vx: 0,
          vy: 0,
          yellow,
        });
      };
      for (let cy = 0; cy < height; cy += cell) {
        for (let cx = 0; cx < width; cx += cell) {
          const px = Math.min(width - 1, Math.round(cx + cell / 2));
          const py = Math.min(height - 1, Math.round(cy + cell / 2));
          if (px < markWidth + cell) {
            // Mark cells: bars with a dithered left edge, like the logo.
            const gx = Math.floor(px / unit);
            const gy = Math.floor((py - markTop) / unit);
            const bar = BARS.find((b) => gy >= b.y && gy < b.y + 10 && gx >= 50 - b.w && gx < 50);
            if (bar) {
              const f = (gx - (50 - bar.w) + 0.5) / bar.w;
              const bx = Math.floor(cx / cell) % 4;
              const by = Math.floor(cy / cell) % 4;
              if (BAYER[by][bx] / 16 < f * 1.9 - 0.15) scatter(cx, cy, true);
            }
            continue;
          }
          if (data[(py * width + px) * 4 + 3] > 120) scatter(cx, cy, false);
        }
      }
      particles = next;
      draw();
      kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          kick();
          // Once the pixels have had time to land, a resize should not replay the fly-in.
          window.setTimeout(() => {
            assembled = true;
          }, 1600);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(wrap);

    let resizeTimer = 0;
    let lastWidth = 0;
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth === lastWidth) return;
      lastWidth = wrap.clientWidth;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 120);
    });
    ro.observe(wrap);

    const onMove = (e: PointerEvent) => {
      if (reduce) return;
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
      kick();
    };
    const onLeave = () => {
      pointer.active = false;
      kick();
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce]);

  return (
    <div ref={wrapRef} className={`relative w-full select-none font-pixel ${className}`} style={{ aspectRatio: `1 / ${RATIO}` }} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
