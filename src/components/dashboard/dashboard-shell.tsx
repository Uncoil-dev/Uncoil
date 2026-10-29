"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PanelLeftOpen } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { DashboardSidebar } from "./dashboard-sidebar";

const COLLAPSED_STORAGE_KEY = "uncoil.sidebar.collapsed";
const LEGACY_COLLAPSED_STORAGE_KEY = "uncoil:dashboard-sidebar";

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 232;
type DashboardTheme = "legacy" | "uncoil-v2";

export function DashboardShell({
  children,
  canAccessContent,
  preview = false,
  previewProjectId,
  previewProjectName,
  dashboardTheme,
  synthetic = false,
  demo = false,
}: {
  children: React.ReactNode;
  canAccessContent: boolean;
  preview?: boolean;
  previewProjectId?: string;
  previewProjectName?: string;
  dashboardTheme?: DashboardTheme;
  synthetic?: boolean;
  demo?: boolean;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.projectId as string | undefined;

  const isDashboardRoute =
    synthetic || preview || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isUncoilOverview = synthetic || preview || Boolean(projectId);

  const defaultTheme = dashboardTheme ?? ((process.env.NEXT_PUBLIC_UNCOIL_DASHBOARD_V2 ?? process.env.NEXT_PUBLIC_TRACIFY_DASHBOARD_V2) === "false" ? "legacy" : "uncoil-v2");

  const requestedTheme = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("ui"),
    () => null,
  );

  const activeTheme: DashboardTheme =
    dashboardTheme ??
    (requestedTheme === "legacy" || requestedTheme === "uncoil-v2" ? requestedTheme : defaultTheme);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (stored === "true" || stored === "false") return stored === "true";
    return window.localStorage.getItem(LEGACY_COLLAPSED_STORAGE_KEY) === "collapsed";
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobileViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function updateCollapsed(next: boolean) {
    setIsCollapsed(next);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.altKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "o" && projectId) {
        event.preventDefault();
        router.push(`/dashboard/${projectId}`);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "\\") {
        event.preventDefault();
        setIsCollapsed((current) => {
          const next = !current;
          window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
          return next;
        });
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [projectId, router]);

  const layoutSidebarWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  // Account settings is a full page with its own settings sidebar, not part of a project's dashboard.
  if (pathname === "/dashboard/account") return <>{children}</>;

  return (
    <div
      data-dashboard-theme={activeTheme}
      className={`flex min-h-svh w-full font-mono ${isDashboardRoute ? "uncoil-cloud-shell text-white/70" : "text-black/70 bg-[#eceae3]"} ${isUncoilOverview ? "uncoil-shell" : ""}`}
    >
      <DashboardSidebar
        canAccessContent={canAccessContent}
        isCollapsed={isCollapsed}
        onCollapsedChange={updateCollapsed}
        projectIdOverride={previewProjectId}
        previewProjectName={previewProjectName}
        synthetic={synthetic}
        demo={demo}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        onMobileToggle={() => setIsMobileOpen((current) => !current)}
      />
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="uncoil-shell-sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}
      <div
        className={`flex min-h-svh min-w-0 flex-1 flex-col transition-[padding] duration-150 motion-reduce:transition-none ${isDashboardRoute ? "bg-[#101010]" : "bg-[#eceae3]"}`}
        style={{ paddingLeft: isMobileViewport ? 0 : layoutSidebarWidth }}
      >
        <main
          className={`h-svh pb-0 overflow-y-auto scrollbar-hide ${isDashboardRoute ? "bg-[#101010] p-0" : "bg-[#eceae3] p-4 lg:p-6"}`}
        >
          {isDashboardRoute && !synthetic && isMobileViewport ? (
            <div className="uncoil-collapse-anchor relative h-11">
              <button
                type="button"
                aria-label="Open menu"
                title="Open menu"
                onClick={() => window.dispatchEvent(new Event("uncoil:toggle-sidebar"))}
                className="absolute left-1 top-0.5 z-10 flex size-10 items-center justify-center !text-[#8d8d8d] outline-none hover:!bg-[#181818] hover:!text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
