import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { integrationGuides, KEY_STEP } from "./integration-guides";
import { comparisons, formatLastChecked, integrationPages } from "./seo-pages";

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

test("integration page slugs are unique across hand-written pages and setup guides", () => {
  const slugs = integrationPages.map((p) => p.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  expect(dupes).toEqual([]);
  for (const guide of integrationGuides) expect(slugs, guide.slug).toContain(guide.slug);
});

test("llms.txt links every integration page once", () => {
  const llms = readFileSync(new URL("../../public/llms.txt", import.meta.url), "utf8");
  for (const page of integrationPages) {
    const link = `(https://www.uncoil.dev/integrations/${page.slug})`;
    expect(llms.split(link).length - 1, page.slug).toBe(1);
  }
});

test("every setup guide has a title and at least one step with code and a language", () => {
  for (const guide of integrationGuides) {
    expect(guide.title.trim(), guide.slug).not.toBe("");
    const withCode = (guide.steps ?? []).filter((s) => s.code?.trim());
    expect(withCode.length, guide.slug).toBeGreaterThan(0);
    for (const step of withCode) expect(step.language, `${guide.slug}: ${step.title}`).toBeDefined();
  }
});

test("the shared key step uses the placeholder live key prefix, not a real key", () => {
  expect(KEY_STEP.code).toContain('UNCOIL_API_KEY="uncoil_sk_live_..."');
});
