"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "convex/_generated/api";
import { WorkspaceCheckScreen } from "@/components/brand/workspace-check-screen";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";

const PROJECT_ID_STORAGE_KEY = "uncoil.onboarding.projectId";
const LAST_PROJECT_STORAGE_KEY = "uncoil.lastProjectId";

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

  return <WorkspaceCheckScreen label="Checking your workspace" />;
}
