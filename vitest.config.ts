import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test files written for the Node test runner (`node:test`) run through `npm run test:tools`,
// not through vitest, so they are left out of the vitest file set.
function nodeTestFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...nodeTestFiles(path));
    else if (/\.test\.[cm]?[jt]sx?$/.test(entry.name) && readFileSync(path, "utf8").includes("node:test")) found.push(path);
  }
  return found;
}

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "edge-runtime",
    retry: process.env.CI ? 1 : 0,
    exclude: ["**/node_modules/**", ...nodeTestFiles(join(root, "src"))],
  },
});
