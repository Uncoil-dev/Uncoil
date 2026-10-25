"use client";

import { useState, useSyncExternalStore, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import type { OnboardingStepId } from "@/components/onboarding/onboarding-progress";
import {
  hasOneTimeApiKey,
  subscribeToOneTimeApiKey,
  setReturnPath,
  getReturnPath,
  clearReturnPath,
  dismissOnboarding,
} from "@/lib/onboarding-client-state";

const PROJECT_ID_STORAGE_KEY = "tracify.onboarding.projectId";
const API_KEY_COPIED_STORAGE_KEY = "tracify.onboarding.apiKeyCopied";

function getSessionSnapshot() {
  const projectId = window.sessionStorage.getItem(PROJECT_ID_STORAGE_KEY) ?? "";
  const returnPath = getReturnPath();
  const hasApiKey = hasOneTimeApiKey();
  const hasCopiedApiKey =
    window.sessionStorage.getItem(API_KEY_COPIED_STORAGE_KEY) === "true";

  return JSON.stringify({ projectId, returnPath, hasApiKey, hasCopiedApiKey });
}

function getServerSessionSnapshot() {
  return JSON.stringify({
    projectId: "",
    returnPath: "",
    hasApiKey: false,
    hasCopiedApiKey: false,
  });
}

export function OnboardingEscapeLink({
  currentStep,
}: {
  currentStep: OnboardingStepId;
}) {
  const router = useRouter();
  const updateProgress = useMutation(api.projects.updateOnboardingProgress);
  const searchParams = useSearchParams();
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const sessionSnapshot = useSyncExternalStore(
    subscribeToOneTimeApiKey,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const { projectId, returnPath, hasApiKey, hasCopiedApiKey } = JSON.parse(
    sessionSnapshot,
  ) as {
    projectId: string;
    returnPath: string;
    hasApiKey: boolean;
    hasCopiedApiKey: boolean;
  };

  useEffect(() => {
    const from = searchParams.get("from");
    if (from) {
      setReturnPath(from);
    }
  }, [searchParams]);

  const label = returnPath ? "Back" : "Skip setup";
  const destination =
    returnPath || (projectId ? `/dashboard/${projectId}/tracing` : "/dashboard");

  function leaveOnboarding() {
    dismissOnboarding();
    if (projectId) void updateProgress({ projectId: projectId as Id<"projects">, dismissed: true });
    if (returnPath) {
      clearReturnPath();
    }
    router.push(destination);
  }

  function onNavigate() {
    const shouldWarn =
      currentStep === "api-key" &&
      hasApiKey &&
      window.sessionStorage.getItem(API_KEY_COPIED_STORAGE_KEY) !== "true" &&
      !hasCopiedApiKey;

    if (shouldWarn) {
      setIsConfirmingLeave(true);
      return;
    }
    leaveOnboarding();
  }

  return (
    <>
      <button
        type="button"
        onClick={onNavigate}
        className="absolute right-5 top-3 z-10 font-mono text-[11px] uppercase tracking-[0.12em] text-black underline-offset-4 hover:underline sm:right-8 outline-none transition-colors hover:text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-black/55"
      >
        {label}
      </button>

      {isConfirmingLeave ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-key-leave-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
        >
          <div className="w-full max-w-md border border-black/15 bg-white p-5 text-black/70">
            <h2
              id="api-key-leave-title"
              className="font-mono text-lg text-black"
            >
              API key not copied.
            </h2>
            <p className="mt-3 font-sans text-sm leading-6 text-black">
              This key is shown once. If you leave now, you will need to rotate
              the key later.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmingLeave(false)}
                className="h-9 border border-black/15 bg-[#f3f2ed] px-4 font-mono text-[13px] text-black/70 transition-colors hover:bg-[#f3f2ed] hover:text-black"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={leaveOnboarding}
                className="h-9 border border-black/15 bg-white px-4 font-mono text-[13px] text-[#EF4444] transition-colors hover:bg-[#f3f2ed] hover:text-black"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
