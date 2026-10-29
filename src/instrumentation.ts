import { parseUncoilRegion, UNCOIL_REGIONS } from "@/lib/regions";

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // The managed local Playwright server runs the production bundle against the
  // local test origin. Keep the real cloud validation intact while allowing the
  // repository-owned test launcher to provide its isolated fixture environment.
  if (process.env.PLAYWRIGHT_LOCAL_SERVER === "1") return;

  const deploymentKind = (process.env.NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND ?? process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND) ?? "marketing";
  if (deploymentKind !== "cloud") return;

  const required = [
    "NEXT_PUBLIC_UNCOIL_REGION",
    "UNCOIL_REGION",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_CONVEX_URL",
    "NEXT_PUBLIC_CONVEX_SITE_URL",
    "UNCOIL_API_KEY_HASH_SECRET",
    "REDIS_URL",
    "INNGEST_EVENT_KEY",
  ] as const;
  // Span analytics run on self-hosted ClickHouse when CLICKHOUSE_URL is set, otherwise on Tinybird.
  const analytics = process.env.CLICKHOUSE_URL?.trim()
    ? ["CLICKHOUSE_URL", "CLICKHOUSE_USER", "CLICKHOUSE_PASSWORD"]
    : ["TINYBIRD_HOST", "TINYBIRD_TOKEN"];
  const missing = [...required, ...analytics].filter((name) => !(process.env[name] ?? process.env[name.replace("UNCOIL_", "TRACIFY_")])?.trim());
  if (missing.length) {
    throw new Error(`Regional cloud deployment is missing required environment variables: ${missing.join(", ")}`);
  }

  const publicRegion = parseUncoilRegion((process.env.NEXT_PUBLIC_UNCOIL_REGION ?? process.env.NEXT_PUBLIC_TRACIFY_REGION));
  const serverRegion = parseUncoilRegion((process.env.UNCOIL_REGION ?? process.env.TRACIFY_REGION));
  if (!publicRegion || publicRegion !== serverRegion) {
    throw new Error("NEXT_PUBLIC_UNCOIL_REGION and UNCOIL_REGION must identify the same supported region");
  }

  const expectedOrigin = UNCOIL_REGIONS[publicRegion].origin;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // Outside production, allow a localhost origin. Pinning NEXT_PUBLIC_SITE_URL to the
  // regional host on a developer machine makes the app treat production as its own
  // origin, so post-authentication redirects leave localhost for the live site.
  const isLocalOrigin =
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(siteUrl ?? "");
  // Staging and PR preview copies run on their own hosts. Opt in explicitly with
  // UNCOIL_ENVIRONMENT=staging; production never sets it.
  const isStagingOrigin =
    (process.env.UNCOIL_ENVIRONMENT ?? process.env.TRACIFY_ENVIRONMENT) === "staging" &&
    /^https:\/\/(staging|pr-\d+\.preview)\.eu\.cloud\.tracify\.tech$/.test(siteUrl ?? "");
  // The EU cloud app is moving to uncoil.dev; accept the new origin until the
  // regional config switches over.
  const isUncoilOrigin = publicRegion === "eu" && siteUrl === "https://eu.cloud.uncoil.dev";
  if (siteUrl !== expectedOrigin && !isLocalOrigin && !isStagingOrigin && !isUncoilOrigin) {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be ${expectedOrigin} for the ${publicRegion.toUpperCase()} deployment`);
  }
}

export async function onRequestError(
  error: unknown,
  request: { path: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.PLAYWRIGHT_LOCAL_SERVER === "1" || process.env.NODE_ENV !== "production") return;
  const err = error instanceof Error ? error : new Error(String(error));
  const { reportCrash } = await import("@/lib/crash-report");
  await reportCrash({
    source: "server",
    message: err.message,
    stack: err.stack,
    route: request.path,
    digest: (err as { digest?: string }).digest,
  });
}
