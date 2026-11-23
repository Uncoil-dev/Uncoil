import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./require-tests.mjs";

test("code without a test fails", () => {
  assert.equal(evaluate({ files: ["src/lib/utils.ts"] }).ok, false);
});
test("code with a test passes", () => {
  assert.equal(evaluate({ files: ["src/lib/utils.ts", "src/lib/utils.test.ts"] }).ok, true);
});
test("docs, content and generated files need no test", () => {
  const files = ["docs/a.md", "content/blog", "convex/_generated/api.d.ts", "src/types.d.ts", "public/x.png"];
  assert.equal(evaluate({ files }).ok, true);
});
test("skip label and description phrase pass", () => {
  assert.equal(evaluate({ files: ["src/a.ts"], labels: ["no-tests-needed"] }).ok, true);
  assert.equal(evaluate({ files: ["src/a.ts"], body: "No new test needed: copy change" }).ok, true);
});
test("python and convex code count", () => {
  assert.equal(evaluate({ files: ["packages/python-sdk/src/x.py"] }).ok, false);
  assert.equal(evaluate({ files: ["convex/a.ts", "packages/python-sdk/tests/test_x.py"] }).ok, true);
});
