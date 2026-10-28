import { type NextRequest, NextResponse } from "next/server";
import { isRegionAvailable, parseUncoilRegion, UNCOIL_REGION_COOKIE, UNCOIL_REGIONS } from "@/lib/regions";
import { parseEntryIntent, safeRelativePath } from "@/lib/navigation-context";

export function GET(request: NextRequest) {
  const regionId = parseUncoilRegion(request.nextUrl.searchParams.get("region"));
  // Reject dormant regions here too, not just in the UI — otherwise a hand-typed
  // ?region=us would still set the cookie and redirect into a region that must not
  // take production traffic.
  if (!regionId || !isRegionAvailable(regionId)) {
    return NextResponse.redirect(new URL("/cloud", request.url));
  }

  const next = safeRelativePath(request.nextUrl.searchParams.get("next"), "/sign-in");
  const intent = parseEntryIntent(request.nextUrl.searchParams.get("intent"));
  const destinationPath = new URL(next, "https://uncoil.invalid");
  if (intent) destinationPath.searchParams.set("intent", intent);
  // Selecting a region from a local marketing server must not jump to the live
  // regional host, or local sign-in lands on production. UNCOIL_LOCAL_CLOUD_ORIGIN
  // points at the locally running cloud host (see `npm run dev:cloud`).
  const localCloudOrigin =
    process.env.NODE_ENV !== "production" &&
    (request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1")
      ? ((process.env.UNCOIL_LOCAL_CLOUD_ORIGIN ?? process.env.TRACIFY_LOCAL_CLOUD_ORIGIN) ?? "http://localhost:4000")
      : null;
  const destination = new URL(`${destinationPath.pathname}${destinationPath.search}`, localCloudOrigin ?? UNCOIL_REGIONS[regionId].origin);
  const response = NextResponse.redirect(destination);
  response.cookies.set(UNCOIL_REGION_COOKIE, regionId, {
    domain: request.nextUrl.hostname.endsWith("uncoil.dev") ? ".uncoil.dev" : undefined,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
  });
  return response;
}
