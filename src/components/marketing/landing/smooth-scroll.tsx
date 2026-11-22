"use client";

import { useEffect } from "react";

/* Gentle inertia scroll for the landing page only. It moves the real page scroll,
   so the scroll-driven animations and the sticky nav keep working unchanged.
   Touch devices keep native scrolling; reduced-motion users get none of this. */
export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) return;

    let lenis: { raf: (time: number) => void; destroy: () => void } | undefined;
    let frame = 0;
    let cancelled = false;
    const onChange = () => query.matches && lenis?.destroy();

    // Lenis loads once the browser is idle, so it stays out of the first render.
    const start = async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 0.9, anchors: true });
      frame = requestAnimationFrame(function raf(time) {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      });
    };
    const hasIdle = "requestIdleCallback" in window;
    const idle = hasIdle ? window.requestIdleCallback(() => void start(), { timeout: 2000 }) : window.setTimeout(() => void start(), 1000);

    query.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      query.removeEventListener("change", onChange);
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);

  return null;
}
