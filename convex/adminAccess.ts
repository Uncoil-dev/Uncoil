// One shared rule for "who counts as an Uncoil admin". Pure on purpose, so a test can prove it.
// Anyone not matched here never reaches the admin data. The backend also requires a verified email.
export const BUILT_IN_ADMIN_EMAILS = ["kristofferbon@gmail.com", "kristoffer.bon@gmail.com"];
export const ADMIN_DOMAINS = ["uncoil.dev"];

export function isAllowedAdminEmail(email: string | null | undefined, extraEmails: string[] = []): boolean {
  if (typeof email !== "string") return false;
  const value = email.trim().toLowerCase();
  const parts = value.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const allowed = [...BUILT_IN_ADMIN_EMAILS, ...extraEmails.map((x) => x.trim().toLowerCase())];
  // Exact domain match only: "uncoil.dev.evil.com" and "evil-uncoil.dev" never pass.
  return allowed.includes(value) || ADMIN_DOMAINS.includes(parts[1]);
}
