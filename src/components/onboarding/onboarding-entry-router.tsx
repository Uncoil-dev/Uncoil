"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "convex/_generated/api";
import { BrandLogo } from "@/components/brand-logo";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";

const PROJECT_ID_STORAGE_KEY = "tracify.onboarding.projectId";
const LAST_PROJECT_STORAGE_KEY = "tracify.lastProjectId";

export function OnboardingEntryRouter() {
  const router = useRouter();
  const auth = useConvexAuthReadiness();
  const isAuthenticated = auth.isAuthenticated;
  const projects = useQuery(
    api.projects.getProjectsByUserOrOrg,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (auth.status === "loading" || auth.status === "error" || (isAuthenticated && projects === undefined)) return;

    if (!isAuthenticated) {
      router.replace("/onboarding/project");
      return;
    }

    if (!projects) return;

    if (!projects.length) {
      window.sessionStorage.removeItem(PROJECT_ID_STORAGE_KEY);
      window.localStorage.removeItem(LAST_PROJECT_STORAGE_KEY);
      router.replace("/onboarding/project");
      return;
    }

    const storedProjectId =
      window.sessionStorage.getItem(PROJECT_ID_STORAGE_KEY) ??
      window.localStorage.getItem(LAST_PROJECT_STORAGE_KEY) ??
      "";
    const project =
      projects.find((candidate) => candidate._id === storedProjectId) ??
      projects[0];

    window.sessionStorage.setItem(PROJECT_ID_STORAGE_KEY, project._id);
    window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, project._id);
    router.replace(`/dashboard/${project._id}/tracing`);
  }, [auth.status, isAuthenticated, projects, router]);

  if (auth.status === "error") return <ConvexAuthState mode="error" redirectPath="/onboarding" />;

  return (
    <main className="min-h-svh bg-[#f3f2ed] px-4 py-8 font-mono text-black/70">
      <div className="mx-auto flex min-h-[calc(100svh-64px)] w-full max-w-[720px] flex-col justify-center">
        <div className="mb-4 text-black"><BrandLogo className="text-lg" /></div>
        <section className="border border-black/15 bg-white p-6 md:p-8">
          <div className="text-[11px] uppercase tracking-wide text-black/55">
            onboarding.route
          </div>
          <h1 className="mt-3 font-mono text-2xl normal-case tracking-normal text-black">
            Checking workspace state.
          </h1>
          <p className="mt-3 max-w-xl font-sans text-sm leading-6 text-black/60">
            You will only enter onboarding when a project still needs to be
            created.
          </p>
        </section>
      </div>
    </main>
  );
}
