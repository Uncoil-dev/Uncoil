# Saved views: isolated preview verification

Draft PR #168 adds Convex metadata and must be verified with an isolated backend before release.
The existing `jovial-owl-711` deployment is production. Its `prod:` deploy key is not a preview key.

## Vercel configuration

In the Convex project's Settings, generate a **Preview Deploy Key**. In Vercel project
`uncoil-cloud-eu`, add an additional `CONVEX_DEPLOY_KEY` environment entry with **Preview** as its
only target and `codex/tracing-saved-views` as its branch. Keep the existing production entry.
Never put a deploy key in a `NEXT_PUBLIC_` variable, a PR, a screenshot, or a chat message.

The branch build script creates/reuses a Convex preview for that branch, initializes a persistent
preview auth secret and the frontend's existing API-key hashing secret, and points all three Convex
URL variables at that preview. It rejects production keys and the known production backend URL.
Marketing, production, other branches and ordinary local builds run the existing frontend build.
The script captures/redacts subprocess output and sends secret values to the CLI through stdin.

A new Convex preview has separate accounts/projects. Sign up a test account, create a test project,
and seed that project's actual ingestion endpoint before using browser verification tools. Do not
reuse the production robot project's ID/key as though they belonged to this empty deployment.
Store test credentials under the server's protected test-tools area and never print them.

## Required hosted checks

- Save a private view, reopen after reload, rename/update/delete, and verify persistence.
- Check filters, sort, columns, relative ranges and fixed dates. URL snapshots of unsaved edits must
  survive reload and show Modified; a bare shared-view link resolves the saved snapshot once.
- Share with a project member, copy/open the team link, and verify member reads but cannot mutate.
- Verify an outsider and a member of a different project cannot read or mutate by ID.
- Confirm desktop/phone screenshots and no page-wide overflow, including long view names.
- Existing Tracing click/live/feature suites must still pass. Also exercise the cross-trace Steps checks.

Local schema deployment, access tests and build guards are proof of local behavior. They do not
replace authenticated hosted verification. A Ready frontend still using production's old backend
cannot be reported as a working saved-view preview.
