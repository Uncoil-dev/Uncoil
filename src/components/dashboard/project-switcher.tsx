"use client";

import { Check, ChevronDown, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const LAST_PROJECT_STORAGE_KEY = "uncoil.lastProjectId";
const RECENT_PROJECTS_STORAGE_KEY = "uncoil.recentProjects";
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(projectId: string) {
  try {
    const next = [projectId, ...readRecent().filter((id) => id !== projectId)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Recents are a convenience only.
  }
}

export function ProjectSwitcher({
  isCollapsed = false,
  previewProjectName,
  synthetic = false,
}: {
  isCollapsed?: boolean;
  previewProjectName?: string;
  synthetic?: boolean;
}) {
  const router = useRouter();
  const params = useParams();
  const currentProjectId = params?.projectId as string | undefined;
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const projectsResult = useQuery(api.projects.getProjectsByUserOrOrg, synthetic ? "skip" : undefined);
  const projects = useMemo(() => projectsResult ?? [], [projectsResult]);

  const selectedProject =
    projects.find((project) => project._id === currentProjectId) ??
    projects[0] ??
    null;

  useEffect(() => {
    if (currentProjectId) writeRecent(currentProjectId);
  }, [currentProjectId]);

  function handleOpenChange(next: boolean) {
    if (next) setRecent(readRecent());
    setOpen(next);
  }

  // Recent projects first (current on top), then everything else in the order Convex returns it.
  const { recentProjects, otherProjects } = useMemo(() => {
    const byId = new Map(projects.map((project) => [project._id as string, project]));
    const order = [currentProjectId, ...recent].filter((id): id is string => Boolean(id));
    const seen = new Set<string>();
    const recentList = order.flatMap((id) => {
      const project = byId.get(id);
      if (!project || seen.has(id)) return [];
      seen.add(id);
      return [project];
    });
    return { recentProjects: recentList, otherProjects: projects.filter((project) => !seen.has(project._id as string)) };
  }, [projects, recent, currentProjectId]);

  function selectProject(projectId: string) {
    window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, projectId);
    writeRecent(projectId);
    router.push(`/dashboard/${projectId}`);
  }

  const label = previewProjectName ?? selectedProject?.name ?? "No projects";
  const initials = label.slice(0, 1).toUpperCase();

  useEffect(() => {
    function openProjectSwitcher() { setRecent(readRecent()); setOpen(true); }
    window.addEventListener("uncoil:open-project-switcher", openProjectSwitcher);
    return () => window.removeEventListener("uncoil:open-project-switcher", openProjectSwitcher);
  }, []);

  function renderRow(project: (typeof projects)[number]) {
    const isCurrent = project._id === currentProjectId;
    return (
      <div key={project._id} className="flex items-stretch gap-1">
        <DropdownMenuItem
          onClick={() => selectProject(project._id)}
          className="min-w-0 flex-1 flex-col items-start gap-0 normal-case"
        >
          <span className="flex w-full items-center gap-2">
            <span className="truncate text-[13px]">{project.name}</span>
            {isCurrent ? <Check className="ml-auto size-3.5 shrink-0 text-[#f4d44d]" /> : null}
          </span>
          <span className="text-[10px] uppercase opacity-55">{project.planTier}</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="shrink-0 justify-center px-2.5">
          <Link href={`/dashboard/${project._id}/manage`} aria-label={`Manage ${project.name}`} title="Manage project">
            <Settings2 className="size-3.5" />
            <span className="text-[10px]">Manage</span>
          </Link>
        </DropdownMenuItem>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Switch project. Current: ${label}`}
          className={cn(
            "flex items-center border border-white/15 bg-[#141414] font-mono outline-none transition-colors hover:border-white/40 focus-visible:border-white/60",
            isCollapsed ? "size-10 justify-center text-[13px] font-semibold !text-[#f4d44d]" : "h-10 w-full gap-2 px-2.5 text-[13px] !text-[#dedede]",
          )}
        >
          {isCollapsed ? (
            <span>{initials}</span>
          ) : (
            <>
              <span className="flex size-5 shrink-0 items-center justify-center bg-[#f4d44d] text-[11px] font-semibold !text-[#090909]">{initials}</span>
              <span className="truncate">{label}</span>
              <ChevronDown className="ml-auto size-4 shrink-0 opacity-60" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={isCollapsed ? "right" : "bottom"}
        sideOffset={isCollapsed ? 12 : 6}
        collisionPadding={8}
        className="w-72 max-h-[70vh] overflow-y-auto"
      >
        {synthetic ? (
          <>
            <DropdownMenuLabel>Projects</DropdownMenuLabel>
            <DropdownMenuItem disabled>Uncoil Demo · view only</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.assign("https://www.uncoil.dev/cloud")}>Build a real project</DropdownMenuItem>
          </>
        ) : projects.length ? (
          <>
            {recentProjects.length ? <DropdownMenuLabel className="text-[10px] uppercase tracking-wider !text-[#8d8d8d]">Recent</DropdownMenuLabel> : null}
            {recentProjects.map(renderRow)}
            {otherProjects.length ? (
              <>
                {recentProjects.length ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider !text-[#8d8d8d]">All projects</DropdownMenuLabel>
                {otherProjects.map(renderRow)}
              </>
            ) : null}
          </>
        ) : (
          <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/onboarding/project")}>
          <Plus className="size-4" />
          <span>New project</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/organizations")}>
          <span>Organizations</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
