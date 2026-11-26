import { describe, expect, it } from "vitest";
import { stepsShortcut } from "./steps-shortcuts";

const key = (key: string, extra: Partial<Parameters<typeof stepsShortcut>[0]> = {}) =>
  stepsShortcut({ key, ctrlKey: false, metaKey: false, altKey: false, target: null, ...extra });

describe("stepsShortcut", () => {
  it("maps / to search and Escape to close", () => {
    expect(key("/")).toBe("search");
    expect(key("Escape")).toBe("close");
    expect(key("a")).toBeNull();
  });

  it("ignores keys held with Ctrl, Cmd or Alt", () => {
    expect(key("/", { ctrlKey: true })).toBeNull();
    expect(key("Escape", { metaKey: true })).toBeNull();
    expect(key("/", { altKey: true })).toBeNull();
  });

  it("ignores keys typed into form fields", () => {
    expect(key("/", { target: { tagName: "INPUT" } as unknown as EventTarget })).toBeNull();
    expect(key("Escape", { target: { tagName: "TEXTAREA" } as unknown as EventTarget })).toBeNull();
  });
});
