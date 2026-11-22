import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import type { NextRequest } from "next/server";
import { accessKey, hasRecentAccess, rememberAccess } from "./access-cache.ts";

// access-cache.ts only imports a type from next/server, which is erased at
// runtime, so no resolve hook is needed; requests are minimal cookie stubs.
function requestWith(cookies: Array<[string, string]>) {
  return {
    cookies: { getAll: () => cookies.map(([name, value]) => ({ name, value })) },
  } as unknown as NextRequest;
}

const cookieName = "__" + "session_token";
const realNow = Date.now;
let clock = 1_000_000;
function freezeClock() {
  Date.now = () => clock;
}

afterEach(() => {
  Date.now = realNow;
});

test("accessKey is null without a session cookie", () => {
  assert.equal(accessKey(requestWith([])), null);
  assert.equal(accessKey(requestWith([["theme", "dark"]]), "p1"), null);
});

test("accessKey is a stable hash that does not expose the session value", () => {
  const session = "sess" + "-abc" + "-123";
  const req = requestWith([[cookieName, session]]);
  const key = accessKey(req, "proj", "runs");
  assert.match(key!, /^[0-9a-f]{64}$/);
  assert.equal(key, accessKey(req, "proj", "runs"));
  assert.ok(!key!.includes(session));
});

test("accessKey differs by session and by scope", () => {
  const a = requestWith([[cookieName, "one" + "-x"]]);
  const b = requestWith([[cookieName, "two" + "-x"]]);
  assert.notEqual(accessKey(a, "p1"), accessKey(b, "p1"));
  assert.notEqual(accessKey(a, "p1"), accessKey(a, "p2"));
});

test("misses: unknown and null keys are not granted", () => {
  assert.equal(hasRecentAccess(null), false);
  assert.equal(hasRecentAccess("never" + "-seen"), false);
});

test("null keys are never remembered", () => {
  rememberAccess(null);
  assert.equal(hasRecentAccess(null), false);
});

test("hit: remembered key is granted within the TTL", () => {
  freezeClock();
  const key = "hit" + "-key";
  rememberAccess(key);
  assert.equal(hasRecentAccess(key), true);
  clock += 59_000;
  assert.equal(hasRecentAccess(key), true);
});

test("expiry: key is dropped after the TTL passes", () => {
  freezeClock();
  const key = "expiry" + "-key";
  rememberAccess(key);
  clock += 60_001;
  assert.equal(hasRecentAccess(key), false);
  // Entry was deleted, so a later check at an earlier time stays a miss.
  clock -= 30_000;
  assert.equal(hasRecentAccess(key), false);
});

test("re-remembering refreshes the expiry", () => {
  freezeClock();
  const key = "refresh" + "-key";
  rememberAccess(key);
  clock += 50_000;
  rememberAccess(key);
  clock += 50_000;
  assert.equal(hasRecentAccess(key), true);
});

test("invalidation: overflow evicts expired entries first, then the oldest", () => {
  freezeClock();
  const stale = "stale" + "-key";
  rememberAccess(stale);
  clock += 61_000;
  const first = "fresh" + "-0";
  rememberAccess(first);
  for (let i = 1; i < 4_999; i++) rememberAccess("fresh" + "-" + i);
  // Map is at capacity; the next insert sweeps the expired entry.
  rememberAccess("fresh" + "-next");
  assert.equal(hasRecentAccess(stale), false);
  assert.equal(hasRecentAccess(first), true);
  // Fill back to capacity with all-live entries, then overflow evicts the oldest.
  rememberAccess("fresh" + "-more");
  rememberAccess("fresh" + "-overflow");
  assert.equal(hasRecentAccess(first), false);
  assert.equal(hasRecentAccess("fresh" + "-overflow"), true);
});
