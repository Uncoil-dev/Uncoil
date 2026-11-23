#!/usr/bin/env node
// Re-runs failed check runs whose failed steps show an infrastructure hiccup
// (network reset, runner shutdown, registry outage) rather than a code problem.
// Each run is retried once. Needs the gh CLI and GH_TOKEN with actions: write.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const WORKFLOW = "checks.yml";
export const MAX_RERUNS = 5;
export const WINDOW_HOURS = 3;

// Signatures that point at the environment, not the change under test.
export const INFRA_PATTERNS = [
  /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up/i,
  /Could not resolve host|Connection timed out|Connection reset by peer/i,
  /The runner has received a shutdown signal|runner (?:lost communication|is shutting down)/i,
  /The operation was canceled|##\[error\]The hosted runner/i,
  /HTTP(?: error)?:? (?:429|500|502|503|504)\b|\b(?:502|503|504) (?:Bad Gateway|Service Unavailable|Gateway Time-?out)/i,
  /npm error network|ERR_PNPM_FETCH|ERR_PNPM_META_FETCH_FAIL|Failed to download/i,
  /rate limit exceeded|API rate limit|secondary rate limit/i,
  /Error response from daemon: .*(?:timeout|unavailable)|toomanyrequests/i,
];

// A failure that also shows a real test, type or lint error is a code failure.
export const CODE_PATTERNS = [
  /\bAssertionError\b|✖ failing tests|# fail [1-9]/,
  /error TS\d{4}/,
  /\d+ problems? \(\d+ errors?/,
  /Test Files\s+\d+ failed|FAIL\s+\S+\.test\./,
  /\bmissing (?:word|spelling)|leaks? found/i,
];

export function isInfraFailure(log) {
  if (!log) return false;
  if (CODE_PATTERNS.some((re) => re.test(log))) return false;
  return INFRA_PATTERNS.some((re) => re.test(log));
}

// runs: [{ id, attempt, conclusion, createdAt }]. Newest first is fine.
export function candidateRuns(runs, now = Date.now(), windowHours = WINDOW_HOURS) {
  const cutoff = now - windowHours * 3600 * 1000;
  return runs.filter(
    (r) => r.conclusion === "failure" && r.attempt === 1 && Date.parse(r.createdAt) >= cutoff,
  );
}

export function selectReruns(runs, readLog, max = MAX_RERUNS, now = Date.now()) {
  const picked = [];
  for (const run of candidateRuns(runs, now)) {
    if (picked.length >= max) break;
    if (isInfraFailure(readLog(run.id))) picked.push(run.id);
  }
  return picked;
}

const gh = (args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function main() {
  const raw = JSON.parse(
    gh(["run", "list", "--workflow", WORKFLOW, "--status", "failure", "--limit", "50",
      "--json", "databaseId,attempt,conclusion,createdAt"]),
  );
  const runs = raw.map((r) => ({ id: r.databaseId, attempt: r.attempt, conclusion: r.conclusion, createdAt: r.createdAt }));
  const readLog = (id) => {
    try { return gh(["run", "view", String(id), "--log-failed"]); } catch { return ""; }
  };
  const ids = selectReruns(runs, readLog);
  console.log(`${ids.length} run(s) to retry`);
  if (process.argv.includes("--dry-run")) return;
  for (const id of ids) {
    gh(["run", "rerun", String(id), "--failed"]);
    console.log(`Re-ran failed jobs of run ${id}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
