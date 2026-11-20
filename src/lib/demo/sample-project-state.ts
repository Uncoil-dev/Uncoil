"use client";

import { useCallback, useSyncExternalStore } from "react";

/** The sample project is not a database row: it never counts toward project or span limits. This only remembers if the user hid it on this browser. */
const HIDDEN_KEY = "uncoil.sampleProject.hidden";
const CHANGE_EVENT = "uncoil:sample-project-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function read() {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function useSampleProjectHidden(): [boolean, (hidden: boolean) => void] {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  const setHidden = useCallback((next: boolean) => {
    try {
      if (next) window.localStorage.setItem(HIDDEN_KEY, "true");
      else window.localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // Hiding is a convenience only.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [hidden, setHidden];
}
