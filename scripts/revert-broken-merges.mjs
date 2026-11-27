#!/usr/bin/env node
// Finds commits merged to main in the last 24 hours whose checks failed and
// that no later commit has fixed, then opens a revert pull request for each.
// Needs the gh CLI, git with full history, and GH_TOKEN with contents and
// pull-requests write access. A revert that touches sensitive paths is opened
// without auto-merge so the owner reviews it.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const GATE = "All checks passed";
export const MAX_REVERTS = 3;
export const WINDOW_HOURS = 24;
// Leaves time for the flaky-check retry to turn a false failure green first.
export const MIN_AGE_MINUTES = 45;
const SENSITIVE_PATH = /auth|billing|secret|stripe|delet|credential|token|password|crypto|api-key|infra|\.github\/|convex\/schema/i;

export const isSensitivePath = (p) => SENSITIVE_PATH.test(p);

// commits: newest first, [{ sha, subject, conclusion, completedAt }].
// conclusion is the gate result on that commit: "success", "failure" or null.
// Returns the commits to revert, oldest first. A failure is skipped when a
// newer commit already passed (main recovered) or when it is a revert itself.
export function findCulprits(commits, now = Date.now(), max = MAX_REVERTS) {
  const cutoff = now - WINDOW_HOURS * 3600 * 1000;
  const minAge = now - MIN_AGE_MINUTES * 60 * 1000;
  const out = [];
  for (const c of commits) {
    if (c.conclusion === "success") break;
    if (c.conclusion !== "failure") continue;
    const at = Date.parse(c.completedAt);
    if (at < cutoff || at > minAge || /^revert\b/i.test(c.subject)) continue;
    out.push(c);
  }
  return out.slice(0, max).reverse();
}

export const revertBranch = (sha) => `revert/${sha.slice(0, 7)}`;

export function prText(commit, ref) {
  return {
    title: `revert: ${commit.subject}`.slice(0, 120),
    body: `Reverts ${ref}.\n\nChecks on \`main\` failed on this commit and had not recovered an hour later.\n\n**Tests:** no new tests; this restores the previous passing state.\n`,
  };
}

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const gh = (args) => sh("gh", args);

function gateFor(sha) {
  const out = JSON.parse(gh(["api", `repos/${process.env.GH_REPO}/commits/${sha}/check-runs?check_name=${encodeURIComponent(GATE)}&per_page=100`]));
  const runs = (out.check_runs ?? []).filter((r) => r.status === "completed").sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at));
  return runs[0] ? { conclusion: runs[0].conclusion, completedAt: runs[0].completed_at } : { conclusion: null, completedAt: null };
}

function main() {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
  const lines = sh("git", ["log", "origin/main", `--since=${since}`, "--format=%H%x09%s"]).trim().split("\n").filter(Boolean);
  const commits = lines.map((l) => {
    const [sha, ...rest] = l.split("\t");
    return { sha, subject: rest.join("\t"), ...gateFor(sha) };
  });
  const culprits = findCulprits(commits);
  console.log(`${culprits.length} commit(s) to revert`);
  for (const c of culprits) {
    const branch = revertBranch(c.sha);
    const reverted = sh("git", ["log", "origin/main", "-F", `--grep=This reverts commit ${c.sha}`, "--format=%H"]).trim();
    const open = gh(["pr", "list", "--state", "all", "--head", branch, "--json", "number"]);
    if (reverted || JSON.parse(open).length) { console.log(`Skip ${c.sha}: already handled`); continue; }
    const files = sh("git", ["show", "--name-only", "--format=", c.sha]).trim().split("\n").filter(Boolean);
    if (files.some((f) => f.startsWith(".github/workflows/"))) { console.log(`Skip ${c.sha}: changes workflow files`); continue; }
    if (process.argv.includes("--dry-run")) { console.log(`Would revert ${c.sha}`); continue; }
    try {
      sh("git", ["checkout", "-B", branch, "origin/main"]);
      sh("git", ["revert", "--no-edit", c.sha]);
    } catch {
      try { sh("git", ["revert", "--abort"]); } catch { /* nothing to abort */ }
      console.log(`Skip ${c.sha}: revert does not apply cleanly`);
      continue;
    }
    sh("git", ["push", "origin", branch]);
    const { title, body } = prText(c, c.sha);
    const url = gh(["pr", "create", "--base", "main", "--head", branch, "--title", title, "--body", body]).trim();
    console.log(url);
    if (!files.some(isSensitivePath)) {
      try { gh(["pr", "merge", url, "--auto", "--squash"]); } catch { console.log(`Auto-merge not enabled for ${url}`); }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
