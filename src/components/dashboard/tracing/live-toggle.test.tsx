import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveToggle, readTracingLive, writeTracingLive } from "./live-toggle";

const toggle = (live: boolean, fixedWindow: boolean) => renderToStaticMarkup(createElement(LiveToggle, { live, fixedWindow, onToggle: () => {} }));

describe("LiveToggle", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows Live with a pulsing dot, or Paused, as a pressed toggle", () => {
    expect(toggle(true, false)).toMatch(/aria-pressed="true"[\s\S]*animate-pulse[\s\S]*Live/);
    expect(toggle(false, false)).toMatch(/aria-pressed="false"[\s\S]*Paused/);
  });

  it("is disabled and explains why for a fixed window", () => {
    const html = toggle(true, true);
    expect(html).toContain("disabled");
    expect(html).toContain("Live updates are off for a fixed window");
    expect(html).toContain("Paused");
  });

  it("remembers the choice in this browser, defaulting to live", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
    expect(readTracingLive()).toBe(true);
    writeTracingLive(false);
    expect(store.get("uncoil.tracing.live")).toBe("paused");
    expect(readTracingLive()).toBe(false);
    writeTracingLive(true);
    expect(readTracingLive()).toBe(true);
  });
});
