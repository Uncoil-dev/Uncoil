import { NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { hashApiKey } from "@/lib/api-keys";
import { decodePromptName } from "@/lib/prompt-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return Response.json({ error: "Bearer API key required" }, { status: 401 });
  const environment = request.nextUrl.searchParams.get("environment")?.trim() || "production";
  if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(environment)) return Response.json({ error: "Invalid environment" }, { status: 422 });
  const { name } = await params;
  if (!name.trim()) return Response.json({ error: "Prompt name is required" }, { status: 422 });
  const promptName = decodePromptName(name);
  if (promptName === null) return Response.json({ error: "Prompt name is not valid" }, { status: 422 });
  try {
    const prompt = await getConvexClient().query(api.prompts.resolveByApiKey, { apiKeyHash: hashApiKey(token), name: promptName, environment });
    if (!prompt) return Response.json({ error: "Prompt or deployed environment not found" }, { status: 404 });
    return Response.json(prompt, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Prompt resolution failed:", error);
    return Response.json({ error: "Prompt resolution unavailable" }, { status: 503 });
  }
}
