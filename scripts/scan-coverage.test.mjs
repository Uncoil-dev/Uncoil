import assert from "node:assert/strict";
import test from "node:test";
import { findUncovered, isSensitive, issueFor, selectNew } from "./scan-coverage.mjs";

test("findUncovered skips tested, test, declaration and sensitive files", () => {
  const files = ["a.ts", "a.test.ts", "b.ts", "c.d.ts", "billing-links.ts", "auth-server.ts", "z.ts"];
  assert.deepEqual(findUncovered(files), ["b.ts", "z.ts"]);
});

test("findUncovered skips files whose source touches sensitive APIs", () => {
  const src = { "x.ts": "import { createHmac } from 'crypto'", "y.ts": "export const a = 1" };
  assert.deepEqual(findUncovered(["x.ts", "y.ts"], (f) => src[f]), ["y.ts"]);
  assert.equal(isSensitive("plain.ts", "const k = process.env.MY_SECRET"), true);
});

test("selectNew dedupes by title and caps at five", () => {
  const files = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts", "g.ts"];
  const out = selectNew(files, [issueFor("a.ts").title]);
  assert.equal(out.length, 5);
  assert.equal(out[0].title, "[coverage-scan] src/lib/b.ts");
  assert.match(out[0].body, /\*\*Task\*\*[\s\S]*\*\*Files owned\*\*[\s\S]*\*\*Done looks like\*\*/);
});
