import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { ConvexHttpClient } from "convex/browser";
import { decryptIntegrationSecret } from "@/lib/integration-crypto";

/** Needs UNCOIL_CONNECTION_KEY: 32 random bytes as base64. It lives only on the web server, never in Convex. */
export function connectionKey() {
  return process.env.UNCOIL_CONNECTION_KEY?.trim() || "";
}

export type ProjectLlm = { apiKey: string; baseUrl: string; model: string | null; provider: string };

/** The project's own default model connection, or null so callers fall back to the platform key. Never throws. */
export async function getProjectLlm(convex: ConvexHttpClient, projectId: string): Promise<ProjectLlm | null> {
  const key = connectionKey();
  if (!key) return null;
  try {
    const secret = await convex.query(api.llmConnections.getDefaultSecret, { projectId: projectId as Id<"projects"> });
    if (!secret) return null;
    return { apiKey: await decryptIntegrationSecret(secret.ciphertext, key), baseUrl: secret.baseUrl, model: secret.defaultModel, provider: secret.provider };
  } catch (error) {
    console.warn("Project model connection could not be used:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function chatUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}
