import assert from "node:assert/strict";
import test from "node:test";
import { closingComment, matchFlaky } from "./known-flaky.mjs";

const checks = [{ name: "Tests (sites and unit)", reason: "timing" }];

test("matches a listed check name ignoring case", () => {
  assert.equal(matchFlaky("tests (SITES and unit) failed on main", checks), checks[0]);
});

test("ignores issues that name no listed check or when the list is empty", () => {
  assert.equal(matchFlaky("Build (marketing) broke", checks), null);
  assert.equal(matchFlaky("Tests (sites and unit)", []), null);
});

test("comment names the check and its reason", () => {
  assert.match(closingComment(checks[0]), /Tests \(sites and unit\).*timing.*Re-run/);
});
