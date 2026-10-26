import { type NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";

import { getConvexClient } from "@/lib/convex";
import { hashDeviceCode, isDeviceCode, overLimit, requestIp } from "@/lib/cli-login";

export const dynamic = "force-dynamic";

/** The terminal asks whether the person has confirmed. The encrypted key is returned once. */
export async function POST(request: NextRequest) {
  if (await overLimit(`cli-login-poll:${requestIp(request)}`, 60, 60)) {
    return NextResponse.json({ error: "Polling too fast" }, { status: 429, headers: { "Retry-After": "10" } });
  }
  let body: { deviceCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }
  if (!isDeviceCode(body.deviceCode)) return NextResponse.json({ status: "expired" }, { headers: { "Cache-Control": "no-store" } });
  const result = await getConvexClient().mutation(api.deviceLogins.poll, { deviceCodeHash: hashDeviceCode(body.deviceCode) });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
