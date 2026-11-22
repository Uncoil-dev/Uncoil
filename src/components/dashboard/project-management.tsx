"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Trash2 } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { KeyValue, Panel, StatTile } from "@/components/dashboard/project-admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { captureAnalytics } from "@/lib/analytics";

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export function ProjectManagement({ projectId }: { projectId: string }) {
  const router = useRouter();
  const summary = useQuery(api.projects.getProjectManagementSummary, projectId ? {
    projectId: projectId as Id<"projects">,
  } : "skip");
  const deleteProject = useMutation(api.projects.deleteProject);
  const [confirmationName, setConfirmationName] = useState("");
  const [confirmationWord, setConfirmationWord] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = useMemo(() => {
    if (!summary) return false;
    return (
      confirmationName === summary.project.name &&
      confirmationWord === "DELETE"
    );
  }, [confirmationName, confirmationWord, summary]);

  async function handleDelete() {
    if (!summary || !canDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteProject({
        projectId: projectId as Id<"projects">,
        confirmationName,
        confirmationWord,
      });
      if (isPostHogConfigured) {
        captureAnalytics("project_deleted");
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setIsDeleting(false);
    }
  }

  if (summary === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-none bg-[#111418]" />
        <Skeleton className="h-64 w-full rounded-none bg-[#111418]" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="border border-[#262C35] bg-[#0E1115] p-6 font-mono text-sm text-[#8B93A1]">
        Project not found or access denied.
      </div>
    );
  }

  const project = summary.project;
  const latestActivity = summary.latestActivityAt
    ? new Date(summary.latestActivityAt).toLocaleString()
    : "No runs yet";

  return (
    <div className="space-y-6">
      <div className="border border-[#262C35] bg-[#0E1115] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]">Project</div>
        <h2 className="mt-2 truncate font-pixel text-3xl tracking-[-0.05em] text-[#E6E9EE]">{project.name}</h2>
        <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
          <KeyValue label="ID" value={project._id} />
          <KeyValue label="Plan" value={project.planTier ?? "free"} />
          <KeyValue label="API key" value={project.apiKeyLast4 ? `...${project.apiKeyLast4}` : "not issued"} />
          <KeyValue label="Latest activity" value={latestActivity} />
        </dl>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Saved runs" value={summary.totals.totalRuns.toLocaleString()} detail={`${summary.totals.activeRuns} running`} />
        <StatTile label="Saved spans" value={summary.totals.totalSpans.toLocaleString()} detail={`${summary.totals.failedRuns} failed runs`} />
        <StatTile label="Saved cost" value={formatCurrency(summary.totals.totalCostUsd)} detail={`${summary.totals.alertCount} alerts`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Lifecycle">
          <dl>
            <KeyValue label="Created" value={formatDate(project.createdAt)} />
            <KeyValue label="Updated" value={formatDate(project.updatedAt)} />
            <KeyValue label="Key last used" value={formatDate(project.apiKeyLastUsedAt)} />
          </dl>
        </Panel>
        <Panel title="Limits">
          <dl>
            <KeyValue label="Cost threshold" value={formatCurrency(project.costThresholdUsd ?? 0)} />
            <KeyValue label="Max duration" value={`${project.maxDurationSeconds ?? 0}s`} />
            <KeyValue label="Max stall" value={`${project.maxStallMinutes ?? 0}m`} />
          </dl>
        </Panel>
      </div>

      <Panel title="Recent saved runs" hint="Saved activity used when analytics are unavailable.">
        <div className="divide-y divide-[#1F242C] border border-[#1F242C]">
          {summary.recentRuns.length ? (
            summary.recentRuns.map((run) => (
              <Link
                key={run._id}
                href={`/dashboard/${projectId}/runs/${run.runId}`}
                className="grid gap-3 px-4 py-3 font-mono text-[12px] text-[#8B93A1] transition-colors hover:bg-[#111418] sm:grid-cols-[minmax(0,1fr)_120px_100px_24px]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[#E6E9EE]">{run.runId}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-[#6B7380]">{run.primaryModel ?? "no model"}</div>
                </div>
                <div>{run.status}</div>
                <div>{run.spanCount} spans</div>
                <ArrowRight className="size-4 self-center justify-self-end" />
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 font-mono text-[12px] text-[#8B93A1]">No saved runs yet.</div>
          )}
        </div>
      </Panel>

      <Panel
        tone="danger"
        title="Delete project"
        hint="Removes the project plus saved runs, alerts and comments from your account. Type the exact project name, then DELETE."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={confirmationName}
            onChange={(event) => setConfirmationName(event.target.value)}
            placeholder={project.name}
            aria-label="Project name"
            className="h-10 border border-[#5a2a2a] bg-[#0B0D10] px-3 font-mono text-[12px] text-[#E6E9EE] outline-none placeholder:text-[#566070] focus:border-[#FF8A8A]"
          />
          <input
            value={confirmationWord}
            onChange={(event) => setConfirmationWord(event.target.value)}
            placeholder="DELETE"
            aria-label="Confirmation word"
            className="h-10 border border-[#5a2a2a] bg-[#0B0D10] px-3 font-mono text-[12px] text-[#E6E9EE] outline-none placeholder:text-[#566070] focus:border-[#FF8A8A]"
          />
        </div>
        {error ? <div className="mt-3 font-mono text-[11px] text-[#FF8A8A]">{error}</div> : null}
        <button
          type="button"
          disabled={!canDelete || isDeleting}
          onClick={handleDelete}
          className="mt-4 inline-flex items-center gap-2 border border-[#FF6B6B] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#FF8A8A] transition-colors hover:bg-[#FF6B6B] hover:text-[#0B0D10] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#FF8A8A]"
        >
          <Trash2 className="size-4" />
          {isDeleting ? "Deleting..." : "Delete project"}
        </button>
      </Panel>
    </div>
  );
}

function formatDate(value: number | string | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}
