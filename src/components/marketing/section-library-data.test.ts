import assert from "node:assert/strict";
import test from "node:test";

const { librarySections, libraryCategories, siteStructures } = await import(
  "./section-library-data.ts"
);

const TONES = ["yellow", "coral", "violet", "mint", "light", "dark"];

test("library sections have unique anchors", () => {
  const anchors = librarySections.map((section) => section.anchor);
  assert.ok(anchors.length > 0);
  assert.equal(new Set(anchors).size, anchors.length);
});

test("library sections have required non-empty fields and a valid tone", () => {
  for (const section of librarySections) {
    assert.match(section.anchor, /^[a-z0-9]+(-[a-z0-9]+)*$/, section.anchor);
    assert.ok(section.title.trim().length > 0, section.anchor);
    assert.ok(section.category.trim().length > 0, section.anchor);
    assert.ok(section.description.trim().length > 0, section.anchor);
    assert.ok(TONES.includes(section.tone), `${section.anchor}: ${section.tone}`);
  }
});

test("library categories are unique and cover every section", () => {
  assert.equal(new Set(libraryCategories).size, libraryCategories.length);
  for (const section of librarySections) {
    assert.ok(libraryCategories.includes(section.category), section.anchor);
  }
});

test("site structures have unique ids and required fields", () => {
  const ids = siteStructures.map((structure) => structure.id);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
  for (const structure of siteStructures) {
    assert.ok(structure.name.trim().length > 0, structure.id);
    assert.ok(structure.summary.trim().length > 0, structure.id);
    assert.ok(structure.bestFor.trim().length > 0, structure.id);
    assert.ok(structure.sections.length > 0, structure.id);
  }
});

test("site structures only reference known section anchors", () => {
  const anchors = new Set(librarySections.map((section) => section.anchor));
  for (const structure of siteStructures) {
    for (const anchor of structure.sections) {
      assert.ok(anchors.has(anchor), `${structure.id}: ${anchor}`);
    }
  }
});
