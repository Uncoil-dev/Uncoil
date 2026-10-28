// Adapted from open-source observability patterns (MIT License)
// Source: web/src/features/scores/lib/mergeScoresWithCache.ts
// See /THIRD_PARTY_NOTICES.md
//
// Pure functions merging server-fetched scores with an optimistic local
// cache (e.g. a score just submitted via a Convex mutation, before the
// `useQuery` subscription has caught up). Types match Uncoil's own
// `scores` table and the score-aggregation port in ./aggregateScores.

import {
  composeAggregateScoreKey,
  toBooleanScoreValue,
  type ScoreAggregate,
  type ScoreToAggregate,
} from "./aggregateScores";

export type CachedScore = ScoreToAggregate;

/**
 * Merge server scores with cache.
 * - Update existing: overlay editable fields (value, comment) only.
 * - Add new: cache-only scores (optimistic UI, incomplete but fine).
 * - Delete: remove deleted scores.
 */
export function mergeScoresWithCache<T extends ScoreToAggregate>(
  serverScores: T[],
  cachedScores: CachedScore[],
  deletedIds: Set<string>,
): T[] {
  const merged = new Map<string, T>();

  for (const s of serverScores) {
    if (!deletedIds.has(s.id)) merged.set(s.id, s);
  }

  for (const cached of cachedScores) {
    const existing = merged.get(cached.id);
    if (existing) {
      merged.set(cached.id, { ...existing, value: cached.value, comment: cached.comment });
    } else {
      merged.set(cached.id, cached as T);
    }
  }

  return Array.from(merged.values());
}

/**
 * Merge a ScoreAggregate with cache: removes deleted aggregates, overlays
 * cached values.
 */
export function mergeAggregatesWithCache(
  serverAggregates: ScoreAggregate,
  cachedScores: CachedScore[],
  deletedIds: Set<string>,
): ScoreAggregate {
  const merged = { ...serverAggregates };

  for (const [key, aggregate] of Object.entries(merged)) {
    if (aggregate.id && deletedIds.has(aggregate.id)) {
      delete merged[key];
    }
  }

  for (const cached of cachedScores) {
    const key = composeAggregateScoreKey(cached);

    if (cached.dataType === "numeric") {
      const value = typeof cached.value === "number" ? cached.value : 0;
      merged[key] = {
        type: "NUMERIC",
        values: [value],
        average: value,
        comment: cached.comment,
        id: cached.id,
      };
    } else {
      const value = cached.dataType === "boolean" ? toBooleanScoreValue(cached) : String(cached.value);
      merged[key] = {
        type: "CATEGORICAL",
        values: [value],
        valueCounts: [{ value, count: 1 }],
        comment: cached.comment,
        id: cached.id,
      };
    }
  }

  return merged;
}
