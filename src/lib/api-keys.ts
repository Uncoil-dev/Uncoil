import { createHmac, randomBytes } from "crypto";
import { getRegionalApiKeyPrefix, getWrongRegion } from "@/lib/regions";

export const API_KEY_PREFIX = getRegionalApiKeyPrefix();

export function generateApiKey() {
  return `${API_KEY_PREFIX}${randomBytes(16).toString("hex")}`;
}

export function hashApiKey(apiKey: string) {
  const secret = process.env.UNCOIL_API_KEY_HASH_SECRET ?? process.env.TRACIFY_API_KEY_HASH_SECRET;
  if (!secret) {
    throw new Error("UNCOIL_API_KEY_HASH_SECRET is not set");
  }

  return createHmac("sha256", secret).update(apiKey).digest("hex");
}

export function isTracifyApiKey(apiKey: string) {
  return apiKey.startsWith("tracify_sk_live_");
}

export function getWrongRegionApiKeyResponse(apiKey: string) {
  const correctRegion = getWrongRegion(apiKey);
  if (!correctRegion) return null;
  return Response.json(
    {
      error: `This API key belongs to the ${correctRegion.shortName} region. Send it to ${correctRegion.origin}.`,
      code: "wrong_region",
      region: correctRegion.id,
      ingestUrl: `${correctRegion.origin}/api/ingest`,
    },
    { status: 401 },
  );
}

export function getApiKeyDisplayParts(apiKey: string) {
  return {
    apiKeyPrefix: API_KEY_PREFIX,
    apiKeyLast4: apiKey.slice(-4),
  };
}
