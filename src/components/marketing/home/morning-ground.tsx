"use client";

import { useRef } from "react";
import { useGridCanvas } from "./use-grid";
import { drawGround, type GroundSpec } from "./morning";

/**
 * A strip of the morning landscape on the page grid. Its height is a whole number of cells, taken
 * from the same breakpoints as the grid, so the strip never sits on a half cell. Static art.
 */
export function MorningGround({ rows, className = "", ...spec }: GroundSpec & { rows: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useGridCanvas(ref, ({ px }) => drawGround(px, spec), { still: true, redraw: `${spec.glow}:${spec.hills}:${spec.stones ?? false}:${spec.pines ?? false}:${spec.sun ?? false}` });
  return (
    <div aria-hidden="true" className={`pointer-events-none overflow-hidden [--c:4px] min-[640px]:[--c:5px] min-[1100px]:[--c:6px] ${className}`} style={{ height: `calc(${rows} * var(--c))` }}>
      <canvas ref={ref} className="block [image-rendering:pixelated]" />
    </div>
  );
}
