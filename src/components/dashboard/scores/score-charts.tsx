"use client";

import { useRef, useState } from "react";
import type { Bucket, DayPoint } from "@/lib/score-utils";

const W = 760;
const H = 250;
const PAD = { left: 40, right: 12, top: 12, bottom: 24 };
const INK = "#E6E9EE";
const MUTED = "#6B7380";
const GRID = "#1A1F26";
const ACCENT = "#F4D44D";

type Format = (value: number) => string;
const dayLabel = (start: number) => new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Daily trend: one line with a soft area, a gap where a day has no scores, and a crosshair tooltip. */
export function TrendChart({ days, domain, format, unit }: { days: DayPoint[]; domain: [number, number]; format: Format; unit: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [lo, hi] = domain[0] === domain[1] ? [domain[0] - 1, domain[1] + 1] : domain;
  const x = (index: number) => PAD.left + (days.length === 1 ? (W - PAD.left - PAD.right) / 2 : (index / (days.length - 1)) * (W - PAD.left - PAD.right));
  const y = (value: number) => PAD.top + (1 - (value - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => lo + fraction * (hi - lo));
  const segments: Array<Array<{ i: number; v: number }>> = [];
  days.forEach((day, i) => { if (day.value === null) { segments.push([]); return; } if (!segments.length) segments.push([]); segments[segments.length - 1].push({ i, v: day.value }); });
  const live = segments.filter((segment) => segment.length);
  const point = hover === null ? null : days[hover];
  const labelEvery = Math.max(1, Math.ceil(days.length / 8));

  function move(event: React.MouseEvent<SVGSVGElement>) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((event.clientX - box.left) / box.width) * W;
    setHover(Math.min(days.length - 1, Math.max(0, Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (days.length - 1)))));
  }

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Daily ${unit}, ${days.length} days`} onMouseMove={move} onMouseLeave={() => setHover(null)}>
        {ticks.map((tick) => <g key={tick}><line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke={GRID} /><text x={PAD.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="10" fill={MUTED} fontFamily="var(--font-geist-mono, monospace)">{format(tick)}</text></g>)}
        {days.map((day, i) => i % labelEvery === 0 ? <text key={day.start} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="var(--font-geist-mono, monospace)">{dayLabel(day.start)}</text> : null)}
        {live.map((segment, index) => segment.length > 1 ? (
          <g key={index}>
            <path d={`M${x(segment[0].i)},${y(lo)} ${segment.map((p) => `L${x(p.i)},${y(p.v)}`).join(" ")} L${x(segment[segment.length - 1].i)},${y(lo)} Z`} fill={ACCENT} opacity="0.09" />
            <polyline points={segment.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" />
          </g>
        ) : null)}
        {days.map((day, i) => day.value !== null ? <circle key={day.start} cx={x(i)} cy={y(day.value)} r={hover === i ? 5 : 2.5} fill={ACCENT} stroke="#0B0D10" strokeWidth="2" /> : null)}
        {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke={MUTED} strokeDasharray="3 3" /> : null}
      </svg>
      {point && hover !== null ? (
        <div className="pointer-events-none absolute top-2 rounded border border-[#262C35] bg-[#0E1115] px-2.5 py-1.5 text-xs shadow-lg" style={{ left: `${Math.min(80, Math.max(2, (x(hover) / W) * 100 - 8))}%` }}>
          <div className="font-mono text-[10px] text-[#8B93A1]">{dayLabel(point.start)}</div>
          <div className="font-mono" style={{ color: INK }}>{point.value === null ? "No scores" : `${format(point.value)} ${unit}`}</div>
          <div className="font-mono text-[10px] text-[#6B7380]">{point.count} score{point.count === 1 ? "" : "s"}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Scores per day as thin bars, sharing the trend chart's days. */
export function VolumeStrip({ days }: { days: DayPoint[] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="mt-1" aria-label="Scores per day">
      <div className="flex h-10 items-end gap-0.5 px-[40px] pr-[12px]" onMouseLeave={() => setHover(null)}>
        {days.map((day, i) => <div key={day.start} onMouseEnter={() => setHover(i)} className="group relative flex h-full flex-1 items-end" title={`${dayLabel(day.start)}: ${day.count}`}><div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(day.count ? 6 : 1, (day.count / max) * 100)}%`, background: day.count ? (hover === i ? ACCENT : "#3A3420") : GRID }} /></div>)}
      </div>
      <div className="px-[40px] pt-1 font-mono text-[10px] text-[#6B7380]">Scores per day · most {max}</div>
    </div>
  );
}

/** Histogram of one numeric score. */
export function Histogram({ buckets, format }: { buckets: Bucket[]; format: Format }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const [hover, setHover] = useState<number | null>(null);
  if (!buckets.length) return <p className="text-xs text-[#6B7380]">No scores yet. They show up here after an evaluator runs or feedback is sent.</p>;
  return (
    <div>
      <div className="flex h-24 items-end gap-0.5" onMouseLeave={() => setHover(null)} role="img" aria-label="How the scores are spread">
        {buckets.map((bucket, i) => <div key={i} onMouseEnter={() => setHover(i)} className="flex h-full flex-1 items-end"><div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(bucket.count ? 5 : 1, (bucket.count / max) * 100)}%`, background: bucket.count ? (hover === i ? ACCENT : "#C7A93A") : GRID }} /></div>)}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[#6B7380]"><span>{format(buckets[0].from)}</span><span>{hover !== null ? `${format(buckets[hover].from)} to ${format(buckets[hover].to)}: ${buckets[hover].count}` : "how scores are spread"}</span><span>{format(buckets[buckets.length - 1].to)}</span></div>
    </div>
  );
}

/** Part-to-whole as a single bar with a 2px gap between parts. */
export function SplitBar({ parts }: { parts: Array<{ label: string; value: number; color: string }> }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (!total) return <p className="text-xs text-[#6B7380]">No scores yet. They show up here after an evaluator runs or feedback is sent.</p>;
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded" role="img" aria-label={parts.map((part) => `${part.label} ${part.value}`).join(", ")}>
        {parts.filter((part) => part.value).map((part) => <div key={part.label} style={{ width: `${(part.value / total) * 100}%`, background: part.color }} title={`${part.label}: ${part.value}`} />)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{parts.map((part) => <li key={part.label} className="flex items-center gap-1.5 text-[11px] text-[#C9CED6]"><span className="size-2 rounded-sm" style={{ background: part.color }} />{part.label}<span className="font-mono text-[#8B93A1]">{part.value}</span></li>)}</ul>
    </div>
  );
}

/** Horizontal bars for categories (or sources), longest first. */
export function BarList({ items, max }: { items: Array<{ label: string; value: number }>; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="grid gap-1.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-[#C9CED6]" title={item.label}>{item.label}</span>
          <span className="h-2 overflow-hidden rounded-sm bg-[#151A20]"><span className="block h-full rounded-sm bg-[#C7A93A]" style={{ width: `${(item.value / top) * 100}%` }} /></span>
          <span className="font-mono text-[11px] text-[#8B93A1]">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
