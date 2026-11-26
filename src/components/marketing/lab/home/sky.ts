"use client";

import { useEffect, useRef, type RefObject } from "react";
import { CREAM, INK, PALE, YELLOW, dith, type Px, type Scene } from "../pixel-world/pixels";
import { hash, noise } from "../pixel-world/world";

/** A rectangle in buffer pixels. */
export type Box = { x: number; y: number; w: number; h: number };

// Colours are packed as signed ints but the buffer holds unsigned ones; compare like with like.
const DARK = INK >>> 0;

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Keeps a live list of the copy boxes in a scene (every `[data-clear]` element), in CSS pixels
 * relative to the scene, so the canvas can keep its sky clear behind the words.
 */
export function useCopyBoxes(sceneRef: RefObject<HTMLElement | null>) {
  const boxes = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const measure = () => {
      const origin = scene.getBoundingClientRect();
      boxes.current = [...scene.querySelectorAll<HTMLElement>("[data-clear]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    scene.querySelectorAll("[data-clear]").forEach((el) => ro.observe(el));
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [sceneRef]);
  return boxes;
}

/** CSS-pixel boxes to buffer boxes, grown by `pad` buffer pixels on every side. */
export function toBuffer(boxes: readonly { x: number; y: number; w: number; h: number }[], scale: number, pad = 2): Box[] {
  return boxes.map((b) => {
    const x = Math.floor(b.x / scale) - pad;
    const y = Math.floor(b.y / scale) - pad;
    return { x, y, w: Math.ceil((b.x + b.w) / scale) + pad - x, h: Math.ceil((b.y + b.h) / scale) + pad - y };
  });
}

/**
 * Removes stars behind copy. Stars are single pixels or pairs, so a lit pixel with at most one lit
 * neighbour is cleared; ridge lines (at least two lit neighbours) and the sun stay untouched.
 */
export function clearStars(px: Px, boxes: readonly Box[]) {
  const { w, h, buf } = px;
  for (const b of boxes) {
    const x1 = Math.min(w - 1, b.x + b.w);
    const y1 = Math.min(h - 1, b.y + b.h);
    for (let y = Math.max(1, b.y); y < y1; y++) {
      for (let x = Math.max(1, b.x); x < x1; x++) {
        const i = y * w + x;
        if (buf[i] === DARK) continue;
        let lit = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && buf[i + dy * w + dx] !== DARK) lit++;
        if (lit <= 1) buf[i] = INK;
      }
    }
  }
}

/** Highest row in columns `x0..x1` that holds a horizontal run of lit pixels (a ridge crest). */
export function crestTop(px: Px, x0: number, x1: number, below: number) {
  const { w, buf } = px;
  for (let y = 0; y < below; y++) {
    for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) {
      const i = y * w + x;
      if (buf[i] !== DARK && buf[i + 1] !== DARK) return y;
    }
  }
  return below;
}

/**
 * Where a callout box goes: above the ridge, beside its stem, clear of the copy and the sun.
 * Tries the left of the stem first, then the right. Returns the box in buffer pixels, or null
 * when there is no clean spot (the scene's status bar still reports the step).
 */
export function placeCallout(px: Px, stemX: number, below: number, size: { w: number; h: number }, avoid: readonly Box[]) {
  for (const x of [stemX - size.w + 1, stemX - 1]) {
    if (x < 1 || x + size.w > px.w - 1) continue;
    const bottom = crestTop(px, x - 1, x + size.w + 1, below) - 3;
    const box = { x, y: bottom - size.h, w: size.w, h: size.h };
    if (box.y >= 2 && !avoid.some((a) => overlaps(a, box))) return box;
  }
  return null;
}

/**
 * The pixel-world landscape (sky, stars, sun, two ridges) with the hills settled under the copy.
 * Where a ridge would climb into a copy box its height is scaled down, and it rises back to full
 * height over a few dozen columns, so the hills keep rolling everywhere else and the ridge line
 * stays one continuous stroke. Same drawing as `landscape` in the pixel world otherwise.
 */
