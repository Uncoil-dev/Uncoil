"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { clamp01, easeInOut, inked, pairParticles, rasterPoints, type Particle, type Pt } from "./art";

const INK = [9, 9, 9] as const;
const YELLOW = [244, 212, 77] as const;

/** Rasterises a line of text in the page's pixel font onto a small grid and returns its inked cells. */
export function textPoints(text: string, width: number, height: number, family: string, size: number): Pt[] {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  ctx.font = `${size}px ${family}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2 + size * 0.04);
  return rasterPoints(ctx.getImageData(0, 0, width, height).data, width, height);
}

function paint(canvas: HTMLCanvasElement, particles: readonly Particle[], width: number, height: number, t: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(width, height);
  const plot = (x: number, y: number, c: readonly number[]) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    img.data[i] = c[0];
    img.data[i + 1] = c[1];
    img.data[i + 2] = c[2];
    img.data[i + 3] = 255;
  };
  for (const p of particles) {
    // Pixels leave in a sweep from left to right, so the change reads like a wipe.
    const local = clamp01((t - (p.from.x / width) * 0.45 - p.seed * 0.08) / 0.47);
    if (!p.to) {
      if (local >= 1) continue;
      const x = p.from.x + (p.seed - 0.5) * 30 * local;
      const y = p.from.y + local * local * height * 0.6;
      if (local === 0 || inked(Math.round(x), Math.round(y), 1 - local)) plot(x, y, local > 0 ? YELLOW : INK);
      continue;
    }
    const e = easeInOut(local);
    const lift = Math.sin(Math.PI * e);
    const x = p.from.x + (p.to.x - p.from.x) * e + (p.seed - 0.5) * 36 * lift;
    const y = p.from.y + (p.to.y - p.from.y) * e - lift * (8 + p.seed * 18);
    plot(x, y, local > 0.04 && local < 0.96 ? YELLOW : INK);
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Draws one pixel shape dissolving into another as `progress` goes from 0 to 1. Pixels that
 * are travelling turn yellow; pixels with nowhere to go fall away as dithered dust.
 */
export function DissolveCanvas({
  width,
  height,
  build,
  progress,
  label,
  className = "",
}: {
  width: number;
  height: number;
  build: (family: string) => { from: Pt[]; to: Pt[] };
  progress: MotionValue<number>;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || !ref.current) return;
      const { from, to } = build(getComputedStyle(ref.current).fontFamily);
      particles.current = pairParticles(from, to);
      paint(ref.current, particles.current, width, height, progress.get());
    });
    return () => {
      cancelled = true;
    };
  }, [build, width, height, progress]);

  useMotionValueEvent(progress, "change", (t) => {
    if (ref.current) paint(ref.current, particles.current, width, height, t);
  });

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={`block h-auto w-full font-pixel [image-rendering:pixelated] ${className}`}
    />
  );
}
