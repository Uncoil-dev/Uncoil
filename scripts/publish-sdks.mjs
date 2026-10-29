/**
 * Publish both SDKs. Credentials come from your shell, never from a file.
 *
 *   PowerShell:
 *     $env:NODE_AUTH_TOKEN = "<npm publish token>"
 *     $env:TWINE_USERNAME  = "__token__"
 *     $env:TWINE_PASSWORD  = "<pypi- token>"
 *     npm run publish:sdks
 *
 * twine reads TWINE_USERNAME / TWINE_PASSWORD natively, so no ~/.pypirc is needed.
 *
 * npm has no equivalent env-var hook: it only reads a token from an .npmrc
 * entry, and committing that pattern trips secret scanning. So authenticate npm
 * with `npm login` first, or use the GitHub Actions workflow, which is the
 * supported path and keeps credentials off developer machines entirely.
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, readdirSync } from "node:fs";

const win = process.platform === "win32";
const run = (cmd, args, cwd) =>
  spawnSync(win && cmd === "npm" ? "npm.cmd" : cmd, args, { cwd, stdio: "inherit", shell: win });

const missing = [];
if (!process.env.TWINE_PASSWORD) missing.push("TWINE_PASSWORD (pypi)");
if (missing.length) {
  console.error("Missing credentials in the environment:\n  " + missing.join("\n  "));
  console.error("\nSet them in your shell, then re-run. Nothing is written to disk.");
  process.exit(2);
}
if (!process.env.TWINE_USERNAME) process.env.TWINE_USERNAME = "__token__";

console.log("\n=== npm: @uncoil/sdk ===");
const who = spawnSync(win ? "npm.cmd" : "npm", ["whoami"], { encoding: "utf8", shell: win });
if (who.status !== 0) {
  console.error("npm authentication failed. The token is invalid or lacks publish rights.");
  console.error("It must be an Automation or Publish token, not a read-only one.");
  process.exit(1);
}
console.log(`authenticated as ${who.stdout.trim()}`);
if (run("npm", ["publish", "--access", "public"], "packages/ts-sdk").status !== 0) {
  console.error("npm publish failed."); process.exit(1);
}

console.log("\n=== pypi: uncoil-sdk ===");
const py = "packages/python-sdk";
// Rebuild from scratch so no stale artifact under an old name can be uploaded.
for (const d of ["dist", "build"]) if (existsSync(`${py}/${d}`)) rmSync(`${py}/${d}`, { recursive: true, force: true });
if (run("python", ["-m", "build"], py).status !== 0) { console.error("build failed"); process.exit(1); }
console.log("built:", readdirSync(`${py}/dist`).join(", "));
if (run("python", ["-m", "twine", "check", "dist/*"], py).status !== 0) { console.error("twine check failed"); process.exit(1); }
if (run("python", ["-m", "twine", "upload", "dist/*"], py).status !== 0) { console.error("twine upload failed"); process.exit(1); }

console.log("\nBoth SDKs published.");
