# Uncoil release log

This is the canonical release record. The public `/changelog` page and GitHub Releases use it as their source.

## [Unreleased]

### Features
- Release-log and SharePoint discovery foundations.

### Fixes
- None.

### SDK changes
- None.

### Breaking changes
- None.

### Migrations
- None.

### Security and operations
- SharePoint exports exclude secrets, customer data, caches, worktrees, and scratch files.

### Known limitations
- Direct SharePoint synchronization requires Microsoft 365 access and a target site.

### Deployment and rollback
- No deployment or publication is associated with this unreleased entry.

## [0.2.0] — 2026-09-03

### Features
- Added release and environment context support across the TypeScript and Python SDKs.
- Added repository, compatibility, release, and regional documentation foundations.

### Fixes
- Corrected SDK quickstart terminology and package usage documentation.

### SDK changes
- Added `release`, `environment`, `deploymentId`, `sessionId`, `endUserId`, and `tags` context fields.

### Breaking changes
- None.

### Migrations
- Existing SDK payloads remain accepted; new context fields are optional.

### Security and operations
- Documented release metadata, generated Convex binding checks, and regional processing limitations.

### Known limitations
- EU asynchronous processing still uses US-based Inngest infrastructure.
- This entry is a local release record until a verified release commit is published.

### Deployment and rollback
- Follow `docs/releasing.md`; application rollback does not automatically roll back Convex data or schema.
