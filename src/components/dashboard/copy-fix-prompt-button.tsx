"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies a ready-made fix prompt for a failed run, with a short confirmation or a visible failure note. */
export function CopyFixPromptButton({ prompt }: { prompt: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2400);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        title="Copies a prompt describing this failure, ready to paste into a coding agent. Secrets stay redacted."
        className="flex h-8 items-center gap-2 border border-black/15 bg-white px-3 font-mono text-[11px] uppercase text-black/60 hover:border-black hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        {state === "copied" ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy fix prompt"}
      </button>
      <span className="sr-only" aria-live="polite">{state === "copied" ? "Fix prompt copied" : state === "failed" ? "Copy failed" : ""}</span>
    </>
  );
}
