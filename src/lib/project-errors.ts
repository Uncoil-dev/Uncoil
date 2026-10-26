import { ConvexError } from "convex/values";

/** Reads the plain-language message and code from a failed project creation. */
export function projectCreateError(err: unknown, fallback = "Project creation failed.") {
  if (err instanceof ConvexError) {
    const data = err.data as { code?: string; message?: string } | string;
    if (typeof data === "string") return { code: "", message: data };
    return { code: data.code ?? "", message: data.message ?? fallback };
  }
  return { code: "", message: err instanceof Error ? err.message : fallback };
}
