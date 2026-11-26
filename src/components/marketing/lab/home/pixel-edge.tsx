"use client";

import { useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { EDGE, cellsPath, edgeCells, type EdgeShape } from "./story";
import { useCalm } from "./use-calm";
import { useCell } from "./use-grid";

type Props = {
  /** Colour of the section above. */
  from: string;
  /** Colour of the section below; it rises into the one above as pixel ground. */
  to: string;
  shape?: EdgeShape;
  seed?: number;
  /** A few yellow pixels caught on the horizon, used once on the page. */
  sparks?: boolean;
};

/**
 * The seam between two sections: the next section's colour rises as stepped pixel ground with
 * an ordered-dither fringe and loose pixels drifting off it. While it scrolls past, the loose
 * pixels and the fringe drift at different speeds, a whole cell at a time, so the seam reads as
 * one colour dissolving into the other rather than a hard cut. It is drawn on the page grid: one
 * cell is the same size as a pixel in the scenes, and the art crops at the right on narrow screens.
 */
export function PixelEdge({ from, to, shape = "hills", seed = 1, sparks = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useCalm();
  const cell = useCell();
  const { solid, dither, loose, spark } = useMemo(() => {
    const cells = edgeCells(shape, seed);
    // Sparks sit on the three highest fringe cells, the way the hero's sun catches the ridge.
    const tops = [...cells.dither].sort((a, b) => a[1] - b[1]).filter((_, i) => i % 7 === 0).slice(0, 3);
    return { solid: cellsPath(cells.solid, 1), dither: cellsPath(cells.dither, 1), loose: cellsPath(cells.loose, 1), spark: cellsPath(tops, 1) };
  }, [shape, seed]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // In viewBox units, which are cells, rounded so the drift moves whole cells.
  const looseY = useTransform(scrollYProgress, (p) => Math.round(5 - p * 9));
  const fringeY = useTransform(scrollYProgress, (p) => Math.round(1 - p * 2));
  const h = EDGE.rows * cell;

  return (
    <div ref={ref} aria-hidden="true" data-edge className="relative -my-px overflow-hidden" style={{ backgroundColor: from, height: h }}>
      <svg viewBox={`0 0 ${EDGE.cols} ${EDGE.rows}`} width={EDGE.cols * cell} height={h} shapeRendering="crispEdges" className="absolute bottom-0 left-0 max-w-none">
        <motion.path d={loose} fill={to} style={{ y: reduce ? 0 : looseY }} />
        <motion.path d={dither} fill={to} style={{ y: reduce ? 0 : fringeY }} />
        <path d={solid} fill={to} />
        {/* Covers any gap where the fringe drifts above the solid ground. */}
        <rect x="0" y={EDGE.rows - 1} width={EDGE.cols} height={1} fill={to} />
        {sparks && <motion.path d={spark} fill="#f4d44d" style={{ y: reduce ? 0 : fringeY }} />}
      </svg>
    </div>
  );
}
