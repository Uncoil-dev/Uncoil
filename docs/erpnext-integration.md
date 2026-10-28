# ERPNext integration design

The first ERPNext integration will be an outbound, project-scoped connector from Uncoil to an ERPNext/Frappe instance. It will send selected operational events—initially failed runs and configured alert breaches—as `ToDo` records, while keeping raw trace evidence in Uncoil.

## Proposed flow

`Uncoil alert -> project integration settings -> server-side delivery action -> ERPNext REST API -> linked ERPNext record`

Use a dedicated least-privilege ERPNext API user. Frappe’s REST API supports token authentication with `token api_key:api_secret`, exposes DocTypes at `/api/resource/:doctype`, and provides `/api/method/frappe.auth.get_logged_user` for a connection test.

## Initial mapping

| Uncoil event | ERPNext record | Data sent |
| --- | --- | --- |
| Failed agent run | ToDo | run ID, status, failure message, project, environment, release, trace URL |
| Cost/duration threshold alert | ToDo | alert type, message, run ID, triggered time, trace URL |

## Security requirements

- Accept only HTTPS base URLs and reject localhost, loopback, link-local, private, and unspecified targets.
- Validate the destination at save time and immediately before every outbound request.
- Never send API secrets to client components or return them from read queries.
- Store only encrypted credentials or a server-side secret reference; do not persist plaintext if the deployment has no encryption-at-rest mechanism.
- Require project access plus admin-level permission for connect, update, test, and disconnect.
- Use fixed API paths, bounded payloads, timeouts, no redirects, idempotency, and redacted logs.
- Add negative tests for cross-project access, invalid/private URLs, missing credentials, and secret omission.

## Implementation sequence

1. Add a project-scoped ERPNext connection model and safe read shape.
2. Add a server-only connection test.
3. Add a server-only delivery action with timeout and idempotency handling.
4. Wire failed-run and threshold-alert events without blocking existing alert delivery.
5. Add settings UI for status, test, disconnect, and event toggles.
6. Verify against a customer-provided ERPNext sandbox before claiming end-to-end success.

## Required owner input

- ERPNext site or sandbox URL.
- Confirmation that `ToDo` is the target DocType (rather than `Issue`).
- Dedicated API user key and secret supplied through deployment secrets, never committed.
- Uncoil public base URL for links back to trace evidence.

## Deployment secret

Before enabling project-scoped ERPNext credentials, configure `UNCOIL_INTEGRATION_ENCRYPTION_KEY` as a randomly generated, stable 32-byte AES key encoded as base64 in the server/Convex environment. Never put an ERPNext API secret in `.env.local.example`, source control, browser state, or a client-visible Convex query. Rotating this key requires re-encrypting stored integration credentials before removing the old key.
