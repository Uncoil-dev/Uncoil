"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

function formatTime(value: string | number) { return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export function LiveCapturedUsers({ projectId, userId }: { projectId: string; userId?: string }) {
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const sessions = useQuery(api.sessions.listByProject, projectId ? { projectId: projectId as Id<"projects">, limit: 250 } : "skip");
  if (project === undefined || project === null || sessions === undefined) return <div className="captured-build-loading">Loading users…</div>;
  const grouped = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) if (session.endUserId && !grouped.has(session.endUserId)) grouped.set(session.endUserId, session);
  const records = Array.from(grouped.entries()).map(([id, session]) => ({ id, name: id, status: session.latestStatus, environment: session.environment ?? "default", timestamp: formatTime(session.lastSeenAt), cost: `$${session.totalCostUsd.toFixed(5)}`, model: session.traceName ?? "user activity", userId: id, sessionId: session.sessionId }));
  const workspace = { ...sandboxWorkspace, mode: "live" as const, readOnly: false, dataSource: "uncoil-live" as const, project: { id: projectId, name: project.name, organizationName: "Workspace" }, environments: ["all", ...Array.from(new Set(records.map((record) => record.environment)))], collections: { ...sandboxWorkspace.collections, users: { description: "Review activity and performance by end user.", records } }, metrics: { ...sandboxWorkspace.metrics, traces: sessions.length, observations: sessions.reduce((total, session) => total + session.spanCount, 0) } };
  return <CapturedWorkspace workspace={workspace} segments={userId ? ["users", userId] : ["users"]} />;
}
