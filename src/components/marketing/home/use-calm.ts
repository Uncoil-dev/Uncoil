"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Whether the visitor asked for reduced motion. The server and the first client render both
 * report `false`, so the markup hydrates identically; React then re-renders with the real
 * preference, and every animated section switches to its still end state.
 */
export function useCalm() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
