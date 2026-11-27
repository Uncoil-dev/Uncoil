"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { promptFor, type Agent } from "./prompt";

/** Copies text; resolves false when neither the clipboard API nor the legacy copy command works. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/**
 * Copy state for one or more copy buttons. `done` names the button that copied, for a moment;
 * `manual` names the one whose copy the browser blocked, so it can offer the text to copy by hand.
 */
export function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy(id: string, text: string) {
    const ok = await copyText(text);
    window.clearTimeout(timer.current);
    setDone(ok ? id : null);
    setManual(ok ? null : id);
    if (ok) timer.current = window.setTimeout(() => setDone(null), 2000);
  }
  return { done, manual, copy, closeManual: () => setManual(null) };
}

/** Shown when the browser blocks the clipboard: the text, preselected, to copy by hand. */
export function ManualCopy({ text, onClose, className = "" }: { text: string; onClose: () => void; className?: string }) {
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => area.current?.select(), []);
  return (
    <span role="dialog" aria-label="Copy by hand" className={`absolute z-30 block w-[min(30rem,calc(100vw-2.5rem))] border-2 border-[#eceae3] bg-[#090909] p-3 text-left text-[#eceae3] shadow-[6px_6px_0_0_#f4d44d] ${className}`}>
      <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]/70">
        Your browser blocked copying. Select and copy:
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 shrink-0 place-items-center hover:bg-[#eceae3] hover:text-black focus-visible:outline-2 focus-visible:outline-[#f4d44d]">
          <X className="size-4" aria-hidden="true" />
        </button>
      </span>
      <textarea ref={area} readOnly value={text} rows={8} className="mt-2 block w-full resize-none border border-[#eceae3]/25 bg-[#090909] p-2 font-mono text-[11px] leading-5 text-[#eceae3] outline-none" />
    </span>
  );
}

/**
 * A button that puts the setup prompt on the clipboard and says so. Both labels share one grid
 * cell, so the button keeps its width when it flips to "Copied". When the browser blocks the
 * clipboard, it opens the prompt in a selectable box instead. `wide` fills the row on phones.
 */
export function CopyPromptButton({ className, agent, wide = false, label = "Copy setup prompt" }: { className: string; agent?: Agent; wide?: boolean; label?: string }) {
  const { done, manual, copy, closeManual } = useCopy();
  const prompt = promptFor(agent);
  const copied = done === "prompt";

  return (
    <span className={`relative ${wide ? "flex w-full sm:inline-flex sm:w-auto" : "inline-flex"}`}>
      <button type="button" onClick={() => copy("prompt", prompt)} className={`${wide ? "w-full sm:w-auto" : ""} ${className}`}>
        <span className="grid">
          <span className={`[grid-area:1/1] ${copied ? "invisible" : ""}`}>{label}</span>
          <span className={`[grid-area:1/1] ${copied ? "" : "invisible"}`} aria-hidden={!copied}>Copied</span>
        </span>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />}
      </button>
      <span className="sr-only" role="status">{copied ? "Setup prompt copied. Paste it into your coding agent." : ""}</span>
      {manual === "prompt" && <ManualCopy text={prompt} onClose={closeManual} className="left-0 top-full mt-3" />}
    </span>
  );
}
