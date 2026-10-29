export type TracifyRegionId = "eu" | "us";

export type TracifyRegion = {
  id: TracifyRegionId;
  name: string;
  shortName: string;
  flag: string;
  origin: string;
  hostname: string;
  location: string;
  infrastructure: string;
  /**
   * Whether this region is offered to customers. The US deployment exists but must not
   * take production traffic until every US stateful provider has a verified US location,
   * so it stays dormant: routable and defined, but never listed in public surfaces.
   */
  available: boolean;
};

export const DEFAULT_TRACIFY_REGION: TracifyRegionId = "eu";
export const TRACIFY_REGION_COOKIE = "tracify_region";

export const TRACIFY_REGIONS: Record<TracifyRegionId, TracifyRegion> = {
  eu: {
    id: "eu",
    name: "Europe",
    shortName: "EU",
    flag: "🇪🇺",
    origin: "https://eu.cloud.tracify.tech",
    hostname: "eu.cloud.tracify.tech",
    location: "Ireland",
    infrastructure: "EU West",
    available: true,
  },
  us: {
    id: "us",
    name: "United States",
    shortName: "US",
    flag: "🇺🇸",
    origin: "https://us.cloud.tracify.tech",
    hostname: "us.cloud.tracify.tech",
    location: "Virginia",
    infrastructure: "US East",
    available: false,
  },
};

/**
 * Regions offered to customers. Use this for every public-facing surface — the region
 * selector, docs, status board, onboarding — rather than iterating TRACIFY_REGIONS
 * directly, so a dormant region can never be advertised by accident.
 */
export function getAvailableRegions(): TracifyRegion[] {
  return Object.values(TRACIFY_REGIONS).filter((region) => region.available);
}

export function isRegionAvailable(id: TracifyRegionId): boolean {
  return TRACIFY_REGIONS[id].available;
}

export function parseTracifyRegion(value: string | null | undefined): TracifyRegionId | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "eu" || normalized === "us" ? normalized : null;
}

export function getDeploymentRegion(): TracifyRegionId {
  return (
    parseTracifyRegion(process.env.NEXT_PUBLIC_UNCOIL_REGION ?? process.env.NEXT_PUBLIC_TRACIFY_REGION) ??
    parseTracifyRegion(process.env.UNCOIL_REGION ?? process.env.TRACIFY_REGION) ??
    DEFAULT_TRACIFY_REGION
  );
}

export function getTracifyRegion(id: TracifyRegionId = getDeploymentRegion()) {
  return TRACIFY_REGIONS[id];
}

export function getRegionForHostname(hostname: string | null | undefined): TracifyRegionId | null {
  const normalized = hostname?.split(":")[0].toLowerCase();
  if (!normalized) return null;
  if (normalized === "eu.cloud.uncoil.dev") return "eu";
  return (Object.values(TRACIFY_REGIONS).find((region) => region.hostname === normalized)?.id ?? null);
}

export function getRegionalApiKeyPrefix(region: TracifyRegionId = getDeploymentRegion()) {
  return `tracify_sk_live_${region}_`;
}

export function getApiKeyRegion(apiKey: string): TracifyRegionId | null {
  if (apiKey.startsWith(getRegionalApiKeyPrefix("eu"))) return "eu";
  if (apiKey.startsWith(getRegionalApiKeyPrefix("us"))) return "us";
  // Keys issued before regional cloud are assigned to the original EU deployment.
  if (apiKey.startsWith("tracify_sk_live_")) return "eu";
  return null;
}

export function getWrongRegion(apiKey: string, deploymentRegion = getDeploymentRegion()) {
  const keyRegion = getApiKeyRegion(apiKey);
  return keyRegion && keyRegion !== deploymentRegion ? TRACIFY_REGIONS[keyRegion] : null;
}
