export const DEFAULT_REDACTION_RULES = ["email", "phone", "credit_card", "api_key", "ssn"] as const;

export type RedactionRule = (typeof DEFAULT_REDACTION_RULES)[number];

const PATTERNS: Record<RedactionRule, { pattern: RegExp; replacement: string }> = {
  email: { pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, replacement: "[REDACTED_EMAIL]" },
  phone: { pattern: /(?:\+?\d[\d .()\-]{7,}\d)/g, replacement: "[REDACTED_PHONE]" },
  credit_card: { pattern: /(?:\d[ -]?){13,19}/g, replacement: "[REDACTED_CARD]" },
  api_key: {
    pattern: /(?:sk|pk|uncoil_sk_live|api[_-]?key)[A-Za-z0-9_\-.]{8,}/gi,
    replacement: "[REDACTED_API_KEY]",
  },
  ssn: { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[REDACTED_SSN]" },
};

function normalizeRules(rules: string[] | undefined): RedactionRule[] {
  const selected = rules?.filter((rule): rule is RedactionRule => rule in PATTERNS) ?? [];
  return selected.length ? selected : [...DEFAULT_REDACTION_RULES];
}

export function redactString(value: string, rules?: string[]) {
  return normalizeRules(rules).reduce((current, rule) => {
    const { pattern, replacement } = PATTERNS[rule];
    return current.replace(pattern, replacement);
  }, value);
}

export function redactRecord(value: Record<string, unknown>, rules?: string[], depth = 0): Record<string, unknown> {
  if (depth > 8) return { ...value };
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      typeof item === "string"
        ? redactString(item, rules)
        : Array.isArray(item)
          ? item.map((entry) =>
              typeof entry === "string"
                ? redactString(entry, rules)
                : entry && typeof entry === "object"
                  ? redactRecord(entry as Record<string, unknown>, rules, depth + 1)
                  : entry,
            )
          : item && typeof item === "object"
            ? redactRecord(item as Record<string, unknown>, rules, depth + 1)
            : item,
    ]),
  );
}

export function redactPayload(value: unknown, rules?: string[]) {
  return redactString(typeof value === "string" ? value : JSON.stringify(value ?? ""), rules);
}
