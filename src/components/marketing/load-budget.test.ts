import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { prewarmRules } from "./cloud-prewarm";

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
});
