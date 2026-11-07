import { NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { isAuthenticated } from "@/lib/auth-server";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { decryptIntegrationSecret } from "@/lib/integration-crypto";
import { checkBaseUrl } from "@/lib/llm-providers";
import { connectionKey } from "@/lib/project-llm";

/** Sends one tiny request with the stored key and records whether the provider accepted it. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ projectId: string; connectionId: string }> }) {
  const { projectId, connectionId } = await params;
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secretKey = connectionKey();
  if (!secretKey) return NextResponse.json({ error: "This server has no encryption key set yet." }, { status: 503 });
  const convex = await getAuthedConvexClient();
  const ids = { projectId: projectId as Id<"projects">, connectionId: connectionId as Id<"llmConnections"> };
  let secret;
  try { secret = await convex.query(api.llmConnections.getSecret, ids); } catch { secret = null; }
  if (!secret) return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  const address = checkBaseUrl(secret.baseUrl);
  let ok = false;
  let message = "";
  if (!address.ok) message = address.reason;
  else {
    try {
      const response = await fetch(`${address.url}/models`, { headers: { authorization: `Bearer ${await decryptIntegrationSecret(secret.ciphertext, secretKey)}` }, signal: AbortSignal.timeout(10_000), redirect: "error" });
      ok = response.ok;
      message = ok ? "The provider accepted the key." : response.status === 401 || response.status === 403 ? "The provider rejected this key." : `The provider answered with status ${response.status}.`;
    } catch (error) {
      message = error instanceof Error && error.name === "TimeoutError" ? "The provider did not answer in 10 seconds." : "The provider could not be reached.";
    }
  }
  try { await convex.mutation(api.llmConnections.recordTest, { ...ids, ok, message }); } catch { /* the answer below still reaches the page */ }
  return NextResponse.json({ ok, message });
}
