// Fails a pull request that changes application code without touching a test.
// Usage: node scripts/require-tests.mjs  (changed file names on stdin, one per line)
// Env: PR_LABELS (comma separated), PR_BODY, PR_AUTHOR_TYPE.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SKIP_LABEL = "no-tests-needed";
const SKIP_PHRASE = /no new test needed/i;

const TEST_FILE =
  /(^|\/)(tests?|__tests__|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$|_test\.py$|\.integration\.test\./;
const CODE_FILE =
  /^(src|convex|packages\/[^/]+)\/.*\.([cm]?[jt]sx?|py)$/;

export const isTestFile = (f) => TEST_FILE.test(f);
export const isCodeFile = (f) =>
  CODE_FILE.test(f) &&
  !isTestFile(f) &&
  !/^convex\/_generated\//.test(f) &&
  !/\.d\.ts$/.test(f);

export function evaluate({ files, labels = [], body = "", authorType = "User" }) {
  const code = files.filter(isCodeFile);
  const tests = files.filter(isTestFile);
  if (code.length === 0) return { ok: true, reason: "No application code changed." };
  if (tests.length > 0) return { ok: true, reason: "Tests changed with the code." };
  if (authorType === "Bot") return { ok: true, reason: "Bot pull request." };
  if (labels.includes(SKIP_LABEL)) return { ok: true, reason: `Skipped by the ${SKIP_LABEL} label.` };
  if (SKIP_PHRASE.test(body)) return { ok: true, reason: "Description says no new test is needed." };
  return {
    ok: false,
    reason:
      `Code changed but no test file did (${code.slice(0, 5).join(", ")}). ` +
      `Add or extend a test, or add the "${SKIP_LABEL}" label (or write "No new test needed: <reason>" in the description) and re-run this check.`,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const files = readFileSync(0, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  const result = evaluate({
    files,
    labels: (process.env.PR_LABELS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    body: process.env.PR_BODY ?? "",
    authorType: process.env.PR_AUTHOR_TYPE ?? "User",
  });
  console.log(result.reason);
  process.exit(result.ok ? 0 : 1);
}
