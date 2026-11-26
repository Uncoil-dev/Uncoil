import { CREAM, INK, PALE, YELLOW, bridge, ground, landscape, pines, reticle, robot, signpost, type Px, type Scene } from "../pixel-world/pixels";
import { hash } from "../pixel-world/world";
import { GAP, HOLE_X, STOP_X, WORLD_W, beats, robotAt } from "./story";

export const journeyPixel = (w: number, h: number) => (w < 640 ? 3 : Math.max(3, Math.round(h / 175)));

/**
 * The short scroll journey at progress `p`: the prompt is pasted, the first trace stacks up and
 * Uncoil locks onto the missing plank. The plank stays an empty slot here (no red): the failure
 * was already shown in the hero and the break section, and the repair comes at the end.
 */
export function drawJourney(px: Px, p: number, seconds: number, prevX: { current: number }) {
  const b = beats(p);
  const rx = robotAt(p);
  const groundY = Math.round(px.h * (px.w < 160 ? 0.8 : 0.72));
  const anchor = px.w < 160 ? 0.3 : 0.5;
  const cam = Math.round(Math.max(0, Math.min(WORLD_W - px.w, rx - px.w * anchor)));
  const s: Scene = { px, cam, groundY, t: seconds };
  const X = (wx: number) => wx - cam;

  landscape(s, 0.86);
  pines(s, [[STOP_X[0] - 30, STOP_X[0] + 70], [STOP_X[1] - 40, STOP_X[1] + 90], [GAP.x0 - 40, GAP.x1 + 10], [WORLD_W - 90, WORLD_W]]);
  ground(s, [[GAP.x0, GAP.x1]], b.prompt >= 1 ? rx + 6 : -1, STOP_X[0] + 20);
  bridge(s, GAP.x0, GAP.x1, 1);

  signpost(px, 1, X(STOP_X[0] - 16), groundY);
  terminal(px, X(STOP_X[0] + 14), groundY, b.prompt, seconds);

  signpost(px, 2, X(STOP_X[1] - 30), groundY);
  tower(px, X(STOP_X[1] + 34), groundY - 4, b.drop, b.tower);

  signpost(px, 3, X(GAP.x0 - 26), groundY);
  const by = groundY - 2;
  if (b.scan > 0) {
    reticle(px, X(HOLE_X), by, 11, 3, b.scan);
    // Once locked, a dashed yellow outline marks where the missing plank belongs.
    if (b.scan >= 1 && Math.floor(seconds * 2) % 2 === 0) {
      for (let i = 0; i < 11; i += 2) {
        px.set(X(HOLE_X) + i, by, YELLOW);
        px.set(X(HOLE_X) + i, by + 2, YELLOW);
      }
    }
  }

  const moving = Math.abs(rx - prevX.current) > 0.05;
  prevX.current = rx;
  robot(px, X(Math.round(rx)), groundY - 3, moving ? Math.floor(seconds * 8) : 0, b.scan > 0 && b.scan < 1);
}

function terminal(px: Px, x: number, groundY: number, fill: number, seconds: number) {
  const w = 40;
  const h = 28;
  const top = groundY - h - 12;
  px.rect(x + 18, top + h, 4, 12, CREAM);
  px.rect(x + 12, groundY - 2, 16, 2, CREAM);
  px.rect(x, top, w, h, CREAM);
  px.rect(x + 2, top + 2, w - 4, h - 4, INK);
  const lines = [26, 18, 30, 22, 14];
  const shown = fill * lines.length;
  lines.forEach((len, i) => {
    const part = Math.max(0, Math.min(1, shown - i));
    if (part <= 0) return;
    px.rect(x + 5, top + 5 + i * 4, 1, 1, YELLOW);
    px.rect(x + 7, top + 5 + i * 4, Math.round(len * part), 1, CREAM);
  });
  const row = Math.min(lines.length - 1, Math.floor(shown));
  if (Math.floor(seconds * 2.5) % 2 === 0 && fill < 1) px.rect(x + 7 + Math.round(lines[row] * Math.max(0, Math.min(1, shown - row))), top + 4 + row * 4, 2, 3, YELLOW);
  if (fill >= 1) {
    for (let i = 0; i < 12; i += 2) px.set(x + w + 1 + i, groundY - 6 + Math.round(i / 4), YELLOW);
    px.rect(x + w - 8, top + h - 6, 4, 2, YELLOW);
  }
}

const BLOCKS = [44, 34, 24, 28, 34, 18];

function tower(px: Px, x: number, groundY: number, drop: number, build: number) {
  if (drop <= 0) return;
  if (drop < 1) {
    const y = Math.round(-10 + (groundY - 14) * drop * drop);
    for (let i = 1; i < 10; i++) px.dither(x + 10, y - i * 3, 6, 3, 0.6 - i * 0.07, PALE);
    px.rect(x + 9, y, 8, 8, YELLOW);
    return;
  }
  const n = build * BLOCKS.length;
  let y = groundY - 1;
  BLOCKS.forEach((bw, i) => {
    const part = Math.max(0, Math.min(1, n - i));
    if (part <= 0) return;
    const h = 7;
    const ox = Math.round((hash(i, 41) - 0.5) * 8);
    const fallY = Math.round((1 - part) * (1 - part) * -60);
    const bx = x + 13 - bw / 2 + ox;
    px.rect(bx, y - h + fallY, bw, h, CREAM);
    // Block four is the step that broke; it carries the yellow marker Uncoil puts on it.
    px.rect(bx + 2, y - h + 2 + fallY, 3, 3, i === 0 || i === 3 ? YELLOW : INK);
    px.rect(bx + 7, y - h + 3 + fallY, Math.round(bw * 0.4), 1, INK);
    px.rect(bx, y - 1 + fallY, bw, 1, INK);
    y -= h + 1;
  });
  if (build >= 1) px.rect(x + 12, y - 1, 2, 2, PALE);
}
