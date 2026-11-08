/** Rules for a project's named score types: what values are allowed and what counts as a pass. Pure, so it is easy to test. */

export type ScoreDataType = "numeric" | "boolean" | "categorical";

export type ScoreConfigShape = {
  dataType: ScoreDataType;
  min?: number;
  max?: number;
  categories?: string[];
  passThreshold?: number;
  passCategories?: string[];
};

export const MAX_CATEGORIES = 20;

export function checkConfig(config: ScoreConfigShape & { name: string; description?: string }): string | null {
  const name = config.name.trim();
  if (!name) return "A score needs a name.";
  if (name.length > 100) return "A score name can be at most 100 characters.";
  if ((config.description?.length ?? 0) > 500) return "The description can be at most 500 characters.";
  if (config.dataType === "numeric") {
    const { min, max, passThreshold } = config;
    for (const value of [min, max, passThreshold]) if (value !== undefined && !Number.isFinite(value)) return "Range and threshold must be numbers.";
    if (min !== undefined && max !== undefined && min >= max) return "The smallest value must be lower than the largest.";
    if (passThreshold !== undefined && ((min !== undefined && passThreshold < min) || (max !== undefined && passThreshold > max))) return "The pass threshold must sit inside the range.";
  }
  if (config.dataType === "categorical") {
    const categories = (config.categories ?? []).map((item) => item.trim());
    if (categories.length < 2) return "A category score needs at least two categories.";
    if (categories.length > MAX_CATEGORIES) return `Use at most ${MAX_CATEGORIES} categories.`;
    if (categories.some((item) => !item || item.length > 60)) return "Each category must be 1 to 60 characters.";
    if (new Set(categories.map((item) => item.toLowerCase())).size !== categories.length) return "Categories must be different from each other.";
    const missing = (config.passCategories ?? []).find((item) => !categories.includes(item));
    if (missing) return `"${missing}" is marked as passing but is not a category.`;
  }
  return null;
}

/** Returns a plain-language problem with a value for this score type, or null when it fits. */
export function checkValue(config: ScoreConfigShape & { name: string }, dataType: string, value: number | boolean | string): string | null {
  if (dataType !== config.dataType) return `"${config.name}" is a ${config.dataType} score, but this one was sent as ${dataType}.`;
  if (config.dataType === "numeric") {
    if (typeof value !== "number" || !Number.isFinite(value)) return `"${config.name}" needs a number.`;
    if (config.min !== undefined && value < config.min) return `"${config.name}" can not be below ${config.min}.`;
    if (config.max !== undefined && value > config.max) return `"${config.name}" can not be above ${config.max}.`;
  }
  if (config.dataType === "boolean" && typeof value !== "boolean") return `"${config.name}" is true or false.`;
  if (config.dataType === "categorical" && (typeof value !== "string" || !(config.categories ?? []).includes(value))) return `"${config.name}" must be one of: ${(config.categories ?? []).join(", ")}.`;
  return null;
}

/** True or false when the config says what a pass is; null when it does not (or the value does not fit). */
export function isPass(config: ScoreConfigShape, value: number | boolean | string): boolean | null {
  if (config.dataType === "numeric") return config.passThreshold !== undefined && typeof value === "number" ? value >= config.passThreshold : null;
  if (config.dataType === "boolean") return typeof value === "boolean" ? value : null;
  return config.passCategories?.length && typeof value === "string" ? config.passCategories.includes(value) : null;
}

export type ScoreSummary = { count: number; passCount: number; judged: number; average: number | null; lastAt: number | null };

export function summarize(config: ScoreConfigShape, scores: Array<{ value: number | boolean | string; createdAt: number }>): ScoreSummary {
  let judged = 0;
  let passCount = 0;
  let total = 0;
  let numeric = 0;
  let lastAt: number | null = null;
  for (const score of scores) {
    const pass = isPass(config, score.value);
    if (pass !== null) {
      judged += 1;
      if (pass) passCount += 1;
    }
    if (typeof score.value === "number") {
      total += score.value;
      numeric += 1;
    }
    if (lastAt === null || score.createdAt > lastAt) lastAt = score.createdAt;
  }
  return { count: scores.length, passCount, judged, average: numeric ? total / numeric : null, lastAt };
}
