"use client";

import { useEffect, useRef } from "react";
import { pointAt, walkTime, type MapLayout } from "./map-layout";
import { CREAM, digit, hash, INK, LANDMARKS, PALE, Px, ridge, robot, sun, YELLOW } from "./pixels";

type Props = {
  layout: MapLayout;
  /** Pixel size in CSS pixels. */
  scale: number;
  /** 0 is the trailhead, 1-5 the stops. */
  target: number;
  /** Bumped on every successful copy so the robot can celebrate. */
  cheer: number;
  calm: boolean;
};

type Walk = { from: number; to: number; start: number; dur: number; arrived: number };

/**
 * The map itself: sky, sun, ridges, the trail and the robot. It animates only while mounted, so
 * closing the menu stops it, and with reduced motion it draws one still frame per change.
 */
export function MapCanvas({ layout, scale, target, cheer, calm }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const walk = useRef<Walk | null>(null);
  const cheerAt = useRef(-10);
  const born = useRef(0);
  const state = useRef({ layout, scale, target, calm });

  useEffect(() => {
    state.current = { layout, scale, target, calm };
  });

  useEffect(() => {
    if (cheer > 0) cheerAt.current = performance.now() / 1000;
  }, [cheer]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let px: Px | null = null;
    if (!born.current) born.current = performance.now() / 1000;

    const frame = () => {
      const { layout: L, scale: s, target: tgt, calm: still } = state.current;
      const bw = Math.ceil(L.w / s);
      const bh = Math.ceil(L.h / s);
      if (!px || px.w !== bw || px.h !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        canvas.style.width = `${bw * s}px`;
        canvas.style.height = `${bh * s}px`;
        px = new Px(bw, bh);
      }
      const now = performance.now() / 1000;
      const t = still ? 0 : now - born.current;
      const goal = L.at[tgt] ?? 0;
      let w = walk.current;
      if (!w) w = walk.current = { from: goal, to: goal, start: -10, dur: 0, arrived: -10 };
      if (w.to !== goal) {
        const at = robotS(w, now);
        const dur = still ? 0 : walkTime(Math.abs(goal - at));
        w = walk.current = { from: at, to: goal, start: now, dur, arrived: now + dur };
      }
      draw(px, L, s, w, now, t, tgt, still ? -10 : cheerAt.current, still);
      px.blit(ctx);
      if (!still) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [layout, scale, target, calm, cheer]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 block [image-rendering:pixelated]" />;
}

function robotS(w: Walk, now: number) {
  if (w.dur <= 0) return w.to;
  const k = Math.min(1, Math.max(0, (now - w.start) / w.dur));
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  return w.from + (w.to - w.from) * e;
}

function draw(px: Px, L: MapLayout, s: number, w: Walk, now: number, t: number, target: number, cheerAt: number, still: boolean) {
  const b = (v: number) => Math.round(v / s);
  const far = L.points[5];
  const horizon = b(far.y) + 3;
  px.clear(INK);

  // Stars drift slowly left and twinkle; a shooting star crosses every nine seconds.
  for (let i = 0; i < 46; i++) {
    const x = (((hash(i, 3) * px.w - t * (0.6 + hash(i, 5))) % px.w) + px.w) % px.w;
    const y = Math.floor(hash(i, 7) * (horizon - 6));
    if (hash(i + Math.floor(t * 1.4), 11) > 0.92) continue;
    px.set(x, y, hash(i, 13) > 0.8 ? PALE : CREAM);
  }
  const shoot = t % 9;
  if (!still && shoot < 0.7) {
    const k = shoot / 0.7;
    const sx = px.w * (0.9 - k * 0.6);
    const sy = horizon * (0.1 + k * 0.25);
    for (let j = 0; j < 7; j++) px.set(sx + j, sy - j * 0.4, j < 2 ? PALE : CREAM);
  }

  // The sun sits on the far ridge, right behind the last stop.
  const r = Math.max(9, Math.min(24, Math.round(px.w * 0.15)));
  sun(px, b(far.x) + Math.round(r * 0.7), horizon - Math.round(r * 0.35), r);
  ridge(px, horizon + 4, Math.max(6, px.h * 0.05), 0.05, 21, true);

  // Small pines dotted over the slope wherever the trail and the signs leave room.
  for (let i = 0; i < 40; i++) {
    const x = 6 + hash(i, 81) * (L.w - 12);
    const y = L.points[5].y + 20 + hash(i, 83) * (L.h - L.points[5].y - 30);
    if (L.signs.some((g) => x > g.x - 8 && x < g.x + g.w + 8 && y > g.y - 4 && y < g.y + g.h + 34)) continue;
    if (L.path.pts.some((q) => Math.abs(q.x - x) < 7 * s && Math.abs(q.y - y) < 9 * s)) continue;
    if (L.points.some((q) => Math.abs(q.x - x) < 24 * s && Math.abs(q.y - y) < 14 * s)) continue;
    const tx = b(x);
    const ty = b(y);
    for (let j = 0; j < 6; j++) {
      const half = j >> 1;
      px.set(tx - half, ty - 6 + j, CREAM);
      px.set(tx + half, ty - 6 + j, CREAM);
    }
    px.set(tx, ty, CREAM);
  }

  // The trail: stones every few pixels, lit yellow where the robot has walked. On open the
  // stones lay themselves out from the trailhead up.
  const rs = robotS(w, now);
  const total = L.path.len[L.path.len.length - 1];
  const laid = still ? total : Math.min(1, t / 0.7) * total;
  const gap = 4 * s;
  for (let d = 0; d <= laid; d += gap) {
    const q = pointAt(L.path, d);
    px.rect(b(q.x) - 1, b(q.y), 2, 2, d <= rs ? YELLOW : CREAM);
  }

  // Trailhead: a lit start pad and a little 00 signpost, like the numbered posts on the homepage.
  const h0 = L.points[0];
  const hx = b(h0.x);
  const hy = b(h0.y);
  px.rect(hx - 7, hy + 1, 15, 2, YELLOW);
  px.rect(hx + 12, hy - 6, 1, 8, CREAM);
  px.rect(hx + 8, hy - 13, 9, 8, CREAM);
  px.rect(hx + 9, hy - 12, 7, 6, INK);
  digit(px, 0, hx + 9, hy - 11, YELLOW);
  digit(px, 0, hx + 13, hy - 11, YELLOW);

  // Each stop: a pad, a post up to its sign, and a landmark on the inner side.
  for (let k = 1; k <= 5; k++) {
    const p = L.points[k];
    const sign = L.signs[k - 1];
    const left = L.sides[k] === "left";
    const gx = b(p.x);
    const gy = b(p.y);
    const post = gx + (left ? -4 : 4);
    const cy = b(sign.y + sign.h / 2);
    px.rect(gx - 7, gy + 1, 15, 2, k === target ? YELLOW : CREAM);
    px.rect(post, cy, 1, gy - cy + 1, CREAM);
    px.rect(left ? b(sign.x + sign.w) : post, cy, Math.abs(post - (left ? b(sign.x + sign.w) : b(sign.x))) + 1, 1, CREAM);
    const mark = LANDMARKS[k - 1];
    const mx = left ? gx + 9 : gx - 9 - mark[0].length;
    // The stop the robot reaches lights up; the terminal's cursor blinks while it is there.
    const lit = k === target && w.to === L.at[k] && now >= w.arrived;
    const blink = !still && Math.floor(now * 2.5) % 2 === 0;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]] as const) px.sprite(mark, mx + dx, gy - mark.length + dy, { C: INK, Y: INK });
    px.sprite(mark, mx, gy - mark.length, { C: lit ? YELLOW : CREAM, K: INK, Y: lit ? (blink && k === 3 ? INK : PALE) : YELLOW });
  }

  // The robot: walks the trail, hops when it arrives, and waves when the prompt is copied.
  const q = pointAt(L.path, rs);
  const moving = rs !== w.to;
  const since = now - w.arrived;
  const cheering = now - cheerAt < 1.1;
  let lift = 0;
  if (!still && !moving && since >= 0 && since < 0.32) lift = Math.sin((since / 0.32) * Math.PI) * 5;
  if (cheering) lift = Math.abs(Math.sin(((now - cheerAt) / 0.55) * Math.PI)) * 6;
  const face = moving ? q.dir < 0 : L.sides[target] === "right";
  robot(px, b(q.x), b(q.y) + 1, moving ? Math.floor(now * 12) : 0, face, lift, cheering);

  // A speech bubble with a tick while the robot celebrates a copied prompt.
  if (cheering) {
    const rx = b(q.x) + (face ? -16 : 6);
    const ry = b(q.y) - 26 - Math.round(lift);
    px.rect(rx - 1, ry - 1, 12, 10, INK);
    px.rect(rx, ry, 10, 8, CREAM);
    px.rect(face ? rx + 8 : rx, ry + 8, 2, 2, CREAM);
    for (const [cx, cy] of [[2, 4], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1]] as const) px.set(rx + cx, ry + cy, INK);
  }

  // Arrival sparks around the robot.
  if (!still && !moving && since >= 0 && since < 0.5) {
    const k = since / 0.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = 6 + k * 10;
      px.set(b(q.x) + Math.cos(a) * d, b(q.y) - 7 + Math.sin(a) * d * 0.7, i % 2 ? YELLOW : PALE);
    }
  }
}
