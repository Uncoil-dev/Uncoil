"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Send } from "lucide-react";
import { captureAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "convex/react";

import { OnboardingHeader } from "@/components/onboarding/onboarding-shell";
import { clearOneTimeApiKey, getOneTimeApiKey } from "@/lib/onboarding-client-state";
import { getDeploymentRegion, getTracifyRegion, getWrongRegion } from "@/lib/regions";

const PROJECT_ID_STORAGE_KEY = "tracify.onboarding.projectId";
const PROJECT_NAME_STORAGE_KEY = "tracify.onboarding.projectName";
const FALLBACK_PROJECT_NAME = "research-agent-prod";

export function WaitingStep() {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [health, setHealth] = useState<"checking" | "healthy" | "unavailable">("checking");
  const [probeState, setProbeState] = useState<"idle" | "sending" | "accepted" | "failed">("idle");
  const [probeMessage, setProbeMessage] = useState("");
  const capturedFirstTrace = useRef(false);
  const [projectId, setProjectId] = useState("");
  const [fallbackProjectName, setFallbackProjectName] = useState(FALLBACK_PROJECT_NAME);
  const [apiKeyDisplay, setApiKeyDisplay] = useState("tracify_sk_live_...");
  const [apiKey, setApiKey] = useState("");
  const { data: session } = authClient.useSession();
  const region = getTracifyRegion(getDeploymentRegion());
  const wrongRegion = useMemo(() => getWrongRegion(apiKey, region.id), [apiKey, region.id]);
  const onboardingState = useQuery(
    api.agentRuns.getProjectOnboardingState,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const updateProgress = useMutation(api.projects.updateOnboardingProgress);
  const recentRuns = useQuery(
    api.agentRuns.listByProject,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  // The built-in test span is a real run, so it must never count as "your agent connected".
  const realFirstRun = useMemo(
    () => (recentRuns ?? []).filter((run) => !run.runId.startsWith("onboarding-")).at(-1) ?? null,
    [recentRuns],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      const storedProjectId = window.sessionStorage.getItem(PROJECT_ID_STORAGE_KEY) ?? "";
      const storedProjectName = window.sessionStorage.getItem(PROJECT_NAME_STORAGE_KEY) ?? FALLBACK_PROJECT_NAME;
      const storedApiKey = getOneTimeApiKey();
      setProjectId(storedProjectId);
      setFallbackProjectName(storedProjectName);
      setApiKey(storedApiKey);
      if (storedApiKey) setApiKeyDisplay(`tracify_sk_live_...${storedApiKey.slice(-4)}`);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!realFirstRun || !projectId) return;
    void updateProgress({ projectId: projectId as Id<"projects">, step: "success" });
    router.push(`/onboarding/success?projectId=${projectId}&runId=${realFirstRun.runId}`);
  }, [realFirstRun, projectId, updateProgress, router]);

  useEffect(() => {
    if (!realFirstRun || !onboardingState || capturedFirstTrace.current) return;
    capturedFirstTrace.current = true;
    if (session?.user.email) {
      void fetch("/api/lifecycle/first-trace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.user.email, name: session.user.name, projectId: onboardingState.projectId, runId: realFirstRun.runId }) }).catch(() => undefined);
    }
    captureAnalytics("first_trace_received", {
      elapsed_seconds: elapsed,
      source: probeState === "accepted" ? "onboarding_probe" : "agent",
      region: region.id,
    });
  }, [elapsed, onboardingState, realFirstRun, probeState, region.id, session?.user.email, session?.user.name]);

  useEffect(() => () => clearOneTimeApiKey(), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/region", { cache: "no-store" })
      .then((response) => {
        if (cancelled) return;
        setHealth(response.ok ? "healthy" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setHealth("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendProbe() {
    if (!apiKey) {
      setProbeState("failed");
      setProbeMessage("The API key is no longer available in this browser session. Return to the API key step and copy it again.");
      return;
    }
    setProbeState("sending");
    setProbeMessage("");
    const runId = `onboarding-${crypto.randomUUID()}`;
    try {
      const response = await fetch(`${window.location.origin}/api/ingest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          spanId: `${runId}-span`,
          runId,
          spanType: "run_end",
          createdAt: new Date().toISOString(),
          latencyMs: 1,
          input: "Tracify onboarding connection check",
          output: "Connection accepted",
          traceName: "tracify-onboarding-check",
          environment: "onboarding",
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `Ingest returned HTTP ${response.status}`);
      }
      setProbeState("accepted");
      setProbeMessage("Your key and our servers work. This was only a test, so we are still waiting for a real run from your agent.");
      captureAnalytics("onboarding_probe_accepted", { region: region.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The test span could not be sent.";
      setProbeState("failed");
      setProbeMessage(message);
      captureAnalytics("onboarding_probe_failed", { region: region.id, error: message.slice(0, 120) });
    }
  }

  const projectName = onboardingState?.projectName ?? fallbackProjectName;
  const keyDisplay =
    onboardingState?.apiKeyPrefix && onboardingState.apiKeyLast4
      ? `${onboardingState.apiKeyPrefix}...${onboardingState.apiKeyLast4}`
      : apiKeyDisplay;

  return (
    <div>
      <OnboardingHeader
        title="Now run your agent."
        description="Start it the way you normally do. The second your first run arrives, this page lights up on its own."
      />
      <div className="border border-black bg-[#090909] px-6 py-5 text-[#eceae3]">
        <div className="flex items-center gap-4">
          <span className="relative flex size-3 shrink-0" aria-hidden="true">
            <span className="absolute inset-0 animate-ping bg-[#f4d44d] opacity-60 motion-reduce:animate-none" style={{ animationDuration: "2.4s" }} />
            <span className="relative size-3 bg-[#f4d44d]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Listening for a run</p>
            <p className="mt-1 truncate font-pixel text-2xl tracking-[-0.05em]">{projectName}</p>
          </div>
          <p className="font-mono text-sm tabular-nums text-[#f4d44d]">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</p>
        </div>
        <p className="mt-4 truncate border-t border-white/10 pt-3 font-mono text-[11px] text-white/45">{keyDisplay}</p>
      </div>

      <details className="group mt-5 border border-black/15 bg-[#f3f2ed]">
        <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-black/60 marker:hidden hover:text-black">+ Not seeing anything? Check the connection</summary>
        <div className="border-t border-black/10">
      <div className="bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Connection diagnostics</p>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-black/45">{elapsed}s</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DiagnosticRow label="Project access" state={!projectId || onboardingState === null ? "fail" : onboardingState === undefined ? "checking" : "pass"} detail={!projectId ? "Project context missing" : onboardingState === null ? "Project is not available" : onboardingState === undefined ? "Checking project access" : "Project is ready"} />
          <DiagnosticRow label="Cloud reachability" state={health === "checking" ? "checking" : health === "healthy" ? "pass" : "fail"} detail={health === "healthy" ? `${region.shortName} health endpoint responded` : health === "checking" ? "Checking dependencies" : "Cloud health check failed"} />
          <DiagnosticRow label="API key region" state={wrongRegion ? "fail" : apiKey ? "pass" : "fail"} detail={wrongRegion ? `Key belongs to ${wrongRegion.shortName}, not ${region.shortName}` : apiKey ? `${region.shortName} key is present` : "Key unavailable in this session"} />
          <DiagnosticRow label="Last request" state={probeState === "accepted" ? "pass" : probeState === "failed" ? "fail" : "checking"} detail={probeState === "accepted" ? "Test span accepted" : probeState === "failed" ? "Test span failed" : "No test span sent yet"} />
        </div>
        <button type="button" onClick={sendProbe} disabled={probeState === "sending" || Boolean(wrongRegion)} className="mt-5 inline-flex min-h-10 items-center gap-2 border border-black bg-black px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#f4d44d] hover:text-black disabled:cursor-not-allowed disabled:opacity-45">
          {probeState === "sending" ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          {probeState === "sending" ? "Sending test span" : "Send test span"}
        </button>
        {probeMessage ? <p className={`mt-3 text-sm leading-6 ${probeState === "failed" ? "text-[#92400E]" : "text-black/60"}`}>{probeMessage}</p> : null}
      </div>

        </div>
      </details>

      {!projectId ? (
        <div className="mt-5 border border-black/15 bg-[#f3f2ed] p-4 font-sans text-sm leading-6 text-black/60">
          Project context is no longer available in this browser session. Create
          a project again to listen for first-span activation.
        </div>
      ) : null}

      {elapsed >= 30 ? (
        <Link
          href="/demo"
          className="mt-5 block text-sm text-black/60 underline underline-offset-4 transition-colors hover:text-black"
        >
          Explore sample trace
        </Link>
      ) : null}
      {elapsed >= 30 && probeState === "idle" ? (
        <div className="mt-5 border border-black/15 bg-[#f3f2ed] p-4 font-sans text-sm leading-6 text-black/60">
          Use the test span above to separate a Tracify connection problem from an agent setup problem. If it is accepted, your SDK or agent is the next place to inspect.
        </div>
      ) : null}
      <button type="button" onClick={() => router.push(projectId ? `/dashboard/${projectId}/tracing` : "/dashboard")} className="mt-6 block font-mono text-[11px] uppercase tracking-[0.12em] text-black/55 underline underline-offset-4 hover:text-black">Skip for now, I&apos;ll connect later</button>
      {elapsed >= 120 ? (
        <a
          href="mailto:support@tracify.tech"
          className="mt-5 inline-block text-sm text-black/60 underline underline-offset-4 transition-colors hover:text-black"
        >
          Still stuck? Email support
        </a>
      ) : null}
    </div>
  );
}

function DiagnosticRow({ label, state, detail }: { label: string; state: "checking" | "pass" | "fail"; detail: string }) {
  const Icon = state === "checking" ? Loader2 : state === "pass" ? Check : AlertTriangle;
  return (
    <div className="flex items-start gap-3 border-t border-black/10 pt-3">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${state === "checking" ? "animate-spin text-black/45" : state === "pass" ? "text-[#166534]" : "text-[#92400E]"}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-black/70">{label}</p>
        <p className="mt-1 text-sm leading-5 text-black/55">{detail}</p>
      </div>
    </div>
  );
}
