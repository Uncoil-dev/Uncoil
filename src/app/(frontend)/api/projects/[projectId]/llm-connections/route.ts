import { NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { isAuthenticated } from "@/lib/auth-server";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { encryptIntegrationSecret } from "@/lib/integration-crypto";
import { checkBaseUrl, lastFour, presetFor } from "@/lib/llm-providers";
import { connectionKey } from "@/lib/project-llm";

/** Tells the page whether this server can store keys yet. */
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ready: Boolean(connectionKey()) });
}

/** Adds a connection. The key is encrypted here, so Convex only ever sees the locked envelope. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secretKey = connectionKey();
  if (!secretKey) return NextResponse.json({ error: "This server has no encryption key set yet, so keys can not be stored. Ask the owner to set UNCOIL_CONNECTION_KEY." }, { status: 503 });
  const body = await request.json().catch(() => null) as { label?: string; provider?: string; baseUrl?: string; defaultModel?: string; apiKey?: string } | null;
  const apiKey = body?.apiKey?.trim() ?? "";
  if (!body || !apiKey || apiKey.length > 500) return NextResponse.json({ error: "Paste the API key." }, { status: 422 });
  const preset = presetFor(body.provider ?? "");
  if (!preset) return NextResponse.json({ error: "Pick a provider." }, { status: 422 });
  const address = checkBaseUrl(preset.id === "custom" ? body.baseUrl ?? "" : preset.baseUrl);
  if (!address.ok) return NextResponse.json({ error: address.reason }, { status: 422 });
  const label = body.label?.trim() || preset.label;
  try {
    const convex = await getAuthedConvexClient();
    const id = await convex.mutation(api.llmConnections.create, {
      projectId: projectId as Id<"projects">,
      label,
      provider: preset.id,
      baseUrl: address.url,
      defaultModel: body.defaultModel?.trim().slice(0, 120) || preset.defaultModel || undefined,
      ciphertext: await encryptIntegrationSecret(apiKey, secretKey),
      keyLast4: lastFour(apiKey),
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? (error.message.match(/Uncaught Error: ([^\n]+)/)?.[1] ?? "The connection could not be saved.") : "The connection could not be saved." }, { status: 403 });
  }
}
