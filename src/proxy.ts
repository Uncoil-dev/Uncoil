import { type NextRequest, NextResponse } from "next/server";

import { TRACIFY_REGIONS } from "@/lib/regions";

const DEMO_PREFIX = "/demo";

const MARKETING_HOSTS = new Set(["www.tracify.tech", "tracify.tech"]);

function isDemoPath(pathname: string) {
  return pathname === DEMO_PREFIX || pathname.startsWith(`${DEMO_PREFIX}/`);
}

const CLOUD_APP_PREFIXES = [
  "/dashboard",
  "/dash",
  "/playground",
  "/onboarding",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
  "/cli",
  "/share",
  "/pricing/checkout",
  "/auth/error",
  "/auth/callback",
  "/cloud/mode",
  "/admin",
  "/demo",
];

function isCloudAppPath(pathname: string) {
  return CLOUD_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * A cloud deployment sends non-app paths to the marketing host. That is correct in
 * production, but on a developer machine it bounces you straight out of localhost and
 * onto www.tracify.tech, so the site root can never be opened locally and the
 * marketing/cloud boundary cannot be exercised. Keep local requests local.
 */
function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
}

/**
 * Behind a reverse proxy (Caddy in front of Coolify) the Node server sees its own bind
 * address in request.url, so nextUrl.hostname reads "localhost" for every public visit
 * and every redirect below was skipped as if it were local development. Prefer the host
 * the visitor actually asked for.
 */
function publicRequestHost(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || request.headers.get("host")?.trim() || request.nextUrl.host;
  return host.toLowerCase();
}

function publicHostname(host: string) {
  return host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1).replace(/[\[\]]/g, "") : host.split(":")[0];
}

export function proxy(request: NextRequest) {
  const deploymentKind = process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND ?? "marketing";
  const { pathname, search } = request.nextUrl;
  const publicHost = publicRequestHost(request);
  const hostname = publicHostname(publicHost);
  const local = isLocalHost(hostname);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  // Coolify's router rewrites x-forwarded-proto to "http" before it reaches the app, so a real
  // public host is always https; only local development keeps the protocol it was reached on.
  const protocol = local ? forwardedProto || request.nextUrl.protocol.replace(":", "") : "https";
  const publicOrigin = `${protocol}://${publicHost}`;

  // The sample project is a sandbox that lives on the cloud site; "/demo" is just its front door.
  if (pathname === DEMO_PREFIX || pathname === `${DEMO_PREFIX}/`) {
    const target = local || deploymentKind === "cloud" ? publicOrigin : TRACIFY_REGIONS.eu.origin;
    return NextResponse.redirect(new URL(`${DEMO_PREFIX}/project${search}`, target));
  }
  if (deploymentKind === "marketing" && isDemoPath(pathname) && !local) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, TRACIFY_REGIONS.eu.origin));
  }

  // Someone opening the cloud site cold lands on sign-in, not sign-up.
  if (deploymentKind === "cloud" && pathname === "/" && !local) {
    return NextResponse.redirect(new URL(`/sign-in${search}`, publicOrigin));
  }

  if (
    deploymentKind === "cloud" &&
    !isCloudAppPath(pathname) &&
    !pathname.startsWith("/api/") &&
    !local
  ) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.tracify.tech"));
  }

  if (deploymentKind === "marketing" && isCloudAppPath(pathname) && !local) {
    const selector = new URL("/cloud", publicOrigin);
    selector.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(selector);
  }

  const response = NextResponse.next();
  // The cloud app is private, but a marketing host must never be told noindex by a cloud-flavoured build.
  if (deploymentKind === "cloud" && !MARKETING_HOSTS.has(hostname)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
