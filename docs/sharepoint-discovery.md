# SharePoint discovery package

Run `npm run prepare:m365-index` to create `artifacts/m365-sharepoint/`. Upload that folder to a SharePoint document library named `Uncoil`.

## Recommended library layout

- `Overview/` — README and orientation.
- `Repository/` — package map and implementation plans.
- `SDK/` — SDK compatibility and quickstart material.
- `Releases/` — release log and releasing runbook.
- `Architecture/` — system and regional boundaries.
- `Operations/` — regional and operational runbooks.
- `Agent instructions/` — `AGENTS.md` and agent-facing rules.

Keep the library searchable and version history enabled. Give maintainers edit access; give agents and general readers read access unless a separate approved write workflow exists. The generated `m365-file-index.json` is the catalog agents can use to locate approved documents.

Never export `.env` files, credentials, customer data, generated caches, `.worktrees`, `scratch`, build output, or provider tokens. Direct Microsoft 365 synchronization is intentionally not configured until a tenant/site URL and authenticated connector are supplied.
