---
name: investigate-ci
description: Works out why a CI check failed and whether the PR caused it. Use before fixing or re-running a red check that looks unrelated to the change.
---
1. Read the failed job log and note the first error and the step it came from.
2. Compare with the latest run of the same check on `main`. If `main` fails the same way, the PR did not cause it.
3. Check whether the failure is a network error, timeout or runner problem. Those can be re-run once. A second identical failure is a real problem.
4. If a test passes and fails on the same code, record the test name and the evidence, and report it as flaky. Do not skip it.
5. Report one of: caused by this PR (then use `fix-ci`), already broken on `main`, or flaky/infra, each with the log line that shows it.
