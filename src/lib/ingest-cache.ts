/**
 * Tiny in-memory caches that keep the ingest path from asking Convex the same thing on every span.
 * They live per server process, so a restart simply starts them empty.
 */

export const API_KEY_CACHE_MS = 30_000;
export const NO_EVALUATORS_CACHE_MS = 60_000;
const MAX_ENTRIES = 5_000;

export class TtlCache<V> {
  private entries = new Map<string, { value: V; expiresAt: number }>();

  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get(key: string, now = Date.now()): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, now = Date.now()) {
    if (this.entries.size >= MAX_ENTRIES) {
      for (const [k, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(k);
      if (this.entries.size >= MAX_ENTRIES) this.entries.clear();
    }
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }

  delete(key: string) {
    this.entries.delete(key);
  }
}

/** Only valid keys are cached: a brand-new key works at once, a deleted key keeps working for up to 30 seconds. */
export async function cachedProjectForKey<P>(
  cache: TtlCache<unknown>,
  keyHash: string,
  load: () => Promise<P | null>,
  now = Date.now(),
): Promise<P | null> {
  const hit = cache.get(keyHash, now);
  if (hit !== undefined) return hit as P;
  const project = await load();
  if (project) cache.set(keyHash, project, now);
  return project;
}

export const apiKeyProjectCache = new TtlCache<unknown>(API_KEY_CACHE_MS);
/** Projects known to have no online evaluators; a new evaluator starts within a minute. */
export const noEvaluatorsCache = new TtlCache<true>(NO_EVALUATORS_CACHE_MS);
