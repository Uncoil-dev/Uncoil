"use client";

import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import { bucketLabel, compactCost, compactNumber, duration, errorShare } from "@/lib/widget-utils";
import { Columns, Lines, Ranking } from "./widget-charts";
import type { Remote, StatsData, TracesData } from "./widget-data";

type Scores = FunctionReturnType<typeof api.evaluation.scoreMetrics> | undefined;
const percent = (value: number) => `${(value * 100).toFixed(value < 0.1 && value > 0 ? 1 : 0)}%`;

function Headline({ value, note }: { value: string; note?: string }) {
  return <div className="mb-2 flex items-baseline gap-2"><span className="font-mono text-2xl">{value}</span>{note ? <span className="text-[11px] text-[#8B93A1]">{note}</span> : null}</div>;
}
function State({ remote, children }: { remote: Remote<unknown>; children: () => React.ReactNode }) {
  if (remote.state === "loading") return <div role="status" aria-label="Loading" className="grid gap-2"><div className="h-6 w-24 animate-pulse bg-[#11151A]" /><div className="h-28 animate-pulse bg-[#11151A]" /></div>;
  if (remote.state === "error") return <p role="alert" className="text-xs leading-5 text-[#FF8A8A]">{remote.message}</p>;
  return <>{children()}</>;
}

export function WidgetBody({ id, traces, stats, scores }: { id: string; traces: Remote<TracesData>; stats: Remote<StatsData>; scores: Scores }) {
  switch (id) {
    case "trace_volume":
      return <State remote={traces}>{() => {
        const data = (traces as { data: TracesData }).data;
        if (!data.stats.traces) return <p className="py-6 text-center text-xs text-[#6B7380]">No runs in this period.</p>;
        return <><Headline value={compactNumber(data.stats.traces)} note={`runs, ${compactNumber(data.stats.errors)} failed`} />
          <Columns label="Runs per period" format={compactNumber} extraLabel="failed" points={data.histogram.buckets.map((b) => ({ label: bucketLabel(b.bucket, data.histogram.bucketSeconds), value: b.traces, extra: b.errors }))} /></>;
      }}</State>;
    case "error_rate":
      return <State remote={traces}>{() => {
        const data = (traces as { data: TracesData }).data;
        const share = errorShare(data.stats.traces, data.stats.errors);
        if (share === null) return <p className="py-6 text-center text-xs text-[#6B7380]">No runs in this period.</p>;
        const spark = data.histogram.buckets.map((b) => errorShare(b.traces, b.errors) ?? 0);
        return <><Headline value={percent(share)} note={`${compactNumber(data.stats.errors)} of ${compactNumber(data.stats.traces)} runs`} />
          <Columns label="Failure rate per period" format={percent} points={spark.map((value, i) => ({ label: bucketLabel(data.histogram.buckets[i].bucket, data.histogram.bucketSeconds), value }))} /></>;
      }}</State>;
    case "latency":
      return <State remote={traces}>{() => {
        const data = (traces as { data: TracesData }).data;
        if (!data.stats.traces) return <p className="py-6 text-center text-xs text-[#6B7380]">No runs in this period.</p>;
        return <><Headline value={duration(data.stats.p50DurationMs)} note={`typical, ${duration(data.stats.p95DurationMs)} for the slowest 5%`} />
          <Lines label="Response time per period" format={duration} aLabel="Median" bLabel="Slowest 5%" points={data.histogram.buckets.map((b) => ({ label: bucketLabel(b.bucket, data.histogram.bucketSeconds), a: b.p50DurationMs, b: b.p95DurationMs }))} /></>;
      }}</State>;
    case "cost_daily":
      return <State remote={stats}>{() => {
        const data = (stats as { data: StatsData }).data;
        const total = data.dailyCosts.reduce((sum, day) => sum + day.totalCostUsd, 0);
        if (data.unavailable) return <p className="py-6 text-center text-xs text-[#F4D44D]">Cost data is temporarily unavailable.</p>;
        if (!data.dailyCosts.length) return <p className="py-6 text-center text-xs text-[#6B7380]">No spend in this period.</p>;
        return <><Headline value={compactCost(total)} note="in this period" /><Columns label="Cost per day" format={compactCost} points={data.dailyCosts.map((day) => ({ label: new Date(`${day.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }), value: day.totalCostUsd }))} /></>;
      }}</State>;
    case "cost_by_model":
      return <State remote={stats}>{() => <Ranking empty="No model calls in this period. They show up when your agent uses a wrapped client or records a model step." format={compactCost} rows={(stats as { data: StatsData }).data.modelCosts.filter((row) => row.modelId).slice(0, 6).map((row) => ({ label: row.modelId, value: row.totalCostUsd, note: `${compactNumber(row.spanCount)} calls` }))} />}</State>;
    case "cost_by_tool":
      return <State remote={stats}>{() => <Ranking empty="No tool calls in this period. They show up when your agent records tool steps." format={compactCost} rows={(stats as { data: StatsData }).data.toolCosts.filter((row) => row.toolName).slice(0, 6).map((row) => ({ label: row.toolName, value: row.totalCostUsd, note: `${compactNumber(row.spanCount)} calls` }))} />}</State>;
    case "top_users":
      return <State remote={stats}>{() => <Ranking empty="No end users recorded. Send an end user id with your steps." format={compactCost} rows={(stats as { data: StatsData }).data.userCosts.filter((row) => row.endUserId).slice(0, 6).map((row) => ({ label: row.endUserId, value: row.totalCostUsd, note: `${compactNumber(row.totalTokens)} tokens` }))} />}</State>;
    case "quality_scores":
      if (scores === undefined) return <div role="status" aria-label="Loading" className="h-28 animate-pulse bg-[#11151A]" />;
      if (!scores.length) return <p className="py-6 text-center text-xs text-[#6B7380]">No scores recorded yet. Evaluators and reviewers add them.</p>;
      return <Ranking empty="" format={(value) => (value <= 1 ? percent(value) : value.toFixed(2))} rows={scores.slice(0, 6).map((metric) => ({ label: metric.name, value: metric.passRate ?? metric.average ?? 0, note: `${compactNumber(metric.count)} scores` }))} />;
    default:
      return <p className="py-6 text-center text-xs leading-5 text-[#8B93A1]">This widget type is no longer available. Remove it to tidy up.</p>;
  }
}
