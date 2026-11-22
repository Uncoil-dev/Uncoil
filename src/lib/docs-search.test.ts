import assert from "node:assert/strict";
import test from "node:test";
import { getDocs } from "./markdoc-docs.ts";
import { searchDocs, toDockDocs } from "./docs-search.ts";

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
