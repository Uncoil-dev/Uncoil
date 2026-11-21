import { describe, expect, it } from "vitest";
import { frameworkSetup, frameworkSetups } from "./framework-setups";

describe("frameworkSetups data integrity", () => {
  it("has at least one entry", () => {
    expect(frameworkSetups.length).toBeGreaterThan(0);
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = frameworkSetups.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("has non-empty required string fields", () => {
    for (const item of frameworkSetups) {
      for (const field of ["slug", "name", "language", "line", "install"] as const) {
        expect(item[field].trim(), `${item.slug}.${field}`).not.toBe("");
      }
    }
  });

  it("has a valid sample waterfall for every entry", () => {
    for (const item of frameworkSetups) {
      expect(item.sample.length, item.slug).toBeGreaterThan(0);
      for (const span of item.sample) {
        expect(span.label.trim(), `${item.slug} label`).not.toBe("");
        expect(["agent", "llm", "tool"]).toContain(span.kind);
        expect(span.start).toBeGreaterThanOrEqual(0);
        expect(span.width).toBeGreaterThan(0);
        expect(span.start + span.width, `${item.slug}:${span.label}`).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("Pydantic AI setup", () => {
  it("has every required field and a matching page with steps and a limits note", async () => {
    const entry = frameworkSetup("pydantic-ai");
    expect(entry).toBeDefined();
    for (const field of ["name", "language", "line", "install"] as const) {
      expect(entry![field].trim(), field).not.toBe("");
    }
    expect(entry!.install).toContain("uncoil-sdk");
    const { integrationPages } = await import("./seo-pages");
    const page = integrationPages.find((p) => p.slug === "pydantic-ai");
    expect(page?.steps?.length).toBeGreaterThan(0);
    expect(page?.notes?.length).toBeGreaterThan(0);
  });
});

describe("frameworkSetup", () => {
  it("returns the matching entry for every known slug", () => {
    for (const item of frameworkSetups) {
      expect(frameworkSetup(item.slug)).toBe(item);
    }
  });

  it("returns undefined for unknown or differently-cased slugs", () => {
    expect(frameworkSetup("not-a-framework")).toBeUndefined();
    expect(frameworkSetup("")).toBeUndefined();
    expect(frameworkSetup(frameworkSetups[0].slug.toUpperCase())).toBeUndefined();
  });
});
