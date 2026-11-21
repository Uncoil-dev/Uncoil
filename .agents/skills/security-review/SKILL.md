---
name: security-review
description: Security checklist for changes touching auth, outbound requests, tenant data, secrets or redirects. Use when reviewing or writing such code.
---

# Security review

Baseline is the security checklist in `REVIEW.md` and the auth notes in `AGENTS.md`. Anything touching auth, billing, secrets, infra or data deletion needs owner review.

## Outbound URLs

- Treat any user-supplied URL as untrusted (webhooks, callbacks, fetch targets).
- Allow only http(s) and resolved public hosts. Block localhost, private ranges, link-local and cloud metadata addresses.
- Re-check after redirects and DNS resolution, set timeouts and response size limits.

## Tenant isolation

- Every route, server action and Convex function checks who the caller is and that they can access the project.
- Derive project and user from the verified session or API key, never from client-supplied ids alone.
- Scope every query, cache key and Tinybird read by project.
- Data deletion is limited to the right project and confirmed or recoverable where expected.

## Secrets

- No secrets in code, logs, error messages, client bundles, tests or PR text.
- API keys are hashed with HMAC-SHA256; plaintext is never stored and is shown once.
- Only `NEXT_PUBLIC_` values may reach the client. Compare secrets in constant time.

## Redirects

- Validate any `redirect`, `returnTo` or `next` parameter against a fixed allowlist or same-origin relative paths.
- Reject protocol-relative (`//host`) and backslash tricks.

## Also check

- Billing limits and usage cannot be set or bypassed from the client.
- Auth middleware and the ingest pipeline are not weakened.

## Reporting

Follow the format in `REVIEW.md`: severity, file and line, one-sentence problem, suggested fix. Anything that weakens auth, billing or secret handling is a blocker.
