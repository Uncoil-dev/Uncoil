export const DEFAULT_REDACTION_RULES = ["email", "phone", "credit_card", "api_key", "ssn"] as const;

export type RedactionRule = (typeof DEFAULT_REDACTION_RULES)[number];

const PATTERNS: Record<RedactionRule, { pattern: RegExp; replacement: string }> = {
  email: { pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, replacement: "[REDACTED_EMAIL]" },
  phone: { pattern: /(?:\+?\d[\d .()\-]{7,}\d)/g, replacement: "[REDACTED_PHONE]" },
  credit_card: { pattern: /(?:\d[ -]?){12,18}\d/g, replacement: "[REDACTED_CARD]" },
  api_key: {
    pattern: /(?:sk|pk|uncoil_sk_live|api[_-]?key)[A-Za-z0-9_\-.]{8,}/gi,
    replacement: "[REDACTED_API_KEY]",
  },
  ssn: { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[REDACTED_SSN]" },
};

function normalizeRules(rules: string[] | undefined): RedactionRule[] {
  const selected = DEFAULT_REDACTION_RULES.filter((rule) => rules?.includes(rule));
  return selected.length ? selected : [...DEFAULT_REDACTION_RULES];
}

function applyRule(value: string, rule: RedactionRule) {
  const { pattern, replacement } = PATTERNS[rule];
  return value.replace(pattern, replacement);
}

// The phone pattern also matches SSNs and card numbers. A phone match made up
// only of SSNs and card numbers gets their labels; any other match is hidden
// whole as a phone number, so it never leaves digits visible.
function redactPhones(value: string, rules: RedactionRule[]) {
  const specific = (["ssn", "credit_card"] as const).filter((rule) => rules.includes(rule));
  return value.replace(PATTERNS.phone.pattern, (match) => {
    const labelled = specific.reduce(applyRule, match);
    return /\d/.test(labelled) ? PATTERNS.phone.replacement : labelled;
  });
}

export function redactString(value: string, rules?: string[]) {
  const selected = normalizeRules(rules);
  return selected.reduce(
    (current, rule) => (rule === "phone" ? redactPhones(current, selected) : applyRule(current, rule)),
    value,
  );
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

// Stricter pass for public share pages. Specific secret shapes are masked first so
// the broad default rules (phone, card) never see or half-mask them.
const SHARE_MAX_DEPTH = 8;
const SENSITIVE_KEY = /secret|token|password|passwd|api[_-]?key|authorization|cookie/i;
const SECRET_MASK = "[REDACTED_SECRET]";

const SHARE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  { pattern: /\beyJ[\w-]{5,}\.eyJ[\w-]{5,}\.[\w-]{5,}/g, replacement: "[REDACTED_JWT]" },
  { pattern: /\bBearer\s+[\w.~+/=-]{6,}/gi, replacement: "Bearer [REDACTED_TOKEN]" },
  {
    pattern:
      /\b(?:sk-ant-[\w-]{10,}|sk-[\w-]{16,}|uncoil_sk_[\w-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[\w]{20,}|AKIA[0-9A-Z]{16}|xox[bp]-[\w-]{10,})/g,
    replacement: "[REDACTED_API_KEY]",
  },
  {
    pattern: /([?&](?:[\w-]*(?:token|password|passwd|secret|key|sig|signature)[\w-]*)=)[^&\s"'#]+/gi,
    replacement: `$1${SECRET_MASK}`,
  },
  { pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, replacement: "[REDACTED_IP]" },
];

function redactShareString(value: string): string {
  const specific = SHARE_PATTERNS.reduce((current, { pattern, replacement }) => current.replace(pattern, replacement), value);
  return redactString(specific);
}

function redactShareValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.stringify(redactShareValue(JSON.parse(trimmed), depth + 1));
      } catch {
        // Not JSON: fall through to plain string masking.
      }
    }
    return redactShareString(value);
  }
  if (!value || typeof value !== "object") return value;
  if (depth > SHARE_MAX_DEPTH) return "[REDACTED_DEEP]";
  if (Array.isArray(value)) return value.map((entry) => redactShareValue(entry, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) && item !== null && item !== undefined ? SECRET_MASK : redactShareValue(item, depth + 1),
    ]),
  );
}

export function redactForShare<T>(value: T): T {
  try {
    return redactShareValue(value, 0) as T;
  } catch {
    return "[REDACTED]" as T;
  }
}
