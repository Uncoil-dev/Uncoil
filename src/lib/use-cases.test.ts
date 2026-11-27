import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { useCases } from "./use-cases.ts";

const entries = Object.entries(useCases);

test("every use case slug is a lowercase URL segment", () => {
  assert.ok(entries.length > 0);
  for (const [slug] of entries) assert.match(slug, /^[a-z]+(-[a-z]+)*$/, `bad slug: ${slug}`);
});

test("every use case has the text and lists its page renders", () => {
  for (const [slug, page] of entries) {
    for (const field of ["title", "statement", "description", "failure"] as const) {
      assert.ok(page[field].trim().length > 0, `${slug} has an empty ${field}`);
    }
    assert.ok(page.signals.length > 0, `${slug} has no signals`);
    assert.ok(page.scene.length > 0, `${slug} has no scene steps`);
    for (const item of [...page.signals, ...page.scene]) assert.ok(item.trim().length > 0, `${slug} has an empty list item`);
  }
});

test("use case titles are unique, so page titles and metadata do not collide", () => {
  const titles = entries.map(([, page]) => page.title);
  assert.equal(new Set(titles).size, titles.length);
});

test("every footer use case link points to a page that exists", () => {
  const footer = readFileSync(new URL("../components/marketing/landing/landing-footer.tsx", import.meta.url), "utf8");
  const linked = [...footer.matchAll(/"\/use-cases\/([^"]+)"/g)].map((match) => match[1]!);
  // The footer lists its use case links as double-quoted literals; fail loudly if that changes so this check never passes on zero links.
  assert.ok(linked.length > 0, "no use case links found in the footer");
  for (const slug of linked) assert.ok(slug in useCases, `footer links to missing use case: ${slug}`);
});
