// The Compare view's numbers for each example case, worked out with the product's own comparison
// code from the two runs the page shows, so the totals and the "N of M differ" line can never
// drift from the rows underneath them. Both runs are fixed example data, so each case is worked
// out once.

import { alignSteps, totals, type AlignedRow, type DiffSpan } from "../../../lib/trace-diff.ts";
import type { Case } from "./cases.ts";
import type { ExampleSpan } from "./run-data.ts";

const asDiff = (run: readonly ExampleSpan[]): DiffSpan[] => run.map((s) => ({ ...s }));

export type Comparison = { ta: ReturnType<typeof totals>; tb: ReturnType<typeof totals>; rows: AlignedRow[]; differ: number };

const compared = new Map<string, Comparison>();

export function compare(c: Case): Comparison {
  let hit = compared.get(c.id);
  if (!hit) {
    const a = asDiff(c.run);
    const b = asDiff(c.fix.after);
    const rows = alignSteps(a, b);
    hit = { ta: totals(a), tb: totals(b), rows, differ: rows.filter((r) => r.kind !== "same").length };
    compared.set(c.id, hit);
  }
  return hit;
}
