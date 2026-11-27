import { api } from "convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { getWrongRegionApiKeyResponse, hashApiKey, isUncoilApiKey } from "@/lib/api-keys";

/** Resolves the project a Bearer API key belongs to. Returns an error response instead when the key is missing, invalid or paused. */
export async function projectForApiKeyRequest(request: Request): Promise<{ projectId: string; redactionRules?: string[] } | { error: Response }> {
  const header = request.headers.get("authorization");
  const unauthorized = { error: Response.json({ error: "Invalid API key" }, { status: 401 }) };
  if (!header?.startsWith("Bearer ")) return unauthorized;
  const apiKey = header.slice(7).trim();
  if (!isUncoilApiKey(apiKey)) return unauthorized;
  const wrongRegion = getWrongRegionApiKeyResponse(apiKey);
  if (wrongRegion) return { error: wrongRegion };

  const project = await getConvexClient().query(api.projects.getProjectByApiKey, { apiKeyHash: hashApiKey(apiKey) });
  return project ? { projectId: String(project._id), redactionRules: project.redactionEnabled === false ? undefined : project.redactionRules } : unauthorized;
}
