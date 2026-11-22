import { expect, test } from "vitest";
import { comparisons, formatLastChecked } from "./seo-pages";

test("every comparison has a valid lastChecked date", () => {
  for (const c of comparisons) {
    expect(c.lastChecked ?? "", c.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const d = new Date(`${c.lastChecked}T00:00:00Z`);
    expect(Number.isNaN(d.getTime()), c.slug).toBe(false);
    expect(d.toISOString().slice(0, 10)).toBe(c.lastChecked);
  }
});

test("formatLastChecked returns month and year", () => {
  expect(formatLastChecked("2026-11-07")).toBe("November 2026");
});
