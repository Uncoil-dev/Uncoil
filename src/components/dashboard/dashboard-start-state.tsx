"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { buttonVariants } from "@/components/ui/button";

import {
  hasOneTimeApiKey,
  subscribeToOneTimeApiKey,
} from "@/lib/onboarding-client-state";

const PROJECT_ID_STORAGE_KEY = "uncoil.onboarding.projectId";
const API_KEY_COPIED_STORAGE_KEY = "uncoil.onboarding.apiKeyCopied";
const INSTALL_READY_STORAGE_KEY = "uncoil.onboarding.installReady";

function getOnboardingSessionSnapshot() {
  const projectId = window.sessionStorage.getItem(PROJECT_ID_STORAGE_KEY) ?? "";
  const hasAvailableKey = hasOneTimeApiKey();
  const hasCopiedKey =
    window.sessionStorage.getItem(API_KEY_COPIED_STORAGE_KEY) === "true";

  return JSON.stringify({ projectId, hasAvailableKey, hasCopiedKey });
}

function getServerOnboardingSessionSnapshot() {
  return JSON.stringify({
    projectId: "",
    hasAvailableKey: false,
    hasCopiedKey: false,
  });
}

const quickstarts = {
  python: {
    label: "Python",
    code: `from uncoil import trace_agent

@trace_agent()
async def research_agent(query):
    return await run(query)`,
  },
  typescript: {
    label: "TypeScript",
    code: `import { traceAgent } from "uncoil-sdk"

const researchAgent = traceAgent(async (query: string) => {
  return await run(query)
})`,
  },
};

type ChecklistStatus = "completed" | "current" | "pending";

