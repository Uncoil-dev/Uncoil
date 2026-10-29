"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

export function LiveCapturedDashboards({ projectId, dashboardId }: { projectId: string; dashboardId?: string }) {
  const createDashboard = useMutation(api.dashboards.create);
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const dashboards = useQuery(api.dashboards.list, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  if (project === undefined || project === null || dashboards === undefined) return <div className="captured-build-loading">Loading dashboards…</div>;
  const records = dashboards.map((dashboard) => ({ id: dashboard._id, name: dashboard.name, status: dashboard.isDefault ? "Default" : "Saved", environment: "all", timestamp: new Date(dashboard.updatedAt).toLocaleDateString(), model: `${dashboard.widgets.length} widgets` }));
  const workspace = { ...sandboxWorkspace, mode: "live" as const, readOnly: false, dataSource: "uncoil-live" as const, project: { id: projectId, name: project.name, organizationName: "Workspace" }, collections: { ...sandboxWorkspace.collections, dashboards: { description: "Saved views for cost, quality, latency, and trace volume.", records } } };
  async function saveDashboard(input: { name: string }) {
    await createDashboard({ projectId: projectId as Id<"projects">, name: input.name });
  }
  return <CapturedWorkspace workspace={workspace} segments={dashboardId ? ["dashboards", dashboardId] : ["dashboards"]} onDashboardCreate={saveDashboard} />;
}
