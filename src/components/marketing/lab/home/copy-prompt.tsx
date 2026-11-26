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
 * A button that puts the setup prompt on the clipboard and says so. When the browser blocks the
 * clipboard, it opens the prompt in a selectable box instead, so the visitor can copy it by hand.
 */
export function CopyPromptButton({ className, agent, label = "Copy setup prompt", done = "Copied. Paste it into your coding agent" }: { className: string; agent?: Agent; label?: string; done?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const timer = useRef<number | undefined>(undefined);
  const area = useRef<HTMLTextAreaElement>(null);
  const prompt = promptFor(agent);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === "manual") area.current?.select();
  }, [state]);

  async function run() {
    const ok = await copyText(prompt);
    setState(ok ? "copied" : "manual");
    window.clearTimeout(timer.current);
    if (ok) timer.current = window.setTimeout(() => setState("idle"), 2400);
  }

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={run} className={className}>
        {state === "copied" ? done : label}
        {state === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />}
      </button>
      <span className="sr-only" role="status">{state === "copied" ? "Setup prompt copied" : ""}</span>
      {state === "manual" && (
        <span role="dialog" aria-label="Copy the setup prompt" className="absolute left-0 top-full z-30 mt-3 block w-[min(30rem,calc(100vw-2.5rem))] border-2 border-[#eceae3] bg-[#090909] p-3 text-left text-[#eceae3] shadow-[6px_6px_0_0_#f4d44d]">
          <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]/70">
            Your browser blocked copying. Select and copy:
            <button type="button" onClick={() => setState("idle")} aria-label="Close" className="grid size-11 shrink-0 place-items-center hover:bg-[#eceae3] hover:text-black focus-visible:outline-2 focus-visible:outline-[#f4d44d]">
              <X className="size-4" aria-hidden="true" />
            </button>
          </span>
          <textarea ref={area} readOnly value={prompt} rows={8} className="mt-2 block w-full resize-none border border-[#eceae3]/25 bg-[#090909] p-2 font-mono text-[11px] leading-5 text-[#eceae3] outline-none" />
        </span>
      )}
    </span>
  );
}
