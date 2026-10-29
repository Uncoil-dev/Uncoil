"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { captureAnalytics } from "@/lib/analytics";

import { OnboardingHeader } from "@/components/onboarding/onboarding-shell";
import { publishOnboardingDraft } from "@/components/onboarding/onboarding-draft";
import { getOneTimeApiKey } from "@/lib/onboarding-client-state";
import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

const API_KEY_COPIED_STORAGE_KEY = "uncoil.onboarding.apiKeyCopied";
const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export function ApiKeyStep() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [initialized, setInitialized] = useState(false);
  const region = getUncoilRegion(getDeploymentRegion());
  const updateProgress = useMutation(api.projects.updateOnboardingProgress);
  const projectId = typeof window !== "undefined" ? window.sessionStorage.getItem("uncoil.onboarding.projectId") : null;
  useEffect(() => {
    const id = window.setTimeout(() => {
      setApiKey(getOneTimeApiKey());
      setInitialized(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  const envContent = useMemo(
    () => (apiKey ? `UNCOIL_API_KEY=${apiKey}\nUNCOIL_REGION=${region.id}\n` : ""),
    [apiKey, region.id],
  );

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    if (isPostHogConfigured) {
      captureAnalytics("api_key_copied", { issuance_flow: "onboarding" });
    }
    window.sessionStorage.setItem(API_KEY_COPIED_STORAGE_KEY, "true");
    setCopied(true);
    publishOnboardingDraft({ keyCopied: true });
  }

  function downloadEnv() {
    if (!apiKey) return;
    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = ".env";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <OnboardingHeader
        title="Here's your key."
        description={`It works like a password for your agent, and you only see it once. Copy it now and keep it in your .env file or secrets manager, never in code. (Uncoil ${region.shortName})`}
      />
      {!initialized ? (
        <div className="border border-black/15 bg-[#f3f2ed] p-4 text-sm text-black/60">
          Loading your one-time API key...
        </div>
      ) : apiKey ? (
        <>
          <div className="relative border border-black bg-[#090909] p-5 font-mono text-sm text-[#f4d44d]">
            <span className="absolute right-3 top-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">shown once</span>
            <code className="mt-3 block break-all">{apiKey}</code>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={copyKey}
              className="h-12 border border-black bg-[#f4d44d] px-6 font-mono text-[12px] uppercase tracking-[0.1em] text-black transition-colors hover:bg-black hover:text-[#f4d44d]"
            >
              {copied ? "Copied ✓" : "Copy key"}
            </button>
            <button
              type="button"
              onClick={downloadEnv}
              className="h-12 border border-black/20 bg-[#f3f2ed] px-5 text-[13px] text-black/70 transition-colors hover:bg-[#f3f2ed] hover:text-black"
            >
              Download .env
            </button>
            <button
              type="button"
              onClick={() => {
                if (!copied && !confirmSkip) { setConfirmSkip(true); return; }
                if (projectId) void updateProgress({ projectId: projectId as Id<"projects">, step: "install" });
                router.push("/onboarding/install");
              }}
              className="h-12 border border-black bg-black px-6 font-mono text-[12px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#f4d44d] hover:text-black disabled:cursor-not-allowed disabled:border-black/15 disabled:bg-transparent disabled:text-black/40"
            >
              {!copied && confirmSkip ? "Continue without copying →" : "Continue →"}
            </button>
          </div>
          {confirmSkip && !copied ? <p className="mt-3 font-sans text-sm text-[#92400E]">You only see this key once. Copy it first, or continue and rotate it later from settings.</p> : null}
        </>
      ) : (
        <div className="border border-black/15 bg-[#f3f2ed] p-4">
          <div className="text-sm text-[#92400E]">
            API key is no longer available.
          </div>
          <p className="mt-3 font-sans text-sm leading-6 text-black/60">
            API keys are shown once. Rotate key from settings or create a new
            project.
          </p>
          <button
            type="button"
            onClick={() => router.push("/onboarding/project")}
            className="mt-5 h-12 border border-black bg-black px-5 text-[13px] text-white transition-colors hover:bg-[#CCCCCC]"
          >
            Back to project creation
          </button>
        </div>
      )}
    </div>
  );
}
