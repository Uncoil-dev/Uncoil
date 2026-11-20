import assert from "node:assert/strict";
import test from "node:test";
import {
  checkRedisHealth,
  consumeRateLimit,
  getJsonCache,
  isFreshCache,
  peekRateLimit,
  setJsonCache,
  withCacheReason,
} from "./redis-cache.ts";

// These tests never touch a network: REDIS_URL is unset, so the module
// never creates a client.
delete process.env.REDIS_URL;

function withFixedNow<T>(now: number, run: () => T): T {
  const original = Date.now;
  Date.now = () => now;
  try {
    return run();
  } finally {
    Date.now = original;
  }
}

test("isFreshCache is false for null payloads and missing timestamps", () => {
  assert.equal(isFreshCache(null, 1_000), false);
  assert.equal(isFreshCache({}, 1_000), false);
  assert.equal(isFreshCache({ meta: {} }, 1_000), false);
  assert.equal(isFreshCache({ meta: { updatedAt: null } }, 1_000), false);
});

test("isFreshCache treats the ttl boundary as fresh and one ms later as stale", () => {
  withFixedNow(10_000, () => {
    assert.equal(isFreshCache({ meta: { updatedAt: 9_000 } }, 1_000), true);
    assert.equal(isFreshCache({ meta: { updatedAt: 8_999 } }, 1_000), false);
    assert.equal(isFreshCache({ meta: { updatedAt: 10_000 } }, 0), true);
  });
});

test("withCacheReason sets cache metadata and computes age", () => {
  const result = withFixedNow(5_000, () =>
    withCacheReason({ meta: { updatedAt: 3_500 }, rows: [1] }, "upstream down", "stale"),
  );
  assert.deepEqual(result, {
    rows: [1],
    meta: {
      updatedAt: 3_500,
      source: "cache",
      cacheStatus: "stale",
      reason: "upstream down",
      ageMs: 1_500,
    },
  });
});

test("withCacheReason uses a null age without updatedAt and keeps a null reason", () => {
  const result = withCacheReason({}, null, "fresh");
  assert.equal(result.meta?.ageMs, null);
  assert.equal(result.meta?.reason, null);
  assert.equal(result.meta?.cacheStatus, "fresh");
  assert.equal(result.meta?.source, "cache");
});

test("withCacheReason overrides an existing source and does not mutate its input", () => {
  const input = { meta: { source: "live", updatedAt: 1 } };
  const result = withCacheReason(input, "r", "fresh");
  assert.equal(result.meta?.source, "cache");
  assert.equal(input.meta.source, "live");
  assert.equal("cacheStatus" in input.meta, false);
});

test("getJsonCache returns null when Redis is not configured", async () => {
  assert.equal(await getJsonCache("any-key"), null);
});

test("setJsonCache is a silent no-op when Redis is not configured", async () => {
  await assert.doesNotReject(setJsonCache("any-key", { meta: {} }, 60));
});

test("rate limit helpers and health check reject when Redis is not configured", async () => {
  await assert.rejects(consumeRateLimit("k", 1, 10, 60), /REDIS_URL is not set/);
  await assert.rejects(peekRateLimit("k", 10), /REDIS_URL is not set/);
  await assert.rejects(checkRedisHealth(), /REDIS_URL is not set/);
});
