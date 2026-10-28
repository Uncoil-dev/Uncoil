export type UncoilRegionId = "eu" | "us";

export type UncoilRegion = {
  id: UncoilRegionId;
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

export const DEFAULT_UNCOIL_REGION: UncoilRegionId = "eu";
export const UNCOIL_REGION_COOKIE = "uncoil_region";

export const UNCOIL_REGIONS: Record<UncoilRegionId, UncoilRegion> = {
  eu: {
    id: "eu",
    name: "Europe",
    shortName: "EU",
    flag: "🇪🇺",
    origin: "https://eu.cloud.uncoil.dev",
    hostname: "eu.cloud.uncoil.dev",
    location: "Ireland",
    infrastructure: "EU West",
    available: true,
  },
  us: {
    id: "us",
    name: "United States",
    shortName: "US",
    flag: "🇺🇸",
    origin: "https://us.cloud.uncoil.dev",
    hostname: "us.cloud.uncoil.dev",
    location: "Virginia",
    infrastructure: "US East",
    available: false,
  },
};

/**
 * Regions offered to customers. Use this for every public-facing surface — the region
 * selector, docs, status board, onboarding — rather than iterating UNCOIL_REGIONS
 * directly, so a dormant region can never be advertised by accident.
 */
export function getAvailableRegions(): UncoilRegion[] {
  return Object.values(UNCOIL_REGIONS).filter((region) => region.available);
}

export function isRegionAvailable(id: UncoilRegionId): boolean {
  return UNCOIL_REGIONS[id].available;
}

export function parseUncoilRegion(value: string | null | undefined): UncoilRegionId | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "eu" || normalized === "us" ? normalized : null;
}

export function getDeploymentRegion(): UncoilRegionId {
  return (
    parseUncoilRegion((process.env.NEXT_PUBLIC_UNCOIL_REGION ?? process.env.NEXT_PUBLIC_TRACIFY_REGION)) ??
    parseUncoilRegion((process.env.UNCOIL_REGION ?? process.env.TRACIFY_REGION)) ??
    DEFAULT_UNCOIL_REGION
  );
}

export function getUncoilRegion(id: UncoilRegionId = getDeploymentRegion()) {
  return UNCOIL_REGIONS[id];
}

export function getRegionForHostname(hostname: string | null | undefined): UncoilRegionId | null {
  const normalized = hostname?.split(":")[0].toLowerCase();
  if (!normalized) return null;
  return (Object.values(UNCOIL_REGIONS).find((region) => region.hostname === normalized)?.id ?? null);
}

export function getRegionalApiKeyPrefix(region: UncoilRegionId = getDeploymentRegion()) {
  return `uncoil_sk_live_${region}_`;
}

export function getApiKeyRegion(apiKey: string): UncoilRegionId | null {
  if (apiKey.startsWith(getRegionalApiKeyPrefix("eu"))) return "eu";
  if (apiKey.startsWith(getRegionalApiKeyPrefix("us"))) return "us";
  // Keys issued before regional cloud are assigned to the original EU deployment.
  if (apiKey.startsWith("uncoil_sk_live_")) return "eu";
  // Keys issued under the previous product name stay valid.
  if (apiKey.startsWith("tracify_sk_live_us_")) return "us";
  if (apiKey.startsWith("tracify_sk_live_")) return "eu";
  return null;
}

export function getWrongRegion(apiKey: string, deploymentRegion = getDeploymentRegion()) {
  const keyRegion = getApiKeyRegion(apiKey);
  return keyRegion && keyRegion !== deploymentRegion ? UNCOIL_REGIONS[keyRegion] : null;
}
