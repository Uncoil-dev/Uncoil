// Adapted from open-source observability patterns (MIT License)
// Source: web/src/features/scores/lib/aggregateScores.ts
// See /THIRD_PARTY_NOTICES.md
//
// Score aggregation — pure, no React, no backend dependency. Types match
// Uncoil's own `scores` table (convex/schema.ts): `value` is a single
// `number | boolean | string` union (no separate stringValue field), and
// `dataType` is "numeric" | "boolean" | "categorical" | "text".

export type ScoreDataType = "numeric" | "boolean" | "categorical" | "text";
export type ScoreSource = "human" | "llm" | "code" | "user";

export type ScoreToAggregate = {
  id: string;
  name: string;
  source: ScoreSource;
  dataType: ScoreDataType;
  value: number | boolean | string;
  comment?: string;
  traceId?: string;
  createdAt?: number;
};

export type NumericAggregate = {
  type: "NUMERIC";
  values: number[];
  average: number;
  comment?: string;
  id?: string;
  timestamp?: number;
};

export type CategoricalAggregate = {
  type: "CATEGORICAL";
  values: string[];
  valueCounts: { value: string; count: number }[];
  comment?: string;
  id?: string;
  timestamp?: number;
};

export type ScoreAggregate = Record<string, NumericAggregate | CategoricalAggregate>;

/** Normalizes score names for comparison: "-" and "." are reserved for splitting the composite key. */
export const normalizeScoreName = (name: string): string => name.replaceAll(/[-.]/g, "_");

export const composeAggregateScoreKey = ({
  name,
  source,
  dataType,
}: {
  name: string;
  source: ScoreSource;
  dataType: ScoreDataType;
}): string => `${normalizeScoreName(name)}-${source}-${dataType}`;

export const decomposeAggregateScoreKey = (
  key: string,
): { name: string; source: ScoreSource; dataType: ScoreDataType } => {
  const [name, source, dataType] = key.split("-");
  return {
    name: name!,
    source: source as ScoreSource,
    dataType: dataType as ScoreDataType,
  };
};

/**
 * Display value of a boolean score: stored as `true`/`false`, read as a string.
 */
export const toBooleanScoreValue = (score: { value: number | boolean | string }): string =>
  score.value === true || score.value === 1 || score.value === "true" ? "true" : "false";

const resolveAggregateType = (dataType: ScoreDataType): "NUMERIC" | "CATEGORICAL" =>
  dataType === "numeric" ? "NUMERIC" : "CATEGORICAL";

export const aggregateScores = <T extends ScoreToAggregate>(scores: T[]): ScoreAggregate => {
  const grouped: Record<string, T[]> = {};
  for (const score of scores) {
    const key = composeAggregateScoreKey(score);
    (grouped[key] ??= []).push(score);
  }

  const result: ScoreAggregate = {};
  for (const [key, group] of Object.entries(grouped)) {
    const aggregateType = resolveAggregateType(group[0]!.dataType);

    if (aggregateType === "NUMERIC") {
      const values = group.map((s) => (typeof s.value === "number" ? s.value : 0));
      if (values.length === 0) continue;
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      result[key] = {
        type: "NUMERIC",
        values,
        average,
        comment: values.length === 1 ? group[0]!.comment : undefined,
        id: values.length === 1 ? group[0]!.id : undefined,
        timestamp: values.length === 1 ? group[0]!.createdAt : undefined,
      };
    } else {
      const isBoolean = group[0]!.dataType === "boolean";
      const values = group
        .map((s) => (isBoolean ? toBooleanScoreValue(s) : String(s.value)))
        .sort((a, b) => a.localeCompare(b));
      if (values.length === 0) continue;
      const counts: Record<string, number> = {};
      for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
      result[key] = {
        type: "CATEGORICAL",
        values,
        valueCounts: Object.entries(counts).map(([value, count]) => ({ value, count })),
        comment: values.length === 1 ? group[0]!.comment : undefined,
        id: values.length === 1 ? group[0]!.id : undefined,
        timestamp: values.length === 1 ? group[0]!.createdAt : undefined,
      };
    }
  }

  return result;
};
