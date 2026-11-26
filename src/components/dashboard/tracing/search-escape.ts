type EscapeEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "preventDefault"> & { currentTarget: { blur: () => void } };

/**
 * Escape in a search box clears it and leaves the box. Page shortcuts skip keys typed into inputs,
 * so a second Escape, now outside the box, closes the panel as usual.
 */
export function escapeSearch(event: EscapeEvent, clear: () => void) {
  if (event.key !== "Escape" || event.ctrlKey || event.metaKey || event.altKey) return false;
  event.preventDefault();
  clear();
  event.currentTarget.blur();
  return true;
}
