---
name: continue-pr
description: Picks up an open pull request and finishes it. Use when asked to continue, update or land an existing PR.
---
1. Read the PR description, the diff, the review comments and the check results.
2. Check out the PR branch. Add commits on top; never force-push or rewrite history, and never push to a branch you did not open.
3. Address each open comment or say why it does not apply. Keep to the PR's original task and size; new work goes in a new PR.
4. If the base moved, merge `main` into the branch instead of rebasing.
5. Fix red checks with `fix-ci`, then run the `review` skill.
6. Keep the description accurate and neutral. Open PRs against `main`.
