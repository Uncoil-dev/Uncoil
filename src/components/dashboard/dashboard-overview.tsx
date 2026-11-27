"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";
import { tracingHref } from "@/lib/tracing-href";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Activity,
  Binary,
  DollarSign,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  CircleCheck,
  Clock3,
  Gauge,
  Percent,
} from "lucide-react";
import { RunsTable } from "./runs-table";
import { OrchestrationSavings } from "./orchestration-savings";
import { spendDetail } from "./overview-metrics";
import { FailOpenAlert } from "./fail-open-alert";
import { useProjectStats } from "@/hooks/use-project-stats";
import { AnalyticsRefreshControl } from "./analytics-refresh-control";
import { DashboardMetric, SignalBadge } from "./dashboard-primitives";

interface DashboardOverviewProps {
  projectId: string;
}

export function DashboardOverview({ projectId }: DashboardOverviewProps) {
  const [reviewRun, setReviewRun] = useState<{ runId: string; spanCount: number } | null>(null);
  const [cause, setCause] = useState("tool_or_workflow_failure");
  const [evidence, setEvidence] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [owner, setOwner] = useState("");

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const requestedRange = Number(searchParams.get("range"));
  const range = useMemo(
    () => ([1, 7, 30, 90].includes(requestedRange) ? requestedRange : 7),
    [requestedRange],
  );

  const recentRuns = useQuery(
    api.agentRuns.getRecentRunsByProject,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const summary = useQuery(
    api.projects.getProjectManagementSummary,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const evaluationOverview = useQuery(
    api.evaluationEngine.overview,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const investigations = useQuery(
    api.annotations.list,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const createInvestigation = useMutation(api.annotations.create);

  const liveRefreshKey =
    summary?.latestActivityAt ??
    summary?.totals.totalRuns ??
    summary?.totals.totalSpans ??
    null;

  const { stats, loading, refreshing, refreshStats } = useProjectStats({
    projectId,
    range,
    liveRefreshKey,
  });

  if (
    loading ||
    recentRuns === undefined ||
    summary === undefined ||
    evaluationOverview === undefined ||
    investigations === undefined
  ) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-none" />
      </div>
    );
  }

  // ---- Derived data ----

  const analyticsSpend = stats?.dailyCosts.reduce((acc, curr) => acc + curr.totalCostUsd, 0) || 0;
  const analyticsSpans = stats?.dailyCosts.reduce((acc, curr) => acc + curr.spanCount, 0) || 0;
  const savedSpend = summary?.totals.totalCostUsd || 0;
  const savedSpans = summary?.totals.totalSpans || 0;
  const useSavedFallback = stats?.unavailable;
  const totalSpend = useSavedFallback ? savedSpend : analyticsSpend;
  const totalSpans = useSavedFallback ? savedSpans : analyticsSpans;

  const analyticsDailyCosts = stats?.dailyCosts ?? [];
  const dailyCosts = analyticsDailyCosts.length
    ? analyticsDailyCosts
    : buildDailyCostSeries(range, recentRuns);

  const activeRuns = summary?.totals.activeRuns ?? recentRuns.filter((r) => r.status === "running").length;

  const totalTokens = stats?.userCosts?.reduce((sum, user) => sum + user.totalTokens, 0) ?? 0;

  const reviewedTraceIds = new Set(
    investigations
      .filter((item) => item.status === "completed")
      .map((item) => item.traceId),
  );

  const failedRuns = recentRuns
    .filter((run) => run.status === "failed" && !reviewedTraceIds.has(run.runId))
    .length;

  const recentFailureRate =
    recentRuns.length
      ? (recentRuns.filter((run) => run.status === "failed").length / recentRuns.length) * 100
      : 0;

  const recentDurations = recentRuns
    .map((run) =>
      run.finishedAt
        ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
        : null,
    )
    .filter((duration): duration is number => duration !== null && Number.isFinite(duration) && duration >= 0)
    .sort((left, right) => left - right);

  const p95Duration = recentDurations.length
    ? recentDurations[Math.min(recentDurations.length - 1, Math.ceil(recentDurations.length * 0.95) - 1)]
    : 0;

  const runTrend = buildRunTrendSeries(range, recentRuns);
  const qualityTrend = buildQualityTrendSeries(range, evaluationOverview?.recentResults ?? []);

  const launchPlan = [
    {
      label: "Capture a first trace",
      complete: recentRuns.length > 0,
      href: tracingHref(projectId, range),
    },
    {
      label: "Review runtime cost",
      complete: totalSpend > 0,
      href: `/dashboard/${projectId}/costs`,
    },
    {
      label: "Add an evaluation",
      complete: Boolean(evaluationOverview?.resultCount),
      href: `/dashboard/${projectId}/evaluation`,
    },
    {
      label: "Set alert coverage",
      complete: Boolean(summary?.totals.alertCount),
      href: `/dashboard/${projectId}/settings`,
    },
  ];

  // ---- Loading state ----

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-none" />
      </div>
    );
  }

  return (
    <div className="dashboard-grid flex flex-col gap-6 bg-[#0b0d10] p-4 text-zinc-100 sm:p-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-pixel text-xl uppercase tracking-wide text-zinc-100">
            Project overview
          </h2>
          <p className="mt-1 font-mono text-[11px] text-zinc-400">
            Live execution speed, run volume, token usage, cost, and reliability for this project.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
          <div className="flex gap-2">
            {([["1d", 1], ["7d", 7], ["30d", 30], ["90d", 90]] as const).map(([label, value]) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                aria-label={`Show workspace health for ${label}`}
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams.toString());
                  nextParams.set("range", String(value));
                  router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
                }}
                className={
                  range === value
                    ? "h-8 border border-zinc-100 bg-zinc-100 px-3 font-mono text-[11px] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100"
                    : "h-8 border border-zinc-700 bg-zinc-900 px-3 font-mono text-[11px] text-zinc-400 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <AnalyticsRefreshControl
            stats={stats}
            refreshing={refreshing}
            onRefresh={refreshStats}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-4 xl:grid-cols-8">
        <DashboardMetric
          label="Spend"
          value={formatGraphCurrency(totalSpend)}
          icon={DollarSign}
          href={`/dashboard/${projectId}/costs`}
          detail={spendDetail(range, Boolean(useSavedFallback))}
        />
        <DashboardMetric
          label="Spans"
          value={totalSpans.toLocaleString()}
          icon={Zap}
          detail={`Observed in last ${range} days`}
          href={tracingHref(projectId, range)}
        />
        <DashboardMetric
          label="Tokens"
          value={totalTokens.toLocaleString()}
          icon={Binary}
          detail={useSavedFallback ? "No token analytics yet" : `Observed in last ${range} days`}
          href={`/dashboard/${projectId}/costs`}
        />
        <DashboardMetric
          label="Active Runs"
          value={activeRuns.toString()}
          icon={Activity}
          signal="info"
          detail="Currently running"
          href={tracingHref(projectId, range)}
        />
        <DashboardMetric
          label="Failed Runs"
          value={failedRuns.toString()}
          icon={AlertTriangle}
          signal={failedRuns > 0 ? "danger" : "success"}
          detail={failedRuns > 0 ? "Needs attention" : "No failures detected"}
          href={tracingHref(projectId, range, { status: "error" })}
        />
        <DashboardMetric
          label="Failure Rate"
          value={`${recentFailureRate.toFixed(1)}%`}
          icon={Percent}
          signal={recentFailureRate > 0 ? "warning" : "success"}
          detail={recentRuns.length ? `Recent ${recentRuns.length}-run sample` : "No recent runs"}
          href={tracingHref(projectId, range, { status: "error" })}
        />
        <DashboardMetric
          label="p95 Latency"
          value={p95Duration ? formatDuration(p95Duration) : "—"}
          icon={Gauge}
          signal={p95Duration > 10000 ? "warning" : "neutral"}
          detail={recentDurations.length ? "Recent completed runs" : "No completed runs"}
          href={tracingHref(projectId, range, { sort: "latency", dir: "desc" })}
        />
        <DashboardMetric
          label="Evaluation Quality"
          value={
            evaluationOverview?.passRate === null || evaluationOverview?.passRate === undefined
              ? "—"
              : `${Math.round(evaluationOverview.passRate * 100)}%`
          }
          icon={CircleCheck}
          signal={
            evaluationOverview?.passRate === null || evaluationOverview?.passRate === undefined
              ? "neutral"
              : evaluationOverview.passRate >= 0.9
                ? "success"
                : "warning"
          }
          detail={evaluationOverview?.resultCount ? `${evaluationOverview.resultCount} evaluation results` : "No evaluation results"}
          href={`/dashboard/${projectId}/evaluation`}
        />
      </div>

      {/* Investigation queue + Launch plan */}
      <div className="grid gap-6">
        <Card className="border-zinc-800 bg-[#111418] p-0 shadow-none">
          <div className="flex items-start justify-between gap-4 border-b border-black/15 p-5">
            <div>
              <h3 className="font-mono text-sm uppercase tracking-widest text-zinc-100">
                Unreviewed failures
              </h3>
              <p className="mt-1 font-mono text-[10px] text-zinc-400">
                Explicit errors from the selected window.
              </p>
            </div>
            <SignalBadge
              signal={failedRuns > 0 ? "danger" : "success"}
            >
              {failedRuns > 0 ? `${failedRuns} open` : "Clear"}
            </SignalBadge>
          </div>

          {failedRuns > 0 ? (
            <div className="divide-y divide-zinc-800">
              {recentRuns
                .filter(
                  (run) =>
                    run.status === "failed" &&
                    !investigations.some(
                      (item) => item.traceId === run.runId && item.status === "completed",
                    ),
                )
                .slice(0, 8)
                .map((run) => (
                  <div
                    key={run._id}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-zinc-900 sm:grid-cols-[1.4fr_1fr_0.7fr_auto] sm:items-center"
                  >
                    <Link
                      href={`/dashboard/${projectId}/runs/${run.runId}`}
                      className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100"
                    >
                      <span className="block truncate font-mono text-xs text-zinc-100">
                        {run.runId}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[10px] text-zinc-500">
                        {run.environment ?? "default"} · {run.primaryModel ?? "unknown model"}
                      </span>
                    </Link>
                    <span className="truncate font-mono text-[11px] text-red-300">
                      Run failed · inspect trace
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {run.spanCount} spans ·{" "}
                      {new Date(run.startedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      type="button"
                      className="h-8 border border-zinc-700 px-2 font-mono text-[10px] uppercase text-zinc-300 hover:border-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100"
                      onClick={() => {
                        setReviewRun({ runId: run.runId, spanCount: run.spanCount });
                        setEvidence("");
                        setNextAction("");
                        setOwner("");
                      }}
                    >
                      Review
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-5">
              <CircleCheck className="mt-0.5 size-4 text-emerald-300" aria-hidden="true" />
              <div>
                <p className="font-mono text-xs text-zinc-100">No failures in the current window.</p>
                <p className="mt-1 font-mono text-[10px] text-zinc-400">
                  The queue will appear when an explicit error is ingested.
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="border-zinc-800 bg-[#111418] p-0 shadow-none">
          <div className="border-b border-black/15 p-5">
            <h3 className="font-mono text-sm uppercase tracking-widest text-black">Launch plan</h3>
            <p className="mt-1 font-mono text-[10px] text-black/55">
              A lightweight path to a more useful workspace.
            </p>
          </div>
          <ol className="space-y-2 p-4">
            {launchPlan.map((item, index) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 border border-black/15 p-3 font-mono text-xs text-black/70 transition-colors hover:border-black hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <span
                    className={
                      item.complete
                        ? "flex size-5 shrink-0 items-center justify-center bg-emerald-600 text-white"
                        : "flex size-5 shrink-0 items-center justify-center border border-black/30 text-black/55"
                    }
                  >
                    {item.complete ? (
                      <CircleCheck className="size-3" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={
                      item.complete ? "line-through decoration-black/75 text-black/55" : "flex-1"
                    }
                  >
                    {item.label}
                  </span>
                  <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Review dialog */}
      <Dialog
        open={Boolean(reviewRun)}
        onOpenChange={(open) => {
          if (!open) setReviewRun(null);
        }}
      >
        <DialogContent className="border-zinc-700 bg-[#111418] text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-widest">
              Record investigation
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-zinc-400">
              Capture what you know about {reviewRun?.runId} before moving it to Reviewed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="font-mono text-[10px] uppercase text-zinc-400">
              Cause
              <select
                value={cause}
                onChange={(event) => setCause(event.target.value)}
                className="mt-1 h-9 w-full border border-zinc-700 bg-zinc-900 px-2 font-mono text-xs text-zinc-100"
              >
                <option value="tool_or_workflow_failure">Tool or workflow failure</option>
                <option value="bad_model_output">Bad model output</option>
                <option value="missing_context">Missing context</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label className="font-mono text-[10px] uppercase text-zinc-400">
              Evidence
              <textarea
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder="What in the trace supports this?"
                className="mt-1 min-h-20 w-full border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
              />
            </label>
            <label className="font-mono text-[10px] uppercase text-zinc-400">
              Next action
              <Input
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                placeholder="Retry tool with validated input"
                className="mt-1 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
              />
            </label>
            <label className="font-mono text-[10px] uppercase text-zinc-400">
              Owner (optional)
              <Input
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="you@example.com"
                className="mt-1 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-zinc-700 bg-transparent text-zinc-300"
              onClick={() => setReviewRun(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={!evidence.trim() || !nextAction.trim()}
              onClick={() => {
                if (!reviewRun) return;
                void createInvestigation({
                  projectId: projectId as Id<"projects">,
                  traceId: reviewRun.runId,
                  label: cause,
                  notes: `${evidence.trim()}\nNext action: ${nextAction.trim()}${owner.trim() ? `\nOwner: ${owner.trim()}` : ""}`,
                }).then(() => setReviewRun(null));
              }}
            >
              Save review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orchestration savings + fail-open */}
      <OrchestrationSavings projectId={projectId} range={range} />
      <FailOpenAlert projectId={projectId} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6 rounded-none border-border bg-white shadow-none">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-mono text-[14px] text-black">Run Volume &amp; Failure Rate</h3>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-black/55">
                {recentRuns.length
                  ? `Recent ${recentRuns.length}-run sample · selected ${range}-day window`
                  : "No run summaries in the selected window"}
              </p>
            </div>
            <Activity className="size-4 text-black/55" aria-hidden="true" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={runTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.12)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="rgba(0,0,0,0.6)"
                  fontSize={10}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis yAxisId="runs" stroke="rgba(0,0,0,0.6)" fontSize={10} allowDecimals={false} />
                <YAxis
                  yAxisId="failure"
                  orientation="right"
                  stroke="rgba(0,0,0,0.6)"
                  fontSize={10}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "0px",
                    fontSize: "12px",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                />
                <Bar yAxisId="runs" dataKey="runs" fill="#000000" barSize={18} name="Runs" />
                <Line
                  yAxisId="failure"
                  type="monotone"
                  dataKey="failureRate"
                  stroke="#B45309"
                  strokeWidth={2}
                  dot={false}
                  name="Failure rate"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-none border-border bg-white shadow-none">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-mono text-[14px] text-black">Quality Score Trend</h3>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-black/55">
                {evaluationOverview?.resultCount
                  ? `${evaluationOverview.resultCount} recent evaluation results`
                  : "No evaluation results in the selected window"}
              </p>
            </div>
            <CircleCheck className="size-4 text-black/55" aria-hidden="true" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.12)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="rgba(0,0,0,0.6)"
                  fontSize={10}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis stroke="rgba(0,0,0,0.6)" fontSize={10} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(0)}%`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "0px",
                    fontSize: "12px",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#000000" }}
                  name="Pass rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-none border-border bg-white shadow-none">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-mono text-[14px] text-black">Spend Over Time</h3>
              <Clock3 className="size-4 text-black/55" aria-hidden="true" />
            </div>
            <p className="text-[11px] text-black/55 uppercase tracking-widest mt-1">
              {analyticsDailyCosts.length
                ? `LLM infrastructure costs, last ${range} day${range === 1 ? "" : "s"}`
                : `Saved run summaries, last ${range} day${range === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyCosts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.12)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="rgba(0,0,0,0.45)"
                  fontSize={10}
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis
                  stroke="rgba(0,0,0,0.45)"
                  fontSize={10}
                  tickFormatter={(val) => formatGraphCurrency(Number(val))}
                />
                <Tooltip
                  formatter={(value) => formatGraphCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "0px",
                    fontSize: "12px",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  itemStyle={{ color: "#000000" }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCostUsd"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#FFFFFF", stroke: "#000000", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[14px] text-black uppercase tracking-widest">Recent Activity</h3>
          <Link
            href={`/dashboard/${projectId}/manage`}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "text-[11px] uppercase",
            })}
          >
            Manage Project
          </Link>
        </div>
        <RunsTable projectId={projectId} />
      </div>
    </div>
  );
}

// ---- Helpers ----

type CostSeriesRun = {
  startedAt: string;
  totalCostUsd: number;
  spanCount: number;
};

function buildDailyCostSeries(range: number, runs: CostSeriesRun[]) {
  const today = new Date();
  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (range - 1 - index));
    return date.toISOString().slice(0, 10);
  });
  const byDay = new Map(
    days.map((day) => [day, { day, totalCostUsd: 0, spanCount: 0 }]),
  );

  for (const run of runs) {
    const day = new Date(run.startedAt).toISOString().slice(0, 10);
    const bucket = byDay.get(day);
    if (!bucket) continue;
    bucket.totalCostUsd += run.totalCostUsd;
    bucket.spanCount += run.spanCount;
  }

  return days.map((day) => byDay.get(day)!);
}

function buildRunTrendSeries(range: number, runs: Array<{ startedAt: string; status: string }>) {
  const today = new Date();
  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (range - 1 - index));
    return date.toISOString().slice(0, 10);
  });
  return days.map((day) => {
    const dayRuns = runs.filter((run) => run.startedAt.slice(0, 10) === day);
    return {
      day,
      runs: dayRuns.length,
      failureRate: dayRuns.length
        ? Math.round((dayRuns.filter((run) => run.status === "failed").length / dayRuns.length) * 100)
        : 0,
    };
  });
}

function buildQualityTrendSeries(range: number, results: Array<{ createdAt?: number; status: string }>) {
  const today = new Date();
  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (range - 1 - index));
    return date.toISOString().slice(0, 10);
  });
  return days.map((day) => {
    const dayResults = results.filter(
      (result) =>
        result.createdAt !== undefined &&
        new Date(result.createdAt).toISOString().slice(0, 10) === day,
    );
    return {
      day,
      passRate: dayResults.length
        ? (dayResults.filter((result) => result.status === "passed").length / dayResults.length) * 100
        : 0,
    };
  });
}

function formatGraphCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
