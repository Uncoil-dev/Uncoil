"use client";

import { useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

/** Writes text to the clipboard and reports whether it worked; a blocked or missing clipboard is a failure. */
export async function writeClipboard(clipboard: Pick<Clipboard, "writeText"> | undefined, text: string) {
  try {
    if (!clipboard) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function copyLabel(state: CopyState, idle: string) {
  return state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : idle;
}

/** Copy button state: "copied" or "failed" for a moment after each copy, then back to idle. */
export function useCopyText(resetMs = 1500) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy(text: string) {
    const ok = await writeClipboard(navigator.clipboard, text);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), resetMs);
  }
  return { state, copy, label: (idle: string) => copyLabel(state, idle) };
}
