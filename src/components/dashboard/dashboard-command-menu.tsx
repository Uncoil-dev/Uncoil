"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Command, Search, ArrowUpRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type CommandMenuProps = { projectId?: string; showTrigger?: boolean; basePath?: string };

/**
 * The dialog lives in the sidebar (one per page, so Ctrl K never opens two). Everything else that
 * wants search renders `showTrigger`, which only asks that dialog to open.
 */
export function DashboardCommandMenu({ projectId, showTrigger = true, basePath }: CommandMenuProps) {
  if (showTrigger) return <CommandTrigger />;
  return <CommandDialog projectId={projectId} basePath={basePath} />;
}

function CommandTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("uncoil:open-command"))}
      aria-label="Open command menu"
      className="hidden h-8 items-center gap-2 border border-black/15 bg-white px-3 font-mono text-[10px] uppercase tracking-widest text-black/55 transition-colors hover:border-black hover:text-black md:flex"
    >
      <Command className="size-3" aria-hidden="true" />
      <span>Command</span>
      <kbd className="border border-black/25 px-1.5 py-0.5 text-[9px] text-black/55">⌘K</kbd>
    </button>
  );
}

function CommandDialog({ projectId, basePath }: { projectId?: string; basePath?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && ["k", "i"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setOpen(true);
      }
    }
    function onAssistantOpen() { setOpen(true); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("uncoil:open-command", onAssistantOpen);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("uncoil:open-command", onAssistantOpen); };
  }, []);

  const items = useMemo(() => {
    const base = basePath ?? (projectId ? `/dashboard/${projectId}` : "/dashboard");
    const destinations = [
      ["Overview", base],
      ["Dashboards", `${base}/dashboards`],
      ["Tracing", `${base}/tracing`],
      ["Runs", `${base}/runs`],
      ["Sessions", `${base}/sessions`],
      ["Users", `${base}/users`],
      ["Alerts", `${base}/alerts`],
      ["Automations", `${base}/automations`],
      ["Search traces", `${base}/search`],
      ["Costs", `${base}/costs`],
      ["Scores", `${base}/scores`],
      ["Scores analytics", `${base}/scores/analytics`],
      ["Evaluators", `${base}/evaluators`],
      ["Human Annotation", `${base}/human-annotation`],
      ["Evaluation", `${base}/evaluation`],
      ["Evaluation rules", `${base}/evals/rules`],
      ["Prompt Management", `${base}/prompt-management`],
      ["Prompts", `${base}/prompts`],
      ["Playground", `${base}/playground`],
      ["Operations", `${base}/operations`],
      ["Settings", `${base}/settings`],
      ["Quickstart", `${base}/quickstart`],
    ];
    const lookup = query.trim();
    if (projectId && lookup.length >= 3) {
      destinations.unshift(
        [`Inspect run “${lookup}”`, `${base}/runs/${encodeURIComponent(lookup)}`],
        [`Open session “${lookup}”`, `${base}/sessions/${encodeURIComponent(lookup)}`],
      );
    }
    return destinations.filter(([label]) => label.toLowerCase().includes(lookup.toLowerCase()));
  }, [basePath, projectId, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden !border-white/20 !bg-[#0b0b0b] p-0 shadow-2xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Dashboard command menu</DialogTitle>
          <DialogDescription className="sr-only">Navigate to a dashboard surface.</DialogDescription>
          <div className="flex items-center gap-3 border-b !border-white/10 px-4">
            <Search className="size-4 !text-white/55" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dashboard…"
              aria-label="Search dashboard destinations"
              className="h-14 min-w-0 flex-1 bg-transparent font-mono text-sm !text-white outline-none placeholder:!text-white/45"
            />
            <kbd className="border !border-white/25 px-1.5 py-0.5 font-mono text-[9px] !text-white/55">ESC</kbd>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {items.length ? items.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="flex items-center justify-between relative border border-transparent px-3 py-3 font-mono text-xs !text-[#b4b4b4] transition-colors hover:!bg-[#181818] hover:!text-white hover:before:absolute hover:before:inset-y-0 hover:before:left-0 hover:before:w-[3px] hover:before:bg-[#f4d44d] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55"
              >
                <span>{label}</span>
                <ArrowUpRight className="size-3 !text-white/45" aria-hidden="true" />
              </Link>
            )) : (
              <div className="p-8 text-center font-mono text-[10px] uppercase tracking-widest !text-white/55">No destinations found</div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t !border-white/10 px-4 py-2 font-mono text-[9px] uppercase tracking-widest !text-white/45"><span>Navigate workspace surfaces</span><span>⌘K / Ctrl+I assistant</span><span>Ctrl+\ sidebar</span></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