export function DashboardStartState({ projectId }: { projectId?: string }) {
  const [tab, setTab] = useState<keyof typeof quickstarts>("python");
  const onboardingSessionSnapshot = useSyncExternalStore(
    subscribeToOneTimeApiKey,
    getOnboardingSessionSnapshot,
    getServerOnboardingSessionSnapshot,
  );
  const onboardingSession = JSON.parse(onboardingSessionSnapshot) as {
    projectId: string;
    hasAvailableKey: boolean;
    hasCopiedKey: boolean;
  };
  const active = quickstarts[tab];
  const effectiveProjectId = projectId ?? onboardingSession.projectId;
  const hasProject = Boolean(effectiveProjectId);
  const onboardingState = useQuery(
    api.agentRuns.getProjectOnboardingState,
    effectiveProjectId ? { projectId: effectiveProjectId as Id<"projects"> } : "skip",
  );
  const installReady = typeof window !== "undefined" && window.sessionStorage.getItem(INSTALL_READY_STORAGE_KEY) === "true";
  const hasFirstTrace = onboardingState?.hasReceivedFirstSpan === true;
  const persistedStep = onboardingState?.onboardingStep ?? null;
  const checklist = [
    { label: "Create project", status: hasProject ? "completed" : "current" },
    { label: "Copy API key", status: onboardingSession.hasCopiedKey ? "completed" : hasProject ? "current" : "pending" },
    { label: "Install SDK", status: installReady ? "completed" : onboardingSession.hasCopiedKey ? "current" : "pending" },
    { label: "Run your agent", status: hasFirstTrace ? "completed" : installReady ? "current" : "pending" },
    { label: "Open first trace", status: hasFirstTrace ? "current" : "pending" },
  ] satisfies Array<{ label: string; status: ChecklistStatus }>;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="border border-black/15 bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-4 border-b border-black/15 pb-4">
          <div className="min-w-0">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-black/55">
              {hasProject ? "overview.empty_state" : "workspace.empty_state"}
            </div>
            <h1 className="font-mono text-2xl normal-case tracking-normal text-black">
              {hasProject ? "No spans received yet." : "Create your first project."}
            </h1>
          </div>
          <div className="hidden border border-black/15 bg-[#f3f2ed] px-3 py-2 text-[12px] text-[#7d5e00] sm:block">
            {hasProject ? "waiting for first span" : "no project"}
          </div>
        </div>
        <p className="max-w-2xl font-sans text-sm leading-6 text-black/60">
          {hasProject
            ? "Install the SDK and run your agent. Your first span will appear here in real time."
            : "Projects hold your API keys, agent runs, alerts, and trace history."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="border border-black/15 bg-white p-5">
          <div className="mb-5 flex items-center justify-between border-b border-black/15 pb-4">
            <h2 className="font-mono text-[15px] text-black">Launch plan</h2>
            <span className="text-[11px] uppercase tracking-wide text-black/55">
              activation
            </span>
          </div>
          <ol className="space-y-3">
            {checklist.map((item, index) => (
              <li
                key={item.label}
                className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border border-black/15 bg-[#f3f2ed] px-3 py-3"
              >
                <span className="text-[12px] text-black/55">{index + 1}</span>
                <span className="text-[13px] text-black/70">{item.label}</span>
                <StatusDot status={item.status} />
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={hasProject ? (persistedStep === "api-key" ? "/onboarding/api-key" : persistedStep === "install" ? "/onboarding/install" : persistedStep === "waiting" ? "/onboarding/waiting" : `/dashboard/${effectiveProjectId}/quickstart`) : "/onboarding/project"}
              className={buttonVariants({
                variant: "default",
                className: "h-9 px-4 uppercase",
              })}
            >
              {hasProject ? "Continue setup" : "Create project"}
            </Link>
            <Link
              href={hasFirstTrace ? `/dashboard/${effectiveProjectId}/runs` : "/demo"}
              className={buttonVariants({
                variant: "secondary",
                className: "h-9 px-4 uppercase",
              })}
            >
              {hasFirstTrace ? "Open your runs" : "Explore seeded demo"}
            </Link>
          </div>
        </section>

        <section className="border border-black/15 bg-white p-5">
          <div className="mb-5 flex items-center justify-between border-b border-black/15 pb-4">
            <h2 className="font-mono text-[15px] text-black">
              Send your first span
            </h2>
            <span className="text-[11px] uppercase tracking-wide text-black/55">
              sdk
            </span>
          </div>
          <div className="mb-4 flex border border-black/15">
            {Object.entries(quickstarts).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as keyof typeof quickstarts)}
                className={
                  key === tab
                    ? "h-9 flex-1 bg-black text-[13px] text-white"
                    : "h-9 flex-1 bg-[#f3f2ed] text-[13px] text-black/55 transition-colors hover:bg-[#f3f2ed] hover:text-black/70"
                }
              >
                {value.label}
              </button>
            ))}
          </div>
          <pre className="min-h-48 overflow-x-auto border border-black bg-[#050505] p-4 text-sm leading-6 text-[#f4d44d]">
            <code>{active.code}</code>
          </pre>
        </section>
      </div>

      <section className="grid gap-6 border border-black/15 bg-white p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wide text-black/55">
            sample trace
          </div>
          <h2 className="font-mono text-[15px] text-black">
            Inspect a completed run while your first span is pending.
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-black/60">
            This is a seeded example for exploring the workflow. It is separate
            from your project data and does not represent a customer run.
          </p>
        </div>
        <Link
          href={hasFirstTrace ? `/dashboard/${effectiveProjectId}/runs` : "/demo"}
          className={buttonVariants({
            variant: "secondary",
            className: "h-9 px-4 uppercase",
          })}
        >
          {hasFirstTrace ? "Open your runs" : "Explore seeded demo"}
        </Link>
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: ChecklistStatus }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-2 text-[11px] text-[#047857]">
        <span className="size-2 bg-[#10B981]" />
        completed
      </span>
    );
  }

  if (status === "current") {
    return (
      <span className="flex items-center gap-2 text-[11px] text-[#7d5e00]">
        <span className="size-2 bg-[#047857]" />
        current
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-[11px] text-black/55">
      <span className="size-2 bg-black/40" />
      pending
    </span>
  );
}
