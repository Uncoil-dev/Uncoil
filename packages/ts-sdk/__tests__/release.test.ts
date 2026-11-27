import { afterEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { type ExecFileSync, GIT_TIMEOUT_MS, PLATFORM_RELEASE_VARIABLES, localGitRelease, lookupGitRelease, resetGitReleaseCache, resolveRelease } from "../src/release";
import { UncoilClient } from "../src/index";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const noGit = () => { throw new Error("git must not be used"); };

afterEach(() => { resetGitReleaseCache(); vi.unstubAllEnvs(); });

describe("release detection", () => {
  it.each(Object.entries(PLATFORM_RELEASE_VARIABLES))("%s variable %s maps to a short release", (_platform, name) => {
    expect(resolveRelease(undefined, { [name]: SHA }, noGit)).toBe(SHA.slice(0, 7));
  });

  it("keeps values that are not full SHAs", () => {
    expect(resolveRelease(undefined, { RENDER_GIT_COMMIT: "v1.2.3" }, noGit)).toBe("v1.2.3");
  });

  it("explicit option wins over the environment", () => {
    expect(resolveRelease("manual", { UNCOIL_RELEASE: "env", GITHUB_SHA: SHA }, noGit)).toBe("manual");
  });

  it.each(["UNCOIL_RELEASE", "TRACIFY_RELEASE"])("%s wins over platform variables", (name) => {
    expect(resolveRelease(undefined, { [name]: "pinned", GITHUB_SHA: SHA }, noGit)).toBe("pinned");
  });

  it("falls back to local git last", () => {
    expect(resolveRelease(undefined, {}, () => "abc1234")).toBe("abc1234");
  });

  it("returns the client release from the environment", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", SHA);
    const client = new UncoilClient({ apiKey: "uncoil_sk_live_eu_test" });
    expect((client as unknown as { release?: string }).release).toBe(SHA.slice(0, 7));
  });
});

describe("local git lookup", () => {
  it("reads the short commit", () => {
    const exec = vi.fn<ExecFileSync>(() => "abc1234\n");
    expect(lookupGitRelease(exec)).toBe("abc1234");
    expect(exec.mock.calls[0][2].timeout).toBe(GIT_TIMEOUT_MS);
  });

  it.each([
    ["git missing", (): string => { throw Object.assign(new Error("spawn git ENOENT"), { code: "ENOENT" }); }],
    ["not a repository", (): string => { throw new Error("exit 128"); }],
    ["empty output", () => ""],
  ])("leaves the release empty when %s", (_name, exec) => {
    expect(lookupGitRelease(exec)).toBeUndefined();
  });

  it("leaves the release empty without a Node runtime", () => {
    expect(lookupGitRelease(null)).toBeUndefined();
  });

  it("gives up on a slow git without delaying startup", () => {
    const slow: ExecFileSync = (_file, _args, options) =>
      execFileSync(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], options);
    const started = Date.now();
    expect(lookupGitRelease(slow)).toBeUndefined();
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("runs at most once per process", () => {
    const first = localGitRelease();
    expect(localGitRelease()).toBe(first);
  });
});
