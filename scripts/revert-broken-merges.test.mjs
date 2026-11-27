import assert from "node:assert/strict";
import test from "node:test";
import { findCulprits, isSensitivePath, prText, revertBranch } from "./revert-broken-merges.mjs";

const NOW = Date.parse("2026-11-23T12:00:00Z");
const c = (sha, conclusion, at = "2026-11-23T09:00:00Z", subject = `change ${sha}`) => ({ sha, subject, conclusion, completedAt: at });

test("reverts failing commits newer than the last passing one, oldest first", () => {
  const commits = [c("d", "failure"), c("c", "failure"), c("b", "success"), c("a", "failure")];
  assert.deepEqual(findCulprits(commits, NOW).map((x) => x.sha), ["c", "d"]);
});

test("does nothing when the newest commit passed", () => {
  assert.deepEqual(findCulprits([c("b", "success"), c("a", "failure")], NOW), []);
});

test("skips fresh failures, old failures, pending runs and reverts", () => {
  const commits = [
    c("e", "failure", "2026-11-23T11:30:00Z"),
    c("d", null),
    c("c", "failure", "2026-11-23T09:00:00Z", "revert: something"),
    c("b", "failure", "2026-11-21T09:00:00Z"),
  ];
  assert.deepEqual(findCulprits(commits, NOW), []);
});

test("caps the number of reverts per run", () => {
  const commits = ["e", "d", "c", "b", "a"].map((s) => c(s, "failure"));
  assert.deepEqual(findCulprits(commits, NOW).map((x) => x.sha), ["c", "d", "e"]);
});

test("sensitive paths are flagged and branch names are short", () => {
  assert.equal(isSensitivePath("src/lib/billing-links.ts"), true);
  assert.equal(isSensitivePath("src/components/hero.tsx"), false);
  assert.equal(revertBranch("0123456789abcdef"), "revert/0123456");
  assert.match(prText(c("a", "failure"), "a").body, /Reverts a\./);
});
