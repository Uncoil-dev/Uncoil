// Known flaky checks: a failure of a listed check is retried, not investigated,
// and issues that only report such a failure are closed with a pointer.
// Entries look like { "name": "Tests (sites and unit)", "reason": "short note" }.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function matchFlaky(text, checks) {
  const hay = (text ?? "").toLowerCase();
  return checks.find((c) => hay.includes(c.name.toLowerCase())) ?? null;
}

export function closingComment(check) {
  return `This looks like the known flaky check "${check.name}"${check.reason ? ` (${check.reason})` : ""}. Re-run the check instead of investigating. If it keeps failing on several unrelated pull requests, reopen this issue with the run links.`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { checks } = JSON.parse(readFileSync(".github/known-flaky.json", "utf8"));
  const hit = matchFlaky(`${process.env.ISSUE_TITLE}\n${process.env.ISSUE_BODY}`, checks);
  if (hit) console.log(JSON.stringify({ comment: closingComment(hit) }));
}
