"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

export function LiveCapturedAnnotations({ projectId }: { projectId: string }) {
  const identity = useQuery(api.auth.getCurrentIdentity);
  const assignNext = useMutation(api.annotations.assignNext);
  const submitReview = useMutation(api.annotations.submitReview);
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const annotations = useQuery(api.annotations.list, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  if (project === undefined || project === null || annotations === undefined) return <div className="captured-build-loading">Loading annotation queue…</div>;
  const records = annotations.map((annotation) => ({ id: annotation._id, name: annotation.traceId, status: annotation.status, environment: "all", timestamp: new Date(annotation.createdAt).toLocaleDateString(), score: annotation.confidence === undefined ? undefined : annotation.confidence.toFixed(2), input: annotation.label ?? "Needs human review", output: annotation.notes ?? "" }));
  const workspace = { ...sandboxWorkspace, mode: "live" as const, readOnly: false, dataSource: "uncoil-live" as const, project: { id: projectId, name: project.name, organizationName: "Workspace" }, collections: { ...sandboxWorkspace.collections, "annotation-queues": { description: "Review trace evidence and capture structured human labels.", records } } };
  async function claimNext() {
    if (!identity?.subject) throw new Error("Sign in to claim a review");
    const result = await assignNext({ projectId: projectId as Id<"projects">, reviewerIds: [identity.subject], strategy: "least_loaded" });
    return result?.annotationId ?? null;
  }
  async function review(input: { annotationId: string; label: string; score?: number; notes: string }) {
    await submitReview({ projectId: projectId as Id<"projects">, annotationId: input.annotationId as Id<"annotations">, label: input.label, score: input.score, notes: input.notes });
  }
  return <CapturedWorkspace workspace={workspace} segments={["annotation-queues"]} onAnnotationClaim={claimNext} onAnnotationReview={review} />;
}
