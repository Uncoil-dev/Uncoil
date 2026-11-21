import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { extractSecretNames, findLeaks, isServerSecretName, scan } from "./scan-client-bundle.mjs";

test("classifies secret-like server names only", () => {
  assert.equal(isServerSecretName("STRIPE_SECRET_KEY"), true);
  assert.equal(isServerSecretName("NEXT_PUBLIC_SECRET_THING"), false);
  assert.equal(isServerSecretName("NODE_ENV"), false);
  assert.equal(isServerSecretName("UNCOIL_API_KEY"), false);
});

test("extracts names from process.env reads", () => {
  const names = extractSecretNames("const a = process.env.OPENAI_API_KEY; process.env.NEXT_PUBLIC_SITE_URL; process.env.PORT");
  assert.deepEqual([...names], ["OPENAI_API_KEY"]);
});

test("flags secret names and Node-only imports in bundle text", () => {
  const names = new Set(["OPENAI_API_KEY"]);
  assert.deepEqual(findLeaks("var x=1;", names), []);
  assert.equal(findLeaks("var k=process.env.OPENAI_API_KEY;", names).length, 1);
  assert.deepEqual(findLeaks('var docs="OPENAI_API_KEY";', names), []);
  assert.equal(findLeaks('const fs=require("node:fs");', names).length, 1);
});

test("scan reports only bundles with findings", () => {
  const root = mkdtempSync(join(tmpdir(), "bundle-scan-"));
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "static"));
  writeFileSync(join(root, "src", "a.ts"), "export const k = process.env.RESEND_API_KEY;");
  writeFileSync(join(root, "static", "clean.js"), "console.log(1)");
  writeFileSync(join(root, "static", "leak.js"), "x(process.env.RESEND_API_KEY)");
  const { checkedNames, results } = scan(join(root, "static"), [join(root, "src")]);
  assert.equal(checkedNames, 1);
  assert.equal(results.length, 1);
  assert.match(results[0].file, /leak\.js$/);
});
