"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureAnalytics } from "@/lib/analytics";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { CodeCopyBlock } from "@/components/onboarding/code-copy-block";
import { OnboardingHeader } from "@/components/onboarding/onboarding-shell";
import { publishOnboardingDraft } from "@/components/onboarding/onboarding-draft";
import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);
const INSTALL_READY_STORAGE_KEY = "uncoil.onboarding.installReady";

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
    install: "npm install uncoil-sdk",
    code: `import { traceAgent } from "uncoil-sdk"

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
   - TypeScript / Node.js: npm install uncoil-sdk
3. Add UNCOIL_API_KEY to .env.example.
4. Find the main agent function.
5. If Python, import trace_agent from uncoil and add @trace_agent().
6. If TypeScript, import traceAgent from uncoil-sdk and wrap the async agent function.
7. Run the agent once.
8. Confirm that a span was sent to Uncoil.

Use this environment variable locally:
UNCOIL_API_KEY=your_key_here`,
  },
};

export function InstallStep() {
  const router = useRouter();
  const updateProgress = useMutation(api.projects.updateOnboardingProgress);
  const [tab, setTab] = useState<keyof typeof snippets>("python");
  const active = snippets[tab];
  const region = getUncoilRegion(getDeploymentRegion());

  return (
    <div>
      <OnboardingHeader
        title="Paste, run, done."
        description={`Pick how you build, copy the lines below into your agent, then run it once. It sends to Uncoil ${region.shortName}.`}
      />
      <CodeCopyBlock label="0 · Point at your region" value={`UNCOIL_REGION=${region.id}`} />
      <div className="mb-4 mt-4 border border-black/15 bg-white p-3 font-mono text-[10px] uppercase tracking-[0.1em] text-black/60">Ingest endpoint · {region.origin}/api/ingest</div>
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
      {tab === "prompt" ? (
        <>
          <div className="mb-3 border border-black/15 bg-[#f3f2ed] px-3 py-2 font-sans text-xs leading-5 text-[#92400E]">
            Keep live API keys out of AI coding tools unless you trust them. Add the key to .env locally.
          </div>
          <CodeCopyBlock
            label="AI setup prompt"
            value={active.code}
            multiline
            collapsible
            copyLabel="Copy setup prompt"
          />
        </>
      ) : (
        <>
          <CodeCopyBlock label="1 · Install" value={active.install} />
          <div className="mt-4">
            <CodeCopyBlock label="2 · Add to your agent" value={active.code} multiline />
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          if (isPostHogConfigured) {
            captureAnalytics("onboarding_install_ready", { runtime: tab });
          }
          window.sessionStorage.setItem(INSTALL_READY_STORAGE_KEY, "true");
          const projectId = window.sessionStorage.getItem("uncoil.onboarding.projectId");
          if (projectId) void updateProgress({ projectId: projectId as Id<"projects">, step: "waiting", sdk: tab === "python" ? "python" : "typescript" });
          router.push("/onboarding/waiting");
        }}
        className="mt-8 h-12 border border-black bg-black px-6 font-mono text-[12px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#f4d44d] hover:text-black"
      >
        I added it, listen for my run →
      </button>
    </div>
  );
}
