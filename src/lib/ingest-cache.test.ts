import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache, cachedProjectForKey } from "./ingest-cache.ts";

test("entries expire after the time limit", () => {
  const cache = new TtlCache<string>(30_000);
  cache.set("a", "x", 1_000);
  assert.equal(cache.get("a", 30_999), "x");
  assert.equal(cache.get("a", 31_000), undefined);
});

test("a valid key is looked up once per window, an unknown key is never cached", async () => {
  const cache = new TtlCache<{ id: string }>(30_000);
  let loads = 0;
  const load = async () => { loads++; return { id: "p" }; };
  await cachedProjectForKey(cache, "h", load, 0);
  await cachedProjectForKey(cache, "h", load, 29_000);
  assert.equal(loads, 1);
  await cachedProjectForKey(cache, "h", load, 30_000);
  assert.equal(loads, 2);

  let misses = 0;
  const none = async () => { misses++; return null; };
  assert.equal(await cachedProjectForKey(cache, "bad", none, 0), null);
  assert.equal(await cachedProjectForKey(cache, "bad", none, 1), null);
  assert.equal(misses, 2);
});
