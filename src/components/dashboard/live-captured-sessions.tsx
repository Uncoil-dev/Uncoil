"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LiveCapturedSessions({ projectId, sessionId }: { projectId: string; sessionId?: string }) {
  const createAnnotation = useMutation(api.annotations.create);
  const promoteTraceToDataset = useMutation(api.evaluation.promoteTraceToDataset);
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const sessions = useQuery(api.sessions.listByProject, projectId ? { projectId: projectId as Id<"projects">, limit: 100 } : "skip");
  const selected = useQuery(api.sessions.getBySessionId, sessionId ? { projectId: projectId as Id<"projects">, sessionId } : "skip");
  const runs = useQuery(api.sessions.getRecentRuns, sessionId ? { projectId: projectId as Id<"projects">, sessionId } : "skip");
  const datasets = useQuery(api.evaluation.listDatasets, projectId ? { projectId: projectId as Id<"projects"> } : "skip");

  if (project === undefined || project === null || sessions === undefined || datasets === undefined || (sessionId && (selected === undefined || runs === undefined))) {
    return <div className="captured-build-loading">Loading sessions…</div>;
  }

  const sessionRecords = sessions.map((session) => ({
    id: session.sessionId,
    name: session.sessionId,
    status: session.latestStatus,
    environment: session.environment ?? "default",
    timestamp: formatTime(session.lastSeenAt),
    cost: `$${session.totalCostUsd.toFixed(5)}`,
    model: session.traceName ?? "session",
    userId: session.endUserId,
    sessionId: session.sessionId,
  }));
  const traceRecords = (runs ?? []).map((run) => ({
    id: run.runId,
    name: run.runId,
    status: run.status,
    environment: run.environment ?? "default",
    timestamp: formatTime(run.startedAt),
    latency: run.finishedAt ? `${((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(2)}s` : "running",
    cost: `$${run.totalCostUsd.toFixed(5)}`,
    model: run.primaryModel,
    sessionId: run.sessionId,
  }));
  const environments = ["all", ...Array.from(new Set(sessionRecords.map((record) => record.environment)))];
  const workspace = {
      ...sandboxWorkspace,
    mode: "live" as const,
    readOnly: false,
    dataSource: "uncoil-live" as const,
    project: { id: projectId, name: project.name, organizationName: "Workspace" },
    environments,
    models: Array.from(new Set(traceRecords.map((record) => record.model).filter((model): model is string => Boolean(model)))),
      collections: {
      ...sandboxWorkspace.collections,
      sessions: { description: "Review multi-turn and multi-step agent activity grouped into a single operational view.", records: sessionRecords },
      tracing: { description: "Inspect traces linked to this session.", records: traceRecords },
      datasets: { description: "Curated evidence sets for repeatable evaluation.", records: datasets.map((dataset) => ({ id: dataset._id, name: dataset.name, status: "Available", environment: dataset.access ?? "project", timestamp: formatTime(new Date(dataset.updatedAt).toISOString()), model: `${dataset.items.length} items` })) },
    },
    metrics: { ...sandboxWorkspace.metrics, traces: traceRecords.length, observations: traceRecords.length },
  };

  async function annotateSession(input: { sessionId: string }) {
    await createAnnotation({ projectId: projectId as Id<"projects">, traceId: input.sessionId, label: "session-review", notes: "Review session traces and outputs." });
  }
  async function addSessionToDataset(input: { sessionId: string; datasetId: string }) {
    const trace = traceRecords.find((record) => record.sessionId === input.sessionId);
    await promoteTraceToDataset({ projectId: projectId as Id<"projects">, datasetId: input.datasetId as Id<"datasets">, traceId: trace?.id ?? input.sessionId, input: `Session ${input.sessionId}` });
  }
  return <CapturedWorkspace workspace={workspace} segments={sessionId ? ["sessions", sessionId] : ["sessions"]} onSessionAnnotate={annotateSession} onSessionAddToDataset={addSessionToDataset} />;
}
