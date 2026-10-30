import { createClient } from "@convex-dev/better-auth";
import { dash, sentinel } from "@better-auth/infra";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { organization } from "better-auth/plugins";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";
import { ac, roles } from "./roles";

export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  { local: { schema }, verbose: false },
);

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/**
 * Sends sign-in emails straight through our own Resend account. Better Auth's hosted
 * email sender is a paid dashboard feature, so using it meant verification and
 * password reset emails never left the building.
 */
async function sendAuthEmail(args: { to: string; subject: string; heading: string; body: string; action: string; url: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.info("[auth-email] no RESEND_API_KEY set, email skipped:", args.subject); return; }
  const safeUrl = escapeHtml(args.url);
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#090909"><h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(args.heading)}</h1><p style="font-size:14px;line-height:1.6;margin:0 0 20px">${escapeHtml(args.body)}</p><p style="margin:0 0 20px"><a href="${safeUrl}" style="display:inline-block;background:#f4d44d;color:#090909;padding:12px 20px;font-size:14px;text-decoration:none;font-weight:600">${escapeHtml(args.action)}</a></p><p style="font-size:12px;color:#666;line-height:1.5;margin:0">If the button does not work, paste this link into your browser:<br>${safeUrl}</p></div>`;
  const text = `${args.heading}\n\n${args.body}\n\n${args.action}: ${args.url}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Uncoil <kb@uncoil.dev>", to: args.to, subject: args.subject, html, text }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const database = authComponent.adapter(ctx);
  const siteUrl = process.env.SITE_URL ?? "https://eu.cloud.uncoil.dev";
  return {
  appName: "uncoil",
  // Auth requests are proxied through the regional Next.js deployment. Resolve
  // the public host per request so OAuth callbacks and host-only session cookies
  // stay on the cloud origin the user selected instead of falling back to the
  // marketing host stored in older Convex environments.
  baseURL: {
    allowedHosts: [
      "eu.cloud.tracify.tech",
      "www.tracify.tech",
      "tracify.tech",
      "*.preview.tracify.tech",
      "eu.cloud.uncoil.dev",
      "staging.eu.cloud.uncoil.dev",
      "staging.uncoil.dev",
      "www.uncoil.dev",
      "uncoil.dev",
      "*.preview.uncoil.dev",
      "tracifytech.vercel.app",
      "*.tracify-tech.vercel.app",
      // Vercel branch previews: <project>-git-<branch>-tracify-tech.vercel.app
      "tracify-git-*-tracify-tech.vercel.app",
      "tracify-cloud-eu-git-*-tracify-tech.vercel.app",
      "localhost:*",
      "127.0.0.1:*",
    ],
    protocol: "auto",
    fallback: siteUrl,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  database,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your Uncoil password",
        heading: "Reset your password",
        body: "Use the button below to choose a new password. The link works for 60 minutes. If you did not ask for this, you can ignore this email.",
        action: "Choose a new password",
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Confirm your email for Uncoil",
        heading: "Confirm your email",
        body: "Welcome to Uncoil. Confirm your email address to finish setting up your account.",
        action: "Confirm email",
        url,
      });
    },
  },
  trustedOrigins: [
    siteUrl,
    "https://eu.cloud.tracify.tech",
    "https://www.tracify.tech",
    "https://tracify.tech",
    // Coolify per-PR previews: <pr number>.preview.tracify.tech
    "https://*.preview.tracify.tech",
    "https://eu.cloud.uncoil.dev",
    "https://staging.eu.cloud.uncoil.dev",
    "https://staging.uncoil.dev",
    "https://www.uncoil.dev",
    "https://uncoil.dev",
    "https://*.preview.uncoil.dev",
    "https://*.tracify-tech.vercel.app",
    "https://tracify-git-*-tracify-tech.vercel.app",
    "https://tracify-cloud-eu-git-*-tracify-tech.vercel.app",
    "http://localhost:3000",
    "http://localhost:4000",
    "https://uncoiltech.vercel.app",
  ].filter((origin): origin is string => Boolean(origin)),
  advanced: {
    // The Next.js auth handler overwrites these headers from the actual request
    // URL before proxying to Convex, and allowedHosts rejects every unknown host.
    trustedProxyHeaders: true,
  },
  // Stay signed in for 30 days. Each visit older than a day silently extends the
  // session, so active users are never asked to sign in again. The cookie is
  // persistent (not a browser-session cookie), so closing the tab keeps you in.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Signed cookie copy of the session: most session checks are answered from
    // the cookie and never touch the database. A revoked session is noticed
    // within five minutes.
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  // In memory, not the database. The database store read, wrote and cleaned up
  // a row on every single /api/auth request (about 3 backend calls each).
  rateLimit: {
    enabled: true,
    storage: "memory",
  },
  account: {
    encryptOAuthTokens: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          } }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? { github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          } }
      : {}),
  },
  plugins: [
    organization({
      ac,
      roles,
      organizationLimit: 10,
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      disableOrganizationDeletion: true,
    }),
    dash({ apiKey: process.env.BETTER_AUTH_API_KEY }),
    sentinel({ apiKey: process.env.BETTER_AUTH_API_KEY }),
    convex({
      authConfig,
      jwt: {
        // The short-lived Convex token is renewed from the 30 day session. One hour
        // (default is 15 minutes) keeps a sleeping or backgrounded tab signed in.
        expirationSeconds: 60 * 60,
        definePayload: async ({ user, session }) => {
          const organizationId = "activeOrganizationId" in session
            ? session.activeOrganizationId ?? undefined
            : undefined;
          const membership = organizationId
            ? await ctx.runQuery(components.betterAuth.adapter.findOne, {
                model: "member",
                where: [
                  { field: "userId", value: user.id },
                  { field: "organizationId", value: organizationId },
                ],
              })
            : null as { role?: string } | null;
          return {
            name: user.name,
            email: user.email,
            org_id: organizationId,
            org_role: typeof membership?.role === "string" ? membership.role : undefined,
          };
        },
      },
    }),
  ],
  } satisfies BetterAuthOptions;
};

export const options = createAuthOptions({} as GenericCtx<DataModel>);
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
