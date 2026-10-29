"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

type Section = "evaluators" | "datasets" | "scores";

export function LiveCapturedEvaluation({ projectId, section }: { projectId: string; section: Section }) {
  const createEvaluator = useMutation(api.evaluators.create);
  const createDataset = useMutation(api.evaluation.createDataset);
  const setEvaluatorActive = useMutation(api.evaluators.setActive);
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const evaluators = useQuery(api.evaluators.list, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const datasets = useQuery(api.evaluation.listDatasets, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const scores = useQuery(api.evaluation.listScores, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  if (project === undefined || project === null || evaluators === undefined || datasets === undefined || scores === undefined) return <div className="captured-build-loading">Loading evaluation data…</div>;
  const records = {
    evaluators: evaluators.map((item) => ({ id: item._id, name: item.name, status: item.active ? "Enabled" : "Disabled", environment: "all", timestamp: new Date(item.updatedAt).toLocaleDateString(), model: item.type })),
    datasets: datasets.map((item) => ({ id: item._id, name: item.name, status: "Available", environment: item.access, timestamp: new Date(item.updatedAt).toLocaleDateString(), model: `${item.items.length} items` })),
    scores: scores.map((item) => ({ id: item._id, name: item.name, status: "Recorded", environment: "all", timestamp: new Date(item.createdAt).toLocaleDateString(), score: String(item.value), model: item.source })),
  };
  const workspace = { ...sandboxWorkspace, mode: "live" as const, readOnly: false, dataSource: "uncoil-live" as const, project: { id: projectId, name: project.name, organizationName: "Workspace" }, collections: { ...sandboxWorkspace.collections, [section]: { description: `Live ${section} records.`, records: records[section] } } };
  async function saveEvaluator(input: { name: string; type: "code" | "llm_judge"; criteria: string }) {
    await createEvaluator({ projectId: projectId as Id<"projects">, ...input });
  }
  async function saveDataset(input: { name: string; description: string }) {
    await createDataset({ projectId: projectId as Id<"projects">, ...input });
  }
  async function toggleEvaluator(input: { evaluatorId: string; active: boolean }) {
    await setEvaluatorActive({ projectId: projectId as Id<"projects">, evaluatorId: input.evaluatorId as Id<"evaluators">, active: input.active });
  }
  return <CapturedWorkspace workspace={workspace} segments={[section]} onEvaluatorCreate={section === "evaluators" ? saveEvaluator : undefined} onDatasetCreate={section === "datasets" ? saveDataset : undefined} onEvaluatorToggle={section === "evaluators" ? toggleEvaluator : undefined} />;
}
