"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CapturedWorkspace } from "@/features/dashboard-workspace/components/captured-workspace";
import { sandboxWorkspace } from "@/features/dashboard-workspace/sandbox-data";

export function LiveCapturedPrompts({ projectId }: { projectId: string }) {
  const createPrompt = useMutation(api.prompts.create);
  const createVersion = useMutation(api.prompts.createVersion);
  const updatePrompt = useMutation(api.prompts.update);
  const project = useQuery(api.projects.getProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const prompts = useQuery(api.prompts.list, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  if (project === undefined || project === null || prompts === undefined) return <div className="captured-build-loading">Loading prompts…</div>;
  const records = prompts.map((prompt) => {
    const version = prompt.versions[0];
    return { id: prompt._id, name: prompt.name, status: version?.labels.includes("production") ? "Production" : "Draft", environment: "all", timestamp: new Date(prompt.updatedAt).toLocaleDateString(), model: version?.model ?? "—", input: version?.content ?? "" };
  });
  const workspace = { ...sandboxWorkspace, mode: "live" as const, readOnly: false, dataSource: "uncoil-live" as const, project: { id: projectId, name: project.name, organizationName: "Workspace" }, collections: { ...sandboxWorkspace.collections, prompts: { description: "Version, test, and promote prompts used by your agents.", records } } };
  async function savePrompt(input: { promptId?: string; name: string; type: "text" | "chat"; content: string }) {
    const typedProjectId = projectId as Id<"projects">;
    if (input.promptId) {
      await updatePrompt({ projectId: typedProjectId, promptId: input.promptId as Id<"prompts">, name: input.name });
      await createVersion({ projectId: typedProjectId, promptId: input.promptId as Id<"prompts">, content: input.content });
      return;
    }
    await createPrompt({ projectId: typedProjectId, name: input.name, type: input.type, content: input.content });
  }
  return <CapturedWorkspace workspace={workspace} segments={["prompts"]} onPromptSave={savePrompt} />;
}
