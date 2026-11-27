import assert from "node:assert/strict";
import test from "node:test";
import { squarify } from "./treemap.ts";

const area = (t: { w: number; h: number }) => t.w * t.h;

test("tile areas are proportional to values and fill the box exactly", () => {
  const tiles = squarify([6, 6, 4, 3, 2, 2, 1], (n) => n, 600, 400);
  assert.equal(tiles.length, 7);
  assert.ok(Math.abs(tiles.reduce((sum, t) => sum + area(t), 0) - 240_000) < 1e-6);
  for (const t of tiles) assert.ok(Math.abs(area(t) / 240_000 - t.item / 24) < 1e-9);
});

test("tiles stay inside the box and never overlap", () => {
  const tiles = squarify([9, 5, 5, 3, 3, 2, 1, 1], (n) => n, 500, 300);
  for (const t of tiles) assert.ok(t.x >= -1e-9 && t.y >= -1e-9 && t.x + t.w <= 500 + 1e-9 && t.y + t.h <= 300 + 1e-9);
  for (const [i, a] of tiles.entries()) for (const b of tiles.slice(i + 1)) {
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    assert.ok(overlapX <= 1e-9 || overlapY <= 1e-9);
  }
});

test("the biggest item comes first and gets the biggest tile; zero and invalid values are skipped", () => {
  const tiles = squarify([{ n: 1 }, { n: 10 }, { n: 0 }, { n: Number.NaN }, { n: 4 }], (t) => t.n, 300, 300);
  assert.deepEqual(tiles.map((t) => t.item.n), [10, 4, 1]);
  assert.ok(area(tiles[0]) > area(tiles[1]));
});

test("tiles are reasonably square and the result is deterministic", () => {
  const sizes = [8, 7, 6, 5, 4, 3, 2, 1];
  const tiles = squarify(sizes, (n) => n, 800, 500);
  for (const t of tiles) assert.ok(Math.max(t.w / t.h, t.h / t.w) < 4);
  assert.deepEqual(squarify(sizes, (n) => n, 800, 500), tiles);
});

test("an empty list or empty box gives no tiles", () => {
  assert.deepEqual(squarify([], (n: number) => n, 100, 100), []);
  assert.deepEqual(squarify([1], (n) => n, 0, 100), []);
});
