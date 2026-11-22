"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import { captureAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

import { QuickstartGuide } from "@/components/dashboard/quickstart-guide";
import { ConnectionCheck, type ProbeState } from "@/components/onboarding/connection-check";
import { FirstRunPanel } from "@/components/onboarding/first-run-panel";
import { publishOnboardingDraft } from "@/components/onboarding/onboarding-draft";
import { OnboardingHeader } from "@/components/onboarding/onboarding-shell";
import { clearOneTimeApiKey, getOneTimeApiKey } from "@/lib/onboarding-client-state";
import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";

const PROJECT_ID_STORAGE_KEY = "uncoil.onboarding.projectId";
const PROJECT_NAME_STORAGE_KEY = "uncoil.onboarding.projectName";
const INSTALL_READY_STORAGE_KEY = "uncoil.onboarding.installReady";
const FALLBACK_PROJECT_NAME = "your-project";

export function InstallStep() {
  const updateProgress = useMutation(api.projects.updateOnboardingProgress);
  const [elapsed, setElapsed] = useState(0);
  const [probeState, setProbeState] = useState<ProbeState>("idle");
  const [projectId, setProjectId] = useState("");
  const [fallbackName, setFallbackName] = useState(FALLBACK_PROJECT_NAME);
  const [apiKey, setApiKey] = useState("");
  const capturedFirstTrace = useRef(false);
  const { data: session } = authClient.useSession();
  const region = getUncoilRegion(getDeploymentRegion());

  // Session storage is only readable after mount.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setProjectId(window.sessionStorage.getItem(PROJECT_ID_STORAGE_KEY) ?? "");
      setFallbackName(window.sessionStorage.getItem(PROJECT_NAME_STORAGE_KEY) ?? FALLBACK_PROJECT_NAME);
      setApiKey(getOneTimeApiKey());
      window.sessionStorage.setItem(INSTALL_READY_STORAGE_KEY, "true");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const onboardingState = useQuery(
    api.agentRuns.getProjectOnboardingState,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const recentRuns = useQuery(
    api.agentRuns.listByProject,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  // The built-in test span is a real run, so it must never count as "your agent connected".
  const realFirstRun = useMemo(
    () => (recentRuns ?? []).filter((run) => !run.runId.startsWith("onboarding-")).at(-1) ?? null,
    [recentRuns],
  );

  // The page can be left open for a while. Count only until the run lands.
  useEffect(() => {
    if (realFirstRun) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [realFirstRun]);

  useEffect(() => {
    if (!realFirstRun || !projectId || !onboardingState || capturedFirstTrace.current) return;
    capturedFirstTrace.current = true;
    publishOnboardingDraft({ arrived: true });
    // The key has done its job. Do not leave it in session storage.
    clearOneTimeApiKey();
    // Someone coming back to a project that already has a run should not trigger the welcome email again.
    if (onboardingState.onboardingStep === "success") return;
    void updateProgress({ projectId: projectId as Id<"projects">, step: "success" });
    if (session?.user.email) {
      void fetch("/api/lifecycle/first-trace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.user.email, name: session.user.name, projectId: onboardingState.projectId, runId: realFirstRun.runId }) }).catch(() => undefined);
    }
    captureAnalytics("first_trace_received", {
      elapsed_seconds: elapsed,
      source: probeState === "accepted" ? "onboarding_probe" : "agent",
      region: region.id,
    });
  }, [elapsed, onboardingState, projectId, realFirstRun, probeState, region.id, session?.user.email, session?.user.name, updateProgress]);

  // Tell the server we reached this step, so the dashboard can send people back here.
  const savedStep = useRef(false);
  useEffect(() => {
    if (!projectId || !onboardingState || realFirstRun || onboardingState.onboardingStep === "success" || savedStep.current) return;
    savedStep.current = true;
    void updateProgress({ projectId: projectId as Id<"projects">, step: "waiting" });
  }, [projectId, onboardingState, realFirstRun, updateProgress]);

  const projectName = onboardingState?.projectName ?? fallbackName;
  const keyDisplay =
    onboardingState?.apiKeyPrefix && onboardingState.apiKeyLast4
      ? `${onboardingState.apiKeyPrefix}...${onboardingState.apiKeyLast4}`
      : apiKey
        ? `uncoil_sk_live_...${apiKey.slice(-4)}`
        : "uncoil_sk_live_...";
  const arrived = realFirstRun !== null;
  const projectReady = !projectId || onboardingState === null ? "fail" : onboardingState === undefined ? "checking" : "pass";

  return (
    <div>
      {arrived ? <OnboardingHeader title="First run in." description="Uncoil heard your agent. Open the trace and see every step." /> : null}
      {arrived ? <FirstRunPanel
        projectName={projectName}
        projectId={projectId}
        keyDisplay={keyDisplay}
        elapsed={elapsed}
        run={realFirstRun}
        probeAccepted={probeState === "accepted"}
      /> : null}
      {arrived ? null : projectId ? <QuickstartGuide projectId={projectId} apiKey={apiKey} embedded /> : null}
      {!arrived ? (
        <>
          <div className="mt-6">
            <ConnectionCheck apiKey={apiKey} projectReady={projectReady} elapsed={elapsed} probeState={probeState} onProbeState={setProbeState} />
          </div>
          {!projectId ? (
            <div className="mt-5 border border-black/15 bg-[#f3f2ed] p-4 font-sans text-sm leading-6 text-black/60">
              Project context is no longer available in this browser session. Create a project again to listen for your first run.
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {elapsed >= 30 ? (
              <Link href="/demo" className="text-sm text-black/60 underline underline-offset-4 transition-colors hover:text-black">Explore a sample trace while you wait</Link>
            ) : null}
            <Link href={projectId ? `/dashboard/${projectId}/tracing` : "/dashboard"} className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/55 underline underline-offset-4 hover:text-black">Skip for now, I&apos;ll connect later</Link>
            {elapsed >= 120 ? (
              <a href="mailto:support@uncoil.dev" className="text-sm text-black/60 underline underline-offset-4 transition-colors hover:text-black">Still stuck? Email support</a>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
