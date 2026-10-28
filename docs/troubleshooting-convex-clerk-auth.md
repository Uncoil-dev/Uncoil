# Convex + Clerk Auth Troubleshooting

This runbook documents the "waiting for auth" issue that blocked project creation in both local development and production.

## Symptom

The user is signed in with Clerk, but the app stays stuck around Convex auth readiness. In the UI this can look like:

- Onboarding/project creation says "waiting for auth" or never enables project creation.
- `useConvexAuth()` stays loading or unauthenticated.
- Mutations such as `projects:createProject` do not reach an authenticated Convex identity.
- Server-side Convex calls may work, while browser client calls do not.

This is different from a missing Convex function error such as:

```text
Could not find public function for 'projects:getProjectRouteState'
```

That error means the Convex deployment has not received the current function bundle. The auth issue documented here is specifically about Clerk not being able to mint the JWT that Convex expects.

## Root Cause

The culprit was a missing Clerk JWT template named `convex`.

The frontend uses Clerk with Convex through `ConvexProviderWithClerk`. That integration asks Clerk for a token with:

```ts
getToken({ template: "convex" })
```

If the active Clerk instance does not have a JWT template named exactly `convex`, Clerk cannot mint the token. Convex then never receives a valid JWT, so `ctx.auth.getUserIdentity()` is `null` and browser auth appears stuck even though the user is signed in.

Convex also validates the token audience against `convex/auth.config.ts`. This project expects:

```ts
applicationID: "convex"
```

So the Clerk JWT template must include:

```json
{ "aud": "convex" }
```

## Current Expected Configuration

### Application code

`convex/auth.config.ts` must include the Clerk issuer domains used by the deployments:

```ts
export default {
  providers: [
    {
      domain: "https://many-crab-79.clerk.accounts.dev",
      applicationID: "convex",
    },
    {
      domain: "https://clerk.uncoil.dev",
      applicationID: "convex",
    },
  ],
};
```

`src/components/convex-provider.tsx` must use Clerk-aware Convex auth, not a plain Convex provider:

```tsx
<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
  {children}
</ConvexProviderWithClerk>
```

### Development

The development Clerk instance must have:

- JWT template name: `convex`
- Audience claim: `aud = "convex"`
- Standard user claims are useful for debugging, but the audience is the critical value.

The Convex dev deployment should have the Clerk issuer available when env-driven config is used:

```text
CLERK_JWT_ISSUER_DOMAIN=https://many-crab-79.clerk.accounts.dev
```

### Production

The production Clerk instance must have:

- JWT template name: `convex`
- Audience claim: `aud = "convex"`
- Current production template id, as of 2026-05-17: `jtmp_3DqnK6lISiE8KVJBB2nnyXdwHtZ`

The Convex prod deployment must have:

```text
CLERK_JWT_ISSUER_DOMAIN=https://clerk.uncoil.dev
```

Vercel production must point browser clients at production Convex:

```text
NEXT_PUBLIC_CONVEX_URL=https://focused-otter-289.convex.cloud
CONVEX_DEPLOYMENT=prod:focused-otter-289
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<production Clerk publishable key>
CLERK_SECRET_KEY=<production Clerk secret key>
```

Do not paste real secret values into documentation or commits.

## What Fixed Production On 2026-05-17

1. Verified production Convex env:

```powershell
npx.cmd convex env list --prod
```

Expected important value:

```text
CLERK_JWT_ISSUER_DOMAIN=https://clerk.uncoil.dev
```

2. Deployed the current Convex functions and auth config to production:

```powershell
npx.cmd convex deploy --yes --cmd "echo prod-convex-ready"
```

Expected deployment target:

```text
https://focused-otter-289.convex.cloud
```

3. Checked production Clerk JWT templates through the Clerk Backend API.

The initial response had no templates, which confirmed the root cause. After that, a production Clerk JWT template named `convex` was created with:

```json
{
  "name": "convex",
  "claims": {
    "aud": "convex",
    "email": "{{user.primary_email_address}}",
    "name": "{{user.full_name}}"
  },
  "lifetime": 60,
  "allowed_clock_skew": 5,
  "custom_signing_key": false
}
```

