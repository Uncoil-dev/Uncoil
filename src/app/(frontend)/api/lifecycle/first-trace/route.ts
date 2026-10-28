import { NextRequest, NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/transactional-email";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown; name?: unknown; projectId?: unknown; runId?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 422 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.uncoil.dev";
  try { await sendTransactionalEmail({ to: email, subject: "Your first Uncoil trace is ready", text: `Your first trace is ready to inspect. Open it here: ${origin}/dashboard/${String(body?.projectId || "")}/runs/${String(body?.runId || "")}`, html: `<p>Your first trace is ready to inspect.</p><p><a href="${origin}/dashboard/${encodeURIComponent(String(body?.projectId || ""))}/runs/${encodeURIComponent(String(body?.runId || ""))}">Open your trace</a></p>`, idempotencyKey: `first-trace-${email}-${String(body?.runId || "first")}` }); return NextResponse.json({ ok: true }); } catch (error) { console.error("First trace email failed", error); return NextResponse.json({ ok: false }, { status: 202 }); }
}
