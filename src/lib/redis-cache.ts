import { createClient } from "redis";

type CacheMeta = {
  source?: string;
  cacheStatus?: string;
  reason?: string | null;
  updatedAt?: number | null;
  ageMs?: number | null;
};

type CachedPayload = {
  meta?: CacheMeta;
};

const DEFAULT_STALE_TTL_SECONDS = 24 * 60 * 60;

declare global {
  var __uncoilRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
  var __uncoilRedisConnectPromise: Promise<unknown> | undefined;
}

function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!globalThis.__uncoilRedisClient) {
    const client = createClient({
      url,
      socket: {
        // Fail fast instead of burning the whole serverless function budget on a
        // connect that will never complete.
        connectTimeout: 5_000,
        reconnectStrategy: (retries) => (retries >= 1 ? false : 100),
      },
    });
    client.on("error", (error) => {
      console.error("Redis cache error:", error);
    });
    globalThis.__uncoilRedisClient = client;
  }

  return globalThis.__uncoilRedisClient;
}

async function connectRedis() {
  const client = getRedisClient();
  if (!client) return null;

  if (!client.isOpen) {
    // Share only an in-flight connect. Caching the settled promise would (a) pin a
    // rejection on globalThis so every later call rethrows it even after Redis
    // recovers, and (b) resolve instantly after an idle disconnect without actually
    // reconnecting, leaving commands to run against a closed client.
    globalThis.__uncoilRedisConnectPromise ??= client
      .connect()
      .finally(() => {
        globalThis.__uncoilRedisConnectPromise = undefined;
      });
    await globalThis.__uncoilRedisConnectPromise;
  }

  return client;
}

export async function checkRedisHealth() {
  const client = await connectRedis();
  if (!client) throw new Error("REDIS_URL is not set");
  const response = await Promise.race([
    client.ping(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Redis health check timed out")), 4_000)),
  ]);
  if (response !== "PONG") throw new Error("Redis did not return PONG");
}

export async function consumeRateLimit(
  key: string,
  amount: number,
  limit: number,
  windowSeconds: number,
) {
  const client = await connectRedis();
  if (!client) throw new Error("REDIS_URL is not set");
  const normalizedAmount = Math.max(1, Math.floor(amount));
  const normalizedLimit = Math.max(1, Math.floor(limit));
  const normalizedWindow = Math.max(1, Math.floor(windowSeconds));
  const current = Number(await client.eval(
    `local current = redis.call('INCRBY', KEYS[1], ARGV[1])
     if current == tonumber(ARGV[1]) then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
     return current`,
    { keys: [key], arguments: [String(normalizedAmount), String(normalizedWindow)] },
  ));
  const ttl = await client.ttl(key);
  return {
    allowed: current <= normalizedLimit,
    remaining: Math.max(0, normalizedLimit - current),
    retryAfterSeconds: Math.max(1, ttl),
  };
}

export async function peekRateLimit(key: string, limit: number) {
  const client = await connectRedis();
  if (!client) throw new Error("REDIS_URL is not set");
  const normalizedLimit = Math.max(1, Math.floor(limit));
  const [rawCurrent, ttl] = await Promise.all([client.get(key), client.ttl(key)]);
  const current = Number(rawCurrent ?? 0);
  return {
    used: current,
    limit: normalizedLimit,
    remaining: Math.max(0, normalizedLimit - current),
    resetSeconds: Math.max(0, ttl),
  };
}

export async function getJsonCache<T extends CachedPayload>(
  key: string,
): Promise<T | null> {
  try {
    const client = await connectRedis();
    if (!client) return null;

    const raw = await client.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as T;
    const updatedAt = parsed.meta?.updatedAt;
    return {
      ...parsed,
      meta: {
        ...parsed.meta,
        source: "cache",
        ageMs: typeof updatedAt === "number" ? Date.now() - updatedAt : null,
      },
    };
  } catch (error) {
    console.error("Failed to read Redis cache:", error);
    return null;
  }
}

export async function setJsonCache<T extends CachedPayload>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_STALE_TTL_SECONDS,
) {
  try {
    const client = await connectRedis();
    if (!client) return;

    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error("Failed to write Redis cache:", error);
  }
}

export function isFreshCache(
  payload: CachedPayload | null,
  ttlMs: number,
) {
  const updatedAt = payload?.meta?.updatedAt;
  return typeof updatedAt === "number" && Date.now() - updatedAt <= ttlMs;
}

export function withCacheReason<T extends CachedPayload>(
  payload: T,
  reason: string | null,
  cacheStatus: "fresh" | "stale",
): T {
  return {
    ...payload,
    meta: {
      ...payload.meta,
      source: "cache",
      cacheStatus,
      reason,
      ageMs:
        typeof payload.meta?.updatedAt === "number"
          ? Date.now() - payload.meta.updatedAt
          : null,
    },
  };
}
