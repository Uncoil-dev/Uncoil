import { type NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";

import { getConvexClient } from "@/lib/convex";
import { hashDeviceCode, newDeviceCode, overLimit, requestIp, requestOrigin } from "@/lib/cli-login";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_SECONDS = 3;

/** `tracify-sdk login` calls this first. No account is needed; nothing is created until a signed-in person confirms in the browser. */
export async function POST(request: NextRequest) {
  if (await overLimit(`cli-login-start:${requestIp(request)}`, 10, 600)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again in a few minutes." }, { status: 429, headers: { "Retry-After": "600" } });
  }
  let body: { publicKey?: unknown; newProjectName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }
  if (typeof body.publicKey !== "string") return NextResponse.json({ error: "Missing public key" }, { status: 422 });
  const newProjectName = typeof body.newProjectName === "string" ? body.newProjectName : undefined;

  const deviceCode = newDeviceCode();
  try {
    const { userCode, expiresAt } = await getConvexClient().mutation(api.deviceLogins.start, {
      deviceCodeHash: hashDeviceCode(deviceCode),
      publicKey: body.publicKey,
      newProjectName,
    });
    const verificationUrl = `${requestOrigin(request)}/cli/login?code=${encodeURIComponent(userCode)}`;
    return NextResponse.json(
      { deviceCode, userCode, verificationUrl, expiresAt, interval: POLL_INTERVAL_SECONDS },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    if (text.includes("Too many sign-in")) return NextResponse.json({ error: "Too many sign-in requests right now. Try again in a few minutes." }, { status: 429 });
    if (text.includes("Invalid public key")) return NextResponse.json({ error: "Invalid public key" }, { status: 422 });
    return NextResponse.json({ error: "Could not start sign-in." }, { status: 500 });
  }
}
