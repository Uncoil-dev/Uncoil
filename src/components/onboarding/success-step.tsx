"use client";

import { useEffect } from "react";
import Link from "next/link";

import { OnboardingHeader } from "@/components/onboarding/onboarding-shell";
import { publishOnboardingDraft } from "@/components/onboarding/onboarding-draft";

export function SuccessStep({
  projectId,
  runId,
}: {
  projectId: string;
  runId: string;
}) {
  useEffect(() => publishOnboardingDraft({ arrived: true }), []);
  return (
    <div>
      <OnboardingHeader
        title="It's alive. First trace in."
        description="Tracify heard your agent. Every step, tool call and token is mapped. Open it and see what your agent really did."
      />
      <div className="mb-6 flex items-center gap-4 border border-black bg-[#f4d44d] p-5">
        <span className="grid size-10 shrink-0 place-items-center bg-black font-mono text-lg text-[#f4d44d]" aria-hidden="true">✓</span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em]">first run received</p>
          <p className="mt-1 break-all font-mono text-[12px] text-black/70">{runId}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/dashboard/${projectId}/runs/${runId}`}
          className="inline-flex h-12 items-center justify-center border border-black bg-black px-6 font-mono text-[12px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#f4d44d] hover:text-black"
        >
          Open your trace →
        </Link>
        <Link
          href={`/dashboard/${projectId}/tracing`}
          className="inline-flex h-12 items-center justify-center border border-black/25 px-6 font-mono text-[12px] uppercase tracking-[0.1em] text-black/70 transition-colors hover:border-black hover:text-black"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
