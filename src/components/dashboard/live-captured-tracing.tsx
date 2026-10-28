"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

export function LiveCapturedTracing({ projectId, runId }: { projectId: string; runId?: string }) {
  const [startedAtAfter] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString());
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const runs = usePaginatedQuery(
    api.agentRuns.getRunsPageByProject,
    projectId ? { projectId: projectId as Id<"projects">, status: "all", startedAtAfter } : "skip",
    { initialNumItems: 50 },
  );

  if (project === undefined || project === null || runs.status === "LoadingFirstPage") {
    return <div className="captured-build-loading">Loading traces…</div>;
  }

  const records = runs.results.map((run) => ({
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
  const environments = ["all", ...Array.from(new Set(records.map((record) => record.environment).filter(Boolean)))];
  const models = Array.from(new Set(records.map((record) => record.model).filter((model): model is string => Boolean(model))));
  const workspace = {
    ...sandboxWorkspace,
    mode: "live" as const,
    readOnly: false,
    dataSource: "uncoil-live" as const,
    project: { id: projectId, name: project.name, organizationName: "Workspace" },
    environments,
    models: models.length ? models : sandboxWorkspace.models,
    collections: { ...sandboxWorkspace.collections, tracing: { description: "Inspect every trace and observation emitted by instrumented agents.", records } },
    metrics: { ...sandboxWorkspace.metrics, traces: records.length, observations: records.length },
  };

  return <CapturedWorkspace workspace={workspace} segments={runId ? ["tracing", runId] : ["tracing"]} />;
}
