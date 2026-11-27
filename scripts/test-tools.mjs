// Runs the node:test suites for `npm run test:tools`.
// Suites are discovered instead of listed in package.json, so adding a
// `*.test.ts` / `*.test.mjs` file that imports node:test needs no other edit.
//
// A file is skipped when it does not import node:test (vitest suites) or when
// another package.json script or CI workflow already names it.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEARCH_DIRS = ["scripts", "src", "convex"];
const TEST_FILE = /\.test\.(ts|mjs)$/;
const INTEGRATION_FILE = /\.integration\.test\./;
const NODE_TEST_IMPORT = /from\s+["']node:test["']|require\(\s*["']node:test["']\s*\)/;

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEST_FILE.test(entry.name)) out.push(full);
  }
}

// Text of every other command that may run a test file on its own.
function otherRunners(root) {
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
  const parts = Object.entries(scripts)
    .filter(([name]) => name !== "test:tools")
    .map(([, command]) => command);
  const workflows = join(root, ".github", "workflows");
  try {
    for (const name of readdirSync(workflows)) {
      parts.push(readFileSync(join(workflows, name), "utf8"));
    }
  } catch {
    // No workflows directory: nothing else to account for.
  }
  return parts.join("\n");
}

/** Repo-relative, forward-slash paths of the suites `test:tools` runs. */
export function discoverToolTests(root = ROOT) {
  const files = [];
  for (const dir of SEARCH_DIRS) walk(join(root, dir), files);
  const elsewhere = otherRunners(root);
  return files
    .map((f) => relative(root, f).split(sep).join("/"))
    .filter((f) => !INTEGRATION_FILE.test(f))
    .filter((f) => NODE_TEST_IMPORT.test(readFileSync(join(root, f), "utf8")))
    .filter((f) => !elsewhere.includes(f))
    .sort();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  // node --test expands its arguments as globs; escape brackets in route folders.
  const args = discoverToolTests().map((f) => f.replace(/\[/g, "[[]"));
  const result = spawnSync(
    process.execPath,
    ["--test", "--experimental-strip-types", ...args],
    { cwd: ROOT, stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}
