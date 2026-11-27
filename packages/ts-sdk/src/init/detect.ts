import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Framework = "nextjs" | "vite" | "node";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type ModelLibrary = "openai" | "anthropic" | "vercel-ai" | "langchain";

export interface ProjectInfo {
  language: "typescript" | "javascript";
  framework: Framework;
  packageManager: PackageManager;
  libraries: ModelLibrary[];
  /** Path relative to the project folder where tracing should start. */
  startupFile: string;
  /** False when the startup file still has to be created (e.g. a Next.js instrumentation file). */
  startupFileExists: boolean;
}

interface PackageJson {
  main?: unknown;
  packageManager?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export type DetectResult = { ok: true; project: ProjectInfo } | { ok: false; message: string };

const LOCKFILES: Array<[string, PackageManager]> = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
];

/** Reads package.json and a few well-known files in `dir`. Never writes anything. */
export function detectProject(dir: string): DetectResult {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return { ok: false, message: "No package.json found here. Run this in your project folder." };
  let pkg: PackageJson;
  try { pkg = JSON.parse(readFileSync(pkgPath, "utf8")); }
  catch { return { ok: false, message: "package.json is not valid JSON." }; }

  const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
  const has = (name: string) => name in deps;
  const exists = (file: string) => existsSync(join(dir, file));

  const language = has("typescript") || exists("tsconfig.json") ? "typescript" : "javascript";
  const framework: Framework = has("next") ? "nextjs" : has("vite") ? "vite" : "node";

  const declared = typeof pkg.packageManager === "string" ? pkg.packageManager.split("@")[0] : "";
  const packageManager = (["npm", "pnpm", "yarn", "bun"].includes(declared) ? declared
    : LOCKFILES.find(([file]) => exists(file))?.[1] ?? "npm") as PackageManager;

  const libraries: ModelLibrary[] = [];
  if (has("openai")) libraries.push("openai");
  if (has("@anthropic-ai/sdk")) libraries.push("anthropic");
  if (has("ai")) libraries.push("vercel-ai");
  if (has("langchain") || Object.keys(deps).some((d) => d.startsWith("@langchain/"))) libraries.push("langchain");

  const startupFile = findStartupFile(framework, language, pkg, exists);
  return { ok: true, project: { language, framework, packageManager, libraries, startupFile, startupFileExists: exists(startupFile) } };
}

function findStartupFile(framework: Framework, language: string, pkg: PackageJson, exists: (f: string) => boolean) {
  const ext = language === "typescript" ? ["ts", "js"] : ["js", "ts"];
  const first = (names: string[]) => names.find(exists);
  if (framework === "nextjs") {
    const base = exists("src/app") || exists("src/pages") ? "src/" : "";
    return first(ext.map((e) => `${base}instrumentation.${e}`)) ?? `${base}instrumentation.${ext[0]}`;
  }
  if (framework === "vite") {
    const names = ["main", "index"].flatMap((n) => [`src/${n}.${ext[0]}x`, `src/${n}.${ext[0]}`, `src/${n}.${ext[1]}x`, `src/${n}.${ext[1]}`]);
    return first(names) ?? `src/main.${ext[0]}`;
  }
  const declared = typeof pkg.main === "string" ? pkg.main.replace(/^\.\//, "") : undefined;
  if (declared && exists(declared)) return declared;
  return first(["src/index", "index", "src/main", "main", "src/server", "server", "src/app", "app"].flatMap((n) => ext.map((e) => `${n}.${e}`)))
    ?? `src/index.${ext[0]}`;
}

const FRAMEWORK_LABEL: Record<Framework, string> = { nextjs: "Next.js", vite: "Vite", node: "Node" };
const LIBRARY_LABEL: Record<ModelLibrary, string> = { openai: "OpenAI", anthropic: "Anthropic", "vercel-ai": "Vercel AI SDK", langchain: "LangChain" };

/** One line, e.g. "TypeScript · Next.js · pnpm · OpenAI · tracing goes in instrumentation.ts (new file)". */
export function formatProject(project: ProjectInfo): string {
  const libs = project.libraries.length ? project.libraries.map((l) => LIBRARY_LABEL[l]).join(" + ") : "no model library found";
  const where = `tracing goes in ${project.startupFile}${project.startupFileExists ? "" : " (new file)"}`;
  return [project.language === "typescript" ? "TypeScript" : "JavaScript", FRAMEWORK_LABEL[project.framework], project.packageManager, libs, where].join(" · ");
}
