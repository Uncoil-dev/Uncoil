"use client";

import { useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { EDGE, cellsPath, edgeCells, type EdgeShape } from "./story";
import { useCalm } from "./use-calm";

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
 * pixels and the fringe drift at different speeds, so the seam reads as one colour dissolving
 * into the other rather than a hard cut. Cells stay square at every width: the art is a fixed
 * 1440-wide grid that crops at the sides on narrow screens.
 */
export function PixelEdge({ from, to, shape = "hills", seed = 1, sparks = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useCalm();
  const { solid, dither, loose, spark } = useMemo(() => {
    const cells = edgeCells(shape, seed);
    // Sparks sit on the three highest fringe cells, the way the hero's sun catches the ridge.
    const tops = [...cells.dither].sort((a, b) => a[1] - b[1]).filter((_, i) => i % 7 === 0).slice(0, 3);
    return { solid: cellsPath(cells.solid), dither: cellsPath(cells.dither), loose: cellsPath(cells.loose), spark: cellsPath(tops) };
  }, [shape, seed]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const looseY = useTransform(scrollYProgress, [0, 1], [36, -28]);
  const fringeY = useTransform(scrollYProgress, [0, 1], [10, -6]);
  const w = EDGE.cols * EDGE.cell;
  const h = EDGE.rows * EDGE.cell;

  return (
    <div ref={ref} aria-hidden="true" data-edge className="relative -my-px h-[clamp(112px,13.4vw,192px)] overflow-hidden" style={{ backgroundColor: from }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" className="absolute inset-0 size-full">
        <motion.path d={loose} fill={to} style={{ y: reduce ? 0 : looseY }} />
        <motion.path d={dither} fill={to} style={{ y: reduce ? 0 : fringeY }} />
        <path d={solid} fill={to} />
        {/* Covers any sub-pixel gap where the fringe drifts above the solid ground. */}
        <rect x="0" y={h - EDGE.cell} width={w} height={EDGE.cell} fill={to} />
        {sparks && <motion.path d={spark} fill="#f4d44d" style={{ y: reduce ? 0 : fringeY }} />}
      </svg>
    </div>
  );
}
