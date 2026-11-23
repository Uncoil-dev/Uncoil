---
name: review
description: Runs a separate bug-review pass on a pull request before auto-merge. Use after the work is finished and checks are green.
---
1. Read `REVIEW.md` and follow its scope, blockers and security checklist.
2. Review only the diff, against the PR's stated task. Look for bugs, missing edge cases, missing tests, and changes unrelated to the task.
3. Run the tests for the touched area if they were not already run.
4. Report findings highest severity first, each with file, line, one sentence and a fix. Say plainly when there are none.
5. Fix every blocker before enabling auto-merge. Leave suggestions as notes and do not hold the PR for them.
6. Do not enable auto-merge on auth, billing, secrets, infra or data deletion changes. Leave those for owner review.
