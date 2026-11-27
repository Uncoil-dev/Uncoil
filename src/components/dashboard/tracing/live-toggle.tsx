"use client";

import { useSyncExternalStore } from "react";

// Tracing and Steps share one live/paused choice per browser.
const LIVE_STORAGE = "uncoil.tracing.live";

export function readTracingLive(): boolean {
  try { return localStorage.getItem(LIVE_STORAGE) !== "paused"; } catch { return true; }
}

export function writeTracingLive(live: boolean) {
  try { localStorage.setItem(LIVE_STORAGE, live ? "live" : "paused"); } catch {}
}

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

// Reads the stored choice after hydration (the server always renders Live) and saves changes.
export function useTracingLive(): [boolean, (live: boolean) => void] {
  const live = useSyncExternalStore(subscribe, readTracingLive, () => true);
  return [live, (next) => { writeTracingLive(next); listeners.forEach((listener) => listener()); }];
}

export function LiveToggle({ live, fixedWindow, onToggle }: { live: boolean; fixedWindow: boolean; onToggle: () => void }) {
  const on = live && !fixedWindow;
  return (
    <button type="button" aria-pressed={on} onClick={onToggle} disabled={fixedWindow}
      title={fixedWindow ? "Live updates are off for a fixed window" : on ? "New traces appear automatically. Click to pause." : "Paused. Click to resume live updates."}
      className="flex h-8 items-center gap-2 rounded-md border border-[#262C35] px-2.5 text-xs text-[#C9CED6] hover:border-[#4A5260] disabled:opacity-50">
      <span aria-hidden="true" className={`size-2 rounded-full ${on ? "animate-pulse bg-[#5BE3A0]" : "bg-[#6B7380]"}`} />{on ? "Live" : "Paused"}
    </button>
  );
}
