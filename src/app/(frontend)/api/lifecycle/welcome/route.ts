import { NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import { fetchAuthMutation } from "@/lib/auth-server";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { renderWelcomeEmail } from "@/lib/email-templates";

/**
 * Welcomes the signed-in user, once, and only if their account is new. The address comes from the
 * session, never from the request, so this cannot be used to email someone else.
 */
export async function POST() {
  const claim = await fetchAuthMutation(api.welcomeEmail.claim, {}).catch(() => null);
  if (!claim) return NextResponse.json({ ok: true, sent: false });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tracify.tech";
  try {
    await sendTransactionalEmail({ to: claim.email, ...renderWelcomeEmail({ name: claim.name, origin }), idempotencyKey: `welcome-${claim.email}` });
    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    console.error("Welcome email failed", error);
    await fetchAuthMutation(api.welcomeEmail.release, {}).catch(() => undefined);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
