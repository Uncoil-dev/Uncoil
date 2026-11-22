import assert from "node:assert/strict";
import test from "node:test";

import { FREE_MAX_PROJECTS } from "./free-plan-limits.ts";

test("FREE_MAX_PROJECTS is a positive integer", () => {
  assert.equal(typeof FREE_MAX_PROJECTS, "number");
  assert.ok(Number.isInteger(FREE_MAX_PROJECTS));
  assert.ok(FREE_MAX_PROJECTS > 0);
});

test("FREE_MAX_PROJECTS matches the documented free tier limit", () => {
  assert.equal(FREE_MAX_PROJECTS, 2);
});
