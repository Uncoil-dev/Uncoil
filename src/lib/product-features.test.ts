import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { productFeatureSlugs } from "./product-features.ts";

test("product feature slugs are unique, URL-safe path segments", () => {
  assert.ok(productFeatureSlugs.length > 0);
  assert.equal(new Set(productFeatureSlugs).size, productFeatureSlugs.length);
  for (const slug of productFeatureSlugs) {
    assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `"${slug}" must be lowercase kebab-case`);
    assert.equal(encodeURIComponent(slug), slug);
  }
});

test("core product pages stay in the route list", () => {
  for (const slug of ["trace-viewer", "cost-dashboard", "tool-calls", "llm-calls", "failures", "runtime-control", "evaluation-engine"]) {
    assert.ok((productFeatureSlugs as readonly string[]).includes(slug), `missing ${slug}`);
  }
});

test("every slug has page content defined in the product route", () => {
  const source = readFileSync(new URL("../app/(frontend)/product/[feature]/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("satisfies Record<ProductFeatureSlug, FeaturePage>");
  assert.ok(start > 0, "page content map not found");
  const body = source.slice(0, start);
  for (const slug of productFeatureSlugs) {
    assert.ok(
      body.includes(`"${slug}": {`) || new RegExp(`\\b${slug}: \\{`).test(body),
      `page.tsx has no content entry for ${slug}`,
    );
  }
});
