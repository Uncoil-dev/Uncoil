"use client";

import type { ReactNode } from "react";

export const ago = (ms: number | string) => {
  const t = typeof ms === "number" ? ms : Date.parse(ms);
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const abs = (ms: number | string) => new Date(ms).toLocaleString();

/** Page-wide motion rules. Bars grow in once; people who prefer less motion get none. */
export function AdminStyles() {
  return (
    <style>{`
      @keyframes adm-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      @keyframes adm-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      @keyframes adm-blink { 50% { opacity: .25; } }
      .adm-bar { transform-origin: bottom; animation: adm-grow .7s cubic-bezier(.2,.8,.2,1) both; }
      .adm-rise { animation: adm-rise .5s ease both; }
      .adm-live { animation: adm-blink 1.6s steps(2) infinite; }
      .adm-dither { background-image: radial-gradient(currentColor 1px, transparent 1.2px); background-size: 4px 4px; }
      @media (prefers-reduced-motion: reduce) { .adm-bar, .adm-rise, .adm-live { animation: none; } }
    `}</style>
  );
}

/** Pixel-bar chart: one bar per day. The left bars dissolve into dots, like the Uncoil mark. */
export function PixelBars({
  values, marks, labels, height = 120, tone = "yellow", unit = "",
}: { values: number[]; marks?: number[]; labels: string[]; height?: number; tone?: "yellow" | "cream"; unit?: string }) {
  const max = Math.max(1, ...values);
  const fill = tone === "yellow" ? "bg-[#f4d44d]" : "bg-[#eceae3]";
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={`Bar chart, ${values.length} days. ${values.map((v, i) => `${labels[i]}: ${v}${unit}`).join(", ")}`}>
        {values.map((v, i) => {
          const h = Math.max(v ? 4 : 2, Math.round((v / max) * height));
          const bad = marks?.[i] ?? 0;
          const badH = v ? Math.round((bad / v) * h) : 0;
          return (
            <div key={i} className="group relative flex flex-1 flex-col justify-end" style={{ height }} title={`${labels[i]} · ${v}${unit}${bad ? ` · ${bad} failed` : ""}`}>
              <div className="adm-bar relative w-full" style={{ height: h, animationDelay: `${i * 35}ms` }}>
                <div className={`absolute inset-0 ${v ? fill : "bg-current opacity-20"} ${i < 3 ? "adm-dither !bg-transparent text-[#f4d44d]" : ""}`} style={i < 3 && tone === "cream" ? { color: "#eceae3" } : undefined} />
                {badH ? <div className="absolute inset-x-0 bottom-0 bg-[repeating-linear-gradient(45deg,#090909_0_2px,transparent_2px_4px)]" style={{ height: badH }} /> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider opacity-55">
        <span>{labels[0]}</span><span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export function Panel({ title, hint, children, dark = true, className = "", right }: { title: string; hint?: string; children: ReactNode; dark?: boolean; className?: string; right?: ReactNode }) {
  return (
    <section className={`adm-rise border ${dark ? "border-[#090909] bg-[#090909] text-[#eceae3]" : "border-[#090909]/20 bg-[#f6f4ee] text-[#090909]"} p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-70">{title}</h2>
          {hint ? <p className="mt-1 text-[13px] opacity-60">{hint}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Tile({ label, value, sub, delay = 0 }: { label: string; value: ReactNode; sub?: string; delay?: number }) {
  return (
    <div className="adm-rise border border-[#090909] bg-[#090909] p-4 text-[#eceae3]" style={{ animationDelay: `${delay}ms` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">{label}</div>
      <div className="mt-2 font-pixel text-4xl leading-none text-[#f4d44d]">{value}</div>
      {sub ? <div className="mt-2 font-mono text-[11px] opacity-60">{sub}</div> : null}
    </div>
  );
}

const tones = {
  ok: "bg-[#090909] text-[#eceae3]",
  warn: "bg-[#f4d44d] text-[#090909]",
  bad: "bg-[#f4d44d] text-[#090909] ring-2 ring-inset ring-[#090909]",
  mute: "border border-[#090909]/25 text-[#090909]/60",
} as const;
export const pill = (text: string, tone: keyof typeof tones) => (
  <span className={`inline-block px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}>{tone === "bad" ? "! " : ""}{text}</span>
);
export const mono = (v: ReactNode) => <span className="font-mono text-[12px]">{v}</span>;
export const dim = (v: ReactNode) => <span className="font-mono text-[12px] text-[#090909]/55">{v}</span>;

export function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto border border-[#090909]/20 bg-[#f6f4ee]">
      <table className="w-full min-w-[420px] text-left text-[13px] text-[#090909]">
        <thead>
          <tr className="bg-[#090909] font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]">
            {head.map((h) => <th key={h} className="px-3 py-2.5 font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#090909]/10 last:border-0 hover:bg-[#fff4b5]">
              {r.map((c, j) => <td key={j} className="px-3 py-2.5 align-middle">{c}</td>)}
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={head.length} className="px-3 py-10 text-center text-[#090909]/55">{empty}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
