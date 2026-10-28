import { cn } from "@/lib/utils";

// The Dissolve mark: three right-aligned bars on a 50x38 pixel grid. Each bar
// fades in from dithered pixels on the left, like a step streaming into a trace.
// Source files and the generator live in public/logos/uncoil/.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const BARS = [
  { y: 0, w: 50 },
  { y: 14, w: 26 },
  { y: 28, w: 18 },
];

function buildPath(dissolve: boolean) {
  let d = "";
  for (const { y: y0, w } of BARS) {
    const x0 = 50 - w;
    if (!dissolve) {
      d += `M${x0} ${y0}h${w}v10h-${w}z`;
      continue;
    }
    for (let y = y0; y < y0 + 10; y++) {
      for (let x = x0; x < 50; x++) {
        const f = (x - x0 + 0.5) / w;
        if (BAYER[y % 4][x % 4] / 16 < f * 1.9 - 0.15) d += `M${x} ${y}h1v1h-1z`;
      }
    }
  }
  return d;
}

const DISSOLVE_PATH = buildPath(true);
const SOLID_PATH = buildPath(false);

/**
 * Tracify icon. `solid` is the small-size version (browser tabs, tiny UI)
 * where the dithered pixels would blur together.
 */
export function TracifyMark({ className, solid = false }: { className?: string; solid?: boolean }) {
  return (
    <svg viewBox="0 0 50 38" className={cn("h-[0.76em] w-auto", className)} shapeRendering="crispEdges" aria-hidden="true">
      <path d={solid ? SOLID_PATH : DISSOLVE_PATH} fill="#f4d44d" />
    </svg>
  );
}
