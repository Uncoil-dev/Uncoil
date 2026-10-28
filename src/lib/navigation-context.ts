export type EntryIntent = "explore" | "build";

export function safeRelativePath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  try {
    const url = new URL(candidate, "https://uncoil.invalid");
    if (url.origin !== "https://uncoil.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function parseEntryIntent(value: string | null | undefined): EntryIntent | null {
  return value === "explore" || value === "build" ? value : null;
}

export function withAuthContext(path: string, intent?: EntryIntent | null) {
  const safePath = safeRelativePath(path);
  if (!intent) return safePath;
  const url = new URL(safePath, "https://uncoil.invalid");
  url.searchParams.set("intent", intent);
  return `${url.pathname}${url.search}${url.hash}`;
}
