import { describe, expect, it } from "vitest";
import { glossaryTerms } from "./glossary";

describe("glossaryTerms", () => {
  it("is non-empty and includes core and merged group terms", () => {
    expect(glossaryTerms.length).toBeGreaterThan(20);
    const slugs = glossaryTerms.map((t) => t.slug);
    expect(slugs).toContain("trace-viewer");
    expect(slugs).toContain("span");
  });

  it("has unique, url-safe slugs", () => {
    const slugs = glossaryTerms.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("has non-empty required text fields", () => {
    for (const t of glossaryTerms) {
      expect(t.term.trim(), t.slug).not.toBe("");
      expect(t.definition.trim(), t.slug).not.toBe("");
      expect(t.expansion.trim(), t.slug).not.toBe("");
    }
  });

  it("only relates to existing terms, never to itself or twice", () => {
    const slugs = new Set(glossaryTerms.map((t) => t.slug));
    for (const t of glossaryTerms) {
      expect(new Set(t.related).size, t.slug).toBe(t.related.length);
      for (const r of t.related) {
        expect(slugs.has(r), `${t.slug} -> ${r}`).toBe(true);
        expect(r, t.slug).not.toBe(t.slug);
      }
    }
  });

  it("uses internal absolute links with labels", () => {
    for (const t of glossaryTerms) {
      if (!t.link) continue;
      expect(t.link.href, t.slug).toMatch(/^\//);
      expect(t.link.label.trim(), t.slug).not.toBe("");
    }
  });
});
