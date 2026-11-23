import assert from "node:assert/strict";
import test from "node:test";
import { checkDescription, shouldSkip } from "./pr-description.mjs";

const good = `<!-- claude-projects-attribution: {} -->
_Requested by **Someone** · [thread](https://example.com)_

## What changed

Adds a check for descriptions.

## Linked issue

<!-- Closes #000 -->

## Type of change

- [ ] Bug fix
- [x] Tooling or CI

## Checklist

- [ ] I reviewed my own diff
`;

test("accepts a filled-in template", () => {
  assert.deepEqual(checkDescription(good), []);
});

test("rejects empty and comment-only descriptions", () => {
  assert.equal(checkDescription("").length, 1);
  assert.equal(checkDescription("<!-- nothing -->\n_Requested by **A** · x_").length, 1);
});

test("rejects a summary left blank and no ticked category", () => {
  const bad = good.replace("Adds a check for descriptions.", "").replace("[x]", "[ ]");
  assert.equal(checkDescription(bad).length, 2);
});

test("a ticked box in the checklist does not count as a category", () => {
  const bad = good.replace("- [x] Tooling or CI", "- [ ] Tooling or CI").replace("- [ ] I reviewed", "- [x] I reviewed");
  assert.match(checkDescription(bad)[0], /Type of change/);
});

test("skips bot pull requests", () => {
  assert.equal(shouldSkip(["bot"], "x"), true);
  assert.equal(shouldSkip([], "dependabot[bot]"), true);
  assert.equal(shouldSkip(["agent"], "person"), false);
});