export function landscapeUnder({ px, cam, groundY, t }: Scene, sunX: number, relief: number, boxes: readonly Box[]) {
  const { w, h } = px;
  const shape = (off: number, freq: number, seed: number) => (x: number) => {
    const wx = x + Math.round(off);
    return 0.6 * noise(wx * freq, seed) + 0.3 * noise(wx * freq * 2.7, seed + 1) + 0.1 * noise(wx * freq * 7, seed + 2);
  };
  const far = shape(cam * 0.2, 0.014, 21);
  const near = shape(cam * 0.5, 0.03, 5);

  // How much of the full relief each column may have so both crests stay below every copy box.
  const allowed = new Float32Array(w).fill(1);
  for (const b of boxes) {
    const limit = b.y + b.h + 3;
    for (let x = Math.max(0, b.x - 1); x < Math.min(w, b.x + b.w + 1); x++) {
      const farM = (groundY - limit) / (h * relief * (0.1 + 0.24 * far(x)));
      const nearM = (groundY - 3 - limit) / (h * 0.17 * relief * Math.max(0.01, near(x)));
      allowed[x] = Math.max(0, Math.min(allowed[x], farM, nearM));
    }
  }
  const RISE = 48; // columns from flattest to full height
  const m = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let v = 1;
    for (let d = -RISE; d <= RISE; d++) {
      const a = allowed[x + d];
      if (a !== undefined && a < 1) v = Math.min(v, a + (1 - a) * Math.pow(Math.abs(d) / RISE, 1.5));
    }
    m[x] = v;
  }

  px.clear();
  for (let i = 0; i < 70; i++) {
    const sx = Math.floor((((hash(i, 3) * (w + 400) - cam * 0.05) % (w + 40)) + w + 40) % (w + 40)) - 20;
    const sy = Math.floor(hash(i, 7) * groundY * 0.62);
    const tw = hash(i + Math.floor(t * 1.5), 11) > 0.93;
    if (!tw) px.set(sx, sy, hash(i, 13) > 0.8 ? PALE : CREAM);
  }
  const r = Math.round(Math.min(w * 0.11, h * 0.2));
  const cx = Math.round(w * sunX - cam * 0.14);
  const cy = Math.round(groundY - h * 0.2 - r * 0.6);
  for (let y = -r; y <= r; y++) {
    const band = y > -r * 0.15 && (y + r) % 5 < 1 + Math.floor(((y + r * 0.15) / r) * 3);
    if (band) continue;
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      px.set(cx + x, cy + y, d > 0.86 && dith(cx + x, cy + y, 0.5) ? PALE : YELLOW);
    }
  }
  ridge(px, cam * 0.2, (x) => groundY - h * 0.1 * relief * m[x], (x) => h * 0.24 * relief * m[x], far, 0.1, 21);
  ridge(px, cam * 0.5, () => groundY - 3, (x) => h * 0.17 * relief * m[x], near, 0.22, 5);
}

function ridge(px: Px, off: number, base: (x: number) => number, amp: (x: number) => number, n: (x: number) => number, dens: number, seed: number) {
  const thin = dens < 0.15;
  const topAt = (x: number) => Math.round(base(Math.max(0, Math.min(px.w - 1, x))) - amp(Math.max(0, Math.min(px.w - 1, x))) * n(x));
  let prev = topAt(-1);
  for (let x = 0; x < px.w; x++) {
    const wx = x + Math.round(off);
    const top = topAt(x);
    for (let y = top; y < base(x) + 6; y++) {
      const d = y - top;
      const on = d < 1 || y <= prev ? true : d < 4 ? dith(x, y, (thin ? 0.3 : 0.5) - d * 0.14) : hash(wx * 977 + y, seed) < dens * 0.08;
      px.set(x, y, on ? (thin && d > 0 && y > prev ? INK : CREAM) : INK);
    }
    prev = top;
  }
}
