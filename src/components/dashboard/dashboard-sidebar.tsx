"use client";

import {
  Activity,
  BookOpen,
  ChevronRight,
  FlaskConical,
  History,
  House,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Search,
  Settings2,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { SidebarAccountMenu } from "@/components/dashboard/sidebar-account-menu";
import { DashboardCommandMenu } from "@/components/dashboard/dashboard-command-menu";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEMO_BASE_PATH } from "@/lib/demo/demo-config";
import { FinishSetupCard, PinButton, PinnedSection, recordRecent, useRecents, usePins, useSavedViews } from "@/components/dashboard/sidebar-extras";

type Icon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

type NavLeaf = { title: string; href: string; external?: boolean; badge?: "New" };
type NavRow = {
  id: string;
  title: string;
  icon: Icon;
  /** Rows with children expand in place; rows without are plain links. */
  href?: string;
  external?: boolean;
  badge?: "New";
  children?: NavLeaf[];
};
type NavSection = { id: string; label: string; rows: NavRow[] };

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 232;
const DETAIL_NOUNS: Record<string, string> = {
  runs: "Run",
  traces: "Trace",
  sessions: "Session",
  users: "User",
  prompts: "Prompt",
  "prompt-management": "Prompt",
  datasets: "Dataset",
  experiments: "Experiment",
  evaluators: "Evaluator",
  alerts: "Alert",
  dashboards: "Dashboard",
};

function titleCase(segment: string) {
  const words = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Page";
}

const MARKETING_ORIGIN = process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.tracify.tech";

