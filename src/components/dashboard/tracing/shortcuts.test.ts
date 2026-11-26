import { describe, expect, it } from "vitest";
import { traceShortcut } from "./shortcuts";

const press = (key: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey", boolean>> = {}, tagName = "BODY") =>
  traceShortcut({ key, ctrlKey: false, metaKey: false, altKey: false, ...mods, target: { tagName } as unknown as EventTarget });

describe("traceShortcut", () => {
  it("maps the plain keys to their Tracing actions", () => {
    expect(press("/")).toBe("search");
    expect(press("Escape")).toBe("close");
    expect(press("j")).toBe("next");
    expect(press("ArrowDown")).toBe("next");
    expect(press("k")).toBe("previous");
    expect(press("ArrowUp")).toBe("previous");
  });

  it("ignores keys held with Ctrl, Cmd or Alt, so Ctrl+K keeps the selected trace", () => {
    expect(press("k", { ctrlKey: true })).toBeNull();
    expect(press("k", { metaKey: true })).toBeNull();
    expect(press("j", { altKey: true })).toBeNull();
  });

  it("ignores keys typed into form fields", () => {
    expect(press("j", {}, "INPUT")).toBeNull();
    expect(press("/", {}, "TEXTAREA")).toBeNull();
  });
});
