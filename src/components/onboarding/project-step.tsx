"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { captureAnalytics } from "@/lib/analytics";

import { OnboardingHeader } from "@/components/onboarding/onboarding-shell";
import { publishOnboardingDraft } from "@/components/onboarding/onboarding-draft";
import { setOneTimeApiKey } from "@/lib/onboarding-client-state";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";

const API_KEY_COPIED_STORAGE_KEY = "tracify.onboarding.apiKeyCopied";
const PROJECT_ID_STORAGE_KEY = "tracify.onboarding.projectId";
const PROJECT_NAME_STORAGE_KEY = "tracify.onboarding.projectName";
const LAST_PROJECT_STORAGE_KEY = "tracify.lastProjectId";
const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export function ProjectStep() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const auth = useConvexAuthReadiness();
  const isConvexLoading = auth.status === "loading";
  const isAuthenticated = auth.isAuthenticated;
  const createProject = useMutation(api.projects.createProject);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;

    if (!isSessionPending && !session) {
      router.push("/sign-in");
      return;
    }

    if (isConvexLoading) {
      setError("Still getting your account ready. Try again in a moment.");
      return;
    }

    if (!isAuthenticated) {
      setError("Still getting your account ready. Try again in a moment.");
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const result = await createProject({ name: trimmed });
      if (session?.user.email) void fetch("/api/lifecycle/onboarding-reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.user.email, name: session.user.name, projectId: result.projectId, projectName: trimmed }) }).catch(() => undefined);
      if (isPostHogConfigured) {
        captureAnalytics("project_created", { creation_flow: "onboarding" });
      }
      setOneTimeApiKey(result.plaintextApiKey);
      window.sessionStorage.removeItem(API_KEY_COPIED_STORAGE_KEY);
      window.sessionStorage.setItem(PROJECT_ID_STORAGE_KEY, result.projectId);
      window.sessionStorage.setItem(PROJECT_NAME_STORAGE_KEY, result.name);
      window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, result.projectId);
      router.push("/onboarding/api-key");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Project creation failed.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  if (isSessionPending) {
    return (
      <div className="border border-black/15 bg-[#f3f2ed] px-4 py-3 font-mono text-[13px] text-black/55">
        Checking your sign-in...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="border border-black/15 bg-[#f3f2ed] px-4 py-3 font-mono text-[13px] text-black/55">
        Sign in to create a project.
      </div>
    );
  }

  if (auth.status === "error") return <ConvexAuthState mode="error" redirectPath="/onboarding/project" />;

  if (isConvexLoading || !isAuthenticated) {
    return (
      <div className="border border-black/15 bg-[#f3f2ed] px-4 py-3 font-mono text-[13px] text-black/55">
        Getting your workspace ready...
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <OnboardingHeader
        title="Name your first project."
        description="Pick a name for the agent or product you want to see inside. You can rename it any time."
      />
      <label
        htmlFor="project-name"
        className="mb-2 block text-[11px] uppercase tracking-wide text-black/60"
      >
        Project name
      </label>
      <input
        id="project-name"
        value={name}
        onChange={(event) => { setName(event.target.value); publishOnboardingDraft({ name: event.target.value }); }}
        placeholder="research-agent-prod"
        className="h-14 w-full border border-black bg-[#f3f2ed] px-4 font-mono text-base text-black outline-none transition-colors placeholder:text-black/55 focus:bg-white focus:shadow-[4px_4px_0_#f4d44d]"
      />
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Name ideas">
        {["support-agent", "research-agent", "my-first-agent"].map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => { setName(idea); publishOnboardingDraft({ name: idea }); }}
            className="border border-black/20 px-2.5 py-1.5 font-mono text-[11px] text-black/65 transition-colors hover:border-black hover:bg-[#f4d44d] hover:text-black"
          >
            {idea}
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-[#EF4444]">{error}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          variant="default"
          disabled={!name.trim() || isCreating}
          className="h-12 px-6 uppercase"
        >
          {isCreating ? "Creating..." : "Create project →"}
        </Button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="h-10 font-mono text-[11px] text-black/60 transition-colors hover:text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-black/55"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
