"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Send } from "lucide-react";
import { captureAnalytics } from "@/lib/analytics";
import { getDeploymentRegion, getUncoilRegion, getWrongRegion } from "@/lib/regions";

export type ProbeState = "idle" | "sending" | "accepted" | "failed";

/** Sends one test span so people can tell "Uncoil is broken" from "my agent is not sending". */
export function ConnectionCheck({
  apiKey,
  projectReady,
  elapsed,
  probeState,
  onProbeState,
}: {
  apiKey: string;
  projectReady: "checking" | "pass" | "fail";
  elapsed: number;
  probeState: ProbeState;
  onProbeState: (state: ProbeState) => void;
}) {
  const [health, setHealth] = useState<"checking" | "healthy" | "unavailable">("checking");
  const [message, setMessage] = useState("");
  const region = getUncoilRegion(getDeploymentRegion());
  const wrongRegion = useMemo(() => getWrongRegion(apiKey, region.id), [apiKey, region.id]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/region", { cache: "no-store" })
      .then((response) => { if (!cancelled) setHealth(response.ok ? "healthy" : "unavailable"); })
      .catch(() => { if (!cancelled) setHealth("unavailable"); });
    return () => { cancelled = true; };
  }, []);

  async function sendProbe() {
    if (!apiKey) {
      onProbeState("failed");
      setMessage("The key is no longer in this browser session. Go back one step and copy it again, or make a new one in API keys.");
      return;
    }
    onProbeState("sending");
    setMessage("");
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
          input: "Uncoil onboarding connection check",
          output: "Connection accepted",
          traceName: "uncoil-onboarding-check",
          environment: "onboarding",
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `Ingest returned HTTP ${response.status}`);
      }
      onProbeState("accepted");
      setMessage("Your key and our servers work. This was only a test, so we are still waiting for a real run from your agent.");
      captureAnalytics("onboarding_probe_accepted", { region: region.id });
    } catch (error) {
      const text = error instanceof Error ? error.message : "The test span could not be sent.";
      onProbeState("failed");
      setMessage(text);
      captureAnalytics("onboarding_probe_failed", { region: region.id, error: text.slice(0, 120) });
    }
  }

  return (
    <details className="group border border-white/15 bg-white/[0.04]" open={elapsed >= 60 ? true : undefined}>
      <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 marker:hidden hover:text-[#f4d44d]">+ Not seeing anything? Check the connection</summary>
      <div className="border-t border-white/10 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Project access" state={projectReady} detail={projectReady === "pass" ? "Project is ready" : projectReady === "fail" ? "Project is not available" : "Checking project access"} />
          <Row label="Cloud reachability" state={health === "checking" ? "checking" : health === "healthy" ? "pass" : "fail"} detail={health === "healthy" ? `${region.shortName} health endpoint responded` : health === "checking" ? "Checking dependencies" : "Cloud health check failed"} />
          <Row label="API key region" state={wrongRegion ? "fail" : apiKey ? "pass" : "fail"} detail={wrongRegion ? `Key belongs to ${wrongRegion.shortName}, not ${region.shortName}` : apiKey ? `${region.shortName} key is present` : "Key unavailable in this session"} />
          <Row label="Last request" state={probeState === "accepted" ? "pass" : probeState === "failed" ? "fail" : "checking"} detail={probeState === "accepted" ? "Test span accepted" : probeState === "failed" ? "Test span failed" : "No test span sent yet"} />
        </div>
        <button type="button" onClick={sendProbe} disabled={probeState === "sending" || Boolean(wrongRegion)} className="mt-5 inline-flex min-h-10 items-center gap-2 border border-[#f4d44d] bg-[#f4d44d] px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-black transition-colors hover:bg-transparent hover:text-[#f4d44d] disabled:cursor-not-allowed disabled:opacity-45">
          {probeState === "sending" ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          {probeState === "sending" ? "Sending test span" : "Send test span"}
        </button>
        {message ? <p className={`mt-3 text-sm leading-6 ${probeState === "failed" ? "text-[#f4d44d]" : "text-white/60"}`}>{message}</p> : null}
      </div>
    </details>
  );
}

function Row({ label, state, detail }: { label: string; state: "checking" | "pass" | "fail"; detail: string }) {
  const Icon = state === "checking" ? Loader2 : state === "pass" ? Check : AlertTriangle;
  return (
    <div className="flex items-start gap-3 border-t border-white/10 pt-3">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${state === "checking" ? "animate-spin text-white/45" : state === "pass" ? "text-[#f4d44d]" : "text-[#eceae3]"}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/75">{label}</p>
        <p className="mt-1 text-sm leading-5 text-white/50">{detail}</p>
      </div>
    </div>
  );
}
