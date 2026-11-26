"use client";

import { PageTitle } from "@/components/dashboard/page-title";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { compactNumber, formatCost, formatDuration } from "../tracing/format";

type Bucket = { bucket: string; traces: number; errors: number; costUsd: number; p50DurationMs: number | null };
type Stats = { traces: number; errors: number; p50DurationMs: number; p95DurationMs: number; totalCostUsd: number; inputTokens: number; outputTokens: number; runningTraces: number };
type Period = { from: number; to: number; stats: Stats; histogram: { bucketSeconds: number; buckets: Bucket[] } };
type Response = { days: number; current: Period; previous: Period; error?: string };

const PERIODS = [
  { days: 1, label: "Today vs yesterday", short: "yesterday" },
  { days: 7, label: "This week vs last", short: "last week" },
  { days: 14, label: "14 days vs prior", short: "the 14 days before" },
  { days: 30, label: "30 days vs prior", short: "the 30 days before" },
];
const YELLOW = "#F4D44D";
const RED = "#FF6B6B";
const MUTED = "#4A5260";

const dateLabel = (ms: number) => new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });

type Metric = {
  id: string; label: string; current: number; previous: number; format: (value: number) => string;
  /** The value of one chart bucket, or null when the bucket has no data. */
  pick: (bucket: Bucket) => number | null;
  /** Higher is worse (cost, failures, time), so a rise is shown in red. */
  higherIsWorse: boolean; hint: string;
};

function delta(metric: Metric) {
  const diff = metric.current - metric.previous;
  if (!metric.previous && !metric.current) return { text: "No change", tone: "text-[#8B93A1]", arrow: "–" };
  if (!metric.previous) return { text: "New this period", tone: "text-[#8B93A1]", arrow: "▲" };
  const percent = (diff / metric.previous) * 100;
  if (Math.abs(percent) < 0.5) return { text: "No change", tone: "text-[#8B93A1]", arrow: "–" };
  const worse = metric.higherIsWorse ? diff > 0 : diff < 0;
  return { text: `${Math.abs(percent).toFixed(percent > 100 || percent < -100 ? 0 : 1)}% ${diff > 0 ? "higher" : "lower"}`, tone: worse ? "text-[#FF8A8A]" : "text-[#F4D44D]", arrow: diff > 0 ? "▲" : "▼" };
}

/** Both periods drawn over each other, lined up by how far into the period each bucket is. */
function CompareChart({ metric, data }: { metric: Metric; data: Response }) {
  const width = 320, height = 72;
  const { current: currentPeriod, previous: previousPeriod } = data;
  const series = useMemo(() => {
    const build = (period: Period) => {
      const step = period.histogram.bucketSeconds * 1000;
      const count = Math.max(1, Math.ceil((period.to - period.from) / step));
      const values: Array<number | null> = Array(count).fill(null);
      for (const bucket of period.histogram.buckets) {
        const index = Math.floor((Date.parse(bucket.bucket.replace(" ", "T") + "Z") - period.from) / step);
        if (index >= 0 && index < count) values[index] = metric.pick(bucket);
      }
      return values;
    };
    return { current: build(currentPeriod), previous: build(previousPeriod) };
  }, [currentPeriod, previousPeriod, metric]);
  const length = Math.max(series.current.length, series.previous.length);
  const max = Math.max(1e-9, ...series.current.map((v) => v ?? 0), ...series.previous.map((v) => v ?? 0));
  const slot = width / length;
  const bar = (values: Array<number | null>, color: string, offset: number, thin: number) =>
    values.map((value, index) => value == null || value <= 0 ? null : (
      <rect key={`${color}-${index}`} x={index * slot + offset} y={height - Math.max(1, (value / max) * height)} width={Math.max(1, slot * thin)} height={Math.max(1, (value / max) * height)} fill={color} />
    ));
  const color = metric.higherIsWorse ? (metric.current > metric.previous ? RED : YELLOW) : YELLOW;
  return (
    <svg role="img" aria-label={`${metric.label}, this period against the previous one`} viewBox={`0 0 ${width} ${height}`} className="mt-3 h-[72px] w-full" preserveAspectRatio="none">
      {bar(series.previous, MUTED, 0, 0.4)}
      {bar(series.current, color, slot * 0.45, 0.4)}
    </svg>
  );
}

