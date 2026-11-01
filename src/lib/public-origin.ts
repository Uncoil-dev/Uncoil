/**
 * Public origin of the site for a request. Behind the Coolify/Caddy proxy,
 * `new URL(request.url).origin` is `http://localhost:3000`, so build it from
 * the forwarded host instead.
 */
export function getPublicOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host")?.trim();
  const isLocal = (value: string) => /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(value);

  if (host && !isLocal(host)) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${host}`;
  }
  if (!isLocal(url.host)) return url.origin;

  // Local request, or proxy sent no usable host: fall back to the configured site URL.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site && !isLocal(site.replace(/^https?:\/\//, ""))) return site.replace(/\/+$/, "");
  return url.origin;
}
