/** Model prices a project defines for itself, and the maths that turns tokens into dollars. Pure, so ingest and the settings page share it. */

export type ModelPrice = { pattern: string; inputPerM: number; outputPerM: number; note?: string };

export const MAX_MODEL_PRICES = 50;
export const MAX_PRICE_PER_M = 10_000;

/** Well-known list prices offered as one-click starting points. They are never applied unless the project saves them. */
export const SUGGESTED_PRICES: ModelPrice[] = [
  { pattern: "gpt-4o-mini", inputPerM: 0.15, outputPerM: 0.6 },
  { pattern: "gpt-4o", inputPerM: 2.5, outputPerM: 10 },
  { pattern: "gpt-4.1-nano", inputPerM: 0.1, outputPerM: 0.4 },
  { pattern: "gpt-4.1-mini", inputPerM: 0.4, outputPerM: 1.6 },
  { pattern: "gpt-4.1", inputPerM: 2, outputPerM: 8 },
  { pattern: "claude-3-5-haiku", inputPerM: 0.8, outputPerM: 4 },
  { pattern: "claude-3-5-sonnet", inputPerM: 3, outputPerM: 15 },
];

/** Returns a plain-language problem with a price list, or null when it can be saved. */
export function checkPrices(prices: ModelPrice[]): string | null {
  if (prices.length > MAX_MODEL_PRICES) return `A project can define at most ${MAX_MODEL_PRICES} model prices.`;
  const seen = new Set<string>();
  for (const price of prices) {
    const pattern = price.pattern.trim();
    if (!pattern) return "Every price needs a model name.";
    if (pattern.length > 120) return "A model name can be at most 120 characters.";
    const key = pattern.toLowerCase();
    if (seen.has(key)) return `"${pattern}" is in the list twice.`;
    seen.add(key);
    for (const value of [price.inputPerM, price.outputPerM]) {
      if (!Number.isFinite(value) || value < 0 || value > MAX_PRICE_PER_M) return `Prices must be between 0 and ${MAX_PRICE_PER_M.toLocaleString("en-US")} dollars per million tokens.`;
    }
    if ((price.note?.length ?? 0) > 200) return "A note can be at most 200 characters.";
  }
  return null;
}

/** The longest saved name that the model id starts with wins, so "gpt-4o-mini" beats "gpt-4o". */
export function findPrice(modelId: string | undefined, prices: ModelPrice[] | undefined): ModelPrice | null {
  const id = modelId?.trim().toLowerCase();
  if (!id || !prices?.length) return null;
  let best: ModelPrice | null = null;
  for (const price of prices) {
    const pattern = price.pattern.trim().toLowerCase();
    if (pattern && id.startsWith(pattern) && (!best || pattern.length > best.pattern.trim().length)) best = price;
  }
  return best;
}

export function costFromTokens(price: ModelPrice, inputTokens: number, outputTokens: number) {
  const input = Number.isFinite(inputTokens) && inputTokens > 0 ? inputTokens : 0;
  const output = Number.isFinite(outputTokens) && outputTokens > 0 ? outputTokens : 0;
  return (input * price.inputPerM + output * price.outputPerM) / 1_000_000;
}

/**
 * The cost to store for a step. A cost the SDK reported always wins; the project's own prices only fill the gap
 * when the step has none (or zero) and has token counts.
 */
export function resolveCostUsd(reported: number | undefined, modelId: string | undefined, inputTokens: number, outputTokens: number, prices: ModelPrice[] | undefined) {
  if (typeof reported === "number" && Number.isFinite(reported) && reported > 0) return reported;
  if (!(inputTokens > 0 || outputTokens > 0)) return reported ?? 0;
  const price = findPrice(modelId, prices);
  return price ? costFromTokens(price, inputTokens, outputTokens) : (reported ?? 0);
}
