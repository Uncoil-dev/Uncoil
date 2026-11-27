"use client";

import { useRef, type RefObject } from "react";
import { CREAM, INK, YELLOW, bridge, flag, ground, landscape, pines, robot, signpost, type Clear, type Scene } from "./pixel/pixels";
import { usePixelCanvas, type Frame } from "./pixel/use-pixel-canvas";
import { STOP_FRACTIONS, signInBeat, signUpBeat } from "./scene";
import { useCalm } from "./use-calm";

export type AuthMode = "sign-in" | "sign-up";

const panelPixel = (w: number) => (w < 640 ? 4 : w < 1100 ? 5 : 6);
const bandPixel = () => 3;

type Props = {
  mode: AuthMode;
  /** The phone band: a short strip with the path only. */
  band?: boolean;
  /** CSS px kept clear below the ground line for HTML text. */
  reserve?: number;
  /** HTML text in the top-left of the scene that the art must stay out of. */
  clearRef?: RefObject<HTMLElement | null>;
  /** Called with the lit sign-up stop (0-2) or null whenever it changes. */
  onActive?: (stop: number | null) => void;
};

/** Measures the text box in scene pixels, relative to the canvas. */
function clearBox(canvas: HTMLCanvasElement | null, el: HTMLElement | null | undefined, scale: number): Clear {
  if (!canvas || !el) return null;
  const c = canvas.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: Math.ceil((r.right - c.left) / scale), y: Math.ceil((r.bottom - c.top) / scale) };
}

/**
 * The night-time pixel path behind the auth form. Sign-up shows the robot at the start of the
 * path with the three stops ahead of it; sign-in shows it crossing the repaired bridge home.
 */
export function AuthWorld({ mode, band = false, reserve = 0, clearRef, onActive }: Props) {
  const still = useCalm();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastActive = useRef<number | null | undefined>(undefined);

  usePixelCanvas(
    canvasRef,
    ({ px, scale, seconds }: Frame) => {
      const groundY = band ? px.h - 7 : px.h - Math.ceil(reserve / scale);
      const s: Scene = { px, cam: 0, groundY, t: seconds };
      const clear = band ? null : clearBox(canvasRef.current, clearRef?.current, scale);
      landscape(s, band && mode === "sign-up" ? 0.72 : band ? 0.9 : 0.8, band ? 0.5 : 0.75, clear);

      if (mode === "sign-up") {
        const beat = signUpBeat(seconds, still);
        const stops = STOP_FRACTIONS.map((f) => Math.round(px.w * f));
        const wait = stops[0] - 18;
        const rx = Math.round(-8 + (wait + 8) * beat.walk);
        if (!band) pines(s, [[-20, wait + 10], ...stops.map((x) => [x - 10, x + 10] as const)], 1);
        const litUntil = still ? stops[2] + 6 : beat.active === null ? -1 : stops[beat.active] + 6;
        ground(s, [], litUntil, rx + 4);
        stops.forEach((x, i) => signpost(px, i + 1, x, groundY - 2, beat.active !== null && i <= beat.active));
        robot(px, rx, groundY - 3, beat.walking ? Math.floor(seconds * 8) : 0);
        if (beat.active !== lastActive.current) {
          lastActive.current = beat.active;
          onActive?.(beat.active);
        }
      } else {
        const beat = signInBeat(seconds, still);
        const gap0 = Math.round(px.w * (band ? 0.36 : 0.42));
        const gap1 = gap0 + 36;
        const goal = Math.round(px.w * (band ? 0.86 : 0.82));
        const from = gap0 - 14;
        const rx = Math.round(from + (goal - 10 - from) * beat.cross);
        if (!band) pines(s, [[gap0 - 16, gap1 + 6], [goal - 14, goal + 30]], 1);
        ground(s, [[gap0, gap1]], rx + 6, 0);
        bridge(s, gap0, gap1, -1);
        // The plank Uncoil rebuilt stays yellow, and so does the rope above it.
        px.rect(gap0 + 12, groundY - 2, 11, 3, YELLOW);
        px.rect(gap0, groundY - 3, gap1 - gap0, 1, YELLOW);
        flag(px, goal, groundY - 3, beat.flag);
        robot(px, rx, groundY - 3, beat.walking ? Math.floor(seconds * 8) : 0);
      }

      // Below the ground line the scene is plain night, so the HTML text there sits on solid black.
      if (!band) px.rect(0, groundY + 5, px.w, px.h, INK);
      // The seam with the cream form dissolves pixel by pixel, like the logo.
      if (band) for (let j = 0; j < 4; j++) px.dither(0, px.h - 1 - j, px.w, 1, 1 - j / 4, CREAM);
      else for (let i = 0; i < 4; i++) px.dither(i, 0, 1, px.h, 1 - i / 4, CREAM);
    },
    { pixel: band ? bandPixel : panelPixel, still },
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
    </div>
  );
}
