import { NextRequest, NextResponse } from "next/server";
import { renderFirstTraceEmail } from "@/lib/email-templates";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { getUncoilRegion } from "@/lib/regions";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown; name?: unknown; projectId?: unknown; runId?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 422 });
  // The trace lives on this deployment's region host, like the reminder email's links.
  const origin = getUncoilRegion().origin;
  try { await sendTransactionalEmail({ to: email, ...renderFirstTraceEmail({ name: typeof body?.name === "string" ? body.name : undefined, projectId: String(body?.projectId || ""), runId: String(body?.runId || ""), origin }), idempotencyKey: `first-trace-${email}-${String(body?.runId || "first")}` }); return NextResponse.json({ ok: true }); } catch (error) { console.error("First trace email failed", error); return NextResponse.json({ ok: false }, { status: 202 }); }
}
