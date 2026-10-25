"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import {
  BookOpen,
  Bell,
  ChevronRight,
  UserPen,
  LogOut,
  Settings,
  MessageSquare,
  Book,
} from "lucide-react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { hasDismissedOnboarding, setReturnPath } from "@/lib/onboarding-client-state";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

import { buttonVariants } from "@/components/ui/button";
import { getOnboardingHref } from "@/lib/onboarding-navigation";
import { getTracifyRegion } from "@/lib/regions";

import { authClient } from "@/lib/auth-client";
import { OrganizationSwitcher } from "@/components/auth/organization-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DashboardCommandMenu } from "./dashboard-command-menu";
import { cn, formatRelativeTime } from "@/lib/utils";

interface DashboardTopbarProps {
  title?: string;
  description?: string;
}

export function DashboardTopbar({ title, description }: DashboardTopbarProps) {
  const onboardingHref = getOnboardingHref();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const projectSettingsHref = projectId ? `/dashboard/${projectId}/settings` : "/dashboard/account";
  const projectManageHref = projectId ? `/dashboard/${projectId}/manage` : "/dashboard";
  const projectDocsHref = projectId ? `/dashboard/${projectId}/docs` : "/docs";
  const dashboardHref = projectId ? `/dashboard/${projectId}` : "/dashboard";

  const environmentContext = searchParams.get("environment")?.trim() || "all environments";
  const usesRunsWindow = pathname.includes("/runs") || pathname.includes("/search");
  const requestedRange = usesRunsWindow ? searchParams.get("days") : searchParams.get("range");
  const rangeContext = ["1", "7", "30", "90"].includes(requestedRange ?? "")
    ? `${requestedRange}d`
    : usesRunsWindow
      ? "30d"
      : "7d";
  const rangeValue = rangeContext.replace("d", "");
  const environmentValue = environmentContext === "all environments" ? "all" : environmentContext;

  const region = getTracifyRegion();
  const { data: session } = authClient.useSession();
  const { data: organization } = authClient.useActiveOrganization();
  const user = session?.user;

  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const alerts = useQuery(
    api.alerts.listByProject,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const markAllAlertsRead = useMutation(api.alerts.markAllRead);
  const markAlertRead = useMutation(api.alerts.markRead);
  const [isMarkingAlertsRead, setIsMarkingAlertsRead] = useState(false);
  const unreadAlertCount = alerts?.filter((alert) => !alert.readAt).length ?? 0;

  const initials = user?.name?.charAt(0) || user?.email?.charAt(0) || "U";
  const router = useRouter();

  function updateDashboardQuery(key: "range" | "days" | "environment", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  const handleOnboardingClick = () => {
    setReturnPath(pathname);
    router.push(onboardingHref);
  };

  const handleReadAllAlerts = async () => {
    if (!projectId || unreadAlertCount === 0 || isMarkingAlertsRead) return;
    setIsMarkingAlertsRead(true);
    try {
      await markAllAlertsRead({ projectId: projectId as Id<"projects"> });
    } finally {
      setIsMarkingAlertsRead(false);
    }
  };

  const segments = pathname.split("/").filter(Boolean);
  const sectionHref =
    projectId && segments.length > 2
      ? `/dashboard/${projectId}/${segments[2]}`
      : dashboardHref;

  return (
    <header className="tracify-dashboard-topbar flex h-14 shrink-0 items-center justify-between border-b border-black/15 bg-[#f3f2ed] px-4 font-mono lg:px-6">
      <span className="sr-only">
        {title || "Dashboard"}{description ? `: ${description}` : ""}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-wider text-black/55">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <Link
              href={dashboardHref}
              className="shrink-0 text-black transition-colors hover:text-black/70"
            >
              Dashboard
            </Link>
            {segments.length > 2 && (
              <>
                <ChevronRight className="size-3 shrink-0" />
                {segments.length > 3 ? (
                  <Link
                    href={sectionHref}
                    className="truncate text-black transition-colors hover:text-black/70"
                  >
                    {segments[2]}
                  </Link>
                ) : (
                  <span className="truncate text-black">{segments[2]}</span>
                )}
              </>
            )}
            {segments.length > 3 && (
              <>
                <ChevronRight className="size-3 shrink-0" />
                <span className="truncate text-black/60">{segments[3]}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-[12px] text-black/60">
        <div className="tracify-topbar-controls hidden items-center gap-1 lg:flex">
          <Link
            href={`/cloud/region?next=${encodeURIComponent(pathname)}`}
            className="tracify-topbar-region inline-flex h-8 items-center gap-1.5 border border-black/15 bg-white px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-black/70 transition-colors hover:border-black hover:text-black"
            title="Switch regional cloud"
          >
            <span aria-hidden="true">{region.flag}</span>
            <span>{region.shortName} cloud</span>
          </Link>
          <label className="tracify-topbar-select">
            <span className="sr-only">Dashboard time range</span>
            <select
              aria-label="Dashboard time range"
              value={rangeValue}
              onChange={(event) => updateDashboardQuery(usesRunsWindow ? "days" : "range", event.target.value)}
            >
              <option value="1">1d</option>
              <option value="7">7d</option>
              <option value="30">30d</option>
              <option value="90">90d</option>
            </select>
          </label>
          <label className="tracify-topbar-select">
            <span className="sr-only">Environment</span>
            <select
              aria-label="Environment"
              value={environmentValue}
              onChange={(event) => updateDashboardQuery("environment", event.target.value === "all" ? "all environments" : event.target.value)}
            >
              <option value="all">All environments</option>
              <option value="default">default</option>
              <option value="production">production</option>
            </select>
          </label>
          <button
            type="button"
            className="tracify-topbar-filter"
            onClick={() => window.dispatchEvent(new Event("tracify:toggle-dashboard-filters"))}
          >
            Filters
          </button>
        </div>

        <DashboardCommandMenu projectId={projectId} />
        <OrganizationSwitcher />

        {!hasDismissedOnboarding() ? (
          <button
            onClick={handleOnboardingClick}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "h-8 px-3 text-[12px] max-sm:hidden",
            })}
          >
            Setup
          </button>
        ) : null}

        <div className="hidden max-w-[360px] items-center gap-2 border border-black/15 bg-white px-2 sm:flex">
          <span className="size-1.5 bg-emerald-600" aria-hidden="true" />
          <span className="truncate text-[10px] uppercase tracking-widest text-black/70">
            {organization?.name || "Personal workspace"}
          </span>
          <span className="text-black/55">/</span>
          <span className="truncate text-[10px] text-black/55">{project?.name || "Loading project…"}</span>
          <span className="text-black/55">/</span>
          <span className="truncate text-[10px] uppercase text-black/55" title="Environment context">
            {environmentContext}
          </span>
          <span className="text-black/55">/</span>
          <span className="shrink-0 text-[10px] uppercase text-black/55" title="Dashboard time range">
            {rangeContext}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open account menu"
              title="Account menu"
              className="flex h-8 w-8 items-center justify-center border border-black/15 bg-white text-black/70 transition-colors hover:border-black hover:text-black outline-none overflow-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3f2ed]"
            >
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "User"}
                  width={32}
                  height={32}
                  unoptimized
                  className="size-full object-cover grayscale opacity-80 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                initials
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
            <DropdownMenuLabel className="flex items-start gap-3 p-3">
              <div className="size-8 shrink-0 bg-[#f3f2ed] border border-black/15 flex items-center justify-center font-mono text-xs text-black uppercase overflow-hidden">
                {user?.image ? (
                  <Image src={user.image} alt={user.name || "User"} width={32} height={32} unoptimized className="size-full object-cover grayscale" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] font-mono text-black">{user?.name || "User"}</span>
                <span className="truncate text-[10px] font-mono text-black/55">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account">
                  <UserPen size={14} className="opacity-60" />
                  <span>Manage Account</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={projectSettingsHref}>
                  <Settings size={14} className="opacity-60" />
                  <span>Project Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={projectManageHref}>
                  <Settings size={14} className="opacity-60" />
                  <span>Project Management</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={projectDocsHref}>
                  <Book size={14} className="opacity-60" />
                  <span>Documentation</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://www.tracify.tech/contact">
                  <MessageSquare size={14} className="opacity-60" />
                  <span>Send Feedback</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
            >
              <LogOut size={14} className="opacity-60" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {projectId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={unreadAlertCount > 0 ? `Open alerts, ${unreadAlertCount} unread` : "Open alerts"}
                title="Alerts"
                className={cn(
                  "relative flex h-8 items-center border px-2 outline-none transition-colors hover:bg-[#f3f2ed] hover:text-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3f2ed]",
                  unreadAlertCount > 0
                    ? "border-black bg-[#f3f2ed] text-black shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
                    : "border-black/15 bg-white text-black/60",
                )}
              >
                <Bell className="size-4" />
                {unreadAlertCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center bg-black px-1 text-[9px] font-bold leading-4 text-white shadow-[0_0_0_2px_#f3f2ed]">
                    {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
                  </span>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[360px] p-0" align="end" sideOffset={8}>
              <div className="flex items-start justify-between gap-3 border-b border-black/15 p-3">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-black">Alerts</div>
                  <div className="mt-1 font-mono text-[10px] text-black/55">Cost, failure, and duration triggers</div>
                </div>
                <button
                  type="button"
                  onClick={handleReadAllAlerts}
                  disabled={unreadAlertCount === 0 || isMarkingAlertsRead}
                  className="shrink-0 border border-black/25 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-black/70 transition-colors hover:border-black hover:text-black disabled:cursor-not-allowed disabled:border-black/15 disabled:text-black/55"
                >
                  Read all
                </button>
              </div>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {alerts === undefined ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-16 border border-black/15 bg-[#f3f2ed]" />
                    ))}
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="border border-dashed border-black/15 p-6 text-center font-mono text-[11px] uppercase tracking-widest text-black/55">
                    No alerts triggered
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.slice(0, 8).map((alert) => {
                      const isUnread = !alert.readAt;
                      return (
                        <Link
                          key={alert._id}
                          href={`/dashboard/${projectId}/runs/${alert.runId}`}
                          onClick={() => {
                            if (isUnread) {
                              void markAlertRead({ alertId: alert._id });
                            }
                          }}
                          className={cn(
                            "relative block border p-3 transition-colors hover:border-black/30",
                            isUnread
                              ? "border-black/30 bg-[#f3f2ed] hover:bg-[#e4e1d8]"
                              : "border-black/15 bg-[#f3f2ed] hover:bg-white",
                          )}
                        >
                          {isUnread ? <span className="absolute left-0 top-0 h-full w-1 bg-black" /> : null}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              {isUnread ? (
                                <span className="shrink-0 bg-black px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-white">
                                  New
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "truncate font-mono text-[10px] uppercase tracking-widest",
                                  alert.type === "cost_exceeded" ? "text-[#7d5e00]" : "text-red-600",
                                )}
                              >
                                {alert.type.replace("_", " ")}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono text-[9px] text-black/55">
                              {formatRelativeTime(alert.triggeredAt)}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "mt-2 line-clamp-2 font-sans text-xs leading-relaxed",
                              isUnread ? "text-black" : "text-black/70",
                            )}
                          >
                            {alert.message}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <a
          href="https://www.tracify.tech/docs"
          className="flex h-8 items-center gap-2 border border-black/15 bg-white px-2 text-black/60 transition-colors hover:bg-[#f3f2ed] hover:text-black"
        >
          <BookOpen className="size-4" />
          <span className="hidden sm:inline">Docs</span>
        </a>
      </div>
    </header>
  );
}
