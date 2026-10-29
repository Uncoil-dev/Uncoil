import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "content/docs/quickstart.mdoc",
  "content/docs/typescript.mdoc",
  "content/docs/python.mdoc",
  "content/docs/data-regions.mdoc",
  "src/components/onboarding/install-step.tsx",
  "src/components/marketing/command-center-story.tsx",
  "src/components/marketing/navigation-system-explorations.tsx",
  "src/components/dashboard/docs-viewer.tsx",
  "src/components/dashboard/dashboard-start-state.tsx",
];

const source = files
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");

assert.doesNotMatch(source, /npm install uncoil(?:\s|["'`]|$)/, "legacy npm install command remains");
assert.doesNotMatch(source, /pip install uncoil(?:\s|\n|$)/, "legacy pip install command remains");
assert.doesNotMatch(source, /import\s*\{\s*Uncoil\s*\}/, "removed Uncoil class remains in public examples");
assert.doesNotMatch(source, /from\s+uncoil\s+import\s+Uncoil/, "removed Python Uncoil class remains in public examples");
assert.match(source, /npm install uncoil-sdk/, "canonical npm package is missing");
assert.match(source, /pip install uncoil-sdk/, "canonical Python package is missing");
assert.match(source, /traceAgent/, "canonical TypeScript wrapper is missing");
assert.match(source, /trace_agent/, "canonical Python wrapper is missing");
assert.match(source, /href=\{hasFirstTrace \? `\/dashboard\/\$\{effectiveProjectId\}\/runs` : "\/demo"\}/, "authenticated first-trace handoff is missing");
assert.doesNotMatch(source, /temporary until the trace viewer milestone/, "stale temporary sample-trace copy remains");
assert.match(source, /seeded example for exploring the workflow/, "seeded demo disclosure is missing");

console.log(`Activation contract passed for ${files.length} user-facing sources.`);
