import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test, { beforeEach } from "node:test";

// plan-limits-server.ts imports path-aliased modules that plain Node cannot
// resolve, so a resolve hook swaps the I/O ones for stubs. The pure
// plan-limits module is used for real.
const stubs: Record<string, string> = {
  "convex/_generated/api": `export const api = { projects: { pauseApiKeyForAbuse: "pause" } };`,
  "@/lib/convex": `
    export const getConvexClient = () => ({
      mutation: async (...args) => { globalThis.__mutations.push(args); },
    });`,
  "@/lib/transactional-email": `
    export const sendTransactionalEmail = async (mail) => { globalThis.__emails.push(mail); };`,
  "@/lib/redis-cache": `
    export const consumeRateLimit = async (key, amount, limit, window) => {
      globalThis.__calls.push({ key, amount, limit, window });
      if (globalThis.__redisDown) throw new Error("redis down");
      const rule = globalThis.__deny.find((prefix) => key.startsWith(prefix));
      return { allowed: !rule };
    };`,
};
const real: Record<string, string> = {
  "@/lib/plan-limits": pathToFileURL(new URL("./plan-limits.ts", import.meta.url).pathname).href,
};
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  const real = ${JSON.stringify(real)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) {
      return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    if (specifier in real) return { url: real[specifier], shortCircuit: true };
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const g = globalThis as unknown as {
  __calls: { key: string; amount: number; limit: number; window: number }[];
  __deny: string[];
  __redisDown: boolean;
  __mutations: unknown[][];
  __emails: { subject: string; to: string }[];
};
const { planLimitResponse, recordRateLimitStrike } = await import("./plan-limits-server.ts");
const { FREE_DAILY_SPAN_LIMIT, ABUSE_STRIKE_LIMIT } = await import("./plan-limits.ts");

const free = { _id: "p1", planTier: "free", name: "Demo" };

beforeEach(() => {
  g.__calls = [];
  g.__deny = [];
  g.__redisDown = false;
  g.__mutations = [];
  g.__emails = [];
});

test("planLimitResponse skips counting for zero spans", async () => {
  assert.equal(await planLimitResponse(free, 0), null);
  assert.equal(g.__calls.length, 0);
});

test("planLimitResponse allows a free project under both limits", async () => {
  assert.equal(await planLimitResponse(free, 5), null);
  assert.deepEqual(g.__calls.map((c) => c.key.split(":")[0]), ["ingest-day", "ingest-month"]);
  assert.equal(g.__calls[0].limit, FREE_DAILY_SPAN_LIMIT);
  assert.equal(g.__calls[0].amount, 5);
});

test("planLimitResponse returns a 429 with Retry-After when the daily cap is hit", async () => {
  g.__deny = ["ingest-day:"];
  const res = await planLimitResponse(free, 1);
  assert.ok(res);
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get("Retry-After")) > 0);
  assert.equal(res.headers.get("X-Uncoil-Daily-Limit"), String(FREE_DAILY_SPAN_LIMIT));
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, "daily_limit_reached");
  assert.equal(g.__calls.some((c) => c.key.startsWith("ingest-month:")), false);
});

test("planLimitResponse returns a 429 when the monthly limit is hit", async () => {
  g.__deny = ["ingest-month:"];
  const res = await planLimitResponse(free, 1);
  assert.ok(res);
  assert.equal(res.status, 429);
  assert.ok(res.headers.get("X-Uncoil-Plan-Limit"));
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, "plan_limit_reached");
});

test("planLimitResponse accepts data when the counter is unavailable", async () => {
  g.__redisDown = true;
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await planLimitResponse(free, 1), null);
  } finally {
    console.warn = warn;
  }
});

test("recordRateLimitStrike never counts strikes for paid plans", async () => {
  await recordRateLimitStrike({ _id: "p2", planTier: "pro" }, "hash");
  assert.equal(g.__calls.length, 0);
});

test("recordRateLimitStrike leaves the key active while under the strike limit", async () => {
  await recordRateLimitStrike(free, "hash");
  assert.equal(g.__calls[0].limit, ABUSE_STRIKE_LIMIT);
  assert.equal(g.__mutations.length, 0);
});

test("recordRateLimitStrike pauses the key and alerts once over the strike limit", async () => {
  g.__deny = ["ingest-strikes:"];
  await recordRateLimitStrike(free, "hash");
  assert.equal(g.__mutations.length, 1);
  assert.equal((g.__mutations[0][1] as { apiKeyHash: string }).apiKeyHash, "hash");
  assert.equal(g.__emails.length, 1);
  assert.match(g.__emails[0].subject, /paused/);
});

test("recordRateLimitStrike swallows counter failures", async () => {
  g.__redisDown = true;
  const warn = console.warn;
  console.warn = () => {};
  try {
    await recordRateLimitStrike(free, "hash");
  } finally {
    console.warn = warn;
  }
  assert.equal(g.__mutations.length, 0);
});
