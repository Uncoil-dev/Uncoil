// The pixel night world from the new homepage, cut down to a strip that fits above the console
// output, plus the robot as a prompt avatar. Built as SVG paths once, so it costs nothing to show.

import styles from "./console.module.css";

const hash = (n: number, seed = 1) => {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise = (x: number, seed = 1) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dith = (x: number, y: number, d: number) => d > BAYER[(y & 3) * 4 + (x & 3)];
const px = (x: number, y: number, w = 1) => `M${x} ${y}h${w}v1h-${w}z`;

export const STRIP_W = 300;
export const STRIP_H = 72;
const ROBOT_X = 112;

function ridgeTop(x: number, base: number, amp: number, freq: number, seed: number) {
  return Math.round(base - amp * (0.6 * noise(x * freq, seed) + 0.3 * noise(x * freq * 2.7, seed + 1) + 0.1 * noise(x * freq * 7, seed + 2)));
}

function buildStrip() {
  let cream = "";
  let yellow = "";
  let pale = "";
  const ridges: { ink: string; crest: string }[] = [];
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(hash(i, 3) * STRIP_W);
    const y = Math.floor(hash(i, 7) * 44);
    if (x < 136 && y < 24) continue;
    if (hash(i, 13) > 0.78) pale += px(x, y);
    else cream += px(x, y);
  }
  // Banded sun, low on the right, its lower half cut into bars like the homepage sun.
  const r = 17;
  const cx = 184;
  const cy = 38;
  for (let y = -r; y <= r; y++) {
    if (y > -r * 0.15 && (y + r) % 5 < 1 + Math.floor(((y + r * 0.15) / r) * 3)) continue;
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      if (d > 0.86 && dith(cx + x, cy + y, 0.5)) pale += px(cx + x, cy + y);
      else yellow += px(cx + x, cy + y);
    }
  }
  // Two ridges: the far one hides the sun's base, the near one is where the robot stands.
  for (const [base, amp, freq, seed] of [
    [61, 14, 0.028, 21],
    [STRIP_H - 1, 9, 0.05, 5],
  ] as const) {
    let ink = "";
    let crest = "";
    for (let x = 0; x < STRIP_W; x++) {
      const top = x > ROBOT_X - 6 && x < ROBOT_X + 6 && seed === 5 ? ridgeTop(ROBOT_X, base, amp, freq, seed) : ridgeTop(x, base, amp, freq, seed);
      ink += `M${x} ${top}h1v${STRIP_H - top}h-1z`;
      crest += px(x, top);
      for (let d = 1; d < 4; d++) if (dith(x, top + d, (seed === 5 ? 0.5 : 0.3) - d * 0.14)) crest += px(x, top + d);
    }
    ridges.push({ ink, crest });
  }
  return { cream, yellow, pale, ridges, ground: ridgeTop(ROBOT_X, STRIP_H - 1, 9, 0.05, 5) };
}

const STRIP = buildStrip();

const ROBOT = [
  "....Y.....",
  "....C.....",
  ".CCCCCCCC.",
  ".CKKKKKKC.",
  ".CKEKKEKC.",
  ".CKKKKKKC.",
  ".CCCCCCCC.",
  "...CCCC...",
  ".CCCCCCCC.",
  "C.CCYCCC.C",
  "...CCCC...",
  "...C..C...",
  "..CC..CC..",
];

function robotPaths() {
  const out: Record<string, string> = { C: "", Y: "", E: "" };
  ROBOT.forEach((row, y) => [...row].forEach((c, x) => c in out && (out[c] += px(x, y))));
  return out;
}
const R = robotPaths();

/** The robot sprite. `look` shifts its eyes one pixel towards the text being typed. */
export function Robot({ className, look = false, x = 0, y = 0 }: { className?: string; look?: boolean; x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <path d={R.C} fill="#eceae3" />
        <path d={R.Y} fill="#f4d44d" className={styles.antenna} />
        <g transform={look ? "translate(1 0)" : undefined}>
          <path d={R.E} fill="#f4d44d" className={styles.eyes} />
        </g>
      </g>
    </g>
  );
}

export function RobotAvatar({ look, className }: { look: boolean; className?: string }) {
  return (
    <svg viewBox="-1 -1 12 15" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <Robot look={look} />
    </svg>
  );
}

export function NightStrip({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${STRIP_W} ${STRIP_H}`} preserveAspectRatio="xMidYMax slice" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path d={STRIP.cream} fill="#eceae3" fillOpacity="0.85" className={styles.stars} />
      <path d={STRIP.pale} fill="#fff4b5" />
      <path d={STRIP.yellow} fill="#f4d44d" />
      {STRIP.ridges.map((r, i) => (
        <g key={i}>
          <path d={r.ink} fill="#090909" />
          <path d={r.crest} fill="#eceae3" />
        </g>
      ))}
      <Robot x={ROBOT_X - 5} y={STRIP.ground - ROBOT.length} className={styles.bob} />
    </svg>
  );
}
