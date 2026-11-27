import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectProject, formatProject } from "../src/init/detect";

const dirs: string[] = [];
function project(files: Record<string, string | object>) {
  const dir = mkdtempSync(join(tmpdir(), "uncoil-detect-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), typeof content === "string" ? content : JSON.stringify(content));
  }
  return dir;
}
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

describe("init project detection", () => {
  it("finds a Next.js app with OpenAI on pnpm and points at a new instrumentation file under src", () => {
    const dir = project({
      "package.json": { dependencies: { next: "16.0.0", openai: "^7.0.0" }, devDependencies: { typescript: "^5" } },
      "pnpm-lock.yaml": "",
      "src/app/page.tsx": "",
    });
    const result = detectProject(dir);
    expect(result).toEqual({ ok: true, project: {
      language: "typescript", framework: "nextjs", packageManager: "pnpm", libraries: ["openai"],
      startupFile: "src/instrumentation.ts", startupFileExists: false,
    } });
    expect(result.ok && formatProject(result.project)).toBe("TypeScript · Next.js · pnpm · OpenAI · tracing goes in src/instrumentation.ts (new file)");
  });

  it("uses an existing Next.js instrumentation file", () => {
    const dir = project({ "package.json": { dependencies: { next: "16", "@anthropic-ai/sdk": "1" } }, "instrumentation.js": "" });
    const result = detectProject(dir);
    expect(result.ok && result.project).toMatchObject({ language: "javascript", libraries: ["anthropic"], startupFile: "instrumentation.js", startupFileExists: true });
  });

  it("finds a Vite app with the Vercel AI SDK on yarn", () => {
    const dir = project({ "package.json": { devDependencies: { vite: "7", typescript: "5" }, dependencies: { ai: "5" } }, "yarn.lock": "", "src/main.tsx": "" });
    const result = detectProject(dir);
    expect(result.ok && result.project).toMatchObject({ framework: "vite", packageManager: "yarn", libraries: ["vercel-ai"], startupFile: "src/main.tsx", startupFileExists: true });
  });

  it("finds a plain Node app with LangChain from package.json main, and the packageManager field wins over lockfiles", () => {
    const dir = project({
      "package.json": { main: "./server.js", packageManager: "bun@1.2.0", dependencies: { "@langchain/core": "1", openai: "7" } },
      "package-lock.json": "{}",
      "server.js": "",
    });
    const result = detectProject(dir);
    expect(result.ok && result.project).toMatchObject({ framework: "node", packageManager: "bun", libraries: ["openai", "langchain"], startupFile: "server.js" });
  });

  it("falls back to npm and src/index.ts, and says when no model library is installed", () => {
    const dir = project({ "package.json": { devDependencies: { typescript: "5" } } });
    const result = detectProject(dir);
    expect(result.ok && formatProject(result.project)).toBe("TypeScript · Node · npm · no model library found · tracing goes in src/index.ts (new file)");
  });

  it("reports a missing or broken package.json and never writes a file", () => {
    const empty = project({});
    expect(detectProject(empty)).toMatchObject({ ok: false, message: expect.stringContaining("No package.json") });
    expect(readdirSync(empty)).toEqual([]);
    expect(detectProject(project({ "package.json": "{nope" }))).toMatchObject({ ok: false, message: "package.json is not valid JSON." });
  });
});
