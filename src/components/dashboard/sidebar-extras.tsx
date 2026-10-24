"use client";

import { Check, Pin, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const EVENT = "tracify:sidebar-extras";
const pinsKey = (projectId: string) => `tracify.sidebar.pins.${projectId}`;
const recentsKey = (projectId: string) => `tracify.sidebar.recents.${projectId || "none"}`;
const setupKey = (projectId: string) => `tracify.sidebar.setupDismissed.${projectId}`;

function read(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function useStored(key: string) {
  return useSyncExternalStore(subscribe, () => read(key), () => "");
}

/** Pinned page links (href + title), remembered per project in this browser. */
export type Pin = { href: string; title: string };

function parsePins(raw: string): Pin[] {
  try {
    const list = JSON.parse(raw || "[]");
    if (!Array.isArray(list)) return [];
    return list.filter((p): p is Pin => typeof p?.href === "string" && typeof p?.title === "string").slice(0, 8);
  } catch {
    return [];
  }
}

export function usePins(projectId: string) {
  const raw = useStored(pinsKey(projectId));
  const pins = parsePins(raw);
  function toggle(pin: Pin) {
    const next = pins.some((p) => p.href === pin.href) ? pins.filter((p) => p.href !== pin.href) : [...pins, pin].slice(-8);
    write(pinsKey(projectId), next.length ? JSON.stringify(next) : "");
  }
  return { pins, toggle, isPinned: (href: string) => pins.some((p) => p.href === href) };
}

/** The pages visited most recently in this project, newest first, remembered in this browser. */
export type Recent = { href: string; title: string; section: string };
const MAX_RECENTS = 5;

function parseRecents(raw: string): Recent[] {
  try {
    const list = JSON.parse(raw || "[]");
    if (!Array.isArray(list)) return [];
    return list
      .filter((r): r is Recent => typeof r?.href === "string" && typeof r?.title === "string" && typeof r?.section === "string")
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function useRecents(projectId: string) {
  const raw = useStored(recentsKey(projectId));
  const recents = parseRecents(raw);
  return { recents };
}

/** Puts a page at the top of the project's recents; reads storage fresh so callers never act on stale lists. */
export function recordRecent(projectId: string, entry: Recent) {
  const current = parseRecents(read(recentsKey(projectId)));
  if (current[0]?.href === entry.href) return;
  const next = [entry, ...current.filter((r) => r.href !== entry.href)].slice(0, MAX_RECENTS);
  write(recentsKey(projectId), JSON.stringify(next));
}

const sectionLabel = "px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-white/35";
const rowClass =
  "relative flex h-8 items-center gap-2 px-4 font-mono text-[12px] !text-[#a0a0a0] outline-none transition-colors hover:!bg-[#181818] hover:!text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55";

export function PinButton({ pinned, title, onToggle }: { pinned: boolean; title: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={pinned ? `Unpin ${title}` : `Pin ${title}`}
      aria-pressed={pinned}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55",
        pinned ? "!text-[#f4d44d]" : "!text-white/40 opacity-0 hover:!text-white focus-visible:opacity-100 group-hover/row:opacity-100",
      )}
    >
      <Pin className={cn("size-3.5", pinned && "fill-current")} />
    </button>
  );
}

export function PinnedSection({
  pins,
  pathname,
  onToggle,
  onNavClick,
}: {
  pins: Pin[];
  pathname: string;
  onToggle: (pin: Pin) => void;
  onNavClick: () => void;
}) {
  if (!pins.length) return null;
  return (
    <div className="pb-1">
      <div className={sectionLabel}>Pinned</div>
      {pins.map((pin) => (
        <div key={pin.href} className="group/row relative">
          <Link
            href={pin.href}
            onClick={onNavClick}
            aria-current={pathname === pin.href.split("?")[0] ? "page" : undefined}
            className={cn(rowClass, "pr-9", pathname === pin.href.split("?")[0] && "!bg-[#1c1c1c] !text-white")}
          >
            <span className="truncate">{pin.title}</span>
          </Link>
          <PinButton pinned title={pin.title} onToggle={() => onToggle(pin)} />
        </div>
      ))}
    </div>
  );
}

type SavedView = { _id: string; name: string; target: "traces" | "steps"; shared: boolean };

/** Loads the project's saved views once per project; null while loading or when unavailable. */
export function useSavedViews(projectId: string, enabled: boolean) {
  const [state, setState] = useState<{ projectId: string; views: SavedView[] } | null>(null);
  useEffect(() => {
    if (!enabled || !projectId) return;
    const controller = new AbortController();
    fetch(`/api/projects/${encodeURIComponent(projectId)}/saved-views`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<SavedView[]>) : null))
      .then((views) => {
        if (views && !controller.signal.aborted) setState({ projectId, views });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [projectId, enabled]);
  return state && state.projectId === projectId ? state.views : null;
}

export function SavedViewsSection({
  views,
  projectId,
  onNavClick,
}: {
  views: SavedView[];
  projectId: string;
  onNavClick: () => void;
}) {
  if (!views.length) return null;
  return (
    <div className="pb-1">
      <div className={sectionLabel}>Saved views</div>
      {views.slice(0, 5).map((view) => (
        <Link
          key={view._id}
          href={`/dashboard/${projectId}/${view.target === "traces" ? "tracing" : "steps"}?savedView=${encodeURIComponent(view._id)}`}
          onClick={onNavClick}
          className={rowClass}
        >
          <span className="truncate">{view.name}</span>
          <span className="ml-auto shrink-0 text-[10px] text-white/30">{view.shared ? "team" : view.target === "steps" ? "steps" : ""}</span>
        </Link>
      ))}
    </div>
  );
}

export function FinishSetupCard({
  projectId,
  hasSavedView,
  tracingHref,
  keysHref,
  onNavClick,
}: {
  projectId: string;
  hasSavedView: boolean;
  tracingHref: string;
  keysHref: string;
  onNavClick: () => void;
}) {
  const project = useQuery(api.projects.getProjectById, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  if (!project) return null;
  return (
    <FinishSetupView
      projectId={projectId}
      hasKey={Boolean(project.apiKeyCreatedAt) && project.apiKeyStatus !== "revoked"}
      hasTrace={Boolean(project.apiKeyLastUsedAt)}
      hasSavedView={hasSavedView}
      tracingHref={tracingHref}
      keysHref={keysHref}
      onNavClick={onNavClick}
    />
  );
}

export function FinishSetupView({
  projectId,
  hasKey,
  hasTrace,
  hasSavedView,
  tracingHref,
  keysHref,
  onNavClick,
}: {
  projectId: string;
  hasKey: boolean;
  hasTrace: boolean;
  hasSavedView: boolean;
  tracingHref: string;
  keysHref: string;
  onNavClick: () => void;
}) {
  const dismissed = useStored(setupKey(projectId)) === "1";
  if (dismissed) return null;
  const steps = [
    { label: "Create an API key", done: hasKey, href: keysHref },
    { label: "Send your first trace", done: hasTrace, href: `/dashboard/${projectId}/quickstart` },
    { label: "Save a view", done: hasSavedView, href: tracingHref },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  return (
    <div className="mx-3 mb-2 mt-1 border border-white/10 bg-[#141414]">
      <div className="flex items-center justify-between px-3 pt-2.5">
        <span className="font-mono text-[11px] font-semibold text-white">Finish setup</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-white/40">
            {doneCount}/{steps.length}
          </span>
          <button
            type="button"
            aria-label="Hide finish setup"
            onClick={() => write(setupKey(projectId), "1")}
            className="!text-white/40 outline-none hover:!text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="mx-3 mt-2 flex h-1 gap-0.5" aria-hidden>
        {steps.map((step) => (
          <span key={step.label} className={cn("flex-1", step.done ? "bg-[#f4d44d]" : "bg-white/10")} />
        ))}
      </div>
      <ul className="py-1.5">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              onClick={onNavClick}
              className={cn(
                "flex h-7 items-center gap-2 px-3 font-mono text-[11px] outline-none hover:!bg-[#1c1c1c] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55",
                step.done ? "!text-white/35 line-through" : "!text-[#d0d0d0]",
              )}
            >
              <span className={cn("flex size-3.5 shrink-0 items-center justify-center border", step.done ? "border-[#f4d44d] bg-[#f4d44d] !text-[#090909]" : "border-white/30")}>
                {step.done ? <Check className="size-2.5" strokeWidth={3} /> : null}
              </span>
              {step.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
