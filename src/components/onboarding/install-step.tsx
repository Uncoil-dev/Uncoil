"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import { captureAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

import { CodeCopyBlock } from "@/components/onboarding/code-copy-block";
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

const snippets = {
  python: {
    label: "Python",
    install: "pip install uncoil-sdk",
    code: `from uncoil import trace_agent

@trace_agent()
async def research_agent(query):
    return await run(query)`,
  },
  typescript: {
    label: "TypeScript",
    install: "npm install @uncoil.dev/sdk",
    code: `import { traceAgent } from "@uncoil.dev/sdk"

const researchAgent = traceAgent(async (query: string) => {
  return await run(query)
})`,
  },
  prompt: {
    label: "AI setup prompt",
    install: "",
    code: `You are integrating Uncoil into this agent project.

Goal:
Instrument the main agent run function so every run sends spans to Uncoil.

Rules:
- Do not rewrite the agent.
- Preserve existing behavior.
- Add the smallest possible instrumentation change.
- Use environment variable UNCOIL_API_KEY.
- Do not hardcode secrets.

Steps:
1. Detect whether this project is Python or TypeScript.
2. Install the Uncoil SDK with the correct command:
   - Python: pip install uncoil-sdk
   - TypeScript / Node.js: npm install @uncoil.dev/sdk
3. Add UNCOIL_API_KEY to .env.example.
4. Find the main agent function.
5. If Python, import trace_agent from uncoil and add @trace_agent().
6. If TypeScript, import traceAgent from @uncoil.dev/sdk and wrap the async agent function.
7. Run the agent once.
8. Confirm that a span was sent to Uncoil.

Use this environment variable locally:
UNCOIL_API_KEY=your_key_here`,
  },
};

export function InstallStep() {
  const updateProgress = useMutation(api.projects.updateOnboardingProgress);
  const [tab, setTab] = useState<keyof typeof snippets>("python");
  const [showSetup, setShowSetup] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [probeState, setProbeState] = useState<ProbeState>("idle");
  const [projectId, setProjectId] = useState("");
  const [fallbackName, setFallbackName] = useState(FALLBACK_PROJECT_NAME);
  const [apiKey, setApiKey] = useState("");
  const capturedFirstTrace = useRef(false);
  const { data: session } = authClient.useSession();
  const region = getUncoilRegion(getDeploymentRegion());
  const active = snippets[tab];

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
  const sdk = tab === "python" ? "python" : tab === "typescript" ? "typescript" : undefined;
  useEffect(() => {
    if (!projectId || !onboardingState || realFirstRun || onboardingState.onboardingStep === "success" || savedStep.current) return;
    savedStep.current = true;
    void updateProgress({ projectId: projectId as Id<"projects">, step: "waiting", sdk });
  }, [projectId, onboardingState, realFirstRun, sdk, updateProgress]);

  const projectName = onboardingState?.projectName ?? fallbackName;
  const keyDisplay =
    onboardingState?.apiKeyPrefix && onboardingState.apiKeyLast4
      ? `${onboardingState.apiKeyPrefix}...${onboardingState.apiKeyLast4}`
      : apiKey
        ? `uncoil_sk_live_...${apiKey.slice(-4)}`
        : "uncoil_sk_live_...";
  const envLines = `UNCOIL_API_KEY=${apiKey || "paste_your_key_here"}\nUNCOIL_REGION=${region.id}`;
  const envMasked = `UNCOIL_API_KEY=${apiKey ? keyDisplay : "paste_your_key_here"}\nUNCOIL_REGION=${region.id}`;
  const arrived = realFirstRun !== null;
  const projectReady = !projectId || onboardingState === null ? "fail" : onboardingState === undefined ? "checking" : "pass";

  const setup = (
    <>
      <div className="mb-4 grid border border-black/15 sm:grid-cols-3">
        {Object.entries(snippets).map(([key, snippet]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key as keyof typeof snippets); publishOnboardingDraft({ runtime: key }); }}
            className={
              key === tab
                ? "h-12 flex-1 bg-[#f4d44d] font-mono text-[12px] uppercase tracking-[0.08em] text-black"
                : "h-12 flex-1 bg-[#f3f2ed] font-mono text-[12px] uppercase tracking-[0.08em] text-black/55 transition-colors hover:bg-[#f3f2ed] hover:text-black/70"
            }
          >
            {snippet.label}
          </button>
        ))}
      </div>
      <CodeCopyBlock label={apiKey ? "1 · Your key, ready to paste into .env" : "1 · Add to .env"} value={envLines} displayValue={envMasked} multiline copyLabel={apiKey ? "Copy with key" : "Copy"} />
      {!apiKey ? (
        <p className="mt-2 font-sans text-xs leading-5 text-black/55">
          Keys are shown once, and this one is gone from this browser. Make a new one in <Link href={projectId ? `/dashboard/${projectId}/api-keys` : "/dashboard"} className="underline underline-offset-4 hover:text-black">API keys</Link>.
        </p>
      ) : (
        <p className="mt-2 font-sans text-xs leading-5 text-black/55">Copy puts your real key in the clipboard. The screen only shows the last 4 characters.</p>
      )}
      {tab === "prompt" ? (
        <div className="mt-4">
          <div className="mb-3 border border-black/15 bg-[#f3f2ed] px-3 py-2 font-sans text-xs leading-5 text-[#92400E]">
            Keep live API keys out of AI coding tools unless you trust them. The prompt has no key in it; the key stays in your .env.
          </div>
          <CodeCopyBlock label="2 · Paste into your AI coding tool" value={active.code} multiline collapsible copyLabel="Copy setup prompt" />
        </div>
      ) : (
        <>
          <div className="mt-4"><CodeCopyBlock label="2 · Install" value={active.install} /></div>
          <div className="mt-4"><CodeCopyBlock label="3 · Wrap your agent" value={active.code} multiline /></div>
        </>
      )}
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-black/50">Then run your agent once. Sends to Uncoil {region.shortName} · {region.origin}/api/ingest</p>
    </>
  );

  return (
    <div>
      <OnboardingHeader
        title={arrived ? "First run in." : "Send your first run."}
        description={arrived ? "Uncoil heard your agent. Open the trace and see every step." : "Copy the lines below into your agent and run it once. The status box turns yellow the second it arrives."}
      />
      <FirstRunPanel
        projectName={projectName}
        projectId={projectId}
        keyDisplay={keyDisplay}
        elapsed={elapsed}
        run={realFirstRun}
        probeAccepted={probeState === "accepted"}
      />
      <div className="mt-6">
        {arrived ? (
          <>
            <button type="button" onClick={() => setShowSetup((open) => !open)} aria-expanded={showSetup} className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/55 underline underline-offset-4 hover:text-black">
              {showSetup ? "Hide the setup code" : "Show the setup code again"}
            </button>
            {showSetup ? <div className="mt-4">{setup}</div> : null}
          </>
        ) : (
          setup
        )}
      </div>
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
