"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Px } from "./pixels";

export type Frame = { px: Px; scale: number; seconds: number };

/**
 * Fits a low-resolution pixel buffer to the canvas parent at a whole-number scale and redraws it
 * every animation frame while it is on screen. With `still` set it draws once per resize.
 */
export function usePixelCanvas(canvasRef: RefObject<HTMLCanvasElement | null>, draw: (f: Frame) => void, { pixel, still }: { pixel: (w: number, h: number) => number; still: boolean }) {
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;
    let px: Px | null = null;
    let scale = 1;
    let raf = 0;
    let visible = true;
    const start = performance.now();

    const render = () => {
      if (!px) return;
      drawRef.current({ px, scale, seconds: (performance.now() - start) / 1000 });
      px.blit(ctx);
    };
    const loop = () => {
      raf = 0;
      render();
      if (visible && !still) raf = requestAnimationFrame(loop);
    };
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = parent;
      if (!w || !h) return;
      scale = pixel(w, h);
      const lw = Math.ceil(w / scale);
      const lh = Math.ceil(h / scale);
      canvas.width = lw;
      canvas.height = lh;
      canvas.style.width = `${lw * scale}px`;
      canvas.style.height = `${lh * scale}px`;
      px = new Px(lw, lh);
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !still) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    resize();
    if (!still) raf = requestAnimationFrame(loop);
    return () => {
      ro.disconnect();
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
    // `pixel` is a stable module-level function at every call site.
  }, [canvasRef, still, pixel]);
}
