"use client";

import { BrandLoader } from "@/components/brand/brand-loader";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { NoProjectStart } from "@/components/dashboard/no-project-start";
import { api } from "convex/_generated/api";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";

const LAST_PROJECT_STORAGE_KEY = "tracify.lastProjectId";

export function DashboardHomeRouter() {
  const router = useRouter();
  const auth = useConvexAuthReadiness();
  const isAuthenticated = auth.isAuthenticated;
  const projects = useQuery(
    api.projects.getProjectsByUserOrOrg,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.replace(`/sign-in?redirect_url=${encodeURIComponent("/dashboard")}`);
      return;
    }
    if (!projects?.length) return;

    const storedProjectId = window.localStorage.getItem(LAST_PROJECT_STORAGE_KEY);
    const project =
      projects.find((candidate) => candidate._id === storedProjectId) ??
      projects[0];

    window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, project._id);
    router.replace(`/dashboard/${project._id}/tracing`);
  }, [auth.status, projects, router]);

  if (auth.status === "error") {
    return <ConvexAuthState mode="error" redirectPath="/dashboard" />;
  }

  if (auth.status === "loading" || (isAuthenticated && projects === undefined)) {
    return <BrandLoader label="Loading your workspace" />;
  }

  if (auth.status === "unauthenticated") {
    return <ConvexAuthState mode="loading" />;
  }

  if (projects?.length) {
    return (
      <div className="px-6 py-6 font-mono text-sm text-black/55">
        Opening project...
      </div>
    );
  }

  return <NoProjectStart />;
}
