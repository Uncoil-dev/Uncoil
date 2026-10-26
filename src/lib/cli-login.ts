import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

import { consumeRateLimit } from "@/lib/redis-cache";

/** The terminal keeps the raw device code; only this hash is ever stored or sent to the database. */
export function hashDeviceCode(deviceCode: string) {
  return createHash("sha256").update(deviceCode).digest("hex");
}

export function newDeviceCode() {
  return randomBytes(32).toString("base64url");
}

export function isDeviceCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** The address the person should open, taken from the host the terminal actually reached. */
export function requestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host")?.trim() || request.nextUrl.host;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  return `${local ? request.nextUrl.protocol.replace(":", "") : "https"}://${host}`;
}

/** True when the caller is over the limit. Redis being down never blocks a sign-in; the database keeps its own cap. */
export async function overLimit(key: string, limit: number, windowSeconds: number) {
  try {
    return !(await consumeRateLimit(key, 1, limit, windowSeconds)).allowed;
  } catch {
    return false;
  }
}
