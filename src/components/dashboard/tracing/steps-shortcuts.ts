export type StepsShortcut = "search" | "close";

type ShortcutEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "target">;

const FORM_FIELDS = ["INPUT", "TEXTAREA", "SELECT"];

/**
 * Maps a keydown on the Steps page to its shortcut. Keys typed into form fields are ignored,
 * and so are keys held with Ctrl, Cmd or Alt, which belong to the browser or the command menu.
 */
export function stepsShortcut(event: ShortcutEvent): StepsShortcut | null {
  const target = event.target as HTMLElement | null;
  if (target && FORM_FIELDS.includes(target.tagName)) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === "/") return "search";
  if (event.key === "Escape") return "close";
  return null;
}
