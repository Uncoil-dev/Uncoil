import { getAvailableRegions } from "@/lib/regions";

/**
 * Links from the marketing site into the app ("/sign-up", "/demo/project", "/dashboard", checkout).
 * Those paths live on the regional cloud host, so on the marketing host a relative link answers
 * with a redirect (and "/demo" with two). Point straight at the final URL instead.
 *
 * The relative path is kept when running on the cloud host, during local development, and whenever
 * more than one region is offered, because then the visitor still has to pick a region first.
 */
export function appHref(path: string): string {
  if ((process.env.NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND ?? process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND) === "cloud") return path;
  if (process.env.NODE_ENV !== "production") return path;
  const regions = getAvailableRegions();
  return regions.length === 1 ? `${regions[0].origin}${path}` : path;
}
