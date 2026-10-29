"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

export function LiveCapturedExperiments({ projectId }: { projectId: string }) {
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const experiments = useQuery(api.experiments.list, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  if (project === undefined || project === null || experiments === undefined) return <div className="captured-build-loading">Loading experiments…</div>;
  const records = experiments.map((experiment) => ({ id: experiment._id, name: experiment.name, status: experiment.status, environment: "all", timestamp: new Date(experiment.createdAt).toLocaleDateString(), latency: experiment.avgLatencyMs === null ? undefined : `${experiment.avgLatencyMs.toFixed(0)}ms`, cost: `$${experiment.totalCostUsd.toFixed(5)}`, model: experiment.model ?? "default", score: experiment.avgScore === null ? undefined : experiment.avgScore.toFixed(2) }));
  const workspace = { ...sandboxWorkspace, mode: "live" as const, readOnly: false, dataSource: "uncoil-live" as const, project: { id: projectId, name: project.name, organizationName: "Workspace" }, collections: { ...sandboxWorkspace.collections, experiments: { description: "Compare prompts, models, quality, cost, and latency across controlled runs.", records } } };
  return <CapturedWorkspace workspace={workspace} segments={["experiments"]} />;
}
