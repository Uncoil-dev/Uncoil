"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_CASE, caseById, isCaseId, type Case, type CaseId } from "./cases";

// The failure the visitor picked, shared by every section of the page. The server and the first
// client render always tell the default story, so search engines and first paint see the same
// page; a `?case=` in the address (set when the visitor picks one) takes over right after, which
// keeps a choice through a reload and makes it linkable without the server reading the query.

let picked: CaseId | null = null;
let picks = 0;
const listeners = new Set<() => void>();

function current(): CaseId {
  if (picked === null) {
    const q = new URLSearchParams(window.location.search).get("case");
    picked = isCaseId(q) ? q : DEFAULT_CASE;
  }
  return picked;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Reads the address again: called when the page mounts, so a case kept in module state from an
 * earlier visit never outlives its link. A missing or unknown `?case=` means the default story.
 */
export function syncCaseFromUrl() {
  picked = null;
  listeners.forEach((cb) => cb());
}

/** Picks a failure for the whole page and keeps it in the address without adding history. */
export function pickCase(id: CaseId) {
  picks++;
  if (id === current()) {
    listeners.forEach((cb) => cb());
    return;
  }
  picked = id;
  const url = new URL(window.location.href);
  if (id === DEFAULT_CASE) url.searchParams.delete("case");
  else url.searchParams.set("case", id);
  window.history.replaceState(window.history.state, "", url);
  listeners.forEach((cb) => cb());
}

/** The picked case. */
export function useCase(): Case {
  return caseById(useSyncExternalStore(subscribe, current, () => DEFAULT_CASE));
}

/** How many times the visitor has picked a case, so a scene can replay its failure on each pick. */
export function usePicks() {
  return useSyncExternalStore(subscribe, () => picks, () => 0);
}
