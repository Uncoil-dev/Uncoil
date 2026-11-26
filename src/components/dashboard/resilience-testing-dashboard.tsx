"use client";

import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoResilienceRuns } from "@/components/dashboard/no-resilience-runs";
import { AlertCircle, Play } from "lucide-react";

const DEFAULT_FAILURE_MIX = {
  success: 0.4,
  timeout: 0.15,
  "429": 0.15,
  "500": 0.15,
  cost_overrun: 0.15,
} as const;

const FAILURE_MODE_LABELS: Record<string, string> = {
  success: "Success",
  timeout: "Timeout",
  "429": "Rate limit (429)",
  "500": "Server error (500)",
  cost_overrun: "Cost overrun",
};

type FailureMode = keyof typeof DEFAULT_FAILURE_MIX;

interface ResilienceTestingDashboardProps {
  projectId: string;
}

export function ResilienceTestingDashboard({ projectId }: ResilienceTestingDashboardProps) {
  const runs = useQuery(api.resilience.listRuns, { projectId: projectId as Id<"projects"> });
  const runResilienceTest = useAction(api.resilience.runResilienceTest);

  const [iterations, setIterations] = useState("20");
  const [failureMix, setFailureMix] = useState<Record<FailureMode, string>>({
    success: String(DEFAULT_FAILURE_MIX.success),
    timeout: String(DEFAULT_FAILURE_MIX.timeout),
    "429": String(DEFAULT_FAILURE_MIX["429"]),
    "500": String(DEFAULT_FAILURE_MIX["500"]),
    cost_overrun: String(DEFAULT_FAILURE_MIX.cost_overrun),
  });
  const [running, setRunning] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRun = useQuery(
    api.resilience.getRun,
    selectedRunId ? { projectId: projectId as Id<"projects">, runId: selectedRunId as Id<"resilienceRuns"> } : "skip",
  );

  async function handleRun() {
    if (!projectId) return;
    const parsedIterations = Number(iterations);
    if (!Number.isInteger(parsedIterations) || parsedIterations < 1 || parsedIterations > 200) {
      setError("Iterations must be an integer between 1 and 200");
      return;
    }
    const parsedMix: Record<FailureMode, number> = {
      success: Number(failureMix.success),
      timeout: Number(failureMix.timeout),
      "429": Number(failureMix["429"]),
      "500": Number(failureMix["500"]),
      cost_overrun: Number(failureMix.cost_overrun),
    };
    if (Object.values(parsedMix).some((weight) => !Number.isFinite(weight) || weight < 0)) {
      setError("Failure mix weights must be non-negative numbers");
      return;
    }

    setError(null);
    setRunning(true);
    try {
      const runId = await runResilienceTest({
        projectId: projectId as Id<"projects">,
        iterations: parsedIterations,
        failureMix: parsedMix,
      });
      setSelectedRunId(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resilience test failed to start");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <Card className="p-6 rounded-none border-border bg-white shadow-none space-y-6">
        <div>
          <h3 className="font-mono text-[14px] text-black uppercase tracking-widest">Configure a run</h3>
          <p className="text-[11px] text-black/55 mt-1">
            Replays fallback-chain, retry, and cost-ceiling behavior from this project&apos;s runtime policy against a synthetic
            mix of failures. No real provider calls, no cost — a policy simulation, not a live load test.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Iterations</label>
            <Input
              type="number"
              min="1"
              max="200"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
              className="rounded-none border-black/15 bg-white text-black font-mono h-10"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Failure mix (relative weights)</label>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(Object.keys(DEFAULT_FAILURE_MIX) as FailureMode[]).map((mode) => (
              <div key={mode} className="space-y-1">
                <span className="text-[9px] text-black/55 font-mono uppercase">{FAILURE_MODE_LABELS[mode]}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.05"
                  value={failureMix[mode]}
                  onChange={(e) => setFailureMix((current) => ({ ...current, [mode]: e.target.value }))}
                  className="rounded-none border-black/15 bg-white text-black font-mono h-9"
                />
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 text-red-600 text-[11px] font-mono">
            <AlertCircle className="size-3" />
            {error}
          </div>
        ) : null}

        <Button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="rounded-none h-10 px-6 font-mono uppercase text-xs"
        >
          <Play className="size-4" />
          {running ? "Running..." : "Run test"}
        </Button>
      </Card>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <Card className="p-4 rounded-none border-border bg-white shadow-none space-y-3">
          <h3 className="font-mono text-[11px] text-black uppercase tracking-widest">Past runs</h3>
          {runs === undefined ? (
            <Skeleton className="h-40 w-full rounded-none" />
          ) : runs.length === 0 ? (
            <NoResilienceRuns />
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <button
                  key={run._id}
                  type="button"
                  onClick={() => setSelectedRunId(run._id)}
                  className={`w-full border px-3 py-2 text-left font-mono text-[10px] uppercase ${
                    selectedRunId === run._id ? "border-black text-black" : "border-black/15 text-black/55 hover:border-black/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{run.status}</span>
                    <span>{run.iterations} iter</span>
                  </div>
                  <div className="mt-1 text-black/55">{new Date(run.createdAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <RunDetail run={selectedRun} />
      </div>
    </div>
  );
}

function RunDetail({
  run,
}: {
  run: { run: { status: string; policySnapshot: { enforcementMode: string; fallbackChain: string[] }; successCount: number; failOpenCount: number; blockedCount: number; iterations: number }; iterations: Array<{ failureMode: string; success: boolean; latencyMs: number; failOpen?: boolean }> } | null | undefined;
}) {
  const breakdown = useMemo(() => {
    if (!run) return [];
    const groups = new Map<string, { total: number; succeeded: number; totalLatency: number; failOpen: number }>();
    for (const item of run.iterations) {
      const entry = groups.get(item.failureMode) ?? { total: 0, succeeded: 0, totalLatency: 0, failOpen: 0 };
      entry.total += 1;
      if (item.success) entry.succeeded += 1;
      if (item.failOpen) entry.failOpen += 1;
      entry.totalLatency += item.latencyMs;
      groups.set(item.failureMode, entry);
    }
    return Array.from(groups.entries()).map(([mode, stats]) => ({
      mode,
      total: stats.total,
      successRate: stats.total ? stats.succeeded / stats.total : 0,
      avgLatencyMs: stats.total ? stats.totalLatency / stats.total : 0,
      failOpen: stats.failOpen,
    }));
  }, [run]);

  if (run === undefined) {
    return <Skeleton className="h-64 w-full rounded-none" />;
  }

  if (!run) {
    return (
      <Card className="flex items-center justify-center p-6 rounded-none border-border bg-white shadow-none">
        <p className="text-[11px] font-mono text-black/55 uppercase">Select a run to see results</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-none border-border bg-white shadow-none space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Status", run.run.status],
          ["Success", `${run.run.successCount}/${run.run.iterations}`],
          ["Fail-open", run.run.failOpenCount],
          ["Blocked", run.run.blockedCount],
        ].map(([label, value]) => (
          <div key={label} className="border border-black/15 p-3">
            <p className="text-[9px] uppercase tracking-widest text-black/55 font-mono">{label}</p>
            <p className="mt-2 font-mono text-lg text-black">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-black/55 font-mono mb-2">
          Policy: {run.run.policySnapshot.enforcementMode} · fallback chain {run.run.policySnapshot.fallbackChain.join(" → ")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-black/15 text-left text-black/55 uppercase text-[9px] tracking-widest">
                <th className="py-2 pr-4">Failure mode</th>
                <th className="py-2 pr-4">Iterations</th>
                <th className="py-2 pr-4">Success rate</th>
                <th className="py-2 pr-4">Avg latency</th>
                <th className="py-2">Fail-open</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.mode} className="border-b border-black/10 text-black/70">
                  <td className="py-2 pr-4">{FAILURE_MODE_LABELS[row.mode] ?? row.mode}</td>
                  <td className="py-2 pr-4">{row.total}</td>
                  <td className="py-2 pr-4">{Math.round(row.successRate * 100)}%</td>
                  <td className="py-2 pr-4">{Math.round(row.avgLatencyMs)}ms</td>
                  <td className="py-2">{row.failOpen || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
