"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

export function LiveCapturedHome({ projectId, surface = "home" }: { projectId: string; surface?: "home" | "costs" }) {
  const [startedAtAfter] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString());
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const runs = useQuery(api.agentRuns.getRecentRunsByProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const summary = useQuery(api.projects.getProjectManagementSummary, projectId ? { projectId: projectId as Id<"projects">, days: 30 } : "skip");
  if (project === undefined || project === null || runs === undefined || summary === undefined || summary === null) return <div className="captured-build-loading">Loading dashboard…</div>;

  const recent = runs.filter((run) => run.startedAt >= startedAtAfter);
  const records = recent.map((run) => ({
    id: run.runId,
    name: run.runId,
    status: run.status,
    environment: run.environment ?? "default",
    timestamp: new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    latency: run.finishedAt ? `${((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(2)}s` : "running",
    cost: `$${run.totalCostUsd.toFixed(5)}`,
    model: run.primaryModel,
    sessionId: run.sessionId,
  }));
  const environments = ["all", ...Array.from(new Set(records.map((record) => record.environment)))];
  const models = Array.from(new Set(records.map((record) => record.model).filter((model): model is string => Boolean(model))));
  const workspace = {
    ...sandboxWorkspace,
    mode: "live" as const,
    readOnly: false,
    dataSource: "uncoil-live" as const,
    project: { id: projectId, name: project.name, organizationName: "Workspace" },
    environments,
    models: models.length ? models : sandboxWorkspace.models,
    collections: { ...sandboxWorkspace.collections, tracing: { description: "Recent traces from this Uncoil project.", records } },
    metrics: { traces: summary.totals.totalRuns, observations: summary.totals.totalSpans, totalCost: summary.totals.totalCostUsd, scores: sandboxWorkspace.metrics.scores },
  };
  return <CapturedWorkspace workspace={workspace} segments={[surface]} />;
}