The resulting production template was:

```text
name: convex
id: jtmp_3DqnK6lISiE8KVJBB2nnyXdwHtZ
signing_algorithm: RS256
lifetime: 60
allowed_clock_skew: 5
```

4. Verified Vercel production env names exist:

```powershell
npx.cmd vercel env ls production
```

5. Pushed the documentation commit, which triggered a production Vercel deployment. The deployment was ready and aliased to:

```text
https://uncoil.dev
https://uncoil.dev
https://uncoil.vercel.app
```

## Dev vs Production Checklist

When auth works in one environment but not the other, compare these in order.

### 1. Browser environment

Check which Convex and Clerk frontend values the deployed app is using:

```text
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

Dev should point to the dev Convex deployment and dev Clerk instance. Production should point to `focused-otter-289` and the live Clerk instance.

### 2. Clerk JWT template

In the active Clerk instance, verify a JWT template exists with:

```text
name = convex
aud = convex
```

The template name is not cosmetic. `ConvexProviderWithClerk` asks for `template: "convex"`, so a template named `Convex`, `convex-prod`, or `uncoil` will not satisfy this flow.

### 3. Convex auth provider config

Check `convex/auth.config.ts` and confirm the active Clerk issuer is listed as a provider domain.

The provider `applicationID` must match the token audience:

```text
applicationID: "convex"
JWT aud: "convex"
```

### 4. Convex deployment freshness

If the browser reports a missing public function, deploy or sync Convex before debugging JWTs:

```powershell
npx.cmd convex dev --once --typecheck disable
```

For production:

```powershell
npx.cmd convex deploy --yes --cmd "echo prod-convex-ready"
```

### 5. User session freshness

After creating or changing a Clerk JWT template, ask the user to sign out and sign back in, or hard refresh. Existing browser session state may not immediately request the newly available template.

## Common Failure Modes

### Missing JWT template

Most likely symptom:

```text
Signed in with Clerk, but Convex auth keeps waiting.
```

Fix:

- Create JWT template `convex`.
- Include `aud: "convex"`.
- Refresh user session.

### Audience mismatch

Most likely symptom:

```text
Clerk returns a token, but Convex rejects it.
```

Fix:

- Confirm Clerk JWT `aud` equals `convex`.
- Confirm `convex/auth.config.ts` uses `applicationID: "convex"`.

### Issuer mismatch

Most likely symptom:

```text
Dev works, production fails, or production works, dev fails.
```

Fix:

- Confirm the Clerk issuer domain in Convex matches the actual environment.
- Dev: `https://many-crab-79.clerk.accounts.dev`
- Prod: `https://clerk.uncoil.dev`

### Stale Convex functions

Most likely symptom:

```text
Could not find public function for 'module:functionName'
```

Fix:

- Run Convex dev sync locally.
- Run Convex deploy for production.
- This is a deployment sync issue, not a JWT-template issue.

### Wrong Vercel public env

Most likely symptom:

```text
Production site talks to dev Convex or dev Clerk.
```

Fix:

- Check Vercel production env vars.
- Redeploy after changing env vars.

## Quick Recovery Commands

Use these commands from `C:\uncoil`.

Check prod Convex env:

```powershell
npx.cmd convex env list --prod
```

Deploy Convex prod:

```powershell
npx.cmd convex deploy --yes --cmd "echo prod-convex-ready"
```

Check Vercel production env variable names:

```powershell
npx.cmd vercel env ls production
```

Inspect latest Vercel deployment:

```powershell
npx.cmd vercel ls --format json
npx.cmd vercel inspect <deployment-url>
```

## Rule Of Thumb

For Convex browser auth to work, all four parts must agree:

```text
Clerk frontend key -> active Clerk instance
Clerk JWT template name -> convex
Clerk JWT aud -> convex
Convex auth.config applicationID -> convex
Convex provider domain -> active Clerk issuer
```

If any one of those is wrong, the user can be signed into Clerk while Convex still behaves as unauthenticated.
