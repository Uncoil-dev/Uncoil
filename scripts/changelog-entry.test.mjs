import assert from "node:assert/strict";
import { test } from "node:test";
import { parseChangelogEntry, renderReleaseNotes } from "./changelog-entry.mjs";

const body = (tick, line) => `## What changed\nx\n\n## Changelog\n\n<!-- hint -->\n${[
  "Features",
  "Fixes",
  "SDK changes",
  "Breaking changes",
  "Security and operations",
]
  .map((c) => `- [${c === tick ? "x" : " "}] ${c}`)
  .join("\n")}\n\nLine: ${line}\n\n## Checklist\n- [ ] a`;

test("reads the ticked category and the line", () => {
  assert.deepEqual(parseChangelogEntry(body("Fixes", "Exports no longer drop rows.")), {
    category: "Fixes",
    line: "Exports no longer drop rows.",
  });
});

test("ignores empty, none and ambiguous entries", () => {
  assert.equal(parseChangelogEntry(body("Fixes", "")), null);
  assert.equal(parseChangelogEntry(body("Fixes", "None.")), null);
  assert.equal(parseChangelogEntry(body("", "A line")), null);
  assert.equal(parseChangelogEntry(body("Fixes", "A <!-- hidden")), null);
  assert.equal(parseChangelogEntry("no section"), null);
  assert.equal(
    parseChangelogEntry(body("Fixes", "A line").replace("- [ ] Features", "- [x] Features")),
    null,
  );
});

test("groups lines by category in the release-log order", () => {
  const out = renderReleaseNotes([
    { number: 2, body: body("Fixes", "Fix two.") },
    { number: 1, body: body("Features", "Feature one.") },
    { number: 3, body: "unrelated" },
  ]);
  assert.equal(out, "### Features\n- Feature one.\n\n### Fixes\n- Fix two.");
});
