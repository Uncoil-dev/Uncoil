// Release detection: picks a release label when the caller did not set one.

/** Deploy platform -> environment variable holding the commit being deployed. */
export const PLATFORM_RELEASE_VARIABLES: Record<string, string> = {
  vercel: "VERCEL_GIT_COMMIT_SHA",
  railway: "RAILWAY_GIT_COMMIT_SHA",
  render: "RENDER_GIT_COMMIT",
  netlify: "COMMIT_REF",
  cloudflare_pages: "CF_PAGES_COMMIT_SHA",
  github_actions: "GITHUB_SHA",
  gitlab_ci: "CI_COMMIT_SHA",
};

export const GIT_TIMEOUT_MS = 200;

export type ExecFileSync = (file: string, args: string[], options: Record<string, unknown>) => string | Buffer;

function shorten(value: string): string {
  return /^[0-9a-f]{40}$/i.test(value) ? value.slice(0, 7) : value;
}

/** Node's execFileSync, loaded lazily so edge and browser bundles never touch child_process. */
function loadExecFileSync(): ExecFileSync | null {
  if (typeof process === "undefined" || !process.versions?.node || typeof process.getBuiltinModule !== "function") return null;
  return (process.getBuiltinModule("node:child_process")?.execFileSync as ExecFileSync | undefined) ?? null;
}

/** Short HEAD of the current checkout, or undefined. Never throws. */
export function lookupGitRelease(exec: ExecFileSync | null = loadExecFileSync()): string | undefined {
  if (!exec) return undefined;
  try {
    const out = exec("git", ["rev-parse", "--short", "HEAD"], { timeout: GIT_TIMEOUT_MS, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return String(out).trim() || undefined;
  } catch {
    return undefined;
  }
}

let gitChecked = false;
let gitRelease: string | undefined;

/** The git lookup runs at most once per process. */
export function localGitRelease(exec?: ExecFileSync | null): string | undefined {
  if (!gitChecked) {
    gitChecked = true;
    gitRelease = exec === undefined ? lookupGitRelease() : lookupGitRelease(exec);
  }
  return gitRelease;
}

export function resetGitReleaseCache(): void {
  gitChecked = false;
  gitRelease = undefined;
}

/** Explicit value, then UNCOIL_RELEASE (and its legacy name), then platform commit variables, then local git. */
export function resolveRelease(explicit?: string, env: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env, git: () => string | undefined = localGitRelease): string | undefined {
  if (explicit) return explicit;
  const configured = (env.UNCOIL_RELEASE || env.TRACIFY_RELEASE || "").trim();
  if (configured) return configured;
  for (const name of Object.values(PLATFORM_RELEASE_VARIABLES)) {
    const value = (env[name] || "").trim();
    if (value) return shorten(value);
  }
  return git();
}
