import assert from "node:assert/strict";
import test from "node:test";
import { coreAnswers } from "./core.ts";

const filled = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;
const isInternalHref = (href: string): boolean => href.startsWith("/") && !href.startsWith("//");

test("coreAnswers is a non-empty array", () => {
  assert.ok(Array.isArray(coreAnswers));
  assert.ok(coreAnswers.length > 0);
});

test("every answer has the required non-empty string fields", () => {
  for (const item of coreAnswers) {
    assert.ok(filled(item.slug), "slug");
    assert.ok(filled(item.question), `${item.slug} question`);
    assert.ok(filled(item.title), `${item.slug} title`);
    assert.ok(filled(item.answer), `${item.slug} answer`);
  }
});

test("slugs are unique, lowercase and URL-safe", () => {
  const seen = new Set<string>();
  for (const { slug } of coreAnswers) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, slug);
    assert.ok(!seen.has(slug), `duplicate slug ${slug}`);
    seen.add(slug);
  }
});

test("questions end with a question mark or are phrased as questions", () => {
  for (const { slug, question } of coreAnswers) {
    assert.ok(question.trim().endsWith("?"), slug);
  }
});

test("points are non-empty and each has a heading and body", () => {
  for (const { slug, points } of coreAnswers) {
    assert.ok(points.length > 0, `${slug} has no points`);
    for (const point of points) {
      assert.ok(filled(point.heading), `${slug} point heading`);
      assert.ok(filled(point.body), `${slug} point body`);
    }
  }
});

test("link is an internal href with a label", () => {
  for (const { slug, link } of coreAnswers) {
    assert.ok(isInternalHref(link.href), `${slug} link ${link.href}`);
    assert.ok(filled(link.label), `${slug} link label`);
  }
});

test("related entries are internal links with labels and no self reference", () => {
  for (const { slug, related } of coreAnswers) {
    assert.ok(related.length > 0, `${slug} has no related links`);
    for (const entry of related) {
      assert.ok(isInternalHref(entry.href), `${slug} related ${entry.href}`);
      assert.ok(filled(entry.label), `${slug} related label`);
      assert.notEqual(entry.href, `/answers/${slug}`);
    }
  }
});

test("optional sections, when present, are well formed", () => {
  for (const item of coreAnswers) {
    for (const step of item.steps ?? []) {
      assert.ok(filled(step.heading) && filled(step.body), `${item.slug} step`);
    }
    for (const snippet of item.code ?? []) {
      assert.ok(filled(snippet.label) && filled(snippet.text), `${item.slug} code`);
    }
    if (item.table) {
      assert.ok(filled(item.table.caption), `${item.slug} table caption`);
      assert.ok(item.table.columns.length > 0, `${item.slug} table columns`);
      for (const row of item.table.rows) {
        assert.equal(row.length, item.table.columns.length, `${item.slug} table row width`);
      }
    }
  }
});

test("answer entries expose no unexpected keys", () => {
  const allowed = new Set(["slug", "question", "title", "answer", "points", "steps", "code", "table", "link", "related"]);
  for (const item of coreAnswers) {
    for (const key of Object.keys(item)) assert.ok(allowed.has(key), `${item.slug} has ${key}`);
  }
});

test("empty input: an empty list of answers yields no slugs", () => {
  const empty = coreAnswers.filter(() => false);
  assert.deepEqual(empty.map((a) => a.slug), []);
});