export function ComparisonEmptyRow({ loading }: { loading: boolean }) {
  return <tr><td colSpan={4} className="px-4 py-6 text-[#6B7380]">{loading ? "Loading…" : "No runs in this time range yet. Send a trace or pick a longer range."}</td></tr>;
}

export function ComparisonsExplorer({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = Number(searchParams.get("days"));
  const days = PERIODS.some((p) => p.days === requested) ? requested : 7;
  const period = PERIODS.find((p) => p.days === days)!;
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let stale = false;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/comparison?days=${days}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as Response;
        if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
        return body;
      })
      .then((body) => { if (!stale) { setData(body); setError(null); } })
      .catch((reason: unknown) => { if (!stale) setError(reason instanceof Error ? reason.message : "Could not load comparison"); });
    return () => { stale = true; };
  }, [projectId, days, reloads]);

  const choose = useCallback((next: number) => {
    setData(null);
    router.replace(`${pathname}?days=${next}`, { scroll: false });
  }, [pathname, router]);

  const loading = !data && !error;
  const current = data?.current.stats, previous = data?.previous.stats;
  const rate = (s?: Stats) => (s && s.traces ? (s.errors / s.traces) * 100 : 0);
  const metrics: Metric[] = current && previous ? [
    { id: "cost", label: "Cost", current: current.totalCostUsd, previous: previous.totalCostUsd, format: formatCost, pick: (b) => b.costUsd, higherIsWorse: true, hint: `${formatCost(current.traces ? current.totalCostUsd / current.traces : 0)} per trace` },
    { id: "failures", label: "Failures", current: rate(current), previous: rate(previous), format: (v) => `${v.toFixed(v && v < 10 ? 1 : 0)}%`, pick: (b) => (b.traces ? (b.errors / b.traces) * 100 : null), higherIsWorse: true, hint: `${compactNumber(current.errors)} of ${compactNumber(current.traces)} traces failed` },
    { id: "speed", label: "Speed (median)", current: current.p50DurationMs, previous: previous.p50DurationMs, format: formatDuration, pick: (b) => b.p50DurationMs, higherIsWorse: true, hint: `p95 ${formatDuration(current.p95DurationMs)}` },
  ] : [];
  const rows = current && previous ? [
    { label: "Traces", now: compactNumber(current.traces), before: compactNumber(previous.traces), change: delta({ id: "t", label: "", current: current.traces, previous: previous.traces, format: String, pick: () => null, higherIsWorse: false, hint: "" }) },
    { label: "Tokens", now: compactNumber(current.inputTokens + current.outputTokens), before: compactNumber(previous.inputTokens + previous.outputTokens), change: delta({ id: "k", label: "", current: current.inputTokens + current.outputTokens, previous: previous.inputTokens + previous.outputTokens, format: String, pick: () => null, higherIsWorse: true, hint: "" }) },
    { label: "Slowest 5% (p95)", now: formatDuration(current.p95DurationMs), before: formatDuration(previous.p95DurationMs), change: delta({ id: "p", label: "", current: current.p95DurationMs, previous: previous.p95DurationMs, format: String, pick: () => null, higherIsWorse: true, hint: "" }) },
  ] : [];

  return (
    <div className="flex min-h-svh flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <PageTitle>Comparisons</PageTitle>
        <div role="group" aria-label="Period" className="flex max-w-full flex-wrap rounded-md border border-[#262C35] p-0.5 text-xs">
          {PERIODS.map((item) => (
            <button key={item.days} type="button" aria-pressed={item.days === days} onClick={() => choose(item.days)}
              className={`h-6 rounded px-2.5 ${item.days === days ? "bg-[#232A34] text-white" : "text-[#8B93A1] hover:text-white"}`}>{item.label}</button>
          ))}
        </div>
        <button type="button" onClick={() => { setData(null); setReloads((n) => n + 1); }} className="ml-auto h-8 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260]">Refresh</button>
      </header>

      <main className="flex flex-col gap-3 p-4">
        <p className="font-mono text-[11px] text-[#6B7380]">
          {data ? `${dateLabel(data.current.from)} – ${dateLabel(data.current.to)} compared with ${dateLabel(data.previous.from)} – ${dateLabel(data.previous.to)}` : "Loading…"}
        </p>
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-[#3A2227] bg-[#1A1114] px-3 py-2 text-[#FF8A8A]">
            <span>{error}</span>
            <button type="button" className="text-xs underline" onClick={() => { setError(null); setReloads((n) => n + 1); }}>Try again</button>
          </div>
        ) : null}

        <section aria-label="Cost, failures and speed" aria-busy={loading} className="grid gap-px overflow-hidden rounded-lg border border-[#1F242C] bg-[#1F242C] md:grid-cols-3">
          {(metrics.length ? metrics : [0, 1, 2].map(() => null)).map((metric, index) => {
            if (!metric || !data) return <div key={index} className="h-[210px] animate-pulse bg-[#0E1115]" />;
            const change = delta(metric);
            return (
              <div key={metric.id} className="min-w-0 bg-[#0E1115] p-4">
                <span className="block text-xs text-[#8B93A1]">{metric.label}</span>
                <span className="mt-1 block font-mono text-2xl leading-8 text-[#E6E9EE]">{metric.format(metric.current)}</span>
                <span className="block font-mono text-[11px] text-[#6B7380]">{PERIODS.find((p) => p.days === data.days)?.short ?? "before"}: {metric.format(metric.previous)}</span>
                <span className={`mt-2 block font-mono text-xs ${change.tone}`}><span aria-hidden="true">{change.arrow} </span>{change.text}</span>
                <CompareChart metric={metric} data={data} />
                <span className="mt-2 block truncate font-mono text-[11px] text-[#6B7380]">{metric.hint}</span>
              </div>
            );
          })}
        </section>
        <div className="flex items-center gap-4 font-mono text-[11px] text-[#6B7380]">
          <span className="flex items-center gap-1.5"><i className="inline-block size-2" style={{ background: YELLOW }} />This period</span>
          <span className="flex items-center gap-1.5"><i className="inline-block size-2" style={{ background: MUTED }} />Previous period</span>
          <span className="ml-auto hidden sm:block">Yellow is better or steady, red is worse.</span>
        </div>

        <section aria-label="More changes" className="overflow-x-auto rounded-lg border border-[#1F242C] bg-[#0E1115]">
          <table className="w-full min-w-[420px] text-left">
            <thead className="text-xs text-[#8B93A1]">
              <tr className="border-b border-[#1F242C]"><th className="px-4 py-2 font-normal">{period.label}</th><th className="px-4 py-2 font-normal">Now</th><th className="px-4 py-2 font-normal">Before</th><th className="px-4 py-2 font-normal">Change</th></tr>
            </thead>
            <tbody className="font-mono text-xs">
              {rows.length ? rows.map((row) => (
                <tr key={row.label} className="border-b border-[#1A1F27] last:border-0">
                  <td className="px-4 py-2 font-[family-name:var(--font-geist-sans)] text-[13px]">{row.label}</td>
                  <td className="px-4 py-2">{row.now}</td><td className="px-4 py-2 text-[#8B93A1]">{row.before}</td>
                  <td className={`px-4 py-2 ${row.change.tone}`}><span aria-hidden="true">{row.change.arrow} </span>{row.change.text}</td>
                </tr>
              )) : <ComparisonEmptyRow loading={loading} />}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
