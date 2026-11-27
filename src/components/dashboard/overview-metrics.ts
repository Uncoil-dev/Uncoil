/** Caption under the overview Spend tile: the window the figure covers, or its source when analytics are unavailable. */
export function spendDetail(rangeDays: number, fromSavedSummary: boolean) {
  return fromSavedSummary ? "Saved summary" : `Last ${rangeDays} days`;
}
