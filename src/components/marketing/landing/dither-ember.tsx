"use client";

import { useEffect, useRef } from "react";

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const CELL = 4;

/** Yellow ordered-dither glow that rises from the bottom-left and drifts slowly. */
export function DitherEmber({ className = "", rgb = [244, 212, 77] }: { className?: string; rgb?: readonly [number, number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let img: ImageData;
    const [r, g, b] = rgb;

    const draw = (t: number) => {
      const d = img.data;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const x = i / w;
          const y = j / h;
          const drift = Math.sin(x * 7 + t) * 0.06 + Math.sin(y * 9 - t * 1.3) * 0.05;
          const glow = 0.62 * (1 - Math.hypot((x - 0.08 + drift * 0.5) * 1.7, y - 1.1 + drift));
          const v = glow + 0.05 * Math.sin(x * 40 + y * 30 + t * 2) * (1 - y);
          const on = v > (BAYER[j & 3][i & 3] + 0.5) / 16;
          const o = (j * w + i) * 4;
          d[o] = r;
          d[o + 1] = g;
          d[o + 2] = b;
          d[o + 3] = on ? 255 : 0;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    const resize = () => {
      w = Math.max(1, Math.ceil(canvas.clientWidth / CELL));
      h = Math.max(1, Math.ceil(canvas.clientHeight / CELL));
      canvas.width = w;
      canvas.height = h;
      img = ctx.createImageData(w, h);
      draw(0);
    };

    const loop = (ms: number) => {
      draw(ms / 1800);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!still) raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- colour is fixed for the life of the canvas
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full opacity-80 [image-rendering:pixelated] ${className}`} />;
}
