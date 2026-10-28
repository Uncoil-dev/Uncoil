# SEO and production release checklist

Use this checklist for public-route, metadata, sitemap, redirect, and SEO releases. It prevents a preview, merged pull request, or older audit from being mistaken for the live production state.

## Public-page contract

Every indexable public page must:

- return HTTP 200 at its final canonical URL;
- use the canonical `https://www.uncoil.dev` host without an internal redirect;
- have one non-empty H1 and one unique canonical URL;
- have a useful title and a natural meta description, normally 70–160 characters;
- provide Open Graph title, description, URL, and image values;
- provide X/Twitter card, title, description, and image values;
- contain enough route-specific information to satisfy the reader rather than filler;
- appear in `sitemap.xml` if it is indexable; and
- link only to working final destinations, not redirecting or broken URLs.

Auth, onboarding, dashboard, checkout, callback, and other utility routes must explicitly use `noindex`. A `robots.txt` disallow rule alone does not guarantee that a URL cannot be indexed.

HTTP-to-HTTPS and bare-domain-to-`www` redirects are intentional. Sitemap entries, canonical tags, and internal links must bypass those redirects by using the final HTTPS `www` URL directly.

## Before merging

1. Run the relevant content tests, production build, and rendered SEO crawl when `npm run test:seo` is available.
2. Inspect the staged diff and exclude `scratch/`, logs, downloaded references, environment files, and unrelated user work.
3. Record the intended release commit with `git rev-parse HEAD`.
4. Confirm the pull request head contains that commit before merging.
5. Stop adding commits to a branch after its pull request is merged. Any later commits require a follow-up pull request.

## Before production deployment

Fetch remote state and prove that the intended commit landed:

```powershell
git fetch origin --prune
git merge-base --is-ancestor <intended-commit> origin/main
git log --oneline -5 origin/main
```

An exit code other than zero from `merge-base --is-ancestor` means the change is not in `main`. Do not deploy and claim that change is included.

Deploy only an exact `origin/main` tree:

```powershell
git switch main
git merge --ff-only origin/main
git diff --quiet HEAD origin/main
```

Confirm `.vercel/project.json` points to project `uncoil` in team `uncoil-tech`. For manual CLI deployments, use a clean checkout or clean Git worktree. Do not deploy the shared working directory when it contains untracked scratch material, even if those files are ignored by Git.

## After deployment

1. Wait for Vercel to report `Ready`; do not rely on an initial deployment URL alone.
2. Inspect `https://www.uncoil.dev` and confirm it resolves to the new deployment ID.
3. Verify `/`, `/robots.txt`, `/sitemap.xml`, one representative public article, and every changed route.
4. Recheck final canonicals, H1, descriptions, social tags, internal links, and utility-route `noindex` behavior.
5. If IndexNow is part of the release, verify the key file before running `npm run seo:indexnow -- --submit`. Never submit while the key returns 404 or before the expected key contents are live. The key file is `public/<key>.txt`; the `IndexNow` GitHub workflow submits URLs modified in the last two days after each push to `main` (waits up to 15 minutes for the key to be live), and can be run by hand with an empty `since` to resubmit every sitemap URL.
6. Start a new Ahrefs crawl after production verification. Compare results using the new crawl timestamp, not a crawl from before deployment.

## Incident note: PR #5

PR #5 merged commit `5e7807b` into `main`. SEO remediation commits `3474f98` and `191cbeb` were pushed to the branch afterward, so they were not included in merge commit `f646ca7`. Production deployment `dpl_GucMKe2AYetsPtixDMw1GMGJgGy6` correctly deployed the exact `main` tree, but it could not contain those later commits. Future agents must use ancestry checks before saying a merged or deployed release contains a particular fix.
