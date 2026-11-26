// The page's one pixel grid. Every pixel scene on the page draws with the same cell: 4 CSS px on
// phones, 5 on tablets and 6 on desktops. A cell is snapped to a whole number of device pixels,
// so at a 125% or 150% display scale every cell still covers the same count of screen pixels and
// no row or column comes out a pixel wider than its neighbours.

/** The cell size the page aims for at a viewport width, in CSS pixels. */
export const targetCell = (viewportW: number) => (viewportW < 640 ? 4 : viewportW < 1100 ? 5 : 6);

/** `target` CSS px rounded to a whole number of device pixels, given back in CSS px. */
export function snapCell(target: number, dpr: number) {
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  return Math.max(1, Math.round(target * ratio)) / ratio;
}

/** Rounds a CSS length down to whole cells. */
export const toCells = (css: number, cell: number) => Math.floor(css / cell + 1e-6);
