/**
 * Where a trace line should end so it "reaches" a hovered step.
 * Returns the y offset (px) of the step's branch tick, measured from the top of its column.
 */
export function traceReachY(item: HTMLElement): number {
  const col = item.closest<HTMLElement>("[data-trace-col]");
  if (!col) return 0;
  const tick = item.querySelector<HTMLElement>("[data-trace-tick]") ?? item;
  const c = col.getBoundingClientRect();
  const t = tick.getBoundingClientRect();
  return Math.max(0, t.top - c.top + t.height / 2);
}
