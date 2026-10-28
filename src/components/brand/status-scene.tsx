import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Shared artwork + frame for the 404 and "something went wrong" pages.
// A Dissolve-style trace: dithered bars stream in, then one step stops short
// and a blinking cursor marks where the trace broke.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const COLS = 48;
const ROW_H = 6;
const ROWS = [
  { w: 48, delay: 0 },
  { w: 30, delay: 0.25 },
  { w: 38, delay: 0.5 },
  { w: 16, delay: 0.75 },
  { w: 24, delay: 1.0 },
];

function rowPath(w: number, y0: number) {
  let d = "";
  const x0 = COLS - w;
  for (let y = 0; y < ROW_H; y++) {
    for (let x = x0; x < COLS; x++) {
      const f = (x - x0 + 0.5) / w;
      if (BAYER[y % 4][x % 4] / 16 < f * 1.9 - 0.15) d += `M${x} ${y0 + y}h1v1h-1z`;
    }
  }
  return d;
}

const PATHS = ROWS.map((r, i) => rowPath(r.w, i * (ROW_H + 3)));
const HEIGHT = ROWS.length * (ROW_H + 3) - 3;

function TraceArt({ broken }: { broken: boolean }) {
  return (
    <svg viewBox={`0 0 ${COLS + 6} ${HEIGHT}`} className="w-full" shapeRendering="crispEdges" aria-hidden="true">
      {PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="#f4d44d"
          className="status-bar"
          style={{ animationDelay: `${ROWS[i].delay}s`, opacity: broken && i === 3 ? 0.35 : 1 }}
        />
      ))}
      <rect x={COLS - ROWS[3].w - 4} y={3 * (ROW_H + 3)} width="3" height={ROW_H} fill="#f4d44d" className="status-cursor" />
    </svg>
  );
}

export function StatusScene({
  code,
  label,
  title,
  body,
  actions,
  broken = false,
  compact = false,
  detail,
}: {
  code: string;
  label: string;
  title: string;
  body: string;
  actions: ReactNode;
  broken?: boolean;
  compact?: boolean;
  detail?: ReactNode;
}) {
  return (
    <section className={cn("w-full max-w-5xl border border-black bg-[#090909] text-[#eceae3]", compact ? "" : "shadow-[10px_10px_0_#f4d44d]")}>
      <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-[#eceae3]/60">
        <span>uncoil / {label}</span>
        <span className="text-[#f4d44d]">{code}</span>
      </div>
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-6">
          <p className="status-code font-pixel text-[clamp(4.5rem,16vw,9rem)] leading-none tracking-tighter text-[#f4d44d]" style={{ fontFamily: "var(--font-pixel)" }}>
            {code}
          </p>
          <h1 className="font-pixel text-2xl uppercase leading-[1.1] tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-pixel)" }}>
            {title}
          </h1>
          <p className="max-w-md font-mono text-sm leading-6 text-[#eceae3]/65">{body}</p>
          {detail}
          <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>
        </div>
        <div className="border border-white/15 p-4 sm:p-6">
          <TraceArt broken={broken} />
        </div>
      </div>
      <style>{`
        .status-bar{animation:status-in .9s steps(8,end) both}
        .status-cursor{animation:status-blink 1s steps(1,end) infinite;animation-delay:1.4s}
        .status-code{animation:status-flicker 5s steps(1,end) infinite}
        @keyframes status-in{from{clip-path:inset(0 0 0 100%)}to{clip-path:inset(0 0 0 0)}}
        @keyframes status-blink{50%{opacity:0}}
        @keyframes status-flicker{0%,92%,96%,100%{opacity:1}94%{opacity:.55}}
        @media (prefers-reduced-motion:reduce){.status-bar,.status-cursor,.status-code{animation:none}}
      `}</style>
    </section>
  );
}

export const statusButton =
  "inline-flex items-center justify-center gap-2 border border-[#f4d44d] bg-[#f4d44d] px-5 py-3 font-mono text-xs uppercase tracking-widest text-black transition-colors hover:bg-[#fff4b5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d44d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909]";
export const statusButtonGhost =
  "inline-flex items-center justify-center gap-2 border border-[#eceae3]/40 px-5 py-3 font-mono text-xs uppercase tracking-widest text-[#eceae3] transition-colors hover:border-[#eceae3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d44d]";
