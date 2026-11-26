import assert from "node:assert/strict";
import test from "node:test";
import { getDocs } from "./markdoc-docs.ts";
import { searchDockLinks, searchDocs, toDockDocs, toDockLinks } from "./docs-search.ts";

test("docs search finds body content and prioritizes exact titles", () => {
  const docs = getDocs();
  const bodyMatch = searchDocs(docs, "ISO 8601");
  assert.equal(bodyMatch[0]?.slug, "api");
  const titleMatch = searchDocs(docs, "python");
  assert.equal(titleMatch[0]?.slug, "python");
  assert.ok(bodyMatch[0]?.excerpt);
});

test("docs search is empty for blank queries", () => {
  assert.deepEqual(searchDocs(getDocs(), "   "), []);
});

test("dock docs drop full markdown bodies but still search the same", () => {
  const docs = getDocs();
  const dock = toDockDocs(docs);
  assert.ok(dock.every((doc) => !("body" in doc)));
  assert.equal(searchDocs(dock, "ISO 8601")[0]?.slug, searchDocs(docs, "ISO 8601")[0]?.slug);
});

test("dock links hold only what the search bar shows and still find guides by title", () => {
  const docs = getDocs();
  const links = toDockLinks([...docs, { ...docs[0], slug: "hidden-guide", title: "Hidden guide", noindex: true }]);
  assert.deepEqual(Object.keys(links[0]).sort(), ["description", "section", "slug", "title"]);
  assert.ok(!links.some((link) => link.slug === "hidden-guide"));
  assert.ok(JSON.stringify(links).length * 4 < JSON.stringify(toDockDocs(docs)).length);
  assert.equal(searchDockLinks(links, "python")[0]?.slug, "python");
});
