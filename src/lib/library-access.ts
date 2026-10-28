import { api } from "convex/_generated/api";
import { notFound, redirect } from "next/navigation";
import { fetchAuthQuery } from "@/lib/auth-server";
import { DASHBOARD_ADMIN_EMAILS } from "@/lib/admin-access";

function values(name: string) {
  return new Set(
    ((process.env[name] ?? process.env[name.replace("UNCOIL_", "TRACIFY_")]) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function getLibraryAccess() {
  let identity: Awaited<ReturnType<typeof fetchAuthQuery<typeof api.auth.getCurrentIdentity>>>;
  try {
    identity = await fetchAuthQuery(api.auth.getCurrentIdentity, {});
  } catch {
    // A stale or mismatched Better Auth token must not turn an unauthenticated
    // dashboard visit into a server error. The client route gate will send the
    // visitor through the normal sign-in flow.
    return { authenticated: false, authorized: false };
  }
  if (!identity) return { authenticated: false, authorized: false };
  const userId = identity.subject;
  const orgId = typeof identity.org_id === "string" ? identity.org_id : undefined;
  const orgRole = typeof identity.org_role === "string" ? identity.org_role : undefined;

  const allowedOrganizations = values("UNCOIL_LIBRARY_ORG_IDS");
  const allowedUsers = new Set([
    ...values("UNCOIL_ADMIN_USER_IDS"),
    ...values("UNCOIL_LIBRARY_USER_IDS"),
  ]);
  const allowedEmails = new Set([
    ...DASHBOARD_ADMIN_EMAILS,
    ...values("UNCOIL_LIBRARY_ADMIN_EMAILS"),
  ]);
  const accessConfigured =
    allowedOrganizations.size > 0 ||
    allowedUsers.size > 0 ||
    allowedEmails.size > 0;
  const approvedOrganization = orgId ? allowedOrganizations.has(orgId) : false;
  const emailAuthorized = typeof identity.email === "string" && allowedEmails.has(identity.email.toLowerCase());
  const authorized =
    allowedUsers.has(userId) ||
    emailAuthorized ||
    (approvedOrganization && (orgRole === "owner" || orgRole === "admin"));

  return { authenticated: true, authorized: accessConfigured && authorized };
}

export async function requireLibraryAccess(returnBackUrl = "/admin/library") {
  const access = await getLibraryAccess();
  if (!access.authenticated) {
    redirect(`/sign-in?redirect=${encodeURIComponent(returnBackUrl)}`);
  }
  if (!access.authorized) notFound();
}
