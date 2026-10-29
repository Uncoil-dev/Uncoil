"use client";

import { BrandLoader } from "@/components/brand/brand-loader";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "convex/_generated/api";
import { useAuthIdentity } from "@/components/auth/auth-identity";
import { projectGateState, type ProjectGateMemory } from "@/lib/project-gate-state";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";

const LAST_PROJECT_STORAGE_KEY = "uncoil.lastProjectId";
const PROJECT_ID_STORAGE_KEY = "uncoil.onboarding.projectId";

export function ProjectRouteGate({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const auth = useConvexAuthReadiness();
  const isAuthenticated = auth.isAuthenticated;
  const routeState = useQuery(
    api.projects.getProjectRouteState,
    isAuthenticated ? { projectId } : "skip",
  );

  const identity = useAuthIdentity();
  const [memory, setMemory] = useState<ProjectGateMemory>(null);
  const gate = projectGateState(memory, { projectId, identity, auth: auth.status, route: routeState });
  // Adjust before committing children, so a scope change cannot briefly display the previous project/account.
  if (gate.memory !== memory) setMemory(gate.memory);

  useEffect(() => {
    if (auth.status === "unauthenticated" || routeState?.status === "unauthenticated") {
      const returnPath = `${window.location.pathname}${window.location.search}`;
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`);
      return;
    }

    if (!routeState) return;

    if (routeState.status === "ready" && routeState.projectId) {
      window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, routeState.projectId);
      window.sessionStorage.setItem(PROJECT_ID_STORAGE_KEY, routeState.projectId);
      return;
    }

    window.localStorage.removeItem(LAST_PROJECT_STORAGE_KEY);
    window.sessionStorage.removeItem(PROJECT_ID_STORAGE_KEY);
    return;
  }, [auth.status, isAuthenticated, routeState, router]);

  if (auth.status === "error") {
    const returnPath =
      typeof window === "undefined"
        ? `/dashboard/${projectId}`
        : `${window.location.pathname}${window.location.search}`;
    return <ConvexAuthState mode="error" redirectPath={returnPath} />;
  }

  if (gate.show) return <>{children}</>;

  if (auth.status === "loading" || !isAuthenticated || routeState === undefined || routeState.status === "unauthenticated" || !identity) {
    return <BrandLoader label="Loading project" />;
  }

  if (routeState.status === "no_projects") {
    return (
      <RouteStatePanel
        title="No project selected"
        description="Create a project before opening project-specific settings, traces, or reports."
        actionLabel="Open dashboard home"
        actionHref="/dashboard"
      />
    );
  }

  if (routeState.status === "not_found") {
    return (
      <RouteStatePanel
        title="Project not found"
        description="This project may have been removed or you may not have access to it."
        actionLabel="Return to dashboard"
        actionHref="/dashboard"
      />
    );
  }

  return null;
}

function RouteStatePanel({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="px-6 py-6">
      <div className="max-w-xl border border-black/15 bg-white p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
          Dashboard state
        </p>
        <h1 className="mt-3 font-mono text-xl uppercase tracking-tight text-black">
          {title}
        </h1>
        <p className="mt-3 font-sans text-sm leading-6 text-black/60">
          {description}
        </p>
        <a
          href={actionHref}
          className="mt-6 inline-flex border border-black bg-black px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-black"
        >
          {actionLabel}
        </a>
      </div>
    </div>
  );
}
