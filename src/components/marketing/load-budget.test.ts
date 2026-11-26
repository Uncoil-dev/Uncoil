import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prewarmRules } from "./cloud-prewarm";
import { loopWhileVisible } from "./landing/dither-ember";

describe("page load budget", () => {
  it("does not prerender the cloud page during page load", () => {
    expect(prewarmRules.prerender.every((rule) => rule.eagerness !== "eager" && rule.eagerness !== "immediate")).toBe(true);
  });

  it("loads the tag manager after the page is idle", () => {
    const source = readFileSync(new URL("../analytics/google-tag-manager.tsx", import.meta.url), "utf8");
    expect(source).toContain('strategy="lazyOnload"');
  });

  it("imports the smooth scroll library lazily", () => {
    const source = readFileSync(new URL("./landing/smooth-scroll.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/^import .* from "lenis"/m);
    expect(source).toContain('import("lenis")');
  });

  describe("dither glow animation", () => {
    let frames: FrameRequestCallback[] = [];
    let report: (...visible: boolean[]) => void = () => {};

    function stubBrowser() {
      frames = [];
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
      vi.stubGlobal("cancelAnimationFrame", (id: number) => { frames[id - 1] = () => {}; });
      vi.stubGlobal("IntersectionObserver", class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { report = (...visible) => cb(visible.map((isIntersecting) => ({ isIntersecting }))); }
        observe() {}
        disconnect() {}
      });
    }

    function runFrames(count: number) {
      for (let i = 0; i < count; i++) {
        const pending = frames;
        frames = [];
        pending.forEach((cb) => cb(i * 16));
      }
    }

    afterEach(() => vi.unstubAllGlobals());

    it("draws no frames while the glow is off screen", () => {
      stubBrowser();
      const draw = vi.fn();
      loopWhileVisible({} as Element, draw);
      runFrames(5);
      expect(draw).not.toHaveBeenCalled();
    });

    it("animates once on screen and stops again after it scrolls away", () => {
      stubBrowser();
      const draw = vi.fn();
      loopWhileVisible({} as Element, draw);
      report(true);
      runFrames(3);
      expect(draw).toHaveBeenCalledTimes(3);
      report(false);
      runFrames(3);
      expect(draw).toHaveBeenCalledTimes(3);
    });

    it("follows the latest visibility when changes arrive together", () => {
      stubBrowser();
      const draw = vi.fn();
      loopWhileVisible({} as Element, draw);
      report(false, true);
      runFrames(2);
      expect(draw).toHaveBeenCalledTimes(2);
    });
  });
});
