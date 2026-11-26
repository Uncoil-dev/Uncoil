// Pixel sprites for the trace menu, drawn as crisp SVG rects in the three brand colors.
// The robot is the one from the homepage concept; the sun is the banded sun from the same world.

const C = "#eceae3";
const K = "#090909";
const Y = "#f4d44d";

const ROBOT_TOP = [
  "....Y.....",
  "....C.....",
  ".CCCCCCCC.",
  ".CKKKKKKC.",
  ".CKYKKYKC.",
  ".CKKKKKKC.",
  ".CCCCCCCC.",
  "...CCCC...",
  ".CCCCCCCC.",
  "C.CCYCCC.C",
  "...CCCC...",
];
const LEGS = [
  ["...C..C...", "..CC..CC.."],
  ["....CC....", "...CC.C..."],
];
const FILL: Record<string, string> = { C, K, Y };

function rects(rows: readonly string[], dy = 0) {
  const out: { x: number; y: number; f: string }[] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => FILL[ch] && out.push({ x, y: y + dy, f: FILL[ch] })));
  return out;
}

const TOP = rects(ROBOT_TOP);
const LEG = LEGS.map((l) => rects(l, ROBOT_TOP.length));

/** 10x13 robot. Two leg frames alternate through the `walk` class while it moves. */
export function Robot({ className, legClass }: { className?: string; legClass?: [string, string] }) {
  return (
    <svg viewBox="0 0 10 13" className={className} shapeRendering="crispEdges" aria-hidden="true">
      {TOP.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width="1" height="1" fill={r.f} />
      ))}
      {LEG.map((frame, i) => (
        <g key={i} className={legClass?.[i]}>
          {frame.map((r) => (
            <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width="1" height="1" fill={r.f} />
          ))}
        </g>
      ))}
    </svg>
  );
}

// A setting sun: the top half of a disc with a dithered rim and ink bands cut through it,
// growing wider toward the horizon the way the homepage sun does.
const R = 12;
const BANDS = new Set([5, 8, 10]);
const SUN: { x: number; y: number }[] = [];
for (let y = 0; y < R; y++) {
  for (let x = 0; x <= 2 * R; x++) {
    const d = Math.hypot(x - R, y - R + 0.5);
    if (d > R + 0.3 || BANDS.has(y)) continue;
    if (d > R - 1.4 && (x + y) % 2 === 1) continue;
    SUN.push({ x, y });
  }
}

export function Sun({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${2 * R + 1} ${R}`} className={className} shapeRendering="crispEdges" aria-hidden="true">
      {SUN.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={Y} />
      ))}
    </svg>
  );
}

/** Pixel caret for a foldable step: points right, turns down when open. */
export function Caret({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 5 7" className={className} shapeRendering="crispEdges" aria-hidden="true">
      {[0, 1, 2, 3, 2, 1, 0].map((w, y) => (
        <rect key={y} x="0" y={y} width={w + 1} height="1" fill="currentColor" />
      ))}
    </svg>
  );
}

/** A tiny check mark in a cream speech block, shown over the robot after the prompt is copied. */
export function Bubble({ className }: { className?: string }) {
  const tick = [
    [2, 3],
    [3, 4],
    [4, 3],
    [5, 2],
    [6, 1],
  ];
  return (
    <svg viewBox="0 0 9 9" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="0" width="9" height="7" fill={C} />
      <rect x="2" y="7" width="2" height="1" fill={C} />
      <rect x="2" y="8" width="1" height="1" fill={C} />
      {tick.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={K} />
      ))}
    </svg>
  );
}
