import { describe, expect, it } from "vitest";
import { escapeSearch } from "./search-escape";

function keyEvent(key: string, extra: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}) {
  const calls: string[] = [];
  return {
    calls,
    event: { key, ctrlKey: false, metaKey: false, altKey: false, ...extra, preventDefault: () => calls.push("prevent"), currentTarget: { blur: () => calls.push("blur") } },
  };
}

describe("escapeSearch", () => {
  it("clears the search and leaves the box on Escape, so the next Escape reaches the page", () => {
    const { event, calls } = keyEvent("Escape");
    let cleared = false;
    expect(escapeSearch(event, () => { cleared = true; })).toBe(true);
    expect(cleared).toBe(true);
    expect(calls).toEqual(["prevent", "blur"]);
  });

  it("ignores other keys and Escape held with a modifier", () => {
    for (const { event, calls } of [keyEvent("a"), keyEvent("Escape", { metaKey: true }), keyEvent("Escape", { ctrlKey: true })]) {
      let cleared = false;
      expect(escapeSearch(event, () => { cleared = true; })).toBe(false);
      expect(cleared).toBe(false);
      expect(calls).toEqual([]);
    }
  });
});
