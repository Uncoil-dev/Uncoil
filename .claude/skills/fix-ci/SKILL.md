---
name: fix-ci
description: Fixes failing CI checks on a pull request. Use when checks on a PR are red and the cause is in the PR's own changes.
---
1. List the failing checks on the PR and read the log of each failed job. Fix the first real error, not the last line of output.
2. Reproduce it locally with the narrowest command: `npm run lint`, `npx tsc --noEmit`, or the single failing test file.
3. Fix the cause. Never skip, disable or delete a test, add a lint-disable comment, or weaken a workflow or branch rule to get green.
4. Re-run only what failed, then the checks the fix could affect.
5. Add a new commit on the same branch. Do not rewrite history or push an empty commit to re-trigger CI.
6. If the failure is not caused by the PR, use `investigate-ci` instead.
