"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, ExternalLink, Link2Off, Share2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Variant = "light" | "dark";

const styles = {
  light: {
    button: "flex h-8 items-center gap-2 border border-black/15 bg-white px-3 font-mono text-[11px] uppercase text-black/60 hover:border-black hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50",
    trigger: "flex h-8 items-center gap-2 border border-black bg-[#f4d44d] px-3 font-mono text-[11px] uppercase text-black hover:bg-[#f7dc6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
    pop: "border border-black/20 bg-white text-black shadow-lg",
    label: "text-black/55",
    body: "text-black/60",
    input: "border-black/15 bg-[#f7f6f1] text-black/70",
    primary: "bg-black text-white hover:bg-[#f4d44d] hover:text-black",
    rule: "border-black/10",
    error: "text-red-700",
  },
  dark: {
    button: "flex h-7 items-center gap-1.5 rounded-md border border-[#262C35] px-2 text-xs text-[#C9CED6] hover:border-[#4A5260] disabled:opacity-50",
    trigger: "flex h-7 items-center gap-1.5 rounded-md bg-[#F4D44D] px-2.5 text-xs font-medium text-[#0B0D10] hover:bg-[#F7DC6B]",
    pop: "rounded-md border border-[#262C35] bg-[#14181E] text-[#E6E9EE] shadow-[0_16px_40px_rgba(0,0,0,0.6)]",
    label: "text-[#8B93A1]",
    body: "text-[#A9B0BC]",
    input: "rounded-md border-[#262C35] bg-[#0E1115] text-[#C9CED6]",
    primary: "rounded-md bg-[#F4D44D] text-[#0B0D10] hover:bg-[#F7DC6B]",
    rule: "border-[#262C35]",
    error: "text-[#FF8A8A]",
  },
} as const;

/**
 * One-click sharing for a run. "Create link and copy" makes the public link and puts it on the clipboard
 * in one step; if a link already exists, the popover shows it with Copy, Open and Turn off.
 */
export function ShareTraceButton({ projectId, runId, variant = "light", label = "Share", teamUrl }: { projectId: string; runId: string; variant?: Variant; label?: string; teamUrl?: () => string }) {
  const s = styles[variant];
  const args = { projectId: projectId as Id<"projects">, runId };
  const link = useQuery(api.sharedTraces.getForRun, args);
  const create = useMutation(api.sharedTraces.create);
  const revoke = useMutation(api.sharedTraces.revoke);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  const publicUrl = link ? `${window.location.origin}/share/${link.token}` : "";

  // Close on outside click or Escape so the popover never gets stuck over the trace.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function fail(err: unknown) {
    setError(err instanceof Error && err.message.includes("Developer") ? "Viewers can't share traces." : "Something went wrong. Try again.");
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      return true;
    } catch {
      setError("Copy failed. Select the link and copy it by hand.");
      return false;
    }
  }

  async function createAndCopy() {
    setBusy(true);
    setError("");
    try {
      const made = await create(args);
      await copy(`${window.location.origin}/share/${made.token}`);
    } catch (err) { fail(err); }
    setBusy(false);
  }

  async function turnOff() {
    setBusy(true);
    setError("");
    try { await revoke(args); } catch (err) { fail(err); }
    setBusy(false);
  }

  return (
    <div className="relative" ref={root}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog" className={s.trigger}>
        <Share2 className="size-3" />{label}{link ? <span aria-label="Public link is on" className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="Share this run" className={`absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-4 p-4 ${s.pop}`}>
          <div>
            <p className={`font-mono text-[10px] uppercase tracking-widest ${s.label}`}>Share this run</p>
            <p className={`mt-1 text-[12px] leading-relaxed ${s.body}`}>Anyone with the link can read the steps, inputs and outputs. No account needed. They can&apos;t see your other data or change anything.</p>
          </div>
          {link === undefined ? <p className={`font-mono text-[11px] ${s.label}`}>Loading…</p> : link ? (
            <div className="space-y-2">
              <input readOnly value={publicUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Public link" className={`h-9 w-full border px-2 font-mono text-[10px] ${s.input}`} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy(publicUrl)} className={s.button}>{copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy link"}</button>
                <a href={publicUrl} target="_blank" rel="noreferrer" className={s.button}><ExternalLink className="size-3" />Preview</a>
                <button type="button" disabled={busy} onClick={() => void turnOff()} className={s.button}><Link2Off className="size-3" />Turn off</button>
              </div>
              <p className={`text-[11px] ${s.body}`}>Turning it off ends access at once. Sharing again makes a new link.</p>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => void createAndCopy()} className={`h-9 w-full font-mono text-[11px] uppercase disabled:opacity-50 ${s.primary}`}>{busy ? "Creating…" : copied ? "Link copied" : "Create link and copy"}</button>
          )}
          <div className={`border-t pt-3 ${s.rule}`}>
            <p className={`font-mono text-[10px] uppercase tracking-widest ${s.label}`}>Team only</p>
            <p className={`mt-1 text-[12px] ${s.body}`}>Teammates must be signed in to open this one.</p>
            <button type="button" onClick={() => void copy(teamUrl ? teamUrl() : window.location.href)} className={`${s.button} mt-2`}><Copy className="size-3" />Copy team link</button>
          </div>
          {error ? <p role="alert" className={`font-mono text-[11px] ${s.error}`}>{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