function isActivePath(pathname: string, href: string, projectId: string, isPreview = false, currentSearch = "") {
  if (href.startsWith("http")) return false;
  const hrefPath = href.split("?")[0];
  if (hrefPath === "/playground") {
    const requestedView = new URLSearchParams(href.split("?")[1] ?? "").get("view") ?? "home";
    const activeView = new URLSearchParams(currentSearch).get("view") ?? "home";
    return pathname === "/playground" && requestedView === activeView;
  }
  if (hrefPath === DEMO_BASE_PATH) return pathname === hrefPath;
  // Without a project every in-app link falls back to "/dashboard"; as a prefix it would match every page (e.g. Account).
  if (hrefPath === "/dashboard") return pathname === hrefPath;
  if (hrefPath === `/dashboard/${projectId}`) {
    return pathname === "/dashboard" || pathname === hrefPath || (isPreview && pathname.startsWith("/tracify-preview"));
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

export function DashboardSidebar({
  canAccessContent,
  isCollapsed,
  onCollapsedChange,
  projectIdOverride,
  previewProjectName,
  synthetic = false,
  demo = false,
  isMobileOpen = false,
  onMobileClose,
  onMobileToggle,
}: {
  canAccessContent: boolean;
  isCollapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  projectIdOverride?: string;
  previewProjectName?: string;
  synthetic?: boolean;
  /** The public demo project: same navigation, pointed at the read-only sample pages. */
  demo?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onMobileToggle?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = projectIdOverride || (params?.projectId as string) || "";
  const isSynthetic = synthetic && pathname.startsWith("/playground");
  const projectDashboardHref = isSynthetic ? "/dashboard" : demo ? DEMO_BASE_PATH : projectId ? `/dashboard/${projectId}` : "/dashboard";
  // Sessions only appear in the menu once the project has recorded one (or while you are already on that page).
  const [hasSessions, setHasSessions] = useState<boolean | null>(null);
  const hasLiveProject = !isSynthetic && !demo && Boolean(projectId);
  useEffect(() => {
    if (!hasLiveProject) return;
    const controller = new AbortController();
    const to = Date.now();
    fetch(`/api/projects/${encodeURIComponent(projectId)}/groups/session?from=${to - 90 * 86_400_000}&to=${to}`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { total?: number } | null) => { if (body && typeof body.total === "number") setHasSessions(body.total > 0); })
      .catch(() => {});
    return () => controller.abort();
  }, [hasLiveProject, projectId]);
  const showSessions = !hasLiveProject || hasSessions !== false || pathname.includes("/sessions");
  const workspaceHref = useCallback(
    (view: string, liveView = view) =>
      isSynthetic
        ? view === "home"
          ? "/playground"
          : `/playground/${view}`
        : liveView === "home"
          ? projectDashboardHref
          : `${projectDashboardHref}/${liveView}`,
    [isSynthetic, projectDashboardHref],
  );

  const hasProject = isSynthetic || demo || Boolean(projectId);
  // While collapsed, pointing at the sidebar opens it over the page and moving away closes it again.
  const [peeking, setPeeking] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const showPanel = !isCollapsed || isMobileOpen || peeking;
  const peekOverlay = isCollapsed && !isMobileOpen && peeking;
  useEffect(() => {
    if (!peeking || pointerInside) return;
    // Menus (project switcher, account) live outside the sidebar; keep it open until they close.
    const timer = window.setInterval(() => {
      if (!document.querySelector('[role="menu"][data-state="open"]')) setPeeking(false);
    }, 150);
    return () => window.clearInterval(timer);
  }, [peeking, pointerInside]);
  const liveProject = !isSynthetic && !demo && !projectIdOverride && Boolean(projectId);
  const { pins, toggle: togglePin, isPinned } = usePins(projectId);
  const savedViews = useSavedViews(projectId, liveProject && showPanel);
  const recentsKey = projectId || (isSynthetic ? "playground" : demo ? "demo" : "");
  const recents = useRecents(recentsKey).recents;

  const home = useMemo<NavRow[]>(
    () => [
      { id: "home", title: "Home", icon: House, href: workspaceHref("home") },
      ...(hasProject ? [{ id: "dashboards", title: "Dashboards", icon: LayoutDashboard, href: workspaceHref("dashboards") }] : []),
    ],
    [hasProject, workspaceHref],
  );

  const sections = useMemo<NavSection[]>(() => {
    const help: NavSection = {
      id: "help",
      label: "",
      rows: [
        ...(liveProject ? [{ id: "quickstart", title: "Quickstart", icon: Terminal, href: workspaceHref("quickstart") }] : []),
        { id: "docs", title: "Docs", icon: BookOpen, href: `${MARKETING_ORIGIN}/docs`, external: true },
        { id: "call", title: "Book a call", icon: PhoneCall, href: `${MARKETING_ORIGIN}/contact`, external: true },
        { id: "support", title: "Support", icon: MessageSquareText, href: `${MARKETING_ORIGIN}/contact`, external: true },
        ...(canAccessContent ? [{ id: "admin-library", title: "Admin Library", icon: ShieldCheck, href: "/admin/library" }] : []),
      ],
    };
    if (!hasProject) return [help];
    const savedViewLeaves: NavLeaf[] = (savedViews ?? []).slice(0, 5).map((view) => ({
      title: view.name,
      href: `/dashboard/${projectId}/${view.target === "traces" ? "tracing" : "steps"}?savedView=${encodeURIComponent(view._id)}`,
    }));
    return [
      {
        id: "observe",
        label: "",
        rows: [
          {
            id: "observe",
            title: "Observe",
            icon: Activity,
            children: [
              { title: "Tracing", href: workspaceHref("tracing") },
              ...(liveProject ? [{ title: "Steps", href: workspaceHref("steps") }] : []),
              ...(demo ? [{ title: "Costs", href: workspaceHref("costs") }] : []),
              ...(isSynthetic || demo ? [{ title: "Explore", href: workspaceHref("explore") }] : []),
              ...(showSessions ? [{ title: "Sessions", href: workspaceHref("sessions") }] : []),
              { title: "Users", href: workspaceHref("users") },
              { title: "Alerts", href: workspaceHref("alerts"), badge: "New" as const },
              ...savedViewLeaves,
            ],
          },
        ],
      },
      {
        id: "improve",
        label: "",
        rows: [
          {
            id: "prompts",
            title: "Prompt management",
            icon: MessageSquareText,
            children: [{ title: "Prompts", href: workspaceHref("prompts") }, { title: "Playground", href: workspaceHref("playground") }],
          },
          {
            id: "evaluation",
            title: "Evaluation",
            icon: FlaskConical,
            children: [
              { title: "Scores", href: workspaceHref("scores") },
              { title: "Evaluators", href: workspaceHref("evaluators") },
              { title: "Human annotation", href: workspaceHref("annotation-queues", "human-annotation") },
              { title: "Datasets", href: workspaceHref("datasets") },
              { title: "Experiments", href: workspaceHref("experiments") },
            ],
          },
        ],
      },
      {
        id: "manage",
        label: "",
        rows: [
          liveProject
            ? {
                id: "settings",
                title: "Settings",
                icon: Settings2,
                children: [
                  { title: "General", href: workspaceHref("settings") },
                  { title: "Members", href: `${workspaceHref("settings")}?tab=members` },
                  { title: "API keys", href: workspaceHref("api-keys") },
                  { title: "Billing", href: workspaceHref("billing") },
                ],
              }
            : { id: "settings", title: "Settings", icon: Settings2, href: workspaceHref("settings") },
        ],
      },
      help,
    ];
  }, [canAccessContent, demo, hasProject, isSynthetic, liveProject, projectId, savedViews, showSessions, workspaceHref]);

  const currentSearch = searchParams.toString();
  // With no project yet, `/dashboard/<page>` would be read as a project id and the page would
  // sit on its loading skeleton, so every in-app link falls back to the project start page.
  const resolveHref = useCallback(
    (href: string) => (hasProject || href.startsWith("http") || !href.startsWith("/dashboard/") ? href : "/dashboard"),
    [hasProject],
  );
  const isLeafActive = useCallback(
    (href: string) => {
      const [path, query] = href.split("?");
      if (!isActivePath(pathname, path, projectId, Boolean(projectIdOverride), currentSearch)) return false;
      if (query) return currentSearch.includes(query);
      // The plain settings page is the "General" tab; a ?tab= belongs to the matching row.
      return !(path.endsWith("/settings") && new URLSearchParams(currentSearch).has("tab"));
    },
    [currentSearch, pathname, projectId, projectIdOverride],
  );

  // The page you are on, as a recents entry. Menu pages keep their menu name; anything deeper
  // (a single trace, session, prompt…) is named from its address so you can jump back to it.
  const dashboardBase = isSynthetic ? "/playground" : projectDashboardHref;
  const activeEntry = useMemo(() => {
    const here = pathname.replace(/\/$/, "");
    let exact: { href: string; title: string; section: string } | null = null;
    const consider = (leaf: NavLeaf, section: string) => {
      if (leaf.external || here !== leaf.href.split("?")[0] || !isLeafActive(leaf.href)) return;
      if (!exact || leaf.href.length > exact.href.length) exact = { href: leaf.href, title: leaf.title, section };
    };
    for (const row of home) if (row.href) consider({ title: row.title, href: row.href }, "Overview");
    for (const section of sections) {
      for (const row of section.rows) {
        if (row.children) row.children.forEach((child) => consider(child, row.title));
        else if (row.href) consider({ title: row.title, href: row.href, external: row.external }, section.label);
      }
    }
    if (exact) return exact as { href: string; title: string; section: string };
    if (!here.startsWith(`${dashboardBase}/`)) return null;
    const [first, ...rest] = here.slice(dashboardBase.length + 1).split("/");
    const noun = DETAIL_NOUNS[first];
    if (noun && rest.length) {
      const id = decodeURIComponent(rest[0]);
      return { href: here, title: `${noun} ${id.length > 14 ? `${id.slice(0, 12)}…` : id}`, section: titleCase(first) };
    }
    return { href: here, title: titleCase(rest.length ? rest[rest.length - 1] : first), section: titleCase(first) };
  }, [dashboardBase, home, isLeafActive, pathname, sections]);
  const activeHref = activeEntry?.href;
  const activeTitle = activeEntry?.title;
  const activeSection = activeEntry?.section;
  useEffect(() => {
    if (!hasProject || !activeHref || !activeTitle || !activeSection) return;
    recordRecent(recentsKey, { href: activeHref, title: activeTitle, section: activeSection });
  }, [activeHref, activeSection, activeTitle, hasProject, recentsKey]);

  // Rows with children open on their own while you are inside them; clicking a row overrides that for the session.
  const [rowOverrides, setRowOverrides] = useState<Record<string, boolean>>({});
  const rowOpen = (row: NavRow) => rowOverrides[row.id] ?? Boolean(row.children?.some((child) => isLeafActive(child.href)));
  const toggleRow = (row: NavRow) => setRowOverrides((current) => ({ ...current, [row.id]: !rowOpen(row) }));
  const recentsOpen = rowOverrides.recents ?? false;

  useEffect(() => {
    function onShellToggle() {
      if (window.matchMedia("(max-width: 700px)").matches) {
        onMobileToggle?.();
        return;
      }
      onCollapsedChange(!isCollapsed);
    }
    window.addEventListener("tracify:toggle-sidebar", onShellToggle);
    return () => window.removeEventListener("tracify:toggle-sidebar", onShellToggle);
  }, [isCollapsed, onCollapsedChange, onMobileToggle]);

  const close = () => onMobileClose?.();
  // In the icon-only sidebar a row that expands has nowhere to show its pages, so it opens the sidebar first.
  function expandRow(id: string) {
    setRowOverrides((current) => ({ ...current, [id]: true }));
    onCollapsedChange(false);
  }
  function openSearch() {
    window.dispatchEvent(new Event("tracify:open-command"));
  }

  const ctx: RowContext = {
    expanded: showPanel,
    isLeafActive,
    resolveHref,
    close,
    pin: liveProject ? { isPinned, toggle: togglePin } : null,
    rowOpen,
    toggleRow,
    expandRow,
  };

  const recentsRow = recents.length > 0 && hasProject;
  const recentsActive = false;

  return (
    <aside
      className={cn(
        "tracify-shell-sidebar fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/10 bg-[#0b0b0b] text-white overflow-hidden transition-[width,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        isMobileOpen && "is-mobile-open",
        peekOverlay && "shadow-[12px_0_32px_rgb(0_0_0/0.45)]",
      )}
      style={{ width: showPanel ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        setPointerInside(true);
        if (isCollapsed) setPeeking(true);
      }}
      onPointerLeave={() => setPointerInside(false)}
    >
      <DashboardCommandMenu projectId={projectId} showTrigger={false} basePath={demo ? DEMO_BASE_PATH : isSynthetic ? "/playground" : undefined} />

      <div className={cn("flex h-14 shrink-0 items-center", showPanel ? "px-3" : "justify-center")}>
        <Link href={projectDashboardHref} aria-label="Tracify dashboard" onClick={close} className="block">
          {showPanel ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logos/dissolve/tracify-logo-on-dark.svg" alt="Tracify" height={30} className="block h-[30px] w-auto" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logos/dissolve/tracify-icon.svg" alt="" width={36} height={36} className="block size-9" />
          )}
        </Link>
      </div>

      {isSynthetic && showPanel ? (
        <div className="captured-sidebar-context border-y border-white/10">
          <Link href={DEMO_BASE_PATH} className="captured-sidebar-context-link is-demo">↗ <span>Use Demo App</span></Link>
          <a href={`${MARKETING_ORIGIN}/cloud`} className="captured-sidebar-context-link">⊞ <span>Your Orgs</span></a>
        </div>
      ) : null}

      <div className={cn("shrink-0 space-y-2 pb-2", showPanel ? "px-3" : "flex flex-col items-center")}>
        <div className={cn(isSynthetic && "captured-sidebar-project")}>
          <ProjectSwitcher isCollapsed={!showPanel} previewProjectName={previewProjectName} synthetic={isSynthetic || demo} />
        </div>
        <button
          type="button"
          onClick={openSearch}
          aria-label="Quick search (Ctrl K)"
          title={showPanel ? undefined : "Quick search · Ctrl K"}
          className={cn(
            "flex items-center border border-white/15 bg-[#141414] font-mono text-[12px] !text-[#b4b4b4] outline-none transition-colors hover:border-white/40 hover:!text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55",
            showPanel ? "h-9 w-full gap-2.5 px-2.5" : "size-10 justify-center",
          )}
        >
          <Search className="size-4 shrink-0" strokeWidth={1.7} />
          {showPanel ? (
            <>
              <span className="truncate">Quick search…</span>
              <kbd className="ml-auto shrink-0 font-mono text-[10px] !text-white/45">Ctrl <span className="font-semibold !text-white/70">K</span></kbd>
            </>
          ) : null}
        </button>
      </div>

      <nav key={showPanel ? "open" : "rail"} className="min-h-0 flex-1 animate-in fade-in-0 overflow-y-auto pb-3 duration-300 scrollbar-hide motion-reduce:animate-none" aria-label="Dashboard">
        {home.map((row) => (
          <SidebarRow key={row.id} row={row} ctx={ctx} />
        ))}

        {recentsRow ? (
          showPanel ? (
            <>
              <button
                type="button"
                aria-expanded={recentsOpen}
                onClick={() => setRowOverrides((current) => ({ ...current, recents: !recentsOpen }))}
                className={cn(rowClass, "mx-2 w-[calc(100%-1rem)] text-left", recentsActive ? rowActive : rowIdle)}
              >
                <History className="size-[16px] shrink-0" strokeWidth={1.7} />
                <span className="truncate">Recents</span>
                <Chevron open={recentsOpen} className="ml-auto size-4" />
              </button>
              <Collapsible open={recentsOpen}>
                <div className="mx-2 ml-[23px] border-l !border-white/15">
                  {recents.map((recent) => {
                    const active = isLeafActive(recent.href);
                    return (
                      <Link
                        key={recent.href}
                        href={resolveHref(recent.href)}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(leafClass, "h-auto flex-col items-start gap-0 py-1.5", active ? leafActive : leafIdle)}
                      >
                        <span className="w-full truncate">{recent.title}</span>
                        <span className="w-full truncate text-[10.5px] !text-white/35">{recent.section}</span>
                      </Link>
                    );
                  })}
                </div>
              </Collapsible>
            </>
          ) : (
            <button
              type="button"
              aria-label="Recents"
              title="Recents"
              onClick={() => expandRow("recents")}
              className={cn(rowClass, "mx-auto w-10 justify-center px-0", rowIdle)}
            >
              <History className="size-[16px]" strokeWidth={1.7} />
            </button>
          )
        ) : null}

        {liveProject && showPanel ? <PinnedSection pins={pins} pathname={pathname} onToggle={togglePin} onNavClick={close} /> : null}

        {sections.map((section, index) => (
          <div key={section.id} className={cn(section.id === "help" && index > 0 && "mx-3 mt-2 border-t !border-white/10 pt-2", section.id !== "help" && index > 0 && !showPanel && "mt-1")}>
            {section.rows.map((row) => <SidebarRow key={row.id} row={row} ctx={ctx} />)}
          </div>
        ))}
      </nav>

      {liveProject && showPanel ? (
        <FinishSetupCard
          projectId={projectId}
          hasSavedView={Boolean(savedViews?.length)}
          tracingHref={workspaceHref("tracing")}
          keysHref={`${projectDashboardHref}/api-keys`}
          onNavClick={close}
        />
      ) : null}

      <div className="shrink-0 border-t border-white/10 pt-1">
        <SidebarAccountMenu isCollapsed={!showPanel} synthetic={isSynthetic || demo} />
        <div className={cn("flex h-11 items-center", showPanel ? "px-3" : "justify-center")}>
          <button
            type="button"
            aria-label={showPanel ? "Collapse sidebar (Ctrl+\\)" : "Open sidebar (Ctrl+\\)"}
            title={showPanel ? "Collapse sidebar · Ctrl+\\" : "Open sidebar · Ctrl+\\"}
            onClick={() => {
              setPeeking(false);
              if (isMobileOpen) onMobileClose?.();
              else onCollapsedChange(!isCollapsed);
            }}
            className="flex size-8 items-center justify-center !text-[#8d8d8d] outline-none transition-colors hover:!bg-[#181818] hover:!text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55"
          >
            {showPanel ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

const rowClass =
  "relative flex h-8 items-center gap-2.5 px-2.5 font-mono text-[12px] outline-none transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55";
const rowActive = "!bg-[#1c1c1c] font-semibold !text-white before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[#f4d44d]";
const rowIdle = "!text-[#b4b4b4] hover:!bg-[#181818] hover:!text-white";
const leafClass =
  "relative flex h-8 items-center px-3 font-mono text-[12px] outline-none transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55";
const leafActive = "!bg-[#1c1c1c] font-semibold !text-white before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[#f4d44d]";
const leafIdle = "!text-[#b4b4b4] hover:!bg-[#181818] hover:!text-white";

type RowContext = {
  expanded: boolean;
  isLeafActive: (href: string) => boolean;
  resolveHref: (href: string) => string;
  close: () => void;
  pin: { isPinned: (href: string) => boolean; toggle: (pin: { href: string; title: string }) => void } | null;
  rowOpen: (row: NavRow) => boolean;
  toggleRow: (row: NavRow) => void;
  expandRow: (id: string) => void;
};

/** Opens and closes by animating the height from and to zero, so folding is as smooth as unfolding. */
function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn("grid transition-[grid-template-rows,opacity] duration-250 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
  return <ChevronRight className={cn("shrink-0 opacity-60 transition-transform duration-250 motion-reduce:transition-none", open && "rotate-90", className)} />;
}

function NewBadge() {
  return <span className="shrink-0 border border-dashed !border-white/45 px-1.5 font-mono text-[10px] leading-[16px] !text-white">New</span>;
}

function SidebarRow({ row, ctx }: { row: NavRow; ctx: RowContext }) {
  const Icon = row.icon;
  const hasChildren = Boolean(row.children?.length);
  const childActive = hasChildren && row.children!.some((child) => ctx.isLeafActive(child.href));
  const open = hasChildren && ctx.rowOpen(row);
  // An open dropdown shows its active page below it, so only a folded one carries the highlight.
  const active = hasChildren ? childActive && !open : row.href ? ctx.isLeafActive(row.href) : false;

  if (!ctx.expanded) {
    const state = cn(rowClass, "mx-auto w-10 justify-center px-0", active ? rowActive : rowIdle);
    if (hasChildren) {
      return (
        <button type="button" aria-label={row.title} title={row.title} onClick={() => ctx.expandRow(row.id)} className={state}>
          <Icon className="size-[16px]" strokeWidth={1.7} />
        </button>
      );
    }
    return row.external ? (
      <a href={row.href} title={row.title} aria-label={row.title} className={state} onClick={ctx.close}>
        <Icon className="size-[16px]" strokeWidth={1.7} />
      </a>
    ) : (
      <Link href={ctx.resolveHref(row.href ?? "/dashboard")} title={row.title} aria-label={row.title} aria-current={active ? "page" : undefined} className={state} onClick={ctx.close}>
        <Icon className="size-[16px]" strokeWidth={1.7} />
      </Link>
    );
  }

  const rowState = cn(rowClass, "mx-2 w-[calc(100%-1rem)]", active ? rowActive : rowIdle);
  const label = (
    <>
      <Icon className="size-[16px] shrink-0" strokeWidth={1.7} />
      <span className="truncate">{row.title}</span>
      {row.badge ? <NewBadge /> : null}
    </>
  );

  const leaves = hasChildren
    ? row.children!.map((child) => {
              const leafOn = ctx.isLeafActive(child.href);
              const link = (
                <Link
                  href={ctx.resolveHref(child.href)}
                  aria-current={leafOn ? "page" : undefined}
                  onClick={ctx.close}
                  className={cn(leafClass, ctx.pin && "pr-9", leafOn ? leafActive : leafIdle)}
                >
                  <span className="truncate">{child.title}</span>
                  {child.badge ? <span className="ml-2"><NewBadge /></span> : null}
                </Link>
              );
              if (!ctx.pin || child.href.includes("savedView=")) return <div key={child.href}>{link}</div>;
              return (
                <div key={child.href} className="group/row relative">
                  {link}
                  <PinButton pinned={ctx.pin.isPinned(child.href)} title={child.title} onToggle={() => ctx.pin?.toggle({ href: child.href, title: child.title })} />
                </div>
              );
            })
    : null;

  if (hasChildren) {
    return (
      <>
        <button type="button" aria-expanded={open} onClick={() => ctx.toggleRow(row)} className={cn(rowClass, "mx-2 w-[calc(100%-1rem)] text-left", active ? rowActive : rowIdle)}>
          {label}
          <Chevron open={open} className="ml-auto size-4" />
        </button>
        <Collapsible open={open}>
          <div className="mx-2 ml-[23px] border-l !border-white/15">
            {leaves}
          </div>
        </Collapsible>
      </>
    );
  }

  if (row.external) {
    return (
      <a href={row.href} className={rowState} onClick={ctx.close}>
        {label}
        <span className="ml-auto text-[11px] opacity-50">↗</span>
      </a>
    );
  }
  const link = (
    <Link href={ctx.resolveHref(row.href ?? "/dashboard")} aria-current={active ? "page" : undefined} className={cn(rowState, ctx.pin && "pr-9")} onClick={ctx.close}>
      {label}
    </Link>
  );
  if (!ctx.pin || row.id === "home" || row.id === "dashboards") return link;
  return (
    <div className="group/row relative">
      {link}
      <PinButton pinned={ctx.pin.isPinned(row.href ?? "")} title={row.title} onToggle={() => ctx.pin?.toggle({ href: row.href ?? "", title: row.title })} />
    </div>
  );
}
