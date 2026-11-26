// Pure timing for the hero demo: given a phase and elapsed milliseconds, which
// steps are running, done or failed, and what the cost counter reads.
export type DemoPhase = "break" | "fix";
export type RowStatus = "idle" | "running" | "ok" | "warn" | "fail" | "skipped";

export type DemoRow = { name: string; detail: string; status: RowStatus; progress: number; left: number; width: number };
export type DemoFrame = { rows: DemoRow[]; cost: number; costStopped: boolean; showCard: boolean; finished: boolean };

type RowDef = { name: string; left: number; width: number; start: number; end: number; final: RowStatus; detail: string };

const STEP = 480;
const FIX_STEP = 420;

const LAYOUT = [
  ["plan", 0, 10],
  ["docs.search", 10, 14],
  ["model", 24, 16],
  ["order.lookup", 40, 12],
  ["model", 52, 18],
  ["refund.issue", 70, 22],
  ["reply", 92, 8],
] as const;

const BREAK_FINAL: ReadonlyArray<readonly [RowStatus, string]> = [
  ["ok", "3 steps"],
  ["warn", "0 results"],
  ["warn", "guessed the policy"],
  ["ok", "140 ms"],
  ["ok", "412 tok"],
  ["fail", "timeout · 5000 ms"],
  ["skipped", "not reached"],
];

const FIX_FINAL: ReadonlyArray<readonly [RowStatus, string]> = [
  ["ok", "3 steps"],
  ["ok", "3 results"],
  ["ok", "used the policy"],
  ["ok", "140 ms"],
  ["ok", "412 tok"],
  ["ok", "201 · 310 ms"],
  ["ok", "sent"],
];

export const BREAK_COST = 0.42;
export const FIX_COST = 0.06;
/** How much the fix saves, for the card text. */
export const SAVED_COST = Math.round((BREAK_COST - FIX_COST) * 100) / 100;

const REFUND_FAIL_AT = 5 * STEP + 1500;

function defs(phase: DemoPhase): RowDef[] {
  const final = phase === "break" ? BREAK_FINAL : FIX_FINAL;
  const step = phase === "break" ? STEP : FIX_STEP;
  return LAYOUT.map(([name, left, width], i) => {
    const start = i * step;
    let end = start + step * 1.2;
    if (i === 5) end = phase === "break" ? REFUND_FAIL_AT : start + 500;
    // After the failure the reply row never runs; it only appears as skipped.
    if (phase === "break" && i === 6) return { name, left, width, start: REFUND_FAIL_AT, end: REFUND_FAIL_AT, final: final[i][0], detail: final[i][1] };
    return { name, left, width, start, end, final: final[i][0], detail: final[i][1] };
  });
}

export function phaseTimes(phase: DemoPhase) {
  const rows = defs(phase);
  const costEnd = phase === "break" ? REFUND_FAIL_AT : rows[6].end;
  const cardAt = costEnd + 400;
  return { costEnd, cardAt, end: cardAt + 500 };
}

export function frameAt(phase: DemoPhase, ms: number): DemoFrame {
  const { costEnd, cardAt, end } = phaseTimes(phase);
  const finalCost = phase === "break" ? BREAK_COST : FIX_COST;
  const rows = defs(phase).map((d): DemoRow => {
    const status: RowStatus = ms < d.start ? "idle" : ms < d.end ? "running" : d.final;
    const span = d.end - d.start;
    const progress = span === 0 ? (ms >= d.end ? 1 : 0) : Math.min(1, Math.max(0, (ms - d.start) / span));
    return { name: d.name, detail: status === "idle" || status === "running" ? "" : d.detail, status, progress, left: d.left, width: d.width };
  });
  const cost = Math.round(Math.min(1, Math.max(0, ms / costEnd)) * finalCost * 100) / 100;
  return { rows, cost, costStopped: ms >= costEnd, showCard: ms >= cardAt, finished: ms >= end };
}
