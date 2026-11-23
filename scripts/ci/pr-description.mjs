// Checks that a pull request description follows the PR template:
// a short summary and at least one ticked "Type of change" box.
import { pathToFileURL } from "node:url";

function removeComments(text) {
  let out = "";
  let rest = text;
  for (;;) {
    const start = rest.indexOf("<!--");
    if (start === -1) return out + rest;
    out += rest.slice(0, start);
    const end = rest.indexOf("-->", start + 4);
    if (end === -1) return out;
    rest = rest.slice(end + 3);
  }
}

const stripNoise = (text) =>
  removeComments(text)
    .split("\n")
    .filter((line) => !/^_Requested by /.test(line.trim()))
    .join("\n");

function section(body, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, "mi");
  const match = stripNoise(body).match(re);
  return match ? match[1].trim() : null;
}

export function checkDescription(body) {
  const problems = [];
  const text = (body ?? "").trim();
  if (!stripNoise(text).trim()) return ["The description is empty."];

  const summary = section(text, "What changed");
  if (summary === null) problems.push('Add a "What changed" section.');
  else if (summary.length < 10) problems.push('Write a short summary under "What changed".');

  const types = section(text, "Type of change");
  if (types === null) problems.push('Add a "Type of change" section.');
  else if (!/^\s*[-*]\s+\[[xX]\]/m.test(types)) problems.push('Tick at least one box under "Type of change".');

  return problems;
}

export function shouldSkip(labels = [], author = "") {
  return labels.includes("bot") || /\[bot\]$/i.test(author);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const labels = JSON.parse(process.env.PR_LABELS || "[]");
  if (shouldSkip(labels, process.env.PR_AUTHOR || "")) {
    console.log("Skipped for bot pull requests.");
    process.exit(0);
  }
  const problems = checkDescription(process.env.PR_BODY || "");
  for (const p of problems) console.log(`::error::${p}`);
  process.exit(problems.length ? 1 : 0);
}
