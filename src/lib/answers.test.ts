import { describe, expect, it } from "vitest";

import { answers } from "./answers";

const internalHref = /^\/[a-z0-9][a-z0-9\-/]*$/;

describe("answers", () => {
  it("has entries", () => {
    expect(answers.length).toBeGreaterThan(0);
  });

  it("has unique, url-safe slugs", () => {
    const slugs = answers.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("has unique questions and titles", () => {
    const questions = answers.map((a) => a.question.trim().toLowerCase());
    const titles = answers.map((a) => a.title.trim().toLowerCase());
    expect(new Set(questions).size).toBe(questions.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has non-empty text fields and points", () => {
    for (const a of answers) {
      expect(a.question.trim(), a.slug).not.toBe("");
      expect(a.title.trim(), a.slug).not.toBe("");
      expect(a.answer.trim(), a.slug).not.toBe("");
      expect(a.points.length, a.slug).toBeGreaterThan(0);
      for (const p of a.points) {
        expect(p.heading.trim(), a.slug).not.toBe("");
        expect(p.body.trim(), a.slug).not.toBe("");
      }
      const headings = a.points.map((p) => p.heading);
      expect(new Set(headings).size, `${a.slug} point headings`).toBe(headings.length);
    }
  });

  it("has well-formed, non-duplicated links", () => {
    for (const a of answers) {
      const links = [a.link, ...a.related];
      for (const l of links) {
        expect(l.href, `${a.slug}: ${l.href}`).toMatch(internalHref);
        expect(l.label.trim(), `${a.slug}: ${l.href}`).not.toBe("");
      }
      const hrefs = links.map((l) => l.href);
      expect(new Set(hrefs).size, `${a.slug} repeats a link`).toBe(hrefs.length);
    }
  });
});

describe("answer extras", () => {
  it("has non-empty steps and tables where present", () => {
    for (const a of answers) {
      for (const s of a.steps ?? []) {
        expect(s.heading.trim(), a.slug).not.toBe("");
        expect(s.body.trim(), a.slug).not.toBe("");
      }
      if (a.table) {
        expect(a.table.rows.length, a.slug).toBeGreaterThan(0);
        for (const r of a.table.rows) expect(r.length, a.slug).toBe(a.table.columns.length);
      }
    }
  });

  it("lists the cost answer", () => {
    const a = answers.find((x) => x.slug === "track-ai-agent-costs");
    expect(a?.table?.rows.map((r) => r[0])).toEqual(["Tokens", "Retries", "Tool calls"]);
  });
});
