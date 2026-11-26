export type TraceShortcut = "search" | "close" | "next" | "previous";

type ShortcutEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "target">;

const FORM_FIELDS = ["INPUT", "TEXTAREA", "SELECT"];

/**
 * Maps a keydown on the Tracing page to its shortcut. Keys typed into form fields
 * are ignored, and so are keys held with Ctrl, Cmd or Alt, which belong to the
 * browser or the command menu (Ctrl+K must not also move the selection).
 */
export function traceShortcut(event: ShortcutEvent): TraceShortcut | null {
  const target = event.target as HTMLElement | null;
  if (target && FORM_FIELDS.includes(target.tagName)) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === "/") return "search";
  if (event.key === "Escape") return "close";
  if (event.key === "ArrowDown" || event.key === "j") return "next";
  if (event.key === "ArrowUp" || event.key === "k") return "previous";
  return null;
}
