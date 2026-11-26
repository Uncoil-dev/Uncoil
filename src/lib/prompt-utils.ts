/** Pure helpers shared by the prompts page, the playground and the playground API. */

const VARIABLE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/** Variable names in order of first use, without duplicates. */
export function extractVariables(content: string): string[] {
  return [...new Set(Array.from(content.matchAll(VARIABLE), (match) => match[1]))];
}

/** Fills {{variables}}. Names with no value are left as written and reported, so a missing value is never silently blank. */
export function compilePrompt(content: string, values: Record<string, string>): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const text = content.replace(VARIABLE, (whole, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key) && values[key] !== "") return values[key];
    missing.add(key);
    return whole;
  });
  return { text, missing: [...missing] };
}

/** Decodes a prompt name from a URL path segment, or null when it is not valid percent-encoding. */
export function decodePromptName(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export type DiffLine = { kind: "same" | "add" | "remove"; text: string; oldLine: number | null; newLine: number | null };

const MAX_DIFF_LINES = 2000;

/** Line diff by longest common subsequence. Inputs beyond 2,000 lines are refused so the table stays small. */
export function lineDiff(before: string, after: string): DiffLine[] | null {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) return null;
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ kind: "same", text: a[i], oldLine: i + 1, newLine: j + 1 }); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) { out.push({ kind: "remove", text: a[i], oldLine: i + 1, newLine: null }); i++; }
    else { out.push({ kind: "add", text: b[j], oldLine: null, newLine: j + 1 }); j++; }
  }
  for (; i < a.length; i++) out.push({ kind: "remove", text: a[i], oldLine: i + 1, newLine: null });
  for (; j < b.length; j++) out.push({ kind: "add", text: b[j], oldLine: null, newLine: j + 1 });
  return out;
}

export function diffSummary(lines: DiffLine[]) {
  return { added: lines.filter((line) => line.kind === "add").length, removed: lines.filter((line) => line.kind === "remove").length };
}

/** Rough size hint (about four characters per token); labelled as an estimate wherever it is shown. */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export const PLAYGROUND_MODELS = ["gpt-5.6-luna", "gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"] as const;
export const MAX_PLAYGROUND_MODELS = 3;
