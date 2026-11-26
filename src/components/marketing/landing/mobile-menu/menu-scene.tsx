"use client";

import { useEffect, useRef, useState } from "react";
import { Px, drawScene } from "./pixel-scene";

const PIXEL = 4;
const LAP_SECONDS = 16;

/**
 * The night strip above the menu's buttons: the robot walks the path and lights the stones it
 * passes. It first draws on the frame after the menu opens, so opening never waits on it, and it
 * stops drawing when the menu closes (unmount). With `still` it draws one frame and stays put.
 */
export function MenuScene({ still }: { still: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;
    let px: Px | null = null;
    let raf = 0;
    const start = performance.now();

    const render = () => {
      if (!px) return;
      const seconds = (performance.now() - start) / 1000;
      drawScene(px, still ? 0.42 : (0.1 + seconds / LAP_SECONDS) % 1, seconds, !still);
      px.blit(ctx);
    };
    const resize = () => {
      const lw = Math.ceil(parent.clientWidth / PIXEL);
      const lh = Math.ceil(parent.clientHeight / PIXEL);
      if (!lw || !lh) return;
      canvas.width = lw;
      canvas.height = lh;
      canvas.style.width = `${lw * PIXEL}px`;
      canvas.style.height = `${lh * PIXEL}px`;
      px = new Px(lw, lh);
      render();
    };
    const loop = () => {
      render();
      if (!still) raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(resize);
    raf = requestAnimationFrame(() => {
      ro.observe(parent);
      resize();
      setReady(true);
      if (!still) raf = requestAnimationFrame(loop);
    });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [still]);

  return <canvas ref={canvasRef} className={`absolute bottom-0 left-0 block transition-opacity duration-300 [image-rendering:pixelated] ${ready ? "opacity-100" : "opacity-0"}`} />;
}
