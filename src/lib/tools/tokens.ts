import type { Model, TokenizerFamily } from "./models.ts";

/**
 * Token counting for the free tools.
 *
 * OpenAI models use the real o200k tokenizer (bundled, loaded on demand in the
 * browser). No other provider ships a public offline tokenizer for its current
 * models, so for those we scale the real o200k count by a measured family
 * factor and label the result as an estimate. If the real tokenizer cannot be
 * loaded we fall back to a character-class heuristic, also labelled.
 */

export type TokenCount = {
  tokens: number;
  /** True only for a real tokenizer run on the exact model family. */
  exact: boolean;
  method: "tokenizer" | "scaled-tokenizer" | "heuristic";
};

/** How many tokens a family usually produces compared with OpenAI's o200k, from published comparisons. */
export const familyFactor: Record<TokenizerFamily, number> = {
  openai: 1,
  claude: 1.12,
  gemini: 1,
  llama: 1.04,
  mistral: 1.12,
  deepseek: 1.05,
  grok: 1,
};

/** Rough count with no tokenizer: words, numbers, symbols and CJK are weighed separately. */
export function heuristicTokens(text: string): number {
  if (!text) return 0;
  let total = 0;
  const pieces = text.match(/[぀-ヿ㐀-鿿가-힯]|[\p{L}\p{M}]+|\p{N}+|\p{Extended_Pictographic}|[^\s\p{L}\p{M}\p{N}]+/gu) ?? [];
  for (const piece of pieces) {
    if (/^[぀-ヿ㐀-鿿가-힯]$/u.test(piece)) total += 1.3;
    else if (/^\p{Extended_Pictographic}$/u.test(piece)) total += 2;
    else if (/^\p{N}+$/u.test(piece)) total += Math.ceil(piece.length / 3);
    else if (/^[\p{L}\p{M}]+$/u.test(piece)) total += piece.length <= 6 ? 1 : Math.ceil(piece.length / 4.2);
    else total += Math.ceil(piece.length / 2.5);
  }
  // Newlines usually cost a token of their own once code or lists are involved.
  total += (text.match(/\n/g) ?? []).length * 0.4;
  return Math.max(1, Math.round(total));
}

export type Counter = (text: string) => number;

export type OpenAiTokenizer = {
  count: Counter;
  /** The first `limit` tokens as text pieces, for showing how a prompt is split. */
  pieces: (text: string, limit: number) => { pieces: string[]; total: number };
};

let loading: Promise<OpenAiTokenizer> | null = null;

/** Loads the real o200k tokenizer once. Resolves to a tokenizer, or rejects if the chunk cannot load. */
export function loadOpenAiTokenizer(): Promise<OpenAiTokenizer> {
  loading ??= import("gpt-tokenizer/encoding/o200k_base").then((mod) => ({
    count: (text: string) => (text ? mod.countTokens(text) : 0),
    pieces: (text: string, limit: number) => {
      const ids = mod.encode(text);
      return { pieces: ids.slice(0, limit).map((id) => mod.decode([id])), total: ids.length };
    },
  }));
  loading.catch(() => {
    loading = null; // allow a retry after a failed network load
  });
  return loading;
}

export function loadOpenAiCounter(): Promise<Counter> {
  return loadOpenAiTokenizer().then((t) => t.count);
}

/**
 * Count tokens for one family. `openaiCount` is the real o200k count for the
 * same text when it is available; pass null to use the heuristic.
 */
export function countFor(family: TokenizerFamily, text: string, openaiCount: number | null): TokenCount {
  if (!text) return { tokens: 0, exact: family === "openai" && openaiCount !== null, method: openaiCount === null ? "heuristic" : family === "openai" ? "tokenizer" : "scaled-tokenizer" };
  if (openaiCount === null) {
    return { tokens: Math.max(1, Math.round(heuristicTokens(text) * familyFactor[family])), exact: false, method: "heuristic" };
  }
  if (family === "openai") return { tokens: openaiCount, exact: true, method: "tokenizer" };
  return { tokens: Math.max(1, Math.round(openaiCount * familyFactor[family])), exact: false, method: "scaled-tokenizer" };
}

export function countForModel(model: Pick<Model, "family">, text: string, openaiCount: number | null): TokenCount {
  return countFor(model.family, text, openaiCount);
}

/** Plain-English label for how a number was produced. */
export function methodLabel(count: TokenCount): string {
  if (count.method === "tokenizer") return "Exact";
  if (count.method === "scaled-tokenizer") return "Estimate (about ±15%)";
  return "Rough estimate (about ±30%)";
}
