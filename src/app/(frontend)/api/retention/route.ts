import { NextRequest, NextResponse } from "next/server";
import { runRetention } from "@/lib/retention-job";

/** Runs the daily clean-up by hand or from an outside scheduler; the built-in daily schedule is in inngest-functions.ts. */
export async function POST(request: NextRequest) {
  const configured = process.env.TRACIFY_RETENTION_SECRET;
  const provided = request.headers.get("x-retention-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || !provided || provided !== configured) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await runRetention(provided)) });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "retention" });
}
