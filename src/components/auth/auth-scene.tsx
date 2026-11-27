"use client";

import { useRef, type RefObject } from "react";
import { bridgeArt, gantrySign, groundArt, robotInFront, stoneSign } from "@/components/marketing/home/hero-art";
import { CREAM, INK, YELLOW, flag, pines, type Scene } from "@/components/marketing/home/pixels";
import { clearStars, landscapeUnder, toBuffer, useCopyBoxes } from "@/components/marketing/home/sky";
import { useCalm } from "@/components/marketing/home/use-calm";
import { useGridCanvas, type Frame } from "@/components/marketing/home/use-grid";
import { signInBeat, signUpBeat, stopStones } from "./auth-scene-beats";

export type AuthMode = "sign-in" | "sign-up";

type Props = {
  mode: AuthMode;
  /** The phone band: a short strip with the path only. */
  band?: boolean;
  /** CSS px kept clear below the ground line for HTML text. */
  reserve?: number;
  /** The element the scene fills; its `[data-clear]` text keeps the sky and hills clear behind it. */
  sceneRef?: RefObject<HTMLElement | null>;
  /** Called with the lit sign-up stop (0-2) or null whenever it changes. */
  onActive?: (stop: number | null) => void;
  /** Called with the middle of each sign-up stop's sign, as a fraction of the scene width. */
  onStops?: (centres: readonly number[]) => void;
};

/**
 * The night-time pixel path behind the auth form, drawn on the homepage's pixel grid with its
 * stones, signs, bridge and robot. Sign-up shows the robot at the start of the path with the three
 * stops ahead of it; sign-in shows it crossing the repaired bridge home.
 */
export function AuthScene({ mode, band = false, reserve = 0, sceneRef, onActive, onStops }: Props) {
  const still = useCalm();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noScene = useRef<HTMLElement | null>(null);
  const copy = useCopyBoxes(sceneRef ?? noScene);
  const lastActive = useRef<number | null | undefined>(undefined);
  const lastStops = useRef("");

  useGridCanvas(
    canvasRef,
    ({ px, scale, seconds }: Frame) => {
      const groundY = band ? px.h - 7 : px.h - Math.ceil(reserve / scale);
      const s: Scene = { px, cam: 0, groundY, t: seconds };
      const words = band ? [] : toBuffer(copy.current, scale, 6);
      landscapeUnder(s, band && mode === "sign-up" ? 0.44 : band ? 0.9 : 0.8, band ? 0.5 : 0.75, words);
      clearStars(px, words);

      if (mode === "sign-up") {
        const beat = signUpBeat(seconds, still);
        const stones = stopStones(px.w);
        const wait = stones[0] - 18;
        const rx = Math.round(-8 + (wait + 8) * beat.walk);
        if (!band) pines(s, [[-20, wait + 10], ...stones.map((x) => [x - 8, x + 20] as const)], 1);
        // The stones ahead of the robot light up to the stop that is lit, or all the way when still.
        const litUntil = still ? stones[2] + 12 : beat.active === null ? -1 : stones[beat.active] + 12;
        groundArt(s, [], (wx) => (wx >= rx + 4 && wx < litUntil ? YELLOW : undefined));
        stones.forEach((x, i) => stoneSign(px, i + 1, x, groundY, beat.active !== null && i <= beat.active ? "lit" : "plain"));
        robotInFront(px, rx, groundY - 3, beat.walking ? Math.floor(seconds * 8) : 0);
        if (beat.active !== lastActive.current) {
          lastActive.current = beat.active;
          onActive?.(beat.active);
        }
        const centres = stones.map((x) => (x + 5.5) / px.w);
        const key = centres.join();
        if (key !== lastStops.current) {
          lastStops.current = key;
          onStops?.(centres);
        }
      } else {
        const beat = signInBeat(seconds, still);
        const gap0 = Math.round(px.w * (band ? 0.36 : 0.42));
        const gap1 = gap0 + 36;
        const plankX = gap0 + 12;
        const goal = Math.round(px.w * (band ? 0.86 : 0.82));
        const from = gap0 - 14;
        const rx = Math.round(from + (goal - 10 - from) * beat.cross);
        if (!band) pines(s, [[gap0 - 16, gap1 + 6], [goal - 14, goal + 30]], 1);
        // The path the robot has walked is lit, as on the homepage once a run passes.
        const walked = (x: number) => (x < rx + 6 ? YELLOW : CREAM);
        groundArt(s, [[gap0, gap1]], (wx) => (wx < rx + 6 ? YELLOW : undefined));
        bridgeArt(px, gap0, gap1, groundY, -1, () => CREAM, walked);
        // The plank Uncoil rebuilt stays yellow, under step 06's lit sign.
        px.rect(plankX, groundY - 2, 11, 3, YELLOW);
        if (!band) gantrySign(px, plankX, gap1, groundY, "lit");
        flag(px, goal, groundY - 3, beat.flag);
        const onBridge = rx - 5 >= gap0 && rx + 4 < gap1;
        robotInFront(px, rx, groundY - (onBridge ? 2 : 3), beat.walking ? Math.floor(seconds * 8) : 0);
      }

      // Below the ground line the scene is plain night, so the HTML text there sits on solid black.
      if (!band) px.rect(0, groundY + 5, px.w, px.h, INK);
      // The seam with the cream form dissolves pixel by pixel, like the logo.
      if (band) for (let j = 0; j < 4; j++) px.dither(0, px.h - 1 - j, px.w, 1, 1 - j / 4, CREAM);
      else for (let i = 0; i < 4; i++) px.dither(i, 0, 1, px.h, 1 - i / 4, CREAM);
    },
    { still },
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
    </div>
  );
}
