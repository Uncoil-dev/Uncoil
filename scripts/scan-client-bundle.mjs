#!/usr/bin/env node
// Fails when browser bundles from a production build read server-only
// environment variables (process.env.NAME) or import Node-only modules.
// Usage: node scripts/scan-client-bundle.mjs [bundleDir] [sourceDir ...]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SECRET_NAME = /(SECRET|API_KEY|TOKEN|PASSWORD|PRIVATE|CONNECTION_KEY)/;
const NODE_ONLY = /(?:require\(\s*|from\s*|import\(\s*)["'](?:node:)?(?:fs|child_process|net|tls|dns|http2|worker_threads)(?:\/promises)?["']/;
// Names shown to users in SDK and docs examples; they appear in client code as text.
export const PUBLIC_EXAMPLE_NAMES = new Set(["UNCOIL_API_KEY"]);
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/;

export function isServerSecretName(name) {
  return !name.startsWith("NEXT_PUBLIC_") && !PUBLIC_EXAMPLE_NAMES.has(name) && SECRET_NAME.test(name);
}

export function extractSecretNames(sourceText) {
  const names = new Set();
  for (const m of sourceText.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
    if (isServerSecretName(m[1])) names.add(m[1]);
  }
  return names;
}

export function findLeaks(bundleText, secretNames) {
  const findings = [];
  for (const name of secretNames) {
    if (bundleText.includes(`process.env.${name}`)) findings.push(`server-only env name ${name}`);
  }
  const node = NODE_ONLY.exec(bundleText);
  if (node) findings.push(`Node-only import ${node[0].trim()}`);
  return findings;
}

function walk(dir, accept, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, accept, out);
    else if (accept(full)) out.push(full);
  }
  return out;
}

export function scan(bundleDir, sourceDirs) {
  const names = new Set();
  for (const dir of sourceDirs) {
    for (const file of walk(dir, (f) => SOURCE_EXT.test(f) && !/\.test\./.test(f))) {
      for (const n of extractSecretNames(readFileSync(file, "utf8"))) names.add(n);
    }
  }
  const results = [];
  for (const file of walk(bundleDir, (f) => f.endsWith(".js"))) {
    const findings = findLeaks(readFileSync(file, "utf8"), names);
    if (findings.length) results.push({ file, findings });
  }
  return { checkedNames: names.size, results };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [bundleDir = ".next/static", ...sources] = process.argv.slice(2);
  if (!existsSync(bundleDir)) {
    console.error(`[client-bundle] ${bundleDir} not found; run the build first.`);
    process.exit(1);
  }
  const { checkedNames, results } = scan(bundleDir, sources.length ? sources : ["src", "convex"]);
  for (const r of results) console.error(`[client-bundle] ${r.file}: ${r.findings.join("; ")}`);
  console.log(`[client-bundle] checked ${checkedNames} server-only names; ${results.length} file(s) with findings.`);
  process.exit(results.length ? 1 : 0);
}
