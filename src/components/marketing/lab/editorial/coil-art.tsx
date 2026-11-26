"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "framer-motion";
import { loopWhileVisible } from "@/components/marketing/landing/dither-ember";
import { hash01, inked } from "./art";

const W = 220;
const H = 150;
const INK = [9, 9, 9] as const;
const RED = [255, 77, 61] as const;
const YELLOW = [244, 212, 77] as const;
const TURNS = 7;
const COIL_END = 0.74; // share of the width where the spring has fully straightened into a line
const FAILED_TURN = 5; // zero-based: the sixth turn

/** Horizontal position, as a share of the canvas, of the middle of the failed turn. Used to place the HTML callout. */
export const turnX = (turn: number) => ((12 + ((turn + 0.5) / TURNS) * COIL_END * (W + 10)) / W) * 100;
export const FAILED_TURN_X = turnX(FAILED_TURN);
export const TURN_COUNT = TURNS;

/**
 * A dithered pixel spring that turns slowly and straightens into a clean line on the right.
 * Its sixth turn is snapped: the pixels around the break drift apart. The spring is the
 * agent run; uncoiling it into a line is what the product does. With `uncoil` (0..1) the
 * spring relaxes into a straight line; `healed` draws it without the break.
 */
export function CoilArt({ className = "", uncoil, healed = false }: { className?: string; uncoil?: MotionValue<number>; healed?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const img = ctx.createImageData(W, H);
    const zbuf = new Float32Array(W * H);

    const put = (x: number, y: number, z: number, c: readonly number[]) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      if (zbuf[i] > z) return;
      zbuf[i] = z;
      img.data[i * 4] = c[0];
      img.data[i * 4 + 1] = c[1];
      img.data[i * 4 + 2] = c[2];
      img.data[i * 4 + 3] = 255;
    };

    const draw = (ms: number) => {
      img.data.fill(0);
      zbuf.fill(-9);
      const phase = ms * 0.00045;
      const cy = 66;
      const relax = 1 - (uncoil?.get() ?? 0);
      const R0 = 40 * relax;

      // Ground shadow: a sparse dithered ellipse under the spring.
      for (let y = 118; y < 140; y++) {
        for (let x = 4; x < 180; x++) {
          const dx = (x - 88) / 86;
          const dy = (y - 129) / 9;
          const d = dx * dx + dy * dy;
          if (d < 1 && inked(x, y, (1 - d) * 0.34 * relax)) put(x, y, -5, INK);
        }
      }

      // A yellow pulse runs along the straight part of the wire, like a step streaming out.
      const start = COIL_END * relax;
      const pulse = start + ((ms * 0.00012) % 1) * (1 - start);
      const samples = 5200;
      for (let k = 0; k < samples; k++) {
        const s = k / samples;
        const x0 = 12 + s * (W + 10);
        if (s > COIL_END) {
          // The straightened tail: a crisp two-pixel line with a yellow pulse running out of the frame.
          const head = Math.abs(s - pulse) < 0.018;
          put(x0, cy, 1, head ? YELLOW : INK);
          put(x0, cy + 1, 1, head ? YELLOW : INK);
          continue;
        }
        const u = s / COIL_END;
        const radius = u < 0.78 ? R0 : R0 * Math.cos(((u - 0.78) / 0.22) * Math.PI / 2);
        const ang = u * TURNS * Math.PI * 2;
        const turn = Math.floor(u * TURNS);
        // The wire's cross-section is a circle in the y-z plane, seen from slightly above,
        // with a small sideways slant so the front and back strands separate.
        const a = ang + phase;
        const z = Math.sin(a);
        const px = x0 + z * radius * 0.34;
        const py = cy + radius * (Math.cos(a) * 0.95 + z * 0.3);
        const failed = !healed && turn === FAILED_TURN && u < 0.78;

        if (failed) {
          const t = u * TURNS - FAILED_TURN; // 0..1 through the failed turn
          if (t > 0.42 && t < 0.6) continue; // the break itself
          const near = Math.max(0, 1 - Math.abs(t - 0.51) / 0.32);
          if (near > 0) {
            // Pixels near the break come loose and drift up and away.
            const h = hash01(k);
            if (h < near * 0.85) {
              const drift = near * near * (12 + 34 * hash01(k + 7)) * (0.75 + 0.25 * Math.sin(ms * 0.0012 + h * 6));
              const dx = px + (hash01(k + 3) - 0.3) * drift;
              const dy = py - drift * 0.9 * hash01(k + 5);
              put(dx, dy, 2, RED);
              if (h < 0.35) {
                put(dx + 1, dy, 2, RED);
                put(dx, dy + 1, 2, RED);
                put(dx + 1, dy + 1, 2, RED);
              }
              continue;
            }
          }
        }

        const tone = failed ? 0.6 + 0.4 * ((z + 1) / 2) : 0.22 + 0.78 * ((z + 1) / 2);
        const r = 2.1 + z * 0.7;
        const colour = failed ? RED : relax < 0.12 && Math.abs(s - pulse) < 0.018 ? YELLOW : INK;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const d = Math.hypot(dx, dy) / r;
            if (d > 1) continue;
            const X = Math.round(px + dx);
            const Y = Math.round(py + dy);
            // A small paper-coloured glint on the front of the wire keeps it round.
            if (z > 0.8 && dx === -1 && dy === -1) continue;
            if (inked(X, Y, tone * (1 - d * d * 0.45))) put(X, Y, z, colour);
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    if (reduce) {
      draw(2200);
      const off = uncoil?.on("change", () => draw(2200));
      return () => off?.();
    }
    return loopWhileVisible(canvas, draw);
  }, [reduce, uncoil, healed]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      aria-hidden="true"
      className={`block h-auto w-full [image-rendering:pixelated] ${className}`}
    />
  );
}
