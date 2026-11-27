"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Px } from "../pixel-world/pixels";
import { snapCell, targetCell } from "./grid";

export type Frame = { px: Px; scale: number; seconds: number };

const currentCell = () => snapCell(targetCell(window.innerWidth), window.devicePixelRatio || 1);

function onDensityChange(cb: () => void) {
  // A display-scale change (dragging the window to another screen, browser zoom) fires a resize,
  // but not always; the resolution query catches the rest.
  const media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  media.addEventListener("change", cb);
  window.addEventListener("resize", cb);
  return () => {
    media.removeEventListener("change", cb);
    window.removeEventListener("resize", cb);
  };
}

/** The page's cell size in CSS px, live. The server and first render use the desktop cell. */
export function useCell() {
  const [cell, setCell] = useState(6);
  useEffect(() => {
    let off = () => {};
    const update = () => {
      setCell(currentCell());
      off();
      off = onDensityChange(update);
    };
    update();
    return () => off();
  }, []);
  return cell;
}

/**
 * Fits a low-resolution pixel buffer to the canvas parent on the page grid and redraws it every
 * animation frame while it is on screen. With `still` set it draws once per resize. Each buffer
 * pixel covers a whole number of device pixels, so the browser's nearest-neighbour upscale never
 * has to split one.
 */
export function useGridCanvas(canvasRef: RefObject<HTMLCanvasElement | null>, draw: (f: Frame) => void, { still }: { still: boolean }) {
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
      scale = currentCell();
      const lw = Math.ceil(w / scale);
      const lh = Math.ceil(h / scale);
      if (!px || px.w !== lw || px.h !== lh || canvas.style.width !== `${lw * scale}px`) {
        canvas.width = lw;
        canvas.height = lh;
        canvas.style.width = `${lw * scale}px`;
        canvas.style.height = `${lh * scale}px`;
        px = new Px(lw, lh);
      }
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    const offDensity = onDensityChange(resize);
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
      offDensity();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canvasRef, still]);
}
